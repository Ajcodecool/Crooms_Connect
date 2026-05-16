import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useServerSchedule } from '../hooks/useServerSchedule';

const JAPAN_IMAGES = [
  'https://files.catbox.moe/y6qlyc.JPG',
  'https://files.catbox.moe/zw7lmz.JPG',
  'https://files.catbox.moe/hjcbt5.JPG',
  'https://files.catbox.moe/18nykf.JPG',
  'https://files.catbox.moe/acrxy9.jpg',
  'https://files.catbox.moe/1l768l.jpg',
  'https://files.catbox.moe/0jx9uq.jpg',
  'https://files.catbox.moe/w7flr8.jpg',
  'https://files.catbox.moe/61lkog.jpg',
  'https://files.catbox.moe/ttdpcp.jpg',
  'https://files.catbox.moe/kqq2hr.jpg',
  'https://files.catbox.moe/y5kexz.jpg',
  'https://files.catbox.moe/q74lg8.jpg',
  'https://files.catbox.moe/0atgbh.jpg',
  'https://files.catbox.moe/68b30x.jpg',
  'https://files.catbox.moe/zq1wsx.jpg',
  'https://files.catbox.moe/itgv4h.jpg',
  'https://files.catbox.moe/nwq7is.jpg',
];

// Extracted and Memoized Thumbnail component to prevent massive re-renders/lag when toggling
const ImageThumbnail = React.memo(
  ({ imgUrl, idx, isHidden, toggleImageVisibility }) => (
    <div
      onClick={() => toggleImageVisibility(imgUrl)}
      className={`relative aspect-square cursor-pointer rounded-lg overflow-hidden border-2 transition-all duration-200 ${
        isHidden
          ? 'border-red-500/50 opacity-40 grayscale'
          : 'border-[#4da6ff] hover:scale-105'
      }`}
    >
      <img
        src={imgUrl}
        alt={`thumb-${idx}`}
        loading='lazy'
        className='w-full h-full object-cover'
      />
      {isHidden && (
        <div className='absolute inset-0 flex items-center justify-center bg-black/40'>
          <i className='fa-solid fa-eye-slash text-red-400 text-xl'></i>
        </div>
      )}
      {!isHidden && (
        <div className='absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black/30 transition-opacity'>
          <i className='fa-solid fa-eye text-white text-xl'></i>
        </div>
      )}
    </div>
  ),
);

// Add display name to satisfy the react/display-name ESLint rule
ImageThumbnail.displayName = 'ImageThumbnail';

const ZenMode = ({ isActive }) => {
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');
  const [weather, setWeather] = useState({
    temp: '--',
    condition: 'Loading...',
  });
  const [chats, setChats] = useState([]);
  const [userImages, setUserImages] = useState([]);

  // Settings States
  const [showSettings, setShowSettings] = useState(false);
  const [slideDuration, setSlideDuration] = useState(10000); // Default 10 seconds
  const [hiddenImages, setHiddenImages] = useState([]);

  // Determine available images
  const allImages = userImages.length > 0 ? userImages : JAPAN_IMAGES;
  const activeImages = allImages.filter((img) => !hiddenImages.includes(img));
  const displayImages = activeImages.length > 0 ? activeImages : allImages; // Fallback if all are hidden

  const [slideIndex, setSlideIndex] = useState(() =>
    Math.floor(Math.random() * displayImages.length),
  );

  const { currentPeriod, nextPeriod, timeRemaining, scheduleType } =
    useServerSchedule();

  // Reset slide index if it goes out of bounds when toggling images
  useEffect(() => {
    if (slideIndex >= displayImages.length) {
      setSlideIndex(0);
    }
  }, [displayImages.length, slideIndex]);

  // User Uploaded Images Fetching (with pagination to fetch ALL images)
  useEffect(() => {
    if (!isActive) return;
    const fetchUserImages = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user?.id) return;

        let allFiles = [];
        let page = 0;
        let hasMore = true;
        const limit = 100;

        // Loop to fetch all files bypassing any default limits
        while (hasMore) {
          const { data, error } = await supabase.storage
            .from('chat-uploads')
            .list(session.user.id, {
              limit: limit,
              offset: page * limit,
              sortBy: { column: 'created_at', order: 'desc' },
            });

          if (error) throw error;

          if (data && data.length > 0) {
            allFiles = [...allFiles, ...data];
            if (data.length < limit) {
              hasMore = false; // Less than limit means we've reached the end
            } else {
              page++;
            }
          } else {
            hasMore = false;
          }
        }

        const validImages = allFiles
          .filter((f) => f.name !== '.emptyFolderPlaceholder')
          .filter((f) => {
            const ext = f.name.split('.').pop().toLowerCase();
            return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(
              ext,
            );
          })
          .map((f) => {
            return supabase.storage
              .from('chat-uploads')
              .getPublicUrl(`${session.user.id}/${f.name}`).data.publicUrl;
          });

        if (validImages.length > 0) {
          setUserImages(validImages);
          setSlideIndex(Math.floor(Math.random() * validImages.length));
        }
      } catch (err) {
        console.error('Error fetching user images for ZenMode:', err);
      }
    };

    fetchUserImages();
  }, [isActive]);

  // Weather Fetching
  useEffect(() => {
    if (!isActive) return;
    const fetchWeather = async () => {
      try {
        const res = await fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=28.80&longitude=-81.27&current_weather=true&temperature_unit=fahrenheit',
        );
        const data = await res.json();
        if (data?.current_weather) {
          const code = data.current_weather.weathercode;
          let conditionStr = 'Clear';
          if (code >= 1 && code <= 3) conditionStr = 'Partly Cloudy';
          if (code >= 45 && code <= 48) conditionStr = 'Fog';
          if (code >= 51 && code <= 67) conditionStr = 'Raining';
          if (code >= 71 && code <= 77) conditionStr = 'Snowing';
          if (code >= 95) conditionStr = 'Thunderstorm';

          setWeather({
            temp: `${Math.round(data.current_weather.temperature)}°`,
            condition: conditionStr,
          });
        }
      } catch (e) {
        console.error('ZenMode Weather Error:', e);
      }
    };
    fetchWeather();
    const interval = setInterval(fetchWeather, 600000);
    return () => clearInterval(interval);
  }, [isActive]);

  // Clock
  useEffect(() => {
    if (!isActive) return;
    const updateClock = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      setTime(`${hours}:${minutes} ${ampm}`);

      const options = { weekday: 'long', month: 'long', day: 'numeric' };
      setDate(now.toLocaleDateString(undefined, options));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, [isActive]);

  // Dynamic Random Slideshow
  useEffect(() => {
    if (!isActive || displayImages.length === 0) return;
    const interval = setInterval(() => {
      setSlideIndex((prev) => {
        if (displayImages.length <= 1) return 0;
        let nextIndex;
        do {
          nextIndex = Math.floor(Math.random() * displayImages.length);
        } while (nextIndex === prev);

        return nextIndex;
      });
    }, slideDuration);

    return () => clearInterval(interval);
  }, [isActive, displayImages.length, slideDuration]);

  // Chat Fetching
  useEffect(() => {
    if (!isActive) return;
    const fetchChats = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*, profiles(username)')
        .order('timestamp', { ascending: false })
        .limit(5);
      if (data) setChats(data.reverse());
    };
    fetchChats();
    const interval = setInterval(fetchChats, 10000);
    return () => clearInterval(interval);
  }, [isActive]);

  // Wrapped in useCallback to prevent child components from re-rendering
  const toggleImageVisibility = useCallback((imgUrl) => {
    setHiddenImages((prev) =>
      prev.includes(imgUrl)
        ? prev.filter((url) => url !== imgUrl)
        : [...prev, imgUrl],
    );
  }, []);

  const kenburnsCSS = `
    @keyframes kenburns {
        from { transform: scale(1.0); }
        to { transform: scale(1.12); }
    }
  `;

  // Determine dynamic animation duration (1.5x the slide duration to prevent animation stopping early)
  const animationDuration = `${(slideDuration / 1000) * 1.5}s`;

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-black text-white font-sans overflow-hidden transition-opacity duration-1000 ease-in-out ${isActive ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
    >
      <style>{kenburnsCSS}</style>

      {/* Background Slides */}
      {displayImages.map((img, idx) => {
        const isCurrent = idx === slideIndex;
        return (
          <div
            key={img}
            className='absolute inset-0 transition-opacity duration-2000 pointer-events-none'
            style={{ opacity: isCurrent ? 1 : 0 }}
          >
            <img
              src={img}
              alt='bg-blur'
              className='absolute inset-0 w-full h-full object-cover opacity-50 blur-[30px]'
              style={{ transform: 'scale(1.15)' }}
            />
            <img
              src={img}
              alt='fg'
              className='absolute inset-0 w-full h-full object-contain'
              style={{
                animation: isCurrent
                  ? `kenburns ${animationDuration} linear forwards`
                  : 'none',
              }}
            />
          </div>
        );
      })}

      {/* Settings Button */}
      <div className='absolute top-10 left-1/2 -translate-x-1/2 z-20 pointer-events-auto'>
        <button
          onClick={() => setShowSettings(true)}
          className='bg-black/50 hover:bg-black/80 backdrop-blur-md border border-white/10 rounded-full py-2 px-4 shadow-[0_5px_15px_rgba(0,0,0,0.5)] text-white/70 hover:text-white transition-all flex items-center gap-2'
        >
          <i className='fa-solid fa-gear'></i>{' '}
          <span className='text-sm font-semibold tracking-wider uppercase'>
            Settings
          </span>
        </button>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className='absolute inset-0 z-[10000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto'>
          <div className='bg-[#111] border border-white/20 rounded-2xl p-6 w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl relative'>
            <button
              onClick={() => setShowSettings(false)}
              className='absolute top-4 right-4 text-white/50 hover:text-white text-xl'
            >
              <i className='fa-solid fa-xmark'></i>
            </button>

            <h2 className='text-2xl font-bold mb-6 text-[#4da6ff]'>
              ZenMode Settings
            </h2>

            <div className='overflow-y-auto pr-2 custom-scrollbar flex-1'>
              {/* Duration Slider */}
              <div className='mb-8 bg-black/40 p-4 rounded-xl border border-white/5'>
                <label className='block text-white/80 font-semibold mb-3 flex justify-between'>
                  <span>Photo Duration</span>
                  <span className='text-[#4da6ff]'>
                    {slideDuration / 1000} Seconds
                  </span>
                </label>
                <input
                  type='range'
                  min='3000'
                  max='60000'
                  step='1000'
                  value={slideDuration}
                  onChange={(e) => setSlideDuration(Number(e.target.value))}
                  className='w-full accent-[#4da6ff] h-2 bg-white/20 rounded-lg appearance-none cursor-pointer'
                />
              </div>

              {/* Image Selection Grid */}
              <div>
                <h3 className='text-white/80 font-semibold mb-3'>
                  Visible Photos ({allImages.length} total)
                </h3>
                <p className='text-white/40 text-sm mb-4'>
                  Click on an image to show or hide it from the slideshow.
                </p>
                <div className='grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3'>
                  {allImages.map((imgUrl, idx) => (
                    <ImageThumbnail
                      key={imgUrl} // Using URL as key is more stable than idx
                      imgUrl={imgUrl}
                      idx={idx}
                      isHidden={hiddenImages.includes(imgUrl)}
                      toggleImageVisibility={toggleImageVisibility}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Left - Class Timer Widget */}
      <div className='absolute top-10 left-10 min-w-[280px] bg-black/55 backdrop-blur-md border border-white/10 rounded-2xl p-5 shadow-[0_10px_30px_rgba(0,0,0,0.5)] z-10 hidden md:flex flex-col'>
        <div className='text-[12px] uppercase tracking-[1.5px] text-white/60 border-b border-white/10 pb-2 mb-3 flex items-center justify-between'>
          <span>
            <i className='fa-regular fa-clock mr-2'></i>{' '}
            {scheduleType || 'Schedule'}
          </span>
        </div>

        <div className='flex flex-col'>
          {timeRemaining ? (
            <>
              <span className='text-[42px] font-bold leading-none drop-shadow-md text-white mb-1'>
                {timeRemaining}
              </span>
              <span className='text-[#4da6ff] font-semibold text-[15px]'>
                {currentPeriod
                  ? currentPeriod.name
                  : nextPeriod
                    ? `Up Next: ${nextPeriod.name}`
                    : 'Waiting...'}
              </span>
              {currentPeriod && nextPeriod && (
                <span className='text-white/50 text-[13px] mt-1'>
                  Next: {nextPeriod.name}
                </span>
              )}
            </>
          ) : (
            <div className='text-white/70 italic text-[15px] py-2'>
              No active classes right now.
            </div>
          )}
        </div>
      </div>

      {/* Top Right - Chat Widget */}
      <div className='absolute top-10 right-10 w-[320px] bg-black/55 backdrop-blur-md border border-white/10 rounded-2xl p-5 shadow-[0_10px_30px_rgba(0,0,0,0.5)] z-10 hidden md:flex flex-col'>
        <div className='text-[12px] uppercase tracking-[1.5px] text-white/60 border-b border-white/10 pb-2 mb-4 flex justify-between items-center'>
          <span>Live Chat</span>
        </div>
        <div className='flex flex-col gap-3 overflow-y-auto'>
          {chats.map((msg) => {
            const avatarUrl = msg.user_id
              ? `${supabase.supabaseUrl}/storage/v1/object/public/profile-pictures/${msg.user_id}.png`
              : '/DP1.jpg';

            return (
              <div key={msg.id} className='flex items-start gap-3 mb-1'>
                <img
                  src={avatarUrl}
                  alt='avatar'
                  onError={(e) => {
                    e.target.src = '/DP1.jpg';
                  }}
                  className='w-9 h-9 rounded-full object-cover bg-[#444] border-2 border-white/20 shrink-0'
                />
                <div className='flex flex-col w-[calc(100%-48px)]'>
                  <span className='font-bold text-[#4da6ff] text-[13px] mb-[3px]'>
                    {msg.profiles?.username || 'User'}
                  </span>
                  <span className='text-[#eee] text-[14px] leading-relaxed break-words'>
                    {msg.message}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Overlay - Time, Date & Weather */}
      <div className='absolute bottom-0 left-0 right-0 p-8 md:p-12 bg-gradient-to-t from-black/80 to-transparent flex flex-col md:flex-row justify-between items-end pointer-events-none z-10'>
        <div>
          <div className='text-[60px] md:text-[100px] font-bold leading-none drop-shadow-[2px_2px_8px_rgba(0,0,0,0.5)]'>
            {time}
          </div>
          <div className='text-[20px] md:text-[26px] opacity-80 mt-2'>
            {date}
          </div>
        </div>
        <div className='text-right mt-4 md:mt-0'>
          <div className='text-[50px] md:text-[80px] leading-none drop-shadow-md'>
            {weather.temp}
          </div>
          <div className='text-[20px] md:text-[26px] opacity-80'>
            {weather.condition}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ZenMode;
