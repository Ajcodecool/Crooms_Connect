import React, { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';
import { supabase } from '../supabaseClient';

type AlbumType = 'igor' | 'wolf';

interface AlbumData {
  id: string;
  album_type: AlbumType;
}

// Fixed Payload to use Percentages (Pct) instead of raw pixels
interface DragPayload {
  id: string;
  xPct: number;
  yPct: number;
  vxPct: number;
  vyPct: number;
}

export default function ZeroGravityIgor(): React.ReactElement {
  const sceneRef = useRef<HTMLDivElement>(null);

  // FIX 1: Explicitly enable sleeping to manage CPU, which allows us to manually wake bodies up later
  const engineRef = useRef(Matter.Engine.create({ enableSleeping: true }));
  const bodiesMap = useRef(new Map<string, Matter.Body>());

  // Track which bodies THIS specific user is currently controlling
  const localOwnedBodies = useRef<Set<string>>(new Set());

  // Audio references
  const igorAudioRef = useRef<HTMLAudioElement>(null);
  const wolfAudioRef = useRef<HTMLAudioElement>(null);

  // References to walls so we can dynamically resize them
  const wallsRef = useRef<{
    ground: Matter.Body;
    ceiling: Matter.Body;
    leftWall: Matter.Body;
    rightWall: Matter.Body;
  } | null>(null);

  // React State
  const [albums, setAlbums] = useState<AlbumData[]>([]);
  const [bgColor, setBgColor] = useState<string>('#f4d2d8');
  const [isVerified, setIsVerified] = useState<boolean>(false);

  const ALBUM_SIZE = 180;
  const WALL_THICKNESS = 200;

  // --- 1. Fetch User Profile Verification Status ---
  useEffect(() => {
    const fetchUserVerification = async (): Promise<void> => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (user && !userError) {
        // Check the profiles table for the is_verified flag
        const { data, error } = await supabase
          .from('profiles')
          .select('is_verified')
          .eq('id', user.id)
          .single();

        if (data && !error && data.is_verified === true) {
          setIsVerified(true);
        }
      }
    };

    fetchUserVerification();
  }, []);

  // --- 2. Main Physics & Network Setup ---
  useEffect(() => {
    if (!sceneRef.current) return;

    const engine = engineRef.current;
    const world = engine.world;

    engine.gravity.x = 0;
    engine.gravity.y = 0;

    const fetchInitialAlbums = async (): Promise<void> => {
      const { data, error } = await supabase.from('albums').select('*');
      if (data && !error) setAlbums(data as AlbumData[]);
    };
    fetchInitialAlbums();

    const roomChannel = supabase.channel('album-physics-room', {
      config: { broadcast: { self: false } },
    });

    roomChannel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'albums' },
      (payload: unknown): void => {
        const p = payload as {
          eventType: string;
          new: AlbumData;
          old: { id: string };
        };
        if (p.eventType === 'INSERT') {
          // FIX 2: Harden state against race conditions. Prevent duplicate IDs.
          setAlbums((prev) => {
            if (prev.some((a) => a.id === p.new.id)) return prev;
            return [...prev, p.new];
          });
        } else if (p.eventType === 'DELETE') {
          setAlbums((prev) => prev.filter((a) => a.id !== p.old.id));
        }
      },
    );

    // Receive Synced Drag Data
    roomChannel.on(
      'broadcast',
      { event: 'sync_drag' },
      (eventData: unknown): void => {
        const { payload } = eventData as { payload: DragPayload };
        const body = bodiesMap.current.get(payload.id);

        if (body) {
          // If someone else is moving it, we release our ownership so we don't fight them
          localOwnedBodies.current.delete(payload.id);

          // FIX 1: Wake the body up when receiving a network movement
          Matter.Sleeping.set(body, false);

          // Convert percentage back to exact pixels based on THIS device's screen size
          Matter.Body.setPosition(body, {
            x: payload.xPct * window.innerWidth,
            y: payload.yPct * window.innerHeight,
          });
          Matter.Body.setVelocity(body, {
            x: payload.vxPct * window.innerWidth,
            y: payload.vyPct * window.innerHeight,
          });
        }
      },
    );

    roomChannel.subscribe();

    const width = window.innerWidth;
    const height = window.innerHeight;

    const wallOptions = {
      isStatic: true,
      restitution: 1,
      render: { visible: false },
    };

    const ground = Matter.Bodies.rectangle(
      width / 2,
      height + WALL_THICKNESS / 2,
      width * 2,
      WALL_THICKNESS,
      wallOptions,
    );
    const ceiling = Matter.Bodies.rectangle(
      width / 2,
      -WALL_THICKNESS / 2,
      width * 2,
      WALL_THICKNESS,
      wallOptions,
    );
    const leftWall = Matter.Bodies.rectangle(
      -WALL_THICKNESS / 2,
      height / 2,
      WALL_THICKNESS,
      height * 2,
      wallOptions,
    );
    const rightWall = Matter.Bodies.rectangle(
      width + WALL_THICKNESS / 2,
      height / 2,
      WALL_THICKNESS,
      height * 2,
      wallOptions,
    );

    wallsRef.current = { ground, ceiling, leftWall, rightWall };
    Matter.World.add(world, [ground, ceiling, leftWall, rightWall]);

    const mouse = Matter.Mouse.create(sceneRef.current);
    const mouseConstraint = Matter.MouseConstraint.create(engine, {
      mouse: mouse,
      constraint: {
        stiffness: 0.1,
        render: { visible: false },
      },
    });
    Matter.World.add(world, mouseConstraint);

    const handleInteraction = (type: string): void => {
      if (type === 'igor') {
        setBgColor('#f4d2d8');
        if (wolfAudioRef.current) wolfAudioRef.current.pause();
        if (igorAudioRef.current) igorAudioRef.current.play().catch(() => {});
      } else if (type === 'wolf') {
        setBgColor('#aed9e0');
        if (igorAudioRef.current) igorAudioRef.current.pause();
        if (wolfAudioRef.current) wolfAudioRef.current.play().catch(() => {});
      }
    };

    // Grab Object - Take Network Ownership
    Matter.Events.on(
      mouseConstraint,
      'startdrag',
      (event: Matter.IEvent<Matter.MouseConstraint>): void => {
        const dragEvent = event as Matter.IEvent<Matter.MouseConstraint> & {
          body?: Matter.Body;
        };
        const body = dragEvent.body;

        if (body?.plugin?.id) {
          // We now own this body and will dictate its position to everyone else
          localOwnedBodies.current.add(body.plugin.id as string);

          // FIX 1: Wake the body up when the local user grabs it
          Matter.Sleeping.set(body, false);

          handleInteraction(body.plugin.type as string);
        }
      },
    );

    // Handle Squish on Collision
    const handleCollision = (
      event: Matter.IEventCollision<Matter.Engine>,
    ): void => {
      event.pairs.forEach((pair) => {
        [pair.bodyA, pair.bodyB].forEach((body) => {
          if (body.plugin && body.plugin.id) {
            const speed = body.speed;
            if (speed > 2) {
              const squishFactor = Math.min(speed * 0.05, 0.5);
              body.plugin.scaleX = 1 + squishFactor;
              body.plugin.scaleY = 1 - squishFactor;
              body.plugin.scaleVelX = 0;
              body.plugin.scaleVelY = 0;
            }
          }
        });
      });
    };
    Matter.Events.on(engine, 'collisionStart', handleCollision);

    let lastSyncTime = 0;

    // FIX 3: Lowered to 15 frames per second to prevent network choking
    const SYNC_RATE = 1000 / 15;

    const updateFrame = (): void => {
      const now = performance.now();
      const shouldSync = now - lastSyncTime > SYNC_RATE;

      bodiesMap.current.forEach((body, id) => {
        // Broadcast via Supabase IF we are the owner of this body
        if (localOwnedBodies.current.has(id) && shouldSync) {
          roomChannel
            .send({
              type: 'broadcast',
              event: 'sync_drag',
              payload: {
                id,
                xPct: body.position.x / window.innerWidth, // Percentage format
                yPct: body.position.y / window.innerHeight,
                vxPct: body.velocity.x / window.innerWidth,
                vyPct: body.velocity.y / window.innerHeight,
              },
            })
            .catch(() => {}); // Catch silent network failures

          // If the body has slowed down to a halt, release our network ownership
          if (body.speed < 0.2 && !mouseConstraint.body) {
            localOwnedBodies.current.delete(id);
          }
        }

        const boundaryPadding = 300;
        if (
          body.position.x < -boundaryPadding ||
          body.position.x > window.innerWidth + boundaryPadding ||
          body.position.y < -boundaryPadding ||
          body.position.y > window.innerHeight + boundaryPadding
        ) {
          Matter.Body.setPosition(body, {
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
          });
          Matter.Body.setVelocity(body, { x: 0, y: 0 });
        }

        if (body.plugin) {
          const stiffness = 0.15;
          const damping = 0.75;
          const forceX = (1 - (body.plugin.scaleX as number)) * stiffness;
          const forceY = (1 - (body.plugin.scaleY as number)) * stiffness;

          body.plugin.scaleVelX =
            ((body.plugin.scaleVelX as number) + forceX) * damping;
          body.plugin.scaleVelY =
            ((body.plugin.scaleVelY as number) + forceY) * damping;
          body.plugin.scaleX =
            (body.plugin.scaleX as number) + (body.plugin.scaleVelX as number);
          body.plugin.scaleY =
            (body.plugin.scaleY as number) + (body.plugin.scaleVelY as number);

          const el = document.getElementById(`album-${id}`);
          if (el) {
            el.style.transform = `translate(${body.position.x - ALBUM_SIZE / 2}px, ${
              body.position.y - ALBUM_SIZE / 2
            }px) rotate(${body.angle}rad) scale(${body.plugin.scaleX}, ${body.plugin.scaleY})`;
          }
        }
      });

      if (shouldSync) lastSyncTime = now;
    };
    Matter.Events.on(engine, 'afterUpdate', updateFrame);

    const handleResize = (): void => {
      const newW = window.innerWidth;
      const newH = window.innerHeight;
      if (wallsRef.current) {
        Matter.Body.setPosition(wallsRef.current.rightWall, {
          x: newW + WALL_THICKNESS / 2,
          y: newH / 2,
        });
        Matter.Body.setPosition(wallsRef.current.ground, {
          x: newW / 2,
          y: newH + WALL_THICKNESS / 2,
        });
        Matter.Body.setPosition(wallsRef.current.ceiling, {
          x: newW / 2,
          y: -WALL_THICKNESS / 2,
        });
        Matter.Body.setPosition(wallsRef.current.leftWall, {
          x: -WALL_THICKNESS / 2,
          y: newH / 2,
        });
      }
    };
    window.addEventListener('resize', handleResize);

    const runner = Matter.Runner.create();
    Matter.Runner.run(runner, engine);

    return (): void => {
      roomChannel.unsubscribe();
      Matter.Runner.stop(runner);
      Matter.Engine.clear(engine);
      Matter.World.clear(world, false);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // --- 3. Sync React Albums with Matter.js Bodies ---
  useEffect(() => {
    const engine = engineRef.current;

    albums.forEach((album, index) => {
      if (!bodiesMap.current.has(album.id)) {
        // Spawn them slightly offset based on array index so they don't stack perfectly,
        // but it remains strictly deterministic for all clients.
        const spawnOffset = (index * 20) % 100;

        const body = Matter.Bodies.rectangle(
          window.innerWidth / 2 + spawnOffset,
          window.innerHeight / 2 + spawnOffset,
          ALBUM_SIZE,
          ALBUM_SIZE,
          {
            restitution: 0.9,
            frictionAir: 0.002,
            friction: 0.01,
            density: 0.05,
            chamfer: { radius: 12 },
            plugin: {
              id: album.id,
              type: album.album_type,
              scaleX: 1,
              scaleY: 1,
              scaleVelX: 0,
              scaleVelY: 0,
            },
          },
        );

        // Explicitly set velocity to 0 to prevent initial desync
        Matter.Body.setVelocity(body, { x: 0, y: 0 });

        bodiesMap.current.set(album.id, body);
        Matter.World.add(engine.world, body);
      }
    });

    const currentIds = new Set(albums.map((a) => a.id));
    bodiesMap.current.forEach((body, id) => {
      if (!currentIds.has(id)) {
        Matter.World.remove(engine.world, body);
        bodiesMap.current.delete(id);
      }
    });
  }, [albums]);

  // --- 4. UI Controls ---
  const handleAddIgor = async (): Promise<void> => {
    await supabase.from('albums').insert([{ album_type: 'igor' }]);
  };

  const handleAddWolf = async (): Promise<void> => {
    await supabase.from('albums').insert([{ album_type: 'wolf' }]);
  };

  const handleDeleteLast = async (): Promise<void> => {
    if (albums.length === 0) return;
    const oldestAlbum = albums.reduce((oldest, current) =>
      oldest.id < current.id ? oldest : current,
    );
    await supabase.from('albums').delete().eq('id', oldestAlbum.id);
  };

  const handleClearAll = async (): Promise<void> => {
    if (!isVerified || albums.length === 0) return;

    // Safely delete all albums currently tracked in state by targeting their IDs
    const albumIds = albums.map((album) => album.id);
    await supabase.from('albums').delete().in('id', albumIds);
  };

  return (
    <div
      className='w-screen h-screen overflow-hidden relative transition-colors duration-500 ease-in-out touch-none'
      style={{ backgroundColor: bgColor }}
    >
      <audio
        ref={igorAudioRef}
        src='https://api.croomsconnect.com/storage/v1/object/public/chat-uploads/0f4f49db-4665-4408-83f1-703d163506cf/1775326266242-gz6nugiolx9.mp3'
        loop
      />
      <audio
        ref={wolfAudioRef}
        src='https://api.croomsconnect.com/storage/v1/object/public/chat-uploads/0f4f49db-4665-4408-83f1-703d163506cf/1775326410942-2sae8864r6e.mp3'
        loop
      />

      <div
        ref={sceneRef}
        className='absolute inset-0 z-0 cursor-grab active:cursor-grabbing touch-none'
      >
        {albums.map((album) => (
          <img
            key={album.id}
            id={`album-${album.id}`}
            className='absolute top-0 left-0 w-[180px] h-[180px] object-cover rounded-2xl shadow-xl pointer-events-none will-change-transform'
            src={
              album.album_type === 'igor'
                ? 'https://upload.wikimedia.org/wikipedia/en/thumb/5/51/Igor_-_Tyler%2C_the_Creator.jpg/250px-Igor_-_Tyler%2C_the_Creator.jpg'
                : 'https://upload.wikimedia.org/wikipedia/en/thumb/f/fd/Wolf_Cover2.jpg/250px-Wolf_Cover2.jpg'
            }
            alt={`${album.album_type} Album Cover`}
            draggable={false}
          />
        ))}
      </div>

      <div className='absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-wrap justify-center items-center gap-2 w-[90%] max-w-md bg-white/90 backdrop-blur px-4 py-3 rounded-3xl shadow-2xl z-50 text-sm sm:text-base'>
        <button
          onClick={handleAddIgor}
          className='px-3 py-2 bg-pink-300 text-slate-900 font-bold rounded-full hover:bg-pink-400 hover:scale-105 active:scale-95 transition-all flex-1 whitespace-nowrap'
        >
          + Igor
        </button>
        <button
          onClick={handleAddWolf}
          className='px-3 py-2 bg-blue-300 text-slate-900 font-bold rounded-full hover:bg-blue-400 hover:scale-105 active:scale-95 transition-all flex-1 whitespace-nowrap'
        >
          + Wolf
        </button>

        <div className='hidden sm:block w-px h-8 bg-slate-300 mx-1'></div>

        <button
          onClick={handleDeleteLast}
          disabled={albums.length === 0}
          className='px-3 py-2 bg-slate-200 text-slate-700 font-bold rounded-full hover:bg-red-400 hover:text-white disabled:opacity-50 disabled:hover:scale-100 disabled:hover:bg-slate-200 disabled:hover:text-slate-700 hover:scale-105 active:scale-95 transition-all flex-1 whitespace-nowrap'
        >
          Delete
        </button>

        {/* Conditionally Rendered Clear Button for Verified Users */}
        {isVerified && (
          <button
            onClick={handleClearAll}
            disabled={albums.length === 0}
            className='px-3 py-2 bg-slate-800 text-white font-bold rounded-full hover:bg-red-600 disabled:opacity-50 disabled:hover:scale-100 disabled:hover:bg-slate-800 hover:scale-105 active:scale-95 transition-all flex-1 whitespace-nowrap'
          >
            Clear All
          </button>
        )}
      </div>

      <div className='absolute top-8 w-full text-center font-sans font-bold text-slate-800/50 pointer-events-none select-none z-0 px-4'>
        Multiplayer Mode! You are syncing with everyone else in the room.
      </div>
    </div>
  );
}
