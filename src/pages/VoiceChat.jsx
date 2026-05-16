import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useTheme } from '../hooks/useTheme';

const VoiceChat = ({ session }) => {
  const navigate = useNavigate();
  const { themeClass, themeStyle } = useTheme();
  const user = session?.user;

  // UI State
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [peersInRoom, setPeersInRoom] = useState([]);
  const [speakingPeers, setSpeakingPeers] = useState(new Set());
  const [errorMsg, setErrorMsg] = useState('');

  // WebRTC & Audio Refs
  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const channelRef = useRef(null);
  const audioContextsRef = useRef({}); // Tracks visualizers to prevent memory leaks
  const [remoteStreams, setRemoteStreams] = useState({});

  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  // Fetch rooms from SQL backend on mount
  useEffect(() => {
    const fetchRooms = async () => {
      const { data, error } = await supabase
        .from('voice_rooms')
        .select('*')
        .eq('is_active', true);
      if (!error && data) {
        setRooms(data);
        if (data.length > 0) setActiveRoom(data[0]);
      }
    };
    fetchRooms();
  }, []);

  // --- AUDIO VISUALIZER LOGIC ---
  const trackSpeaking = (stream, peerId) => {
    try {
      const audioContext = new (
        window.AudioContext || window.webkitAudioContext
      )();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.4;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const checkAudioLevel = () => {
        if (!audioContextsRef.current[peerId]) return; // Stop if disconnected

        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const average = sum / dataArray.length;

        setSpeakingPeers((prev) => {
          const next = new Set(prev);
          // Threshold of 15 filters out background static. Adjust if needed.
          if (average > 15) next.add(peerId);
          else next.delete(peerId);
          return next;
        });

        requestAnimationFrame(checkAudioLevel);
      };

      audioContextsRef.current[peerId] = audioContext;
      checkAudioLevel();
    } catch (err) {
      console.warn('AudioContext error:', err);
    }
  };

  const cleanupPeer = (peerId) => {
    if (peerConnectionsRef.current[peerId]) {
      peerConnectionsRef.current[peerId].close();
      delete peerConnectionsRef.current[peerId];
    }
    if (audioContextsRef.current[peerId]) {
      audioContextsRef.current[peerId].close();
      delete audioContextsRef.current[peerId];
    }
    setRemoteStreams((prev) => {
      const newState = { ...prev };
      delete newState[peerId];
      return newState;
    });
    setSpeakingPeers((prev) => {
      const next = new Set(prev);
      next.delete(peerId);
      return next;
    });
  };

  const cleanupWebRTC = useCallback(() => {
    if (localStreamRef.current)
      localStreamRef.current.getTracks().forEach((t) => t.stop());
    Object.keys(peerConnectionsRef.current).forEach(cleanupPeer);
    if (audioContextsRef.current[user?.id]) {
      audioContextsRef.current[user?.id].close();
      delete audioContextsRef.current[user?.id];
    }
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    setIsConnected(false);
    setPeersInRoom([]);
  }, [user]);

  useEffect(() => {
    return () => cleanupWebRTC();
  }, [cleanupWebRTC]);

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const createPeerConnection = (targetUserId, channel) => {
    const pc = new RTCPeerConnection(iceServers);

    if (localStreamRef.current) {
      localStreamRef.current
        .getTracks()
        .forEach((track) => pc.addTrack(track, localStreamRef.current));
    }

    pc.ontrack = (event) => {
      setRemoteStreams((prev) => ({
        ...prev,
        [targetUserId]: event.streams[0],
      }));
      trackSpeaking(event.streams[0], targetUserId); // Track their audio
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        channel.send({
          type: 'broadcast',
          event: 'webrtc-signal',
          payload: {
            targetId: targetUserId,
            fromId: user.id,
            type: 'ice-candidate',
            candidate: event.candidate,
          },
        });
      }
    };

    peerConnectionsRef.current[targetUserId] = pc;
    return pc;
  };

  const joinRoom = async () => {
    if (!user) return setErrorMsg('You must be logged in to join.');
    if (!activeRoom) return setErrorMsg('Please select a valid room.');
    setErrorMsg('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      localStreamRef.current = stream;
      setIsMuted(false);

      // Track our own audio level
      trackSpeaking(stream, user.id);

      const channel = supabase.channel(`voice_room:${activeRoom.slug}`, {
        config: { presence: { key: user.id }, broadcast: { self: false } },
      });
      channelRef.current = channel;

      channel.on(
        'broadcast',
        { event: 'webrtc-signal' },
        async ({ payload: data }) => {
          if (data.targetId !== user.id) return;
          let pc = peerConnectionsRef.current[data.fromId];

          if (data.type === 'offer') {
            if (!pc) pc = createPeerConnection(data.fromId, channel);
            await pc.setRemoteDescription(
              new RTCSessionDescription(data.offer),
            );
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            channel.send({
              type: 'broadcast',
              event: 'webrtc-signal',
              payload: {
                targetId: data.fromId,
                fromId: user.id,
                type: 'answer',
                answer,
              },
            });
          } else if (data.type === 'answer' && pc)
            await pc.setRemoteDescription(
              new RTCSessionDescription(data.answer),
            );
          else if (data.type === 'ice-candidate' && pc)
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        },
      );

      channel.on('presence', { event: 'sync' }, () => {
        setPeersInRoom(Object.keys(channel.presenceState()));
      });

      channel.on('presence', { event: 'join' }, async ({ key }) => {
        if (key !== user.id) {
          const pc = createPeerConnection(key, channel);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          channel.send({
            type: 'broadcast',
            event: 'webrtc-signal',
            payload: { targetId: key, fromId: user.id, type: 'offer', offer },
          });
        }
      });

      channel.on('presence', { event: 'leave' }, ({ key }) => cleanupPeer(key));

      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() });
          setIsConnected(true);
        }
      });
    } catch (err) {
      console.error(err);
      setErrorMsg('Microphone access denied or connection failed.');
    }
  };

  return (
    <div
      className={`min-h-screen font-sans ${themeClass} bg-white/5`}
      style={themeStyle}
    >
      {Object.entries(remoteStreams).map(([peerId, stream]) => (
        <audio
          key={peerId}
          autoPlay
          ref={(el) => {
            if (el && el.srcObject !== stream) el.srcObject = stream;
          }}
        />
      ))}

      <nav className='dashboard-nav shadow-lg sticky top-0 z-50 border-b border-white/20 bg-white/5 backdrop-blur-md'>
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
          </div>

          {errorMsg && (
            <div className='mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-center text-sm font-bold'>
              <i className='fa-solid fa-triangle-exclamation mr-2'></i>{' '}
              {errorMsg}
            </div>
          )}

          {!isConnected ? (
            <div className='flex flex-col items-center gap-4 animate-in fade-in zoom-in-95'>
              <div className='w-full max-w-sm'>
                <label className='block text-sm font-bold opacity-70 mb-2'>
                  Select Channel
                </label>
                <select
                  value={activeRoom?.slug || ''}
                  onChange={(e) =>
                    setActiveRoom(rooms.find((r) => r.slug === e.target.value))
                  }
                  className='w-full px-4 py-3 rounded-lg dashboard-input border border-white/20 bg-black/20 text-white focus:outline-none focus:border-blue-500 transition-colors'
                >
                  {rooms.map((room) => (
                    <option key={room.slug} value={room.slug}>
                      {room.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={joinRoom}
                className='mt-4 px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-lg border border-blue-400 transition-all hover:scale-105 flex items-center gap-2'
              >
                <i className='fa-solid fa-headphones'></i> Connect to Voice
              </button>
            </div>
          ) : (
            <div className='animate-in fade-in slide-in-from-bottom-4'>
              <div className='flex justify-between items-center mb-6 border-b border-white/10 pb-4'>
                <div className='flex items-center gap-2'>
                  <div
                    className='w-3 h-3 rounded-full animate-pulse shadow-[0_0_10px_currentColor]'
                    style={{
                      backgroundColor: activeRoom?.theme_color,
                      color: activeRoom?.theme_color,
                    }}
                  ></div>
                  <span
                    className='font-bold opacity-80 uppercase tracking-wider text-sm'
                    style={{ color: activeRoom?.theme_color }}
                  >
                    {activeRoom?.name}
                  </span>
                </div>
                <div className='text-sm opacity-60'>
                  <i className='fa-solid fa-users mr-1'></i>{' '}
                  {peersInRoom.length} Online
                </div>
              </div>

              {/* ACTIVE USERS GRID WITH SPEAKING INDICATORS */}
              <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-8'>
                {peersInRoom.map((peerId) => {
                  const isSpeaking = speakingPeers.has(peerId);

                  return (
                    <div
                      key={peerId}
                      className='flex flex-col items-center justify-center p-4 bg-black/20 border border-white/10 rounded-xl relative group transition hover:bg-black/30'
                    >
                      <div className='w-16 h-16 rounded-full bg-slate-800 border-2 border-slate-600 flex items-center justify-center text-2xl relative mb-3'>
                        <i className='fa-solid fa-user text-slate-400'></i>

                        {/* VISUALIZER RING */}
                        {isSpeaking && (
                          <div className='absolute inset-[-4px] rounded-full border-[3px] border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.6)] animate-pulse pointer-events-none transition-opacity duration-75'></div>
                        )}
                      </div>
                      <span className='text-xs font-bold truncate w-full text-center'>
                        {peerId === user.id ? 'You' : 'User'}
                      </span>
                      {peerId === user.id && isMuted && (
                        <div className='absolute top-2 right-2 text-red-500 text-xs bg-red-500/20 w-6 h-6 flex items-center justify-center rounded-full'>
                          <i className='fa-solid fa-microphone-slash'></i>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className='flex justify-center items-center gap-6 pt-6 border-t border-white/10'>
                <button
                  onClick={toggleMute}
                  className={`w-14 h-14 rounded-full flex items-center justify-center text-xl transition-all shadow-lg border ${
                    isMuted
                      ? 'bg-red-500/20 text-red-500 border-red-500/50 hover:bg-red-500 hover:text-white'
                      : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                  }`}
                >
                  <i
                    className={`fa-solid ${isMuted ? 'fa-microphone-slash' : 'fa-microphone'}`}
                  ></i>
                </button>

                <button
                  onClick={cleanupWebRTC}
                  className='px-6 py-3 bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/50 font-bold rounded-full transition-all flex items-center gap-2 shadow-lg'
                >
                  <i className='fa-solid fa-phone-slash'></i> Disconnect
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default VoiceChat;
