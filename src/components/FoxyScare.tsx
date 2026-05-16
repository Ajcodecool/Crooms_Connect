import { useEffect, useState, useRef, useCallback, type FC } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const DEFAULT_SCARE_AUDIO =
  'https://www.myinstants.com/media/sounds/fnaf-jumpscare-sound.mp3';
const DEFAULT_SCARE_IMAGE =
  'https://api.croomsconnect.com/storage/v1/object/public/chat-uploads/0f4f49db-4665-4408-83f1-703d163506cf/1776036276997-jbnhrsl1p5j.jpg';

// Define the payload structure to avoid 'any'
interface BroadcastPayload {
  payload?: {
    imageUrl?: string;
    audioUrl?: string;
  };
}

// Storing the audio instance outside of React Hooks completely bypasses
// any 'react-hooks/immutability' linting errors.
let defaultAudioInstance: HTMLAudioElement | null = null;

const FoxyScare: FC = () => {
  const [scareStage, setScareStage] = useState<'idle' | 'foxy' | 'static'>(
    'idle',
  );
  const [activeImage, setActiveImage] = useState<string>(DEFAULT_SCARE_IMAGE);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // === Get current route location ===
  const location = useLocation();

  // 1. Initialize default audio purely in JS on mount
  useEffect((): void => {
    if (!defaultAudioInstance) {
      defaultAudioInstance = new window.Audio(DEFAULT_SCARE_AUDIO);
      defaultAudioInstance.preload = 'auto';
    }
  }, []);

  // === ANIMATION SEQUENCE ===
  const triggerScare = useCallback(
    (customUrl?: string, customAudioUrl?: string): void => {
      // === CHECK: Only trigger if the user is on the /chat page ===
      if (location.pathname !== '/chat' && location.pathname !== '/chat/') {
        console.log('Jumpscare suppressed: User is not on the /chat page.');
        return;
      }

      // If already scaring, ignore
      if (scareStage !== 'idle') return;

      // Set the custom image or fallback to default
      setActiveImage(
        customUrl && customUrl.trim() !== '' ? customUrl : DEFAULT_SCARE_IMAGE,
      );
      setScareStage('foxy');

      // Decide which audio track to play
      let activeAudio: HTMLAudioElement;

      // If a custom audio URL is provided, create a fresh Audio object so the browser immediately fetches/plays it
      if (customAudioUrl && customAudioUrl.trim() !== '') {
        activeAudio = new window.Audio(customAudioUrl);
      } else {
        // Otherwise, use the pre-loaded default audio
        if (!defaultAudioInstance) {
          defaultAudioInstance = new window.Audio(DEFAULT_SCARE_AUDIO);
          defaultAudioInstance.preload = 'auto';
        }
        activeAudio = defaultAudioInstance;
        activeAudio.currentTime = 0; // Reset to start
      }

      // Modify standard JS object properties (linter ignores this since it's not a Hook ref)
      activeAudio.volume = 1.0;
      const playPromise = activeAudio.play();

      if (playPromise !== undefined) {
        playPromise.catch((error: unknown): void => {
          console.warn(
            'Browser blocked audio autoplay (user must interact with the site first).',
            error,
          );
        });
      }
    },
    [scareStage, location.pathname],
  );

  // === 1. GLOBAL LISTENER (ADMIN TRIGGER) ===
  useEffect((): (() => void) => {
    const channel = supabase
      .channel('system_broadcasts')
      .on(
        'broadcast',
        { event: 'jumpscare' },
        (payload: BroadcastPayload): void => {
          console.log('🐺 JUMPSCARE TRIGGERED BY ADMIN!');
          // Extract both custom image and audio from the payload
          const passedImageUrl = payload?.payload?.imageUrl;
          const passedAudioUrl = payload?.payload?.audioUrl;
          triggerScare(passedImageUrl, passedAudioUrl);
        },
      )
      .on('broadcast', { event: 'force_refresh' }, (): void => {
        console.log('🔄 Admin requested global refresh');
        window.location.reload();
      })
      .subscribe((status: string): void => {
        if (status === 'SUBSCRIBED') {
          console.log('🎧 FoxyScare is listening for system broadcasts...');
        }
      });

    return (): void => {
      supabase.removeChannel(channel);
    };
  }, [triggerScare]);

  // === 2. LOCAL RANDOM CHANCE (THEMES SETTING) ===
  useEffect((): (() => void) | void => {
    const isFoxyEnabled = localStorage.getItem('foxyMode') === 'true';
    if (!isFoxyEnabled) return;

    const checkInterval = setInterval((): void => {
      // 1/10000 chance per second
      if (Math.random() < 0.0001) {
        console.log('🎲 Random local scare triggered');
        triggerScare();
      }
    }, 1000);

    return (): void => clearInterval(checkInterval);
  }, [triggerScare]);

  // === 3. TEST TRIGGER (CTRL + SHIFT + X) ===
  useEffect((): (() => void) => {
    const handleKeys = (e: KeyboardEvent): void => {
      if (e.ctrlKey && e.shiftKey && e.key === 'X') {
        console.log('⌨️ Manual test trigger activated');
        triggerScare();
      }
    };
    window.addEventListener('keydown', handleKeys);
    return (): void => window.removeEventListener('keydown', handleKeys);
  }, [triggerScare]);

  useEffect((): (() => void) | void => {
    if (scareStage === 'foxy') {
      // Play GIF/Image for 2.5 seconds (Fast & Scary)
      const timer1 = setTimeout((): void => {
        setScareStage('static');
      }, 2500);

      return (): void => clearTimeout(timer1);
    }

    if (scareStage === 'static') {
      // Play Static for 0.5 seconds then cut to black/idle
      const timer2 = setTimeout((): void => {
        setScareStage('idle');
      }, 500);

      return (): void => clearTimeout(timer2);
    }
  }, [scareStage]);

  // === STATIC NOISE GENERATOR ===
  useEffect((): (() => void) | void => {
    if (scareStage !== 'static') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let animationFrameId: number;

    const resize = (): void => {
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };
    resize();
    window.addEventListener('resize', resize);

    const drawStatic = (): void => {
      const w = canvas.width;
      const h = canvas.height;
      const idata = ctx.createImageData(w, h);
      const buffer32 = new Uint32Array(idata.data.buffer);
      const len = buffer32.length;

      for (let i = 0; i < len; i++) {
        buffer32[i] = Math.random() < 0.5 ? 0xff000000 : 0xffffffff;
      }

      ctx.putImageData(idata, 0, 0);
      animationFrameId = requestAnimationFrame(drawStatic);
    };

    drawStatic();

    return (): void => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [scareStage]);

  if (scareStage === 'idle') return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 99999,
        backgroundColor: 'black',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        pointerEvents: 'auto',
      }}
    >
      {scareStage === 'foxy' && (
        <img
          src={activeImage}
          alt='scare'
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      )}

      {scareStage === 'static' && (
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
      )}
    </div>
  );
};

export default FoxyScare;
