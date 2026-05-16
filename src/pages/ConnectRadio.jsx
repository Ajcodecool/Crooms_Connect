// ConnectRadio.js
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useTheme } from '../hooks/useTheme';

// Themes
import AeroOS from '../themes/AeroOS';
import CrimNet from '../themes/CrimNet';

// Utility: safe getter
const safeGet = (obj, path, fallback = undefined) => {
  try {
    return (
      path.split('.').reduce((acc, key) => (acc ? acc[key] : undefined), obj) ??
      fallback
    );
  } catch {
    return fallback;
  }
};

// Utility: time formatting
const formatTime = (seconds) => {
  if (!seconds || Number.isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

// Utility: check if URL is YouTube
const isYouTubeUrl = (url) => {
  if (!url) return false;
  return url.includes('youtube.com') || url.includes('youtu.be');
};

// Utility: extract YouTube Video ID
const getYouTubeId = (url) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
};

const ConnectRadio = () => {
  const navigate = useNavigate();
  const { theme, themeClass, themeStyle } = useTheme();

  // ===== Auth / Profile / App state =====
  const [session, setSession] = useState(null);
  const sessionRef = useRef(null);

  const [profile, setProfile] = useState(null);
  const profileRef = useRef(null);

  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(() =>
    new Date().toLocaleTimeString(),
  );

  // Joined gate (click-to-play)
  const [hasJoined, setHasJoined] = useState(false);
  const hasJoinedRef = useRef(false);

  // ===== Local Playback Mode =====
  const [playbackMode, setPlaybackMode] = useState('live'); // 'live' | 'local'
  const playbackModeRef = useRef('live');
  const [localTrack, setLocalTrack] = useState(null);

  // ===== Radio state =====
  const [radioState, setRadioState] = useState(null);
  const radioStateRef = useRef(null);
  const autoDjRef = useRef(false);

  // ===== Queue & Likes =====
  const [queue, setQueue] = useState([]);
  const queueRef = useRef([]);
  const [likes, setLikes] = useState([]);

  // ===== Suggestions =====
  const [pendingSuggestions, setPendingSuggestions] = useState([]);
  const [weeklySuggestionCount, setWeeklySuggestionCount] = useState(0);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestionForm, setSuggestionForm] = useState({
    title: '',
    artist: '',
    link: '',
    file: null,
    coverFile: null,
    isExplicit: false,
    type: 'link',
  });

  // ===== Playback state =====
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const volumeRef = useRef(0.5);
  const [spinVinyl, setSpinVinyl] = useState(true);

  // ===== Upload state =====
  const [isUploading, setIsUploading] = useState(false);
  const [newTrack, setNewTrack] = useState({
    title: '',
    artist: '',
    audioFile: null,
    coverFile: null,
    isExplicit: false,
  });

  // ===== Presence & Voice state (Online Hosts) =====
  const [onlineHosts, setOnlineHosts] = useState([]);
  const [isMicLive, setIsMicLive] = useState(false);
  const micStreamRef = useRef(null);
  const micIntervalRef = useRef(null);

  // ===== Refs (DOM / realtime infra) =====
  const audioRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const broadcastChannelRef = useRef(null);
  const presenceChannelRef = useRef(null);
  const hostIntervalRef = useRef(null);

  // Web Audio API Context (For Normalization & Voice Playback)
  const audioCtxRef = useRef(null);
  const compressorRef = useRef(null);

  // 🚨 THE CAPTAIN SYSTEM 🚨
  const instanceId = useRef(Math.random().toString(36).slice(2)).current;
  const activeHostInstanceRef = useRef(null);

  // ===== One-time guards =====
  const hasLoadedStateRef = useRef(false);
  const hasLoadedQueueRef = useRef(false);
  const hasLoadedLikesRef = useRef(false);
  const hasLoadedSuggestionsRef = useRef(false);
  const hasSubscribedRef = useRef(false);

  // Keep refs in sync
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);
  useEffect(() => {
    radioStateRef.current = radioState;
    autoDjRef.current = !!radioState?.auto_dj_enabled;
  }, [radioState]);
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);
  useEffect(() => {
    hasJoinedRef.current = hasJoined;
  }, [hasJoined]);
  useEffect(() => {
    playbackModeRef.current = playbackMode;
  }, [playbackMode]);
  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  // Clock
  useEffect(() => {
    const t = setInterval(
      () => setCurrentTime(new Date().toLocaleTimeString()),
      1000,
    );
    return () => clearInterval(t);
  }, []);

  // Voice playback handler (Listeners)
  const playVoiceChunk = (base64Audio) => {
    try {
      const binaryString = atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'audio/webm; codecs=opus' });
      const url = URL.createObjectURL(blob);
      const voiceAudio = new Audio(url);

      // Duck main music volume
      if (audioRef.current) audioRef.current.volume = volumeRef.current * 0.2;
      if (ytPlayerRef.current?.contentWindow) {
        ytPlayerRef.current.contentWindow.postMessage(
          `{"event":"command","func":"setVolume","args":[${Math.floor(volumeRef.current * 20)}]}]}`,
          '*',
        );
      }

      voiceAudio.play().catch(() => {});

      voiceAudio.onended = () => {
        // Restore music volume
        if (audioRef.current) audioRef.current.volume = volumeRef.current;
        if (ytPlayerRef.current?.contentWindow) {
          ytPlayerRef.current.contentWindow.postMessage(
            `{"event":"command","func":"setVolume","args":[${Math.floor(volumeRef.current * 100)}]}]}`,
            '*',
          );
        }
        URL.revokeObjectURL(url);
      };
    } catch (e) {
      console.error('Voice playback error:', e);
    }
  };

  // ========= Initial load (once) =========
  useEffect(() => {
    // ===== Realtime Subscriptions =====
    function noop() {}
    function sortQueueAscByCreatedAt(list) {
      return [...list].sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at),
      );
    }
    const updateQueueOnInsert = (prev, row) => {
      if (!row || !row.id) return prev;
      if (prev.some((t) => t.id === row.id)) return prev;
      return sortQueueAscByCreatedAt([...prev, row]);
    };
    const updateQueueOnUpdate = (prev, row) => {
      if (!row || !row.id) return prev;
      return sortQueueAscByCreatedAt(
        prev.map((t) => (t.id === row.id ? { ...t, ...row } : t)),
      );
    };
    const updateQueueOnDelete = (prev, row) => {
      const delId = row?.id;
      if (!delId) return prev;
      return prev.filter((t) => t.id !== delId);
    };

    const attachRealtime = (userId, userData) => {
      // 1. Unified broadcast channel
      const channel = supabase.channel('connect-radio-unified');
      broadcastChannelRef.current = channel;

      channel
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'radio_state' },
          (payload) => {
            setRadioState(payload?.new ?? null);
          },
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'radio_queue' },
          (payload) => {
            setQueue((prev) => updateQueueOnInsert(prev, payload?.new));
          },
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'radio_queue' },
          (payload) => {
            setQueue((prev) => updateQueueOnUpdate(prev, payload?.new));
          },
        )
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'radio_queue' },
          (payload) => {
            setQueue((prev) =>
              updateQueueOnDelete(prev, payload?.old ?? payload?.new ?? null),
            );
          },
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'radio_queue_likes' },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              setLikes((prev) => {
                if (prev.some((l) => l.id === payload.new.id)) return prev;
                return [...prev, payload.new];
              });
            } else if (payload.eventType === 'DELETE') {
              setLikes((prev) => prev.filter((l) => l.id !== payload.old.id));
            }
          },
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'radio_suggestions' },
          (payload) => {
            const row = payload?.new;
            if (profileRef.current?.is_verified && row?.status === 'pending') {
              setPendingSuggestions((prev) =>
                prev.some((s) => s.id === row.id) ? prev : [row, ...prev],
              );
            }
          },
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'radio_suggestions' },
          (payload) => {
            const row = payload?.new;
            if (profileRef.current?.is_verified) {
              setPendingSuggestions((prev) => {
                const exists = prev.some((s) => s.id === row.id);
                if (!exists) return prev;
                if (row.status !== 'pending')
                  return prev.filter((s) => s.id !== row.id);
                return prev.map((s) => (s.id === row.id ? row : s));
              });
            }
          },
        )
        .on('broadcast', { event: 'voice-data' }, ({ payload }) => {
          if (!hasJoinedRef.current) return;
          if (payload?.audio && payload?.hostId !== userId) {
            playVoiceChunk(payload.audio);
          }
        })
        .on('broadcast', { event: 'transport' }, ({ payload }) => {
          try {
            if (payload?.instanceId) {
              activeHostInstanceRef.current = payload.instanceId;
            }

            const action = payload?.action;
            const t = Number(payload?.currentTime ?? 0);

            if (autoDjRef.current) return;
            if (payload?.instanceId === instanceId) return;
            if (!hasJoinedRef.current) return;
            if (playbackModeRef.current === 'local') return;

            const isYT = isYouTubeUrl(radioStateRef.current?.current_track_url);
            const a = audioRef.current;
            const yt = ytPlayerRef.current?.contentWindow;

            if (action === 'seek' || action === 'sync') {
              if (!isYT && a && Math.abs(a.currentTime - t) > 2)
                a.currentTime = t;
              if (isYT && yt && action === 'seek') {
                yt.postMessage(
                  `{"event":"command","func":"seekTo","args":[${t}, true]}`,
                  '*',
                );
              }
            }
            if (action === 'play') {
              if (!isYT && a) a.play().catch(() => {});
              if (isYT && yt)
                yt.postMessage(
                  '{"event":"command","func":"playVideo","args":""}',
                  '*',
                );
            }
            if (action === 'pause') {
              if (!isYT && a) a.pause();
              if (isYT && yt)
                yt.postMessage(
                  '{"event":"command","func":"pauseVideo","args":""}',
                  '*',
                );
            }
          } catch (e) {
            console.error('broadcast transport error:', e);
          }
        })
        .subscribe(noop);

      // 2. Presence channel for Online Hosts
      const presenceChannel = supabase.channel('online-hosts', {
        config: { presence: { key: userId } },
      });
      presenceChannelRef.current = presenceChannel;

      presenceChannel
        .on('presence', { event: 'sync' }, () => {
          const state = presenceChannel.presenceState();
          const hosts = [];
          for (const id in state) {
            state[id].forEach((pres) => {
              if (pres.is_verified) hosts.push(pres);
            });
          }
          // Deduplicate by user_id
          const uniqueHosts = hosts.filter(
            (v, i, a) => a.findIndex((t) => t.user_id === v.user_id) === i,
          );
          setOnlineHosts(uniqueHosts);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED' && userData?.is_verified) {
            await presenceChannel.track({
              user_id: userId,
              is_verified: true,
              username: userData.username || 'Host',
            });
          }
        });

      const cleanup = () => {
        try {
          supabase.removeChannel(channel);
          supabase.removeChannel(presenceChannel);
          if (broadcastChannelRef.current) broadcastChannelRef.current = null;
        } catch {
          /*continue*/
        }
      };

      window.addEventListener('beforeunload', cleanup);
      return cleanup;
    };

    let cancelled = false;

    const init = async () => {
      try {
        const { data: auth } = await supabase.auth.getSession();
        const sess = auth?.session ?? auth?.data?.session ?? null;
        if (!sess) {
          navigate('/auth');
          return;
        }
        if (cancelled) return;

        setSession(sess);

        const { data: userData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', sess.user.id)
          .single();

        if (cancelled) return;
        setProfile(userData);

        if (!hasLoadedStateRef.current) {
          const { data: stateData } = await supabase
            .from('radio_state')
            .select('*')
            .eq('id', 1)
            .single();
          if (cancelled) return;
          setRadioState(stateData ?? null);
          hasLoadedStateRef.current = true;
        }

        if (!hasLoadedQueueRef.current) {
          const { data: queueData } = await supabase
            .from('radio_queue')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(200);
          if (cancelled) return;
          setQueue((queueData ?? []).reverse());
          hasLoadedQueueRef.current = true;
        }

        if (!hasLoadedLikesRef.current) {
          const { data: likesData } = await supabase
            .from('radio_queue_likes')
            .select('*');
          if (cancelled) return;
          setLikes(likesData ?? []);
          hasLoadedLikesRef.current = true;
        }

        if (!hasLoadedSuggestionsRef.current) {
          if (userData?.is_verified) {
            // Join with profiles to show who suggested it
            const { data: suggestions } = await supabase
              .from('radio_suggestions')
              .select('*, profiles(username)')
              .eq('status', 'pending');
            if (cancelled) return;
            setPendingSuggestions(suggestions ?? []);
          } else {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const { count } = await supabase
              .from('radio_suggestions')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', sess.user.id)
              .gte('created_at', sevenDaysAgo.toISOString());
            if (cancelled) return;
            setWeeklySuggestionCount(count ?? 0);
          }
          hasLoadedSuggestionsRef.current = true;
        }

        if (!hasSubscribedRef.current) {
          attachRealtime(sess.user.id, userData);
          hasSubscribedRef.current = true;
        }
      } catch (err) {
        console.error('Init error:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    init();
    return () => {
      cancelled = true;
    };
  }, [navigate, instanceId]);

  // 🚨 THE CAPTAIN SYNC LOOP 🚨
  useEffect(() => {
    if (
      !profile?.is_verified ||
      radioState?.auto_dj_enabled ||
      !radioState?.is_playing ||
      activeHostInstanceRef.current !== instanceId ||
      playbackMode === 'local'
    ) {
      if (hostIntervalRef.current) clearInterval(hostIntervalRef.current);
      return;
    }

    hostIntervalRef.current = setInterval(() => {
      const isYT = isYouTubeUrl(radioState?.current_track_url);
      const a = audioRef.current;

      let currentT = 0;
      let isPaused = true;

      if (!isYT && a) {
        currentT = a.currentTime;
        isPaused = a.paused;
      } else if (isYT) {
        // YouTube pseudo-sync for captain
        currentT = progress;
        isPaused = false; // Assuming playing if state says so
      }

      if (!isPaused) {
        broadcastChannelRef.current
          ?.send({
            type: 'broadcast',
            event: 'transport',
            payload: {
              action: 'sync',
              currentTime: currentT,
              userId: sessionRef.current?.user?.id,
              instanceId,
            },
          })
          .catch(() => {});
      }
    }, 5000);

    return () => clearInterval(hostIntervalRef.current);
  }, [
    profile?.is_verified,
    radioState?.is_playing,
    radioState?.auto_dj_enabled,
    instanceId,
    progress,
    radioState?.current_track_url,
    playbackMode,
  ]);

  // ===== Web Audio API Normalization Setup =====
  useEffect(() => {
    // Only set this up once the user interacts with the document to respect autoplay policies
    const setupWebAudio = () => {
      if (audioCtxRef.current || !audioRef.current) return;
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;

        const ctx = new AudioContext();
        audioCtxRef.current = ctx;

        const source = ctx.createMediaElementSource(audioRef.current);
        const compressor = ctx.createDynamicsCompressor();

        // Light compression settings for normalization
        compressor.threshold.value = -24; // dB
        compressor.knee.value = 30; // dB
        compressor.ratio.value = 12;
        compressor.attack.value = 0.003; // seconds
        compressor.release.value = 0.25; // seconds

        compressorRef.current = compressor;
        source.connect(compressor);
        compressor.connect(ctx.destination);
      } catch (err) {
        console.warn(
          'AudioContext setup bypassed (expected on strict browsers):',
          err,
        );
      }
    };

    document.addEventListener('click', setupWebAudio, { once: true });
    return () => document.removeEventListener('click', setupWebAudio);
  }, []);

  const resumeAudioContext = () => {
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  // ===== Audio Handlers =====
  const handleTimeUpdate = () => {
    const a = audioRef.current;
    if (a) {
      const currentSecond = Math.floor(a.currentTime);
      setProgress((prev) =>
        Math.floor(prev) !== currentSecond ? currentSecond : prev,
      );
    }
  };

  const handleLoadedMetadata = () => {
    const a = audioRef.current;
    if (!a) return;
    setDuration(a.duration || 0);

    // Skip autoseek if local playback
    if (playbackModeRef.current === 'local') return;

    let targetTime = safeGet(radioStateRef.current, 'last_position_seconds', 0);

    if (autoDjRef.current && radioStateRef.current?.updated_at) {
      const startedAt = new Date(radioStateRef.current.updated_at).getTime();
      const elapsedSeconds = (Date.now() - startedAt) / 1000;
      if (elapsedSeconds > 0 && elapsedSeconds < a.duration) {
        targetTime = elapsedSeconds;
      }
    }

    const allowAutoseek = !profileRef.current?.is_verified || autoDjRef.current;
    if (allowAutoseek && Math.abs(a.currentTime - targetTime) > 2) {
      a.currentTime = targetTime;
    }
  };

  const handleTrackEnded = async () => {
    if (playbackModeRef.current === 'local') {
      // Local mode playback ended. Keep simple, no auto-next for local yet to not clash.
      return;
    }

    const state = radioStateRef.current;
    if (!state) return;

    if (state.auto_dj_enabled) {
      setTimeout(async () => {
        try {
          const { data: currentState } = await supabase
            .from('radio_state')
            .select('current_track_url')
            .eq('id', 1)
            .single();

          if (
            currentState?.current_track_url ===
            radioStateRef.current?.current_track_url
          ) {
            const q = queueRef.current;
            if (q.length > 0) {
              const nextTrack = q[Math.floor(Math.random() * q.length)];
              await supabase
                .from('radio_state')
                .update({
                  current_track_url: nextTrack.audio_url,
                  is_playing: true,
                  last_position_seconds: 0,
                  track_title: nextTrack.track_title,
                  artist: nextTrack.artist,
                  album_cover_url: nextTrack.album_cover_url,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', 1);
            }
          }
        } catch (e) {
          console.error('Auto-DJ next error:', e);
        }
      }, Math.random() * 1500);
    } else if (profileRef.current?.is_verified) {
      if (
        activeHostInstanceRef.current === instanceId ||
        !activeHostInstanceRef.current
      ) {
        activeHostInstanceRef.current = instanceId;
        handleAutoNext();
      } else {
        setTimeout(
          () => {
            const a = audioRef.current;
            if (a && a.paused && Math.abs(a.currentTime - a.duration) < 1) {
              activeHostInstanceRef.current = instanceId;
              handleAutoNext();
            }
          },
          3000 + Math.random() * 2000,
        );
      }
    }
  };

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
    if (ytPlayerRef.current?.contentWindow) {
      ytPlayerRef.current.contentWindow.postMessage(
        `{"event":"command","func":"setVolume","args":[${Math.floor(volume * 100)}]}]}`,
        '*',
      );
    }
  }, [volume]);

  // Handle Autoplay for Live or Local tracks
  useEffect(() => {
    const isYT = isYouTubeUrl(
      playbackMode === 'local'
        ? localTrack?.audio_url
        : radioState?.current_track_url,
    );
    const shouldPlay =
      playbackMode === 'local' ? !!localTrack : radioState?.is_playing;

    if (hasJoinedRef.current && shouldPlay) {
      resumeAudioContext();
      if (!isYT && audioRef.current) {
        audioRef.current
          .play()
          .catch((e) => console.warn('Autoplay blocked:', e));
      }
    }
  }, [
    radioState?.current_track_url,
    radioState?.is_playing,
    localTrack,
    playbackMode,
  ]);

  // ===== Controls & Actions =====
  const toggleAutoDJ = async () => {
    if (!profileRef.current?.is_verified) return;
    const newState = !autoDjRef.current;
    try {
      await supabase
        .from('radio_state')
        .update({
          auto_dj_enabled: newState,
          updated_at: new Date().toISOString(),
        })
        .eq('id', 1);
    } catch (e) {
      console.error('toggleAutoDJ error:', e);
    }
  };

  const broadcastTransport = async (action, newTime = null) => {
    resumeAudioContext();
    const currentAudioUrl =
      playbackMode === 'local'
        ? localTrack?.audio_url
        : radioStateRef.current?.current_track_url;
    const isYT = isYouTubeUrl(currentAudioUrl);
    const a = audioRef.current;
    const yt = ytPlayerRef.current?.contentWindow;

    // Handle Local Mode explicitly
    if (playbackMode === 'local') {
      if (action === 'play') {
        if (!isYT && a) a.play().catch(() => {});
        if (isYT && yt)
          yt.postMessage(
            '{"event":"command","func":"playVideo","args":""}',
            '*',
          );
      }
      if (action === 'pause') {
        if (!isYT && a) a.pause();
        if (isYT && yt)
          yt.postMessage(
            '{"event":"command","func":"pauseVideo","args":""}',
            '*',
          );
      }
      if (action === 'seek' && typeof newTime === 'number') {
        if (!isYT && a) a.currentTime = newTime;
        if (isYT && yt)
          yt.postMessage(
            `{"event":"command","func":"seekTo","args":[${newTime}, true]}`,
            '*',
          );
      }
      return;
    }

    // Broadcast Mode
    if (!profileRef.current?.is_verified || autoDjRef.current) return;
    setHasJoined(true);

    activeHostInstanceRef.current = instanceId;

    const payload = {
      action,
      currentTime: newTime ?? (isYT ? progress : a ? a.currentTime : 0),
      userId: sessionRef.current?.user?.id,
      instanceId,
    };

    const updateData = { updated_at: new Date().toISOString() };

    if (action === 'play') {
      updateData.is_playing = true;
      if (!isYT && a) a.play().catch(() => {});
      if (isYT && yt)
        yt.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
    }
    if (action === 'pause') {
      updateData.is_playing = false;
      if (!isYT && a) a.pause();
      if (isYT && yt)
        yt.postMessage(
          '{"event":"command","func":"pauseVideo","args":""}',
          '*',
        );
    }
    if (action === 'seek' && typeof newTime === 'number') {
      updateData.last_position_seconds = newTime;
      if (!isYT && a) a.currentTime = newTime;
      if (isYT && yt)
        yt.postMessage(
          `{"event":"command","func":"seekTo","args":[${newTime}, true]}`,
          '*',
        );
    }

    try {
      await broadcastChannelRef.current?.send({
        type: 'broadcast',
        event: 'transport',
        payload,
      });
      if (Object.keys(updateData).length > 0) {
        await supabase.from('radio_state').update(updateData).eq('id', 1);
      }
    } catch (e) {
      console.error('broadcastTransport error:', e);
    }
  };

  const handlePlayTrack = async (track, localOnly = false) => {
    setHasJoined(true);
    resumeAudioContext();

    if (localOnly || playbackMode === 'local') {
      setPlaybackMode('local');
      setLocalTrack(track);
      return;
    }

    if (!profileRef.current?.is_verified || !track) return;

    activeHostInstanceRef.current = instanceId;
    broadcastChannelRef.current?.send({
      type: 'broadcast',
      event: 'transport',
      payload: { action: 'claim', instanceId },
    });

    try {
      await supabase
        .from('radio_state')
        .update({
          current_track_url: track.audio_url,
          is_playing: true,
          last_position_seconds: 0,
          track_title: track.track_title,
          artist: track.artist,
          album_cover_url: track.album_cover_url,
          updated_at: new Date().toISOString(),
        })
        .eq('id', 1);

      await supabase
        .from('radio_queue')
        .update({ is_played: true })
        .eq('id', track.id);
    } catch (e) {
      console.error('handlePlayTrack error:', e);
    }
  };

  const handleAutoNext = () => {
    const upcoming = queueRef.current.filter((t) => !t.is_played);
    if (upcoming.length === 0) {
      broadcastTransport('pause');
      return;
    }
    handlePlayTrack(upcoming[0]);
  };

  const addToQueue = async (track) => {
    if (!profileRef.current?.is_verified || !track) return;
    try {
      await supabase.from('radio_queue').insert([
        {
          track_title: track.track_title,
          artist: track.artist,
          audio_url: track.audio_url,
          album_cover_url: track.album_cover_url,
          is_explicit: !!track.is_explicit,
          added_by: sessionRef.current.user.id,
          is_played: false,
        },
      ]);
    } catch (e) {
      console.error('addToQueue error:', e);
    }
  };

  const handleScrub = (e) => {
    if (!duration || (autoDjRef.current && playbackMode === 'live')) return;
    if (playbackMode === 'live' && !profileRef.current?.is_verified) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = (clickX / rect.width) * duration;
    broadcastTransport('seek', newTime);
  };

  const handleDeleteTrack = async (track) => {
    if (!profileRef.current?.is_verified || !track) return;
    const confirmDelete = window.confirm(
      `Permanently delete "${track.track_title}"?`,
    );
    if (!confirmDelete) return;

    try {
      await supabase.from('radio_queue').delete().eq('id', track.id);

      const filesToRemove = [];
      try {
        if (track.audio_url?.includes('/radio_assets/')) {
          const p = track.audio_url.split('/radio_assets/')[1];
          if (p) filesToRemove.push(p);
        }
        if (track.album_cover_url?.includes('/radio_assets/')) {
          const p = track.album_cover_url.split('/radio_assets/')[1];
          if (p) filesToRemove.push(p);
        }
        if (filesToRemove.length > 0) {
          await supabase.storage.from('radio_assets').remove(filesToRemove);
        }
      } catch (e) {
        console.warn('Asset cleanup warning:', e);
      }
    } catch (e) {
      console.error('handleDeleteTrack error:', e);
    }
  };

  // ===== Toggle Like =====
  const handleToggleLike = async (track) => {
    if (!sessionRef.current?.user) return;
    const userId = sessionRef.current.user.id;
    const existingLike = likes.find(
      (l) => l.queue_id === track.id && l.user_id === userId,
    );

    try {
      if (existingLike) {
        await supabase
          .from('radio_queue_likes')
          .delete()
          .eq('id', existingLike.id);
      } else {
        await supabase
          .from('radio_queue_likes')
          .insert([{ queue_id: track.id, user_id: userId }]);
      }
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  };

  // ===== Mod Live Voice (Mic Broadcast) =====
  const toggleMic = async () => {
    if (!profileRef.current?.is_verified) return;

    if (isMicLive) {
      // Stop Mic
      setIsMicLive(false);
      if (micIntervalRef.current) clearInterval(micIntervalRef.current);
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((track) => track.stop());
        micStreamRef.current = null;
      }
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      setIsMicLive(true);

      micIntervalRef.current = setInterval(() => {
        const recorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm; codecs=opus',
        });
        const chunks = [];
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };
        recorder.onstop = async () => {
          const blob = new Blob(chunks, { type: 'audio/webm; codecs=opus' });
          const buffer = await blob.arrayBuffer();
          const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
          broadcastChannelRef.current
            ?.send({
              type: 'broadcast',
              event: 'voice-data',
              payload: { audio: base64, hostId: sessionRef.current?.user?.id },
            })
            .catch(console.error);
        };
        recorder.start();
        setTimeout(() => recorder.stop(), 2000); // 2 second chunks
      }, 2000);
    } catch (e) {
      console.error('Error starting mic:', e);
      alert('Could not access microphone.');
    }
  };

  // Cleanup Mic on unmount
  useEffect(() => {
    return () => {
      if (micIntervalRef.current) clearInterval(micIntervalRef.current);
      if (micStreamRef.current)
        micStreamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // ===== Suggestions =====
  const handleSuggestionSubmit = async (e) => {
    e.preventDefault();
    if (weeklySuggestionCount >= 2)
      return alert('You have reached your limit of 2 suggestions per week.');

    const { title, artist, link, file, coverFile, isExplicit, type } =
      suggestionForm;
    if (type === 'link' && !link) return alert('Please provide a valid link.');
    if (type === 'file' && !file) return alert('Please select an MP3 file.');

    // File size limits (Client-side proxy for optimization)
    if (file && file.size > 15 * 1024 * 1024)
      return alert(
        'Audio file is too large (Max 15MB). Please compress it first.',
      );
    if (coverFile && coverFile.size > 5 * 1024 * 1024)
      return alert('Cover image is too large (Max 5MB).');

    setIsSuggesting(true);
    try {
      let finalUrl = link;
      let finalCoverUrl = null;

      if (type === 'file' && file) {
        const ext = file.name.split('.').pop();
        const fileName = `suggestion-${Date.now()}.${ext}`;
        const { data, error } = await supabase.storage
          .from('radio_assets')
          .upload(fileName, file);
        if (error) throw error;
        finalUrl = supabase.storage.from('radio_assets').getPublicUrl(data.path)
          .data.publicUrl;
      }

      if (coverFile) {
        const ext = coverFile.name.split('.').pop();
        const fileName = `suggestion-cover-${Date.now()}.${ext}`;
        const { data, error } = await supabase.storage
          .from('radio_assets')
          .upload(fileName, coverFile);
        if (error) throw error;
        finalCoverUrl = supabase.storage
          .from('radio_assets')
          .getPublicUrl(data.path).data.publicUrl;
      }

      // Add directly to queue (Auto-Accept)
      await supabase.from('radio_queue').insert([
        {
          track_title: title,
          artist,
          audio_url: finalUrl,
          album_cover_url: finalCoverUrl,
          is_explicit: isExplicit,
          added_by: sessionRef.current.user.id,
          is_played: false,
        },
      ]);

      // Log in suggestions as accepted (for tracking weekly limits)
      await supabase.from('radio_suggestions').insert([
        {
          user_id: sessionRef.current.user.id,
          track_title: title,
          artist,
          audio_url: finalUrl,
          album_cover_url: finalCoverUrl,
          is_explicit: isExplicit,
          status: 'accepted',
        },
      ]);

      setWeeklySuggestionCount((c) => c + 1);
      setSuggestionForm({
        title: '',
        artist: '',
        link: '',
        file: null,
        coverFile: null,
        isExplicit: false,
        type: 'link',
      });
      alert('Suggestion submitted and accepted automatically!');
    } catch (err) {
      console.error(err);
      alert('Failed to submit suggestion.');
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleAcceptSuggestion = async (s) => {
    if (!profileRef.current?.is_verified) return;
    try {
      await supabase.from('radio_queue').insert([
        {
          track_title: s.track_title,
          artist: s.artist,
          audio_url: s.audio_url,
          album_cover_url: s.album_cover_url,
          is_explicit: s.is_explicit,
          added_by: s.user_id,
          is_played: false,
        },
      ]);

      await supabase
        .from('radio_suggestions')
        .update({ status: 'accepted' })
        .eq('id', s.id);
      setPendingSuggestions((prev) => prev.filter((x) => x.id !== s.id));
    } catch (e) {
      console.error('Accept suggestion error:', e);
      alert('Error accepting suggestion.');
    }
  };

  const handleDeclineSuggestion = async (s) => {
    if (!profileRef.current?.is_verified) return;
    try {
      await supabase
        .from('radio_suggestions')
        .update({ status: 'declined' })
        .eq('id', s.id);
      setPendingSuggestions((prev) => prev.filter((x) => x.id !== s.id));

      if (s.audio_url?.includes('/radio_assets/')) {
        const filePath = s.audio_url.split('/radio_assets/')[1];
        if (filePath) {
          await supabase.storage.from('radio_assets').remove([filePath]);
        }
      }
      if (s.album_cover_url?.includes('/radio_assets/')) {
        const coverPath = s.album_cover_url.split('/radio_assets/')[1];
        if (coverPath) {
          await supabase.storage.from('radio_assets').remove([coverPath]);
        }
      }
    } catch (e) {
      console.error('Decline suggestion error:', e);
    }
  };

  // ===== Upload new track (admin) =====
  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!profileRef.current?.is_verified || !newTrack.audioFile) return;

    if (newTrack.audioFile.size > 25 * 1024 * 1024) {
      return alert(
        'File too large (Max 25MB). Please optimize your MP3 before uploading.',
      );
    }

    setIsUploading(true);
    try {
      // Mock processing delay to simulate optimization/compression checks
      await new Promise((res) => setTimeout(res, 1500));

      const audioExt = newTrack.audioFile.name.split('.').pop();
      const audioName = `${Date.now()}-audio.${audioExt}`;
      const { data: audioData, error: audioErr } = await supabase.storage
        .from('radio_assets')
        .upload(audioName, newTrack.audioFile);
      if (audioErr) throw audioErr;
      const audioUrl = supabase.storage
        .from('radio_assets')
        .getPublicUrl(audioData.path).data.publicUrl;

      let coverUrl = null;
      if (newTrack.coverFile) {
        const coverExt = newTrack.coverFile.name.split('.').pop();
        const coverName = `${Date.now()}-cover.${coverExt}`;
        const { data: coverData, error: coverErr } = await supabase.storage
          .from('radio_assets')
          .upload(coverName, newTrack.coverFile);
        if (coverErr) throw coverErr;
        coverUrl = supabase.storage
          .from('radio_assets')
          .getPublicUrl(coverData.path).data.publicUrl;
      }

      await supabase.from('radio_queue').insert([
        {
          track_title: newTrack.title || 'Unknown Title',
          artist: newTrack.artist || 'Unknown Artist',
          audio_url: audioUrl,
          album_cover_url: coverUrl,
          is_explicit: !!newTrack.isExplicit,
          added_by: sessionRef.current.user.id,
          is_played: false,
        },
      ]);

      setNewTrack({
        title: '',
        artist: '',
        audioFile: null,
        coverFile: null,
        isExplicit: false,
      });
    } catch (err) {
      console.error(err);
      alert('Upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  // ===== Derived lists =====
  const upcomingQueue = useMemo(
    () => queue.filter((t) => !t.is_played),
    [queue],
  );

  const historyQueue = useMemo(() => {
    const played = queue.filter((t) => t.is_played);
    const uniqueMap = new Map();

    played.forEach((t) => {
      const key = t.audio_url || `${t.track_title}-${t.artist}`;
      uniqueMap.set(key, t);
    });

    return Array.from(uniqueMap.values());
  }, [queue]);

  const [searchQuery, setSearchQuery] = useState('');
  const filteredLibrary = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return historyQueue;
    return historyQueue.filter(
      (t) =>
        (t.track_title || '').toLowerCase().includes(q) ||
        (t.artist || '').toLowerCase().includes(q),
    );
  }, [historyQueue, searchQuery]);

  // View state derivatives
  const currentUrl =
    playbackMode === 'local'
      ? localTrack?.audio_url
      : radioState?.current_track_url;
  const currentTitle =
    playbackMode === 'local'
      ? localTrack?.track_title
      : radioState?.track_title;
  const currentArtist =
    playbackMode === 'local' ? localTrack?.artist : radioState?.artist;
  const currentCover =
    playbackMode === 'local'
      ? localTrack?.album_cover_url
      : radioState?.album_cover_url;
  const isPlayingUI =
    playbackMode === 'local'
      ? audioRef.current && !audioRef.current.paused
      : radioState?.is_playing;

  if (isLoading) {
    return (
      <div
        className={`flex items-center justify-center h-screen bg-black ${themeClass}`}
        style={themeStyle}
      >
        <i className='fa-solid fa-circle-notch fa-spin text-2xl text-white' />
      </div>
    );
  }

  const MainContent = (
    <div className='flex flex-col h-full w-full bg-black text-white relative'>
      <style>{`
        @keyframes spin-vinyl {
          100% { transform: rotate(360deg); }
        }
      `}</style>

      <div className='flex justify-between items-center p-4 border-b border-white/10 bg-gray-900/50 backdrop-blur shrink-0 z-10'>
        <div className='flex items-center gap-4'>
          <button
            onClick={() => navigate(-1)}
            className='text-gray-400 hover:text-white transition flex items-center gap-2'
          >
            <i className='fa-solid fa-arrow-left'></i> Back
          </button>

          {/* PLAYBACK MODE SWITCH */}
          <div className='hidden sm:flex bg-black/60 rounded-full p-1 border border-white/10'>
            <button
              onClick={() => setPlaybackMode('live')}
              className={`px-4 py-1 text-xs rounded-full transition ${playbackMode === 'live' ? 'bg-blue-600 text-white font-bold' : 'text-gray-400 hover:text-white'}`}
            >
              <i className='fa-solid fa-broadcast-tower mr-2'></i>Live Broadcast
            </button>
            <button
              onClick={() => setPlaybackMode('local')}
              className={`px-4 py-1 text-xs rounded-full transition ${playbackMode === 'local' ? 'bg-purple-600 text-white font-bold' : 'text-gray-400 hover:text-white'}`}
            >
              <i className='fa-solid fa-headphones mr-2'></i>Personal Playback
            </button>
          </div>
        </div>

        {/* ONLINE HOSTS INDICATOR */}
        <div className='flex items-center gap-3'>
          {onlineHosts.length > 0 && (
            <div className='hidden sm:flex items-center gap-2 text-xs bg-black/40 px-3 py-1 rounded-full border border-green-500/30'>
              <div className='w-2 h-2 rounded-full bg-green-500 animate-pulse'></div>
              <span className='text-gray-300'>
                Hosts Online:{' '}
                <span className='text-white font-semibold'>
                  {onlineHosts.map((h) => h.username).join(', ')}
                </span>
              </span>
            </div>
          )}
          <div className='text-gray-300 font-mono tracking-widest'>
            {currentTime}
          </div>
        </div>
      </div>

      <div className='flex flex-col md:flex-row h-full overflow-y-auto md:overflow-hidden p-4 gap-6'>
        {/* CONDITIONAL MEDIA PLAYERS */}
        {isYouTubeUrl(currentUrl) ? (
          <iframe
            ref={ytPlayerRef}
            className='hidden'
            src={`https://www.youtube.com/embed/${getYouTubeId(currentUrl)}?enablejsapi=1&autoplay=${isPlayingUI ? 1 : 0}&controls=0`}
            allow='autoplay'
          ></iframe>
        ) : (
          <audio
            ref={audioRef}
            src={currentUrl || ''}
            crossOrigin='anonymous' // Essential for CORS/MP3 playback fixes
            preload='auto'
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleTrackEnded}
          />
        )}

        {/* LEFT: Player */}
        <div className='w-full md:flex-1 flex flex-col items-center justify-center bg-gray-900/40 p-6 md:p-8 rounded-xl border border-white/5 relative min-h-[500px]'>
          {!hasJoined && (
            <div className='absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 rounded-xl'>
              <h2 className='text-2xl font-bold mb-4'>
                {profile?.is_verified ? 'Host Controls' : 'Live Broadcast'}
              </h2>
              <button
                onClick={() => {
                  setHasJoined(true);
                  resumeAudioContext();
                  if (!isYouTubeUrl(currentUrl))
                    audioRef.current?.play().catch(() => {});
                }}
                className='bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-full text-lg transition-all'
              >
                <i className='fa-solid fa-headphones mr-2'></i> Tune In
              </button>
            </div>
          )}

          {/* TOP CONTROLS (Auto DJ / Live Mic) */}
          <div className='absolute top-4 right-4 flex gap-2'>
            {profile?.is_verified && playbackMode === 'live' && (
              <>
                <button
                  onClick={toggleMic}
                  className={`px-4 py-2 rounded-full text-xs font-bold border transition-colors flex items-center gap-2
                    ${isMicLive ? 'bg-red-600/20 border-red-500 text-red-400 animate-pulse' : 'bg-gray-800 border-gray-600 text-gray-400 hover:bg-gray-700'}`}
                >
                  <i
                    className={`fa-solid ${isMicLive ? 'fa-microphone' : 'fa-microphone-slash'}`}
                  ></i>
                  {isMicLive ? 'LIVE MIC' : 'Go Live (Voice)'}
                </button>

                <button
                  onClick={toggleAutoDJ}
                  className={`px-4 py-2 rounded-full text-xs font-bold border transition-colors
                    ${radioState?.auto_dj_enabled ? 'bg-green-600/20 border-green-500 text-green-400' : 'bg-gray-800 border-gray-600 text-gray-400'}`}
                >
                  <i className='fa-solid fa-robot mr-2'></i>{' '}
                  {radioState?.auto_dj_enabled ? 'Auto DJ: ON' : 'Auto DJ: OFF'}
                </button>
              </>
            )}

            {playbackMode === 'local' && (
              <span className='px-4 py-2 bg-purple-900/40 text-purple-300 border border-purple-500/30 rounded-full text-xs font-bold'>
                <i className='fa-solid fa-user mr-2'></i> Local Session
              </span>
            )}
          </div>

          {/* VINYL RECORD ALBUM ART */}
          <div className='w-48 h-48 sm:w-64 sm:h-64 md:w-80 md:h-80 bg-gray-950 rounded-full mb-8 overflow-hidden flex items-center justify-center border-8 border-gray-900 shadow-xl relative mt-8'>
            {isYouTubeUrl(currentUrl) && (
              <div className='absolute inset-0 bg-red-600/20 flex items-center justify-center z-10 pointer-events-none rounded-full'>
                <i className='fa-brands fa-youtube text-white/50 text-5xl'></i>
              </div>
            )}
            {currentCover ? (
              <img
                src={currentCover}
                alt='Cover'
                className='w-full h-full object-cover'
                style={{
                  animation: spinVinyl
                    ? 'spin-vinyl 4s linear infinite'
                    : 'none',
                  animationPlayState: isPlayingUI ? 'running' : 'paused',
                }}
              />
            ) : (
              <i
                className='fa-solid fa-music text-4xl text-gray-700'
                style={{
                  animation: spinVinyl
                    ? 'spin-vinyl 4s linear infinite'
                    : 'none',
                  animationPlayState: isPlayingUI ? 'running' : 'paused',
                }}
              ></i>
            )}
          </div>

          <div className='flex flex-col items-center justify-center text-center mb-6 w-full px-4'>
            <h2 className='text-xl md:text-2xl font-bold mb-1 truncate w-full flex items-center justify-center gap-2'>
              {currentTitle ||
                (playbackMode === 'local'
                  ? 'Select a track to play'
                  : 'No track playing')}
            </h2>
            <h3 className='text-base md:text-lg text-gray-400'>
              {currentArtist ||
                (playbackMode === 'local' ? 'Library' : 'Waiting for host...')}
            </h3>
          </div>

          <div className='w-full max-w-md px-4 mb-6'>
            <div className='flex justify-between text-xs text-gray-500 mb-2 font-mono'>
              <span>{formatTime(progress)}</span>
              <span>
                {isYouTubeUrl(currentUrl) ? 'Live' : formatTime(duration)}
              </span>
            </div>
            <div
              className={`w-full bg-gray-800 h-1.5 rounded-full relative ${(profile?.is_verified && !radioState?.auto_dj_enabled) || playbackMode === 'local' ? 'cursor-pointer' : ''}`}
              onClick={handleScrub}
            >
              <div
                className='bg-gray-300 h-full rounded-full transition-all duration-100 ease-linear'
                style={{
                  width: `${duration ? (progress / duration) * 100 : 0}%`,
                }}
              ></div>
            </div>
          </div>

          {/* VOLUME & VINYL TOGGLE */}
          <div className='flex flex-col items-center gap-3 w-full max-w-xs mb-6 px-4'>
            <div className='flex items-center gap-3 w-full'>
              <i className='fa-solid fa-volume-low text-gray-500 text-sm'></i>
              <input
                type='range'
                min='0'
                max='1'
                step='0.01'
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className='w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer'
              />
              <i className='fa-solid fa-volume-high text-gray-500 text-sm'></i>
            </div>
            <label className='flex items-center gap-2 text-xs text-gray-500 cursor-pointer mt-1'>
              <input
                type='checkbox'
                checked={spinVinyl}
                onChange={(e) => setSpinVinyl(e.target.checked)}
                className='accent-gray-600'
              />
              Spin Vinyl Effect
            </label>
          </div>

          {((profile?.is_verified &&
            !radioState?.auto_dj_enabled &&
            playbackMode === 'live') ||
            playbackMode === 'local') && (
            <div className='flex items-center gap-6 md:gap-8'>
              <button
                onClick={() =>
                  broadcastTransport(
                    'seek',
                    Math.max(0, (audioRef.current?.currentTime || 0) - 10),
                  )
                }
                className='text-xl text-gray-400 hover:text-white transition'
              >
                <i className='fa-solid fa-backward-step'></i>
              </button>
              {isPlayingUI ? (
                <button
                  onClick={() => broadcastTransport('pause')}
                  className='w-12 h-12 md:w-14 md:h-14 bg-gray-800 rounded-full flex items-center justify-center text-white text-xl hover:bg-gray-700 transition'
                >
                  <i className='fa-solid fa-pause'></i>
                </button>
              ) : (
                <button
                  onClick={() => broadcastTransport('play')}
                  className='w-12 h-12 md:w-14 md:h-14 bg-white rounded-full flex items-center justify-center text-black text-xl pl-1 hover:bg-gray-200 transition'
                >
                  <i className='fa-solid fa-play'></i>
                </button>
              )}
              <button
                onClick={() =>
                  broadcastTransport(
                    'seek',
                    Math.min(
                      duration,
                      (audioRef.current?.currentTime || 0) + 10,
                    ),
                  )
                }
                className='text-xl text-gray-400 hover:text-white transition'
              >
                <i className='fa-solid fa-forward-step'></i>
              </button>
              {playbackMode === 'live' && (
                <button
                  onClick={() => handleAutoNext()}
                  className='ml-2 text-xl text-gray-500 hover:text-white transition'
                  title='Skip Track'
                >
                  <i className='fa-solid fa-forward'></i>
                </button>
              )}
            </div>
          )}
        </div>

        {/* RIGHT: Queue & Upload/Suggest */}
        <div className='w-full md:w-1/3 flex flex-col gap-4 overflow-y-auto min-h-[500px] md:min-h-0'>
          <div className='bg-gray-900/40 border border-white/5 rounded-xl p-4 flex-1 overflow-y-auto flex flex-col'>
            <h3 className='text-sm font-bold text-gray-400 mb-4 uppercase tracking-wider border-b border-white/10 pb-2 shrink-0'>
              Up Next
            </h3>
            <div className='shrink-0 mb-6'>
              {upcomingQueue.length === 0 ? (
                <p className='text-gray-600 text-sm'>No upcoming tracks.</p>
              ) : (
                <div className='flex flex-col gap-2'>
                  {upcomingQueue.map((track) => {
                    const trackLikes = likes.filter(
                      (l) => l.queue_id === track.id,
                    );
                    const hasLiked =
                      session?.user &&
                      trackLikes.some((l) => l.user_id === session.user.id);

                    return (
                      <div
                        key={track.id}
                        className='flex items-center gap-3 bg-black/30 p-2 rounded group'
                      >
                        {track.album_cover_url ? (
                          <img
                            src={track.album_cover_url}
                            alt=''
                            className='w-8 h-8 rounded object-cover'
                          />
                        ) : (
                          <div className='w-8 h-8 bg-gray-800 rounded flex items-center justify-center'>
                            <i className='fa-solid fa-music text-xs'></i>
                          </div>
                        )}
                        <div className='flex flex-col overflow-hidden flex-1'>
                          <span className='text-sm truncate text-gray-200 flex items-center gap-2'>
                            {track.track_title}
                            {track.is_explicit && (
                              <span className='bg-red-600 text-white text-[9px] px-1 rounded font-bold'>
                                E
                              </span>
                            )}
                            {isYouTubeUrl(track.audio_url) && (
                              <i className='fa-brands fa-youtube text-red-500 text-xs ml-1'></i>
                            )}
                          </span>
                          <span className='text-xs truncate text-gray-500'>
                            {track.artist}
                          </span>
                        </div>

                        <div className='flex items-center gap-3 px-2'>
                          {/* LIKES */}
                          <button
                            onClick={() => handleToggleLike(track)}
                            className={`flex items-center gap-1 text-xs transition ${hasLiked ? 'text-pink-500 hover:text-pink-400' : 'text-gray-500 hover:text-pink-400'}`}
                            title='Like Track'
                          >
                            <i
                              className={`${hasLiked ? 'fa-solid' : 'fa-regular'} fa-heart`}
                            ></i>
                            {trackLikes.length > 0 && (
                              <span>{trackLikes.length}</span>
                            )}
                          </button>

                          <div className='flex opacity-100 md:opacity-0 group-hover:opacity-100 transition gap-3'>
                            <button
                              onClick={() => handlePlayTrack(track, true)}
                              title='Play Locally'
                              className='text-gray-500 hover:text-purple-400 transition'
                            >
                              <i className='fa-solid fa-headphones'></i>
                            </button>
                            {profile?.is_verified && (
                              <>
                                <button
                                  onClick={() => handlePlayTrack(track)}
                                  title='Play on Live Broadcast'
                                  className='text-gray-500 hover:text-white transition'
                                >
                                  <i className='fa-solid fa-play'></i>
                                </button>
                                <button
                                  onClick={() => handleDeleteTrack(track)}
                                  className='text-gray-500 hover:text-red-400 transition'
                                >
                                  <i className='fa-solid fa-trash'></i>
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className='flex flex-col flex-1 min-h-0'>
              <div className='flex items-center justify-between border-b border-white/10 pb-2 mb-4 shrink-0 mt-2'>
                <h3 className='text-sm font-bold text-gray-500 uppercase tracking-wider'>
                  Library
                </h3>
                <div className='relative w-32'>
                  <i className='fa-solid fa-search absolute left-2 top-1.5 text-xs text-gray-500'></i>
                  <input
                    type='text'
                    placeholder='Search...'
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className='w-full bg-black/50 border border-white/10 rounded pl-7 pr-2 py-1 outline-none text-white text-xs'
                  />
                </div>
              </div>

              <div className='flex flex-col gap-2 overflow-y-auto flex-1 pb-4'>
                {filteredLibrary.length === 0 ? (
                  <p className='text-gray-600 text-sm'>No tracks found.</p>
                ) : (
                  filteredLibrary
                    .slice()
                    .reverse()
                    .map((track) => {
                      const trackLikes = likes.filter(
                        (l) => l.queue_id === track.id,
                      );
                      const hasLiked =
                        session?.user &&
                        trackLikes.some((l) => l.user_id === session.user.id);

                      return (
                        <div
                          key={track.id}
                          className='flex items-center gap-3 bg-black/20 p-2 rounded group hover:bg-black/40 transition'
                        >
                          {track.album_cover_url ? (
                            <img
                              src={track.album_cover_url}
                              alt=''
                              className='w-8 h-8 rounded object-cover'
                            />
                          ) : (
                            <div className='w-8 h-8 bg-gray-900 rounded flex items-center justify-center'>
                              <i className='fa-solid fa-check text-xs'></i>
                            </div>
                          )}
                          <div className='flex flex-col overflow-hidden flex-1'>
                            <span className='text-sm truncate text-gray-300 flex items-center gap-2'>
                              {track.track_title}
                              {track.is_explicit && (
                                <span className='bg-red-600 text-white text-[9px] px-1 rounded font-bold'>
                                  E
                                </span>
                              )}
                              {isYouTubeUrl(track.audio_url) && (
                                <i className='fa-brands fa-youtube text-red-500 text-xs ml-1'></i>
                              )}
                            </span>
                            <span className='text-xs truncate text-gray-600'>
                              {track.artist}
                            </span>
                          </div>

                          <div className='flex items-center gap-3 px-2'>
                            {/* LIKES */}
                            <button
                              onClick={() => handleToggleLike(track)}
                              className={`flex items-center gap-1 text-xs transition ${hasLiked ? 'text-pink-500 hover:text-pink-400' : 'text-gray-500 hover:text-pink-400'}`}
                              title='Like Track'
                            >
                              <i
                                className={`${hasLiked ? 'fa-solid' : 'fa-regular'} fa-heart`}
                              ></i>
                              {trackLikes.length > 0 && (
                                <span>{trackLikes.length}</span>
                              )}
                            </button>

                            <div className='flex opacity-100 md:opacity-0 group-hover:opacity-100 transition gap-3'>
                              <button
                                onClick={() => handlePlayTrack(track, true)}
                                title='Play Locally'
                                className='text-gray-500 hover:text-purple-400 transition'
                              >
                                <i className='fa-solid fa-headphones'></i>
                              </button>
                              {profile?.is_verified && (
                                <>
                                  <button
                                    onClick={() => addToQueue(track)}
                                    title='Add to Queue'
                                    className='text-gray-500 hover:text-green-400 transition'
                                  >
                                    <i className='fa-solid fa-plus'></i>
                                  </button>
                                  <button
                                    onClick={() => handlePlayTrack(track)}
                                    title='Play on Live Broadcast'
                                    className='text-gray-500 hover:text-white transition'
                                  >
                                    <i className='fa-solid fa-play'></i>
                                  </button>
                                  <button
                                    onClick={() => handleDeleteTrack(track)}
                                    title='Delete'
                                    className='text-gray-500 hover:text-red-400 transition'
                                  >
                                    <i className='fa-solid fa-trash'></i>
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          </div>

          {profile?.is_verified && pendingSuggestions.length > 0 && (
            <div className='bg-orange-900/20 border border-orange-500/30 rounded-xl p-4 shrink-0'>
              <h3 className='text-sm font-bold text-orange-400 mb-3 uppercase tracking-wider'>
                Pending Suggestions
              </h3>
              <div className='flex flex-col gap-2 max-h-48 overflow-y-auto'>
                {pendingSuggestions.map((s) => (
                  <div
                    key={s.id}
                    className='flex flex-col gap-1 bg-black/40 p-2 rounded'
                  >
                    <div className='flex items-center justify-between'>
                      <div className='flex flex-col overflow-hidden flex-1 mr-2'>
                        <span className='text-sm text-gray-200 truncate'>
                          {s.track_title}
                        </span>
                        <span className='text-xs text-gray-500 truncate'>
                          {s.artist}
                        </span>
                        {/* ATTRIBUTION */}
                        <span className='text-[10px] text-gray-600 mt-1'>
                          Suggested by:{' '}
                          <span className='text-gray-400'>
                            {s.profiles?.username || 'Unknown User'}
                          </span>
                        </span>
                      </div>
                      <div className='flex gap-3 shrink-0'>
                        <button
                          onClick={() => handleAcceptSuggestion(s)}
                          className='text-green-400 hover:text-green-300 transition'
                          title='Accept'
                        >
                          <i className='fa-solid fa-check'></i>
                        </button>
                        <button
                          onClick={() => handleDeclineSuggestion(s)}
                          className='text-red-400 hover:text-red-300 transition'
                          title='Decline'
                        >
                          <i className='fa-solid fa-xmark'></i>
                        </button>
                      </div>
                    </div>
                    {s.audio_url && (
                      <a
                        href={s.audio_url}
                        target='_blank'
                        rel='noreferrer'
                        className='text-[10px] text-blue-400 hover:underline inline-block w-max mt-1'
                      >
                        <i className='fa-solid fa-up-right-from-square mr-1'></i>
                        Review Link
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {profile?.is_verified && (
            <div className='bg-gray-900/40 border border-white/5 rounded-xl p-4 shrink-0'>
              <h3 className='text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider'>
                Upload New Track
              </h3>
              <form
                onSubmit={handleFileUpload}
                className='flex flex-col gap-2 text-sm'
              >
                <input
                  type='text'
                  placeholder='Track Title'
                  required
                  value={newTrack.title}
                  onChange={(e) =>
                    setNewTrack({ ...newTrack, title: e.target.value })
                  }
                  className='bg-black/50 border border-white/10 rounded p-2 outline-none text-white'
                />
                <input
                  type='text'
                  placeholder='Artist'
                  required
                  value={newTrack.artist}
                  onChange={(e) =>
                    setNewTrack({ ...newTrack, artist: e.target.value })
                  }
                  className='bg-black/50 border border-white/10 rounded p-2 outline-none text-white'
                />
                <label className='flex items-center gap-2 mt-1 text-gray-400 cursor-pointer w-max'>
                  <input
                    type='checkbox'
                    checked={newTrack.isExplicit}
                    onChange={(e) =>
                      setNewTrack({ ...newTrack, isExplicit: e.target.checked })
                    }
                    className='accent-red-600'
                  />
                  Explicit Content
                </label>
                <div className='mt-1'>
                  <span className='text-xs text-gray-500 block mb-1'>
                    Audio File (Max 25MB):
                  </span>
                  <input
                    type='file'
                    accept='audio/*'
                    required
                    onChange={(e) =>
                      setNewTrack({
                        ...newTrack,
                        audioFile: e.target.files?.[0] || null,
                      })
                    }
                    className='text-gray-400 file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-gray-800 file:text-white hover:file:bg-gray-700 w-full'
                  />
                </div>
                <div className='mt-1'>
                  <span className='text-xs text-gray-500 block mb-1'>
                    Album Cover (Optional):
                  </span>
                  <input
                    type='file'
                    accept='image/*'
                    onChange={(e) =>
                      setNewTrack({
                        ...newTrack,
                        coverFile: e.target.files?.[0] || null,
                      })
                    }
                    className='text-gray-400 file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-gray-800 file:text-white hover:file:bg-gray-700 w-full'
                  />
                </div>
                <button
                  disabled={isUploading}
                  type='submit'
                  className='bg-white hover:bg-gray-200 text-black font-bold py-2 rounded mt-2 transition disabled:opacity-50 flex justify-center items-center'
                >
                  {isUploading ? (
                    <>
                      <i className='fa-solid fa-circle-notch fa-spin mr-2'></i>{' '}
                      Processing...
                    </>
                  ) : (
                    'Add Track'
                  )}
                </button>
              </form>
            </div>
          )}

          {!profile?.is_verified && (
            <div className='bg-gray-900/40 border border-white/5 rounded-xl p-4 shrink-0'>
              <h3 className='text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider flex justify-between items-center'>
                <span>Suggest a Track</span>
                <span className='text-[10px] bg-gray-800 px-2 py-1 rounded-full text-gray-300'>
                  {Math.max(0, 2 - weeklySuggestionCount)} left this week
                </span>
              </h3>

              {weeklySuggestionCount >= 2 ? (
                <div className='p-3 bg-red-900/20 border border-red-500/20 rounded text-red-400 text-sm text-center'>
                  You&apos;ve hit your limit of 2 suggestions for the week.
                  Thanks for contributing! Check back later.
                </div>
              ) : (
                <form
                  onSubmit={handleSuggestionSubmit}
                  className='flex flex-col gap-2 text-sm'
                >
                  <input
                    type='text'
                    placeholder='Track Title'
                    required
                    value={suggestionForm.title}
                    onChange={(e) =>
                      setSuggestionForm({
                        ...suggestionForm,
                        title: e.target.value,
                      })
                    }
                    className='bg-black/50 border border-white/10 rounded p-2 outline-none text-white'
                  />
                  <input
                    type='text'
                    placeholder='Artist'
                    required
                    value={suggestionForm.artist}
                    onChange={(e) =>
                      setSuggestionForm({
                        ...suggestionForm,
                        artist: e.target.value,
                      })
                    }
                    className='bg-black/50 border border-white/10 rounded p-2 outline-none text-white'
                  />
                  <label className='flex items-center gap-2 mt-1 text-gray-400 cursor-pointer w-max'>
                    <input
                      type='checkbox'
                      checked={suggestionForm.isExplicit}
                      onChange={(e) =>
                        setSuggestionForm({
                          ...suggestionForm,
                          isExplicit: e.target.checked,
                        })
                      }
                      className='accent-red-600'
                    />
                    Explicit Content
                  </label>

                  <div className='flex gap-2 mt-2 border-b border-white/10 pb-2'>
                    <button
                      type='button'
                      onClick={() =>
                        setSuggestionForm({ ...suggestionForm, type: 'link' })
                      }
                      className={`flex-1 py-1 rounded text-xs transition ${suggestionForm.type === 'link' ? 'bg-gray-700 text-white' : 'bg-transparent text-gray-500 hover:text-gray-300'}`}
                    >
                      Link / YouTube
                    </button>
                    <button
                      type='button'
                      onClick={() =>
                        setSuggestionForm({ ...suggestionForm, type: 'file' })
                      }
                      className={`flex-1 py-1 rounded text-xs transition ${suggestionForm.type === 'file' ? 'bg-gray-700 text-white' : 'bg-transparent text-gray-500 hover:text-gray-300'}`}
                    >
                      MP3 File
                    </button>
                  </div>

                  <div className='mt-1'>
                    {suggestionForm.type === 'link' ? (
                      <input
                        type='url'
                        placeholder='Direct Audio URL or YouTube Link'
                        required
                        value={suggestionForm.link}
                        onChange={(e) =>
                          setSuggestionForm({
                            ...suggestionForm,
                            link: e.target.value,
                          })
                        }
                        className='w-full bg-black/50 border border-white/10 rounded p-2 outline-none text-white'
                      />
                    ) : (
                      <input
                        type='file'
                        accept='audio/mpeg,audio/mp3'
                        required
                        onChange={(e) =>
                          setSuggestionForm({
                            ...suggestionForm,
                            file: e.target.files?.[0] || null,
                          })
                        }
                        className='text-gray-400 file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-gray-800 file:text-white hover:file:bg-gray-700 w-full'
                      />
                    )}
                  </div>

                  {/* NEW: Cover Upload for regular users */}
                  <div className='mt-1'>
                    <span className='text-xs text-gray-500 block mb-1'>
                      Album Cover (Optional):
                    </span>
                    <input
                      type='file'
                      accept='image/*'
                      onChange={(e) =>
                        setSuggestionForm({
                          ...suggestionForm,
                          coverFile: e.target.files?.[0] || null,
                        })
                      }
                      className='text-gray-400 file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-gray-800 file:text-white hover:file:bg-gray-700 w-full'
                    />
                  </div>

                  <button
                    disabled={isSuggesting}
                    type='submit'
                    className='bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded mt-2 transition disabled:opacity-50'
                  >
                    {isSuggesting ? 'Sending...' : 'Submit Suggestion'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (theme === 'aero-os') {
    return (
      <div
        className={`h-screen w-full flex flex-col ${themeClass}`}
        style={themeStyle}
      >
        <AeroOS chatMain={MainContent} />
      </div>
    );
  }
  if (theme === 'crimnet') {
    return (
      <div
        className={`h-screen w-full flex flex-col ${themeClass}`}
        style={themeStyle}
      >
        <CrimNet chatMain={MainContent} />
      </div>
    );
  }
  return (
    <div
      className={`h-screen w-full flex flex-col ${themeClass}`}
      style={themeStyle}
    >
      {MainContent}
    </div>
  );
};

export default ConnectRadio;
