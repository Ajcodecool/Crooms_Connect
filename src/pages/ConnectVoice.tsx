import { useNavigate } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { useEffect, useRef, useState, type FC } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';

// --- CUSTOM HOOKS ---
import { useVoiceRooms } from '../connect-voice/hooks/useVoiceRooms';
import { useAudioVisualizer } from '../connect-voice/hooks/useAudioVisualizer';
import { useWebRTC } from '../connect-voice/hooks/useWebRTC';
import { usePeerProfiles } from '../connect-voice/hooks/usePeerProfiles';

// --- COMPONENTS ---
import { RoomSelector } from '../connect-voice/components/RoomSelector';
import { UserGrid } from '../connect-voice/components/UserGrid';
import { Controls } from '../connect-voice/components/Controls';

// 🐞 ISOLATED AUDIO COMPONENT (WITH DEBUGGING & OUTPUT RORUTING)
const RemoteAudio: FC<{
  stream: MediaStream;
  peerId: string;
  outputDeviceId: string;
}> = ({ stream, peerId, outputDeviceId }) => {
  const audioRef = useRef<HTMLAudioElement>(null);

  // 1. Attach the incoming stream to the audio element
  useEffect((): void => {
    if (audioRef.current && stream) {
      console.log(
        `[Audio Debug] 🎧 Attaching stream to <audio> for ${peerId}. Audio tracks active:`,
        stream.getAudioTracks().length,
      );
      audioRef.current.srcObject = stream;

      audioRef.current.play().catch((err: unknown) => {
        console.error(
          `[Audio Debug] ⚠️ Autoplay blocked for ${peerId} (You might need to click Play):`,
          err,
        );
      });
    }
  }, [stream, peerId]);

  // 2. Route the audio to the selected output device
  useEffect((): void => {
    // FIX: Define an intersection type for the experimental setSinkId method
    const audioEl = audioRef.current as HTMLAudioElement & {
      setSinkId?: (deviceId: string) => Promise<void>;
    };

    if (audioEl && outputDeviceId) {
      // Check if the browser supports setSinkId (Standard in Chrome/Edge, limited in Firefox/Safari)
      if (typeof audioEl.setSinkId === 'function') {
        // FIX: Use unknown instead of any for the error object
        audioEl.setSinkId(outputDeviceId).catch((err: unknown) => {
          console.error(
            `[Audio Debug] ❌ Failed to set sink ID for ${peerId}:`,
            err,
          );
        });
      } else {
        console.warn(
          '[Audio Debug] ⚠️ setSinkId is not supported in this browser.',
        );
      }
    }
  }, [outputDeviceId, peerId]);

  return (
    <div className='bg-black/90 p-3 border border-red-500 rounded-lg shadow-xl m-2 inline-block'>
      <p className='text-red-400 text-xs font-mono mb-2'>
        DEBUG: Audio for {peerId.slice(0, 5)}
      </p>
      <audio ref={audioRef} autoPlay controls className='h-8 w-48' />
    </div>
  );
};

interface ConnectVoiceProps {
  session: Session | null;
}

const ConnectVoice: FC<ConnectVoiceProps> = ({ session }) => {
  const navigate = useNavigate();
  const { themeClass, themeStyle } = useTheme();
  const user = session?.user;

  // --- ACCESS CONTROL STATE ---
  const [isScheduleOpen, setIsScheduleOpen] = useState<boolean>(false);
  const [isGloballyUnlocked, setIsGloballyUnlocked] = useState<boolean>(false);
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState<boolean>(true);

  // --- AUDIO OUTPUT STATE ---
  const [audioOutputDevices, setAudioOutputDevices] = useState<
    MediaDeviceInfo[]
  >([]);
  const [selectedOutputDevice, setSelectedOutputDevice] =
    useState<string>('default');

  // Rooms
  const { rooms, activeRoom, setActiveRoom } = useVoiceRooms();

  // Audio visualizer
  const { speakingPeers, trackSpeaking, stopTracking } = useAudioVisualizer();

  // WebRTC
  const {
    isConnected,
    isMuted,
    isVideoEnabled,
    peersInRoom,
    remoteStreams,
    remoteVideoStreams,
    localVideoStream,
    errorMsg,
    joinRoom,
    cleanupWebRTC,
    toggleMute,
    toggleVideo,
  } = useWebRTC(user, activeRoom, trackSpeaking, stopTracking);

  // Profiles
  const profiles = usePeerProfiles(peersInRoom);

  // --- FETCH AUDIO OUTPUT DEVICES ---
  useEffect((): (() => void) => {
    // FIX: Add missing : Promise<void> return type
    const fetchDevices = async (): Promise<void> => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const outputs = devices.filter((d) => d.kind === 'audiooutput');
        setAudioOutputDevices(outputs);
      } catch (err: unknown) {
        console.error('[Audio Devices] ❌ Failed to enumerate devices', err);
      }
    };

    void fetchDevices();

    // Listen for devices being plugged in or removed
    navigator.mediaDevices.addEventListener('devicechange', fetchDevices);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', fetchDevices);
    };
  }, []);

  // --- ACCESS CHECK LOGIC ---
  useEffect((): (() => void) => {
    const checkSchedule = (): boolean => {
      const now = new Date();
      const day = now.getDay();
      const hours = now.getHours();
      const minutes = now.getMinutes();

      if (day === 0 || day === 6) return true;

      const currentMins = hours * 60 + minutes;
      const openMins = day === 3 ? 13 * 60 + 20 : 14 * 60 + 20;

      return currentMins >= openMins;
    };

    const initAccess = async (): Promise<void> => {
      setIsScheduleOpen(checkSchedule());

      if (user?.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_verified')
          .eq('id', user.id)
          .single();
        if (profile) setIsVerified(profile?.is_verified);
      }

      const { data: settings } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'voice_unlocked')
        .single();

      if (settings) setIsGloballyUnlocked(settings.value === 'true');

      setIsCheckingAccess(false);
    };

    void initAccess();

    const interval = setInterval((): void => {
      setIsScheduleOpen(checkSchedule());
    }, 60000);

    const channel = supabase
      .channel('voice-access')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'system_settings',
          filter: 'key=eq.voice_unlocked',
        },
        (payload) => {
          const newData = payload.new as { value?: string };
          if (newData && typeof newData.value === 'string') {
            setIsGloballyUnlocked(newData.value === 'true');
          }
        },
      )
      .subscribe();

    return (): void => {
      clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, [user]);

  const handleGlobalOverride = async (unlock: boolean): Promise<void> => {
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({ key: 'voice_unlocked', value: unlock ? 'true' : 'false' });

      if (error) throw error;
    } catch (err: unknown) {
      console.error('Failed to change global lock state:', err);
      alert('Failed to update global state.');
    }
  };

  const hasAccess = isScheduleOpen || isGloballyUnlocked;

  if (isCheckingAccess) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${themeClass}`}
        style={themeStyle as React.CSSProperties}
      >
        <div className='text-white/60 flex flex-col items-center gap-3'>
          <i className='fa-solid fa-circle-notch fa-spin text-2xl'></i>
          <p>Checking schedule...</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div
        className={`min-h-screen font-sans ${themeClass} bg-white/5 relative flex flex-col items-center justify-center px-4`}
        style={themeStyle as React.CSSProperties}
      >
        <div className='max-w-md w-full dashboard-card rounded-2xl p-8 text-center shadow-2xl border border-white/10 bg-black/40 backdrop-blur-md'>
          <div className='w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20'>
            <i className='fa-solid fa-microphone-slash text-3xl text-red-400'></i>
          </div>
          <h1 className='text-2xl font-bold text-white mb-2'>
            Voice is Closed
          </h1>
          <p className='text-slate-400 mb-6'>
            ConnectVoice is outside of operational hours. It is open{' '}
            <strong className='text-white'>all weekend</strong>, and reopens at{' '}
            <strong className='text-white'>2:20 PM</strong> on weekdays (or{' '}
            <strong className='text-white'>1:20 PM</strong> on Wednesdays).
          </p>

          <button
            onClick={() => navigate('/')}
            className='w-full py-3 px-4 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all font-semibold'
          >
            Return to Chat
          </button>

          {isVerified && (
            <div className='mt-8 pt-6 border-t border-white/10'>
              <p className='text-xs text-blue-400/80 mb-3 uppercase tracking-wider font-bold'>
                Verified Access
              </p>
              <button
                onClick={() => void handleGlobalOverride(true)}
                className='w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all shadow-lg font-bold flex items-center justify-center gap-2'
              >
                <i className='fa-solid fa-unlock'></i> Override & Open Globally
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen font-sans ${themeClass} bg-white/5 relative`}
      style={themeStyle as React.CSSProperties}
    >
      <div className='absolute top-20 left-4 z-50 flex flex-col pointer-events-auto'>
        {Object.entries(remoteStreams).map(([peerId, stream]) => (
          <RemoteAudio
            key={peerId}
            peerId={peerId}
            stream={stream}
            outputDeviceId={selectedOutputDevice}
          />
        ))}
      </div>

      <nav className='dashboard-nav shadow-lg sticky top-0 z-40 border-b border-white/20 bg-white/5 backdrop-blur-md'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex items-center justify-between h-16'>
            <div className='flex items-center gap-3'>
              <button
                onClick={() => navigate('/')}
                className='text-slate-300 hover:text-white mr-2 transition'
              >
                <i className='fa-solid fa-arrow-left text-xl'></i>
              </button>
              <img
                src='/CC.png'
                alt='Logo'
                className='w-9 h-9 object-contain'
              />
              <span className='font-bold text-lg tracking-wide hidden sm:block flex items-center gap-2'>
                ConnectVoice
                <span className='text-[9px] bg-blue-500/20 text-blue-400 border border-blue-500/50 px-1.5 py-0.5 rounded uppercase tracking-wider'>
                  Beta
                </span>
              </span>
            </div>

            {isVerified && isGloballyUnlocked && (
              <button
                onClick={() => void handleGlobalOverride(false)}
                className='bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-red-500/30 transition'
              >
                <i className='fa-solid fa-lock mr-2'></i>
                Close Globally
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className='max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center min-h-[80vh]'>
        <div className='w-full dashboard-card rounded-xl p-6 md:p-10 shadow-lg border border-white/20 bg-white/5 backdrop-blur-md relative'>
          <div className='text-center mb-8'>
            <h1 className='text-3xl font-bold flex flex-wrap items-center justify-center gap-3'>
              <i className='fa-solid fa-microphone-lines text-blue-400'></i>
              ConnectVoice
              <span className='text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/50 px-2 py-0.5 rounded-full uppercase tracking-widest align-middle'>
                Beta
              </span>
            </h1>

            <p className='text-sm opacity-60 mt-3 font-medium'>
              This feature is currently in Beta. You may experience connection
              drops or audio glitches.
            </p>

            {errorMsg && (
              <p className='text-red-400 text-sm mt-3'>{errorMsg}</p>
            )}
          </div>

          {!isConnected ? (
            <RoomSelector
              rooms={rooms}
              activeRoom={activeRoom}
              setActiveRoom={setActiveRoom}
              onJoin={joinRoom}
              errorMsg={errorMsg}
            />
          ) : (
            <div className='animate-in fade-in slide-in-from-bottom-4'>
              <div className='flex justify-between items-center mb-6 border-b border-white/10 pb-4'>
                <div className='flex items-center gap-2'>
                  <div
                    className='w-3 h-3 rounded-full animate-pulse'
                    style={{
                      backgroundColor: activeRoom?.theme_color,
                    }}
                  />

                  <span
                    className='font-bold opacity-80 uppercase tracking-wider text-sm'
                    style={{ color: activeRoom?.theme_color }}
                  >
                    {activeRoom?.name}
                  </span>
                </div>

                <div className='flex items-center gap-4 text-sm opacity-80'>
                  {/* AUDIO OUTPUT SELECTOR */}
                  {audioOutputDevices.length > 0 && (
                    <div className='flex items-center gap-2 bg-black/20 px-2 py-1 rounded-lg border border-white/10'>
                      <i className='fa-solid fa-volume-high text-xs'></i>
                      <select
                        value={selectedOutputDevice}
                        onChange={(e) =>
                          setSelectedOutputDevice(e.target.value)
                        }
                        className='bg-transparent text-white text-xs outline-none cursor-pointer max-w-[140px] truncate'
                      >
                        {audioOutputDevices.map((device) => (
                          <option
                            key={device.deviceId}
                            value={device.deviceId}
                            className='bg-slate-800 text-white'
                          >
                            {/* Browsers hide labels until mic/camera is approved, so we fallback to a generic name */}
                            {device.label ||
                              `Speaker (${device.deviceId.slice(0, 4)}...)`}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <i className='fa-solid fa-users mr-1'></i>
                    {peersInRoom.length} Online
                  </div>
                </div>
              </div>

              {/* USER GRID */}
              <UserGrid
                peersInRoom={peersInRoom}
                speakingPeers={speakingPeers}
                currentUser={user}
                isMuted={isMuted}
                profiles={profiles}
                remoteStreams={remoteStreams}
                isVideoEnabled={isVideoEnabled}
                remoteVideoStreams={remoteVideoStreams}
                localVideoStream={localVideoStream}
              />

              {/* CONTROLS */}
              <Controls
                isMuted={isMuted}
                toggleMute={toggleMute}
                onDisconnect={cleanupWebRTC}
                isVideoEnabled={isVideoEnabled}
                toggleVideo={toggleVideo}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ConnectVoice;
