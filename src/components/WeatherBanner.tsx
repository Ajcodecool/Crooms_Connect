import {
  useState,
  useEffect,
  useRef,
  useLayoutEffect,
  useCallback,
  type FC,
} from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './WeatherBanner.css';

const WeatherBanner: FC = () => {
  const location = useLocation();

  const [alertText, setAlertText] = useState<string | null>(null);
  const [testMode, setTestMode] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [canShow, setCanShow] = useState(false);
  const [currentAlertId, setCurrentAlertId] = useState<string | null>(null);

  const textRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [duration, setDuration] = useState(0);

  // === CONFIGURATION ===
  // Lower = Faster, Higher = Slower. 120 is a good readable speed.
  const PIXELS_PER_SECOND = 120;

  const isExcluded =
    location.pathname.startsWith('/auth') ||
    location.pathname.startsWith('/canvas');

  // === 1. SPEED CALCULATION ===
  const calculateSpeed = useCallback(() => {
    if (canShow && textRef.current && !isExcluded) {
      const textWidth = textRef.current.offsetWidth;
      const screenWidth = window.innerWidth;

      if (textWidth > 0) {
        const totalDistance = screenWidth + textWidth;
        const calculatedDuration = totalDistance / PIXELS_PER_SECOND;
        setDuration(calculatedDuration);
      }
    }
  }, [canShow, isExcluded]);

  // === 2. DATA FETCHING ===
  const enableBanner = useCallback(
    (text: string, id: string) => {
      if (canShow && alertText === text) return;

      setIsVisible(false); // Reset for restart
      setAlertText(text);
      setCurrentAlertId(id);
      setCanShow(true);

      // Small delay to allow render, then slide down
      setTimeout(() => {
        setIsVisible(true);
        calculateSpeed();
      }, 50);
    },
    [alertText, calculateSpeed, canShow],
  );

  const closeBanner = (): void => {
    setIsVisible(false); // Triggers CSS height transition to 0
    setTimeout(() => {
      setCanShow(false);
      setAlertText(null);
    }, 400); // Match CSS transition time
  };

  const checkSystem = useCallback(async () => {
    if (isExcluded) return;

    const { data: settings } = await supabase
      .from('system_settings')
      .select('*')
      .in('key', ['weather_alert_test', 'weather_alert_test_message']);

    const isTesting =
      settings?.find((s) => s.key === 'weather_alert_test')?.value === 'true';
    const testMsg =
      settings?.find((s) => s.key === 'weather_alert_test_message')?.value ||
      'SYSTEM TEST: THIS IS A GLOBAL ALERT TEST.';

    setTestMode(isTesting);

    try {
      const res = await fetch(
        'https://api.weather.gov/alerts/active?point=28.8029,-81.2690',
      );
      const weatherData = await res.json();

      let foundAlert = null;
      if (weatherData.features && weatherData.features.length > 0) {
        foundAlert = weatherData.features[0].properties;
      }

      if (isTesting) {
        enableBanner(testMsg.toUpperCase(), 'TEST_ID');
      } else if (foundAlert) {
        const newText =
          `${foundAlert.event}: ${foundAlert.headline} — ${foundAlert.description}`.toUpperCase();
        const newId = foundAlert.id;
        const seenId = localStorage.getItem('seen_weather_alert_id');

        if (seenId !== newId) enableBanner(newText, newId);
        else if (canShow) closeBanner();
      } else {
        if (canShow) closeBanner();
      }
    } catch (err) {
      console.error('Weather API Error:', err);
      if (!isTesting && canShow) closeBanner();
    }
  }, [canShow, enableBanner, isExcluded]);

  const markAsSeen = (): void => {
    if (!testMode && currentAlertId && alertText) {
      localStorage.setItem('seen_weather_alert_id', currentAlertId);
      localStorage.setItem('seen_weather_alert_text', alertText);
    }
    closeBanner();
  };

  // === 1. SYSTEM CHECK ===
  useEffect(() => {
    if (isExcluded) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      closeBanner();
      return;
    }

    checkSystem();
    const interval = setInterval(checkSystem, 60000);

    const subscription = supabase
      .channel('public:system_settings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'system_settings' },
        (payload) => {
          const newSetting = payload.new as { key: string; value: string }; // TODO: SUPABASE TYPES!!!
          if (
            newSetting.key === 'weather_alert_test' ||
            newSetting.key === 'weather_alert_test_message'
          ) {
            checkSystem();
          }
        },
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(subscription);
    };
  }, [isExcluded, checkSystem]);

  useLayoutEffect(() => {
    calculateSpeed();
    window.addEventListener('resize', calculateSpeed);
    const timeout = setTimeout(calculateSpeed, 500); // Safety double-check
    return () => {
      window.removeEventListener('resize', calculateSpeed);
      clearTimeout(timeout);
    };
  }, [canShow, alertText, isExcluded, calculateSpeed]);

  if (isExcluded || !canShow || !alertText) return null;

  return (
    <>
      <div
        ref={containerRef}
        className={`weather-banner-wrapper ${isVisible ? 'open' : ''}`}
        role='alert'
      >
        <div
          className={`weather-ticker-container ${testMode ? 'test-mode' : ''}`}
        >
          <div
            className='weather-ticker-text'
            ref={textRef}
            style={{
              animation:
                duration > 0 ? `marquee ${duration}s linear forwards` : 'none',
            }}
            onAnimationEnd={markAsSeen}
          >
            {alertText}
          </div>
          <button
            onClick={markAsSeen}
            className='weather-close-btn'
            aria-label='Close Alert'
          >
            ✕
          </button>
        </div>
      </div>
    </>
  );
};

export default WeatherBanner;
