import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

// Expanded Color Palette (32 Colors)
const COLORS = [
  '#FFFFFF',
  '#E4E4E4',
  '#C4C4C4',
  '#888888',
  '#4E4E4E',
  '#000000',
  '#FFA7D1',
  '#FD4659',
  '#E50000',
  '#800000',
  '#FFDDCA',
  '#F6B73C',
  '#E59500',
  '#A06A42',
  '#604020',
  '#E5D900',
  '#94E044',
  '#02BE01',
  '#005F00',
  '#00D3DD',
  '#0083C7',
  '#0000EA',
  '#00006EA',
  '#CF6EE4',
  '#820080',
  '#5100FF',
  '#00E5FF',
  '#FF00FF',
  '#FF9900',
  '#B4E0B4',
  '#A8B1FF',
  '#FFB8D2',
];

const COOLDOWN_MS = 60000; // 1 Minute

export default function ConnectPlace({ session }) {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // App & User State
  const [tosAccepted, setTosAccepted] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false); // Tracks if user is verified
  const [selectedColor, setSelectedColor] = useState(COLORS[5]);
  const [cooldownTime, setCooldownTime] = useState(0);
  const [isPlacing, setIsPlacing] = useState(false);

  // Data Caches
  const pixelMapRef = useRef(new Map());
  const userCacheRef = useRef(new Map());

  // Viewport State
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // Interaction State
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [clickStart, setClickStart] = useState({ x: 0, y: 0 });

  // Hover & Selection State
  const [hoveredPixel, setHoveredPixel] = useState(null);
  const [pendingPixel, setPendingPixel] = useState(null);

  // 1. Initial Load (TOS & Profile)
  useEffect(() => {
    const accepted = localStorage.getItem('connectplace_tos_accepted');
    if (accepted === 'true') setTosAccepted(true);

    const fetchProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('last_pixel_placed, is_verified')
        .eq('id', session.user.id)
        .single();

      if (data) {
        const verified = data.is_verified === true;
        setIsAdmin(verified);

        // If verified, bypass cooldown
        if (verified) {
          setCooldownTime(0);
        } else if (data.last_pixel_placed) {
          const lastPlaced = new Date(data.last_pixel_placed).getTime();
          const timePassed = Date.now() - lastPlaced;
          if (timePassed < COOLDOWN_MS) {
            setCooldownTime(Math.ceil((COOLDOWN_MS - timePassed) / 1000));
          }
        }
      }
    };
    fetchProfile();
  }, [session]);

  // 2. Cooldown Timer Countdown
  useEffect(() => {
    if (cooldownTime <= 0 || isAdmin) return; // Admins don't need the timer
    const timer = setInterval(() => {
      setCooldownTime((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownTime, isAdmin]);

  // 3. Render Canvas & Fetch Pixels
  useEffect(() => {
    if (!tosAccepted) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 2048, 1024);

    const loadPixels = async () => {
      const { data, error } = await supabase
        .from('connect_place')
        .select('x, y, color, user_id')
        .limit(100000);
      if (!error && data) {
        data.forEach((pixel) => {
          ctx.fillStyle = pixel.color;
          ctx.fillRect(pixel.x, pixel.y, 1, 1);
          pixelMapRef.current.set(`${pixel.x},${pixel.y}`, pixel.user_id);
        });
      }
    };
    loadPixels();

    const channel = supabase
      .channel('connectplace-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'connect_place' },
        (payload) => {
          const { x, y, color, user_id } = payload.new;
          ctx.fillStyle = color;
          ctx.fillRect(x, y, 1, 1);
          pixelMapRef.current.set(`${x},${y}`, user_id);
        },
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [tosAccepted]);

  // 4. Native Wheel Event for Smooth Touchpad Support
  // We use a native listener with { passive: false } to stop the browser from trying to navigate/bounce.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleNativeWheel = (e) => {
      e.preventDefault(); // Stop entire page from zooming or swiping back

      if (e.ctrlKey || e.metaKey) {
        // Pinch-to-zoom (trackpad) or Ctrl+Scroll (mouse)
        const zoomIntensity = e.deltaY > 0 ? 0.9 : 1.1;
        setScale((prevScale) =>
          Math.min(Math.max(0.5, prevScale * zoomIntensity), 40),
        );
      } else {
        // Two-finger swipe (trackpad) or standard scroll wheel (mouse pan)
        setPan((prevPan) => ({
          x: prevPan.x - e.deltaX,
          y: prevPan.y - e.deltaY,
        }));
      }
    };

    container.addEventListener('wheel', handleNativeWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleNativeWheel);
  }, []);

  // === INTERACTION LOGIC ===

  const getPixelCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width / 2048;
    const scaleY = rect.height / 1024;
    const x = Math.floor((e.clientX - rect.left) / scaleX);
    const y = Math.floor((e.clientY - rect.top) / scaleY);

    if (x < 0 || x >= 2048 || y < 0 || y >= 1024) return null;
    return { x, y };
  };

  const handlePointerDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    setClickStart({ x: e.clientX, y: e.clientY });
  };

  const handlePointerMove = async (e) => {
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
      setHoveredPixel(null);
      return;
    }

    const coords = getPixelCoords(e);
    if (!coords) {
      setHoveredPixel(null);
      return;
    }

    const { x, y } = coords;
    const userId = pixelMapRef.current.get(`${x},${y}`);

    if (!userId) {
      setHoveredPixel({ x, y, username: 'Empty Space' });
      return;
    }

    if (userCacheRef.current.has(userId)) {
      setHoveredPixel({ x, y, username: userCacheRef.current.get(userId) });
    } else {
      setHoveredPixel({ x, y, username: 'Loading...' });
      const { data } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', userId)
        .single();
      if (data) {
        userCacheRef.current.set(userId, data.username);
        setHoveredPixel((prev) =>
          prev?.x === x && prev?.y === y
            ? { x, y, username: data.username }
            : prev,
        );
      }
    }
  };

  const handlePointerUp = (e) => {
    setIsDragging(false);

    const moveDist = Math.hypot(
      e.clientX - clickStart.x,
      e.clientY - clickStart.y,
    );
    if (moveDist > 5) return; // Cancel click if it was a drag

    const coords = getPixelCoords(e);
    // Allow selection if admin OR cooldown is 0
    if (coords && (cooldownTime === 0 || isAdmin) && !isPlacing) {
      setPendingPixel(coords);
    }
  };

  // === PIXEL CONFIRMATION LOGIC ===
  const confirmPlacement = async () => {
    if (!pendingPixel || (!isAdmin && cooldownTime > 0) || isPlacing) return;
    setIsPlacing(true);

    const { x, y } = pendingPixel;

    try {
      const ctx = canvasRef.current.getContext('2d');
      ctx.fillStyle = selectedColor;
      ctx.fillRect(x, y, 1, 1);
      pixelMapRef.current.set(`${x},${y}`, session.user.id);

      const { error } = await supabase.from('connect_place').upsert({
        x,
        y,
        color: selectedColor,
        user_id: session.user.id,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;

      // Only trigger cooldown for non-admins
      if (!isAdmin) {
        await supabase
          .from('profiles')
          .update({ last_pixel_placed: new Date().toISOString() })
          .eq('id', session.user.id);
        setCooldownTime(COOLDOWN_MS / 1000);
      }

      setPendingPixel(null);
    } catch (err) {
      console.error('Failed to place pixel:', err);
      alert('Failed to place pixel.');
    } finally {
      setIsPlacing(false);
    }
  };

  const cancelPlacement = () => {
    setPendingPixel(null);
  };

  const handleAcceptTos = () => {
    localStorage.setItem('connectplace_tos_accepted', 'true');
    setTosAccepted(true);
  };

  return (
    <div className='flex flex-col h-screen w-full bg-slate-950 text-white overflow-hidden font-sans relative'>
      {/* HEADER */}
      <div className='h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md flex items-center justify-between px-6 z-40 shrink-0'>
        <div className='flex items-center gap-4'>
          <button
            onClick={() => navigate('/')}
            className='text-slate-400 hover:text-white transition flex items-center gap-2'
          >
            <i className='fa-solid fa-arrow-left'></i>
          </button>
          <h1 className='font-bold text-xl flex items-center gap-3'>
            ConnectPlace
            <span className='bg-blue-600 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded shadow-[0_0_10px_rgba(37,99,235,0.5)]'>
              Beta
            </span>
          </h1>
        </div>

        {/* TIMER */}
        <div
          className={`px-4 py-1.5 rounded-full font-bold text-sm border transition-colors ${isAdmin ? 'bg-blue-500/10 border-blue-500/50 text-blue-400' : cooldownTime > 0 ? 'bg-red-500/10 border-red-500/50 text-red-400' : 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'}`}
        >
          {isAdmin
            ? 'Unlimited (Admin)'
            : cooldownTime > 0
              ? `Wait ${cooldownTime}s`
              : 'Pixel Ready!'}
        </div>
      </div>

      {/* CANVAS CONTAINER */}
      <div
        ref={containerRef}
        className='flex-1 relative overflow-hidden bg-[#1a1a2e] cursor-crosshair touch-none outline-none'
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {tosAccepted && (
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
              transformOrigin: '0 0',
              transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            }}
            className='absolute top-0 left-0'
          >
            <canvas
              ref={canvasRef}
              width={2048}
              height={1024}
              style={{
                imageRendering: 'pixelated',
                boxShadow: '0 0 50px rgba(0,0,0,0.8)',
              }}
            />

            {/* HOVER / SELECTION OVERLAY */}
            {pendingPixel && (
              <div
                style={{
                  position: 'absolute',
                  left: `${pendingPixel.x}px`,
                  top: `${pendingPixel.y}px`,
                  width: '1px',
                  height: '1px',
                  border: '0.05px solid white',
                  boxShadow: '0 0 0 0.05px black',
                  backgroundColor: selectedColor,
                  pointerEvents: 'none',
                  zIndex: 10,
                }}
                className='animate-pulse'
              />
            )}
          </div>
        )}
      </div>

      {/* FLOATING HOVER TOOLTIP */}
      {hoveredPixel && !isDragging && !pendingPixel && (
        <div className='absolute top-20 right-6 bg-slate-900/90 backdrop-blur border border-slate-700 p-3 rounded-lg shadow-xl z-30 pointer-events-none transition-opacity'>
          <div className='text-xs text-slate-400 mb-1'>
            ({hoveredPixel.x}, {hoveredPixel.y})
          </div>
          <div className='font-bold text-sm text-white flex items-center gap-2'>
            <i className='fa-solid fa-user text-blue-400'></i>{' '}
            {hoveredPixel.username}
          </div>
        </div>
      )}

      {/* BOTTOM ACTION AREA */}
      <div className='absolute bottom-0 left-0 w-full z-40 flex flex-col items-center pointer-events-none'>
        {/* CONFIRMATION DIALOG */}
        {pendingPixel && (
          <div className='bg-slate-900 border border-slate-700 p-4 rounded-xl shadow-2xl mb-4 pointer-events-auto flex flex-col items-center animate-fade-in-up'>
            <p className='text-sm font-bold text-slate-300 mb-3'>
              Place pixel at ({pendingPixel.x}, {pendingPixel.y})?
            </p>
            <div className='flex gap-3 w-full'>
              <button
                onClick={cancelPlacement}
                className='flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 px-4 rounded-lg font-bold text-sm transition'
              >
                Cancel
              </button>
              <button
                onClick={confirmPlacement}
                disabled={isPlacing || (!isAdmin && cooldownTime > 0)}
                className='flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-2 px-4 rounded-lg font-bold text-sm transition shadow-lg shadow-blue-500/20'
              >
                {isPlacing ? 'Placing...' : 'Confirm'}
              </button>
            </div>
          </div>
        )}

        {/* PALETTE FOOTER */}
        <div className='w-full bg-slate-900/95 backdrop-blur-md border-t border-slate-800 p-4 flex flex-wrap justify-center gap-2 pointer-events-auto shrink-0 max-h-40 overflow-y-auto custom-scrollbar'>
          {COLORS.map((color) => (
            <button
              key={color}
              onClick={() => setSelectedColor(color)}
              className={`w-8 h-8 rounded-full border-2 transition-all ${selectedColor === color ? 'border-white scale-125 shadow-[0_0_15px_rgba(255,255,255,0.4)] z-10' : 'border-slate-800 hover:scale-110'}`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      </div>

      {/* TOS MODAL */}
      {!tosAccepted && (
        <div className='absolute inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4 pointer-events-auto'>
          <div className='w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-8 relative overflow-hidden'>
            <div className='absolute -top-32 -left-32 w-64 h-64 bg-blue-600/10 rounded-full blur-[80px]'></div>
            <div className='absolute -bottom-32 -right-32 w-64 h-64 bg-purple-600/10 rounded-full blur-[80px]'></div>

            <div className='relative z-10'>
              <div className='text-center mb-6'>
                <div className='w-16 h-16 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4'>
                  <i className='fa-solid fa-gavel text-2xl text-blue-400'></i>
                </div>
                <h2 className='text-2xl font-bold text-white mb-2'>
                  ConnectPlace <span className='text-blue-500'>BETA</span>
                </h2>
                <p className='text-slate-400 text-sm'>
                  Please read the rules before placing pixels.
                </p>
              </div>

              <div className='bg-slate-950/50 border border-slate-800 rounded-lg p-5 mb-6 text-sm text-slate-300 space-y-4 max-h-60 overflow-y-auto custom-scrollbar'>
                <p>
                  Welcome to ConnectPlace! This is a collaborative canvas
                  measuring 2048x1024 pixels. Every user has the power to place{' '}
                  <strong>1 pixel every minute</strong>.
                </p>
                <p>
                  <strong>1. School Guidelines Apply:</strong> Do not draw
                  anything hateful, explicitly inappropriate, or harassing. This
                  canvas is moderated.
                </p>
                <p>
                  <strong>2. Resets:</strong> The canvas will be wiped clean
                  automatically at the end of every semester.
                </p>
                <p>
                  <strong>3. Communities:</strong> Team up with other users to
                  create art, flags, or logos. Defend your creations!
                </p>
                <p className='text-xs text-slate-500 mt-4 italic'>
                  * Admins reserve the right to ban users from ConnectPlace for
                  violating these terms.
                </p>
              </div>

              <div className='flex gap-4'>
                <button
                  onClick={() => navigate('/')}
                  className='flex-1 py-3 px-4 rounded-lg font-bold text-slate-400 bg-slate-800 hover:bg-slate-700 hover:text-white transition-colors'
                >
                  Decline
                </button>
                <button
                  onClick={handleAcceptTos}
                  className='flex-1 py-3 px-4 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.2)] transition-all flex items-center justify-center gap-2'
                >
                  I Accept <i className='fa-solid fa-arrow-right'></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
