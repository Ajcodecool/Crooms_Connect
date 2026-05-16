import {
  useState,
  useEffect,
  useRef,
  useLayoutEffect,
  useMemo,
  useCallback,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useServerSchedule } from '../hooks/useServerSchedule';
import { badgeDefinitions } from '../data/badges'; // Ensure this exists
import './CanvasChat.css';

// === COMPONENT: BANNED OVERLAY ===
const BannedOverlay = ({ reason }) => (
  <div className='fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-md p-4'>
    <div className='bg-red-950 border-2 border-red-600 rounded-xl shadow-2xl p-8 max-w-md w-full text-center'>
      <h2 className='text-3xl font-bold text-white mb-2'>Access Denied</h2>
      <p className='text-red-200 text-lg mb-6'>
        You have been suspended from this course.
      </p>
      {reason && <p className='text-white italic mb-4'>&quot;{reason}&quot;</p>}
      <button
        onClick={() => (window.location.href = '/')}
        className='bg-red-600 text-white px-6 py-3 rounded-lg font-bold w-full'
      >
        Return to Dashboard
      </button>
    </div>
  </div>
);

// === COMPONENT: TIMEOUT OVERLAY ===
const TimeoutOverlay = ({ timeoutUntil, reason, onExpire }) => {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const calculateTime = () => {
      const diff = Math.floor((new Date(timeoutUntil) - new Date()) / 1000);
      return diff > 0 ? diff : 0;
    };
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTimeLeft(calculateTime());
    const timer = setInterval(() => {
      const remaining = calculateTime();
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
        onExpire();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [timeoutUntil, onExpire]);

  if (timeLeft <= 0) return null;
  const formatTime = (s) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className='fixed inset-0 z-[60] flex items-center justify-center bg-white/90 backdrop-blur-sm'>
      <div className='bg-white border border-gray-300 shadow-xl p-8 rounded-md text-center'>
        <h3 className='text-xl font-bold text-[#2D3B45]'>Read Only Mode</h3>
        <p className='text-gray-600 mb-2'>You are in a timeout.</p>
        <div className='text-4xl font-bold text-[#2D3B45] font-mono'>
          {formatTime(timeLeft)}
        </div>
        {reason && (
          <p className='text-red-500 text-sm mt-2 italic'>
            &quot;{reason}&quot;
          </p>
        )}
      </div>
    </div>
  );
};

// === COMPONENT: WARNING MODAL ===
const WarningModal = ({ warnings, onClose }) => {
  const [agreed, setAgreed] = useState(false);
  if (!warnings || warnings.length === 0) return null;
  const currentWarning = warnings[0];

  return (
    <div className='fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-6 backdrop-blur-sm'>
      <div className='bg-white border-l-4 border-red-600 rounded-lg shadow-2xl p-8 max-w-lg w-full'>
        <h2 className='text-2xl font-bold text-red-700 mb-2'>
          Conduct Warning
        </h2>
        <div className='bg-red-50 p-4 rounded mb-4 border border-red-100'>
          <p className='text-xs text-red-800 uppercase font-bold mb-1'>
            Instructor Message:
          </p>
          <p className='text-gray-800 italic'>
            &quot;{currentWarning.message}&quot;
          </p>
        </div>
        <label className='flex items-start gap-3 cursor-pointer mb-6 select-none'>
          <input
            type='checkbox'
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className='mt-1'
          />
          <span className='text-gray-600 text-sm'>
            I acknowledge this warning and understand that further violations
            may result in suspension.
          </span>
        </label>
        <button
          onClick={() => onClose(currentWarning.id)}
          disabled={!agreed}
          className={`w-full font-bold py-2 rounded transition-all ${agreed ? 'bg-red-700 hover:bg-red-800 text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
        >
          Acknowledge
        </button>
      </div>
    </div>
  );
};

// === COMPONENT: BADGE LIST ===
const BadgeList = ({ badgeData }) => {
  if (!badgeData) return null;
  let badges = [];
  if (Array.isArray(badgeData)) {
    badges = badgeData;
  } else if (typeof badgeData === 'string') {
    try {
      if (badgeData.startsWith('[')) badges = JSON.parse(badgeData);
      else badges = [badgeData];
    } catch {
      badges = [badgeData];
    }
  }
  return (
    <div className='flex items-center gap-1 ml-2'>
      {badges.map((bId, i) => {
        const def = badgeDefinitions.find((def) => def.id === bId);
        if (!def) return null;
        return (
          <img
            key={i}
            src={def.fileName}
            alt={def.name}
            title={def.name}
            className='w-4 h-4 object-contain'
          />
        );
      })}
    </div>
  );
};

// === MAIN COMPONENT ===
const CanvasChat = () => {
  const navigate = useNavigate();

  // === SYNCED TIMER HOOK ===
  const { periodName, timeLeft, scheduleData } = useServerSchedule();

  // === TIMER STYLE ===
  const timerStyle = useMemo(() => {
    let style = {
      color: 'text-gray-600',
      blink: false,
      bg: 'bg-gray-100',
      border: 'border-gray-300',
    };
    if (!scheduleData || !periodName) return style;
    const currentBlock = scheduleData.find((b) => b.period_name === periodName);
    if (!currentBlock) return style;
    const now = new Date();
    const [sH, sM] = currentBlock.start_time.split(':');
    const [eH, eM] = currentBlock.end_time.split(':');
    const start = new Date();
    start.setHours(sH, sM, 0);
    const end = new Date();
    end.setHours(eH, eM, 0);
    const totalDuration = end - start;
    const remaining = end - now;
    if (totalDuration <= 0) return style;
    const percentage = (remaining / totalDuration) * 100;
    if (percentage <= 10)
      return {
        color: 'text-red-600',
        blink: true,
        bg: 'bg-red-50',
        border: 'border-red-400',
      };
    else if (percentage <= 20)
      return {
        color: 'text-red-600',
        blink: false,
        bg: 'bg-red-50',
        border: 'border-red-200',
      };
    else if (percentage <= 30)
      return {
        color: 'text-yellow-600',
        blink: false,
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
      };
    return style;
  }, [periodName, scheduleData]);

  // === STATE ===
  const [messages, setMessages] = useState([]);
  const [, setOnlineUsers] = useState({});
  const [typers, setTypers] = useState({});
  const [session, setSession] = useState(null);
  const [inputHtml, setInputHtml] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Interaction State
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingId, setEditingId] = useState(null);

  // Discipline & Profile
  const [profile, setProfile] = useState(null);
  const [isTimedOut, setIsTimedOut] = useState(false);
  const [warnings, setWarnings] = useState([]);
  const [myBadges, setMyBadges] = useState([]); /// Changed to Array
  const [isBanned, setIsBanned] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [chatLocked, setChatLocked] = useState(false);
  const [fireworkCooldown] = useState(false);

  // Refs
  const messagesEndRef = useRef(null);
  const messagesBoxRef = useRef(null);
  const previousScrollHeightRef = useRef(0);
  const editorRef = useRef(null);
  const channelRef = useRef(null);
  const fireworksCanvasRef = useRef(null);
  const particlesRef = useRef([]);
  const animationFrameRef = useRef(null);

  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // === HELPERS ===
  const getStorageAvatar = (userId) => {
    const { data } = supabase.storage
      .from('profile-pictures')
      .getPublicUrl(`${userId}.png`);
    return data.publicUrl;
  };

  const resolveAvatar = useCallback((user) => {
    if (!user) return null;
    const meta = user.user_metadata?.avatar_url;
    if (meta && !meta.includes('dicebear')) return meta;
    return getStorageAvatar(user.id);
  }, []);

  const getUserColor = (name) => {
    const colors = ['#3b5a70', '#e04f38', '#008ee2', '#252529', '#32a852'];
    let hash = 0;
    if (name)
      for (let i = 0; i < name.length; i++)
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  // === FIREWORKS ENGINE ===
  const runLocalFireworks = () => {
    const canvas = fireworksCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (
      canvas.width !== window.innerWidth ||
      canvas.height !== window.innerHeight
    ) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    if (particlesRef.current.length > 1000) return;
    let burstCount = 0;
    const burstInterval = setInterval(() => {
      const explosionCount = Math.floor(Math.random() * 2) + 2;
      for (let k = 0; k < explosionCount; k++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height * 0.6;
        const color = `hsl(${Math.random() * 360}, 100%, 50%)`;
        for (let p = 0; p < 40; p++) {
          const angle = Math.random() * Math.PI * 2;
          const velocity = Math.random() * 4 + 2;
          particlesRef.current.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * velocity,
            vy: Math.sin(angle) * velocity,
            life: 120 + Math.random() * 60,
            color: color,
            alpha: 1,
          });
        }
      }
      burstCount++;
      if (burstCount >= 10) clearInterval(burstInterval);
    }, 500);

    if (!animationFrameRef.current) {
      const animate = () => {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = 'lighter';
        for (let i = particlesRef.current.length - 1; i >= 0; i--) {
          const p = particlesRef.current[i];
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.05;
          p.life--;
          p.alpha -= 0.005;
          ctx.fillStyle = p.color;
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
          ctx.fill();
          if (p.life <= 0 || p.alpha <= 0) particlesRef.current.splice(i, 1);
        }
        if (particlesRef.current.length > 0 || burstCount < 10) {
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          animationFrameRef.current = null;
        }
      };
      animate();
    }
  };

  // === DATA LOADING ===
  useEffect(() => {
    const fetchProfileAndWarnings = async (userId) => {
      const { data: userData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (userData) {
        setProfile(userData);
        // Robust Badge Parse
        let badges = [];
        if (Array.isArray(userData.selected_badge))
          badges = userData.selected_badge;
        else if (typeof userData.selected_badge === 'string') {
          try {
            if (userData.selected_badge.startsWith('['))
              badges = JSON.parse(userData.selected_badge);
            else if (userData.selected_badge)
              badges = [userData.selected_badge];
          } catch {
            badges = [userData.selected_badge];
          }
        }
        setMyBadges(badges);
        if (userData.is_banned) {
          setIsBanned(true);
          setBanReason(userData.ban_reason);
        } else {
          setIsBanned(false);
        }
        checkTimeout(userData);
      }
      const { data: warnData } = await supabase
        .from('user_warnings')
        .select('*')
        .eq('user_id', userId);
      if (warnData) setWarnings(warnData);

      const profileChannel = supabase
        .channel(`canvas_profile:${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${userId}`,
          },
          (payload) => {
            const newData = payload.new;
            setProfile(newData);
            let newBadges = [];
            if (Array.isArray(newData.selected_badge))
              newBadges = newData.selected_badge;
            else if (typeof newData.selected_badge === 'string') {
              try {
                if (newData.selected_badge.startsWith('['))
                  newBadges = JSON.parse(newData.selected_badge);
                else newBadges = [newData.selected_badge];
              } catch {
                // continue
              }
            }
            setMyBadges(newBadges);
            if (newData.is_banned) {
              setIsBanned(true);
              setBanReason(newData.ban_reason);
            } else {
              setIsBanned(false);
            }
            checkTimeout(newData);
          },
        )
        .subscribe();

      const warningChannel = supabase
        .channel(`canvas_warnings:${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'user_warnings',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => setWarnings((prev) => [...prev, payload.new]),
        )
        .subscribe();

      const cleanup = () => {
        supabase.removeChannel(profileChannel);
        supabase.removeChannel(warningChannel);
      };
      return { cleanup };
    };

    const loadInitialMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(50);
      if (data) setMessages(data.reverse());
      scrollToBottom();
    };

    let cleanupFunctions = [];
    const initialize = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }
      setSession(session);
      loadInitialMessages();
      fetchChatSettings();
      const { cleanup } = await fetchProfileAndWarnings(session.user.id);
      if (cleanup) cleanupFunctions.push(cleanup);
    };
    initialize();
    return () => cleanupFunctions.forEach((fn) => fn());
  }, [navigate]);

  const fetchChatSettings = async () => {
    const { data } = await supabase
      .from('system_settings')
      .select('*')
      .eq('key', 'chat_locked')
      .maybeSingle();
    if (data) setChatLocked(data.value === 'true' || data.value === true);
    const settingsSub = supabase
      .channel('settings-updates-canvas')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'system_settings',
          filter: 'key=eq.chat_locked',
        },
        (payload) =>
          setChatLocked(
            payload.new.value === 'true' || payload.new.value === true,
          ),
      )
      .subscribe();
    return () => supabase.removeChannel(settingsSub);
  };

  const checkTimeout = (userProfile) => {
    if (
      userProfile.chat_timeout_until &&
      new Date(userProfile.chat_timeout_until) > new Date()
    )
      setIsTimedOut(true);
    else setIsTimedOut(false);
  };

  const handleDismissWarning = async (warningId) => {
    try {
      const { error } = await supabase
        .from('user_warnings')
        .delete()
        .eq('id', warningId);
      if (error) throw error;
      setWarnings((prev) => prev.filter((w) => w.id !== warningId));
    } catch (err) {
      console.error(err);
    }
  };

  // === CHAT REALTIME & LOGIC ===
  useEffect(() => {
    if (!session?.user) return;
    const user = session.user;
    const username = user.user_metadata?.username || user.email.split('@')[0];
    const userAvatar = resolveAvatar(user);

    const channel = supabase.channel('public:room1', {
      config: { presence: { key: user.id } },
    });
    channel
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
          if (messagesBoxRef.current) {
            const { scrollTop, scrollHeight, clientHeight } =
              messagesBoxRef.current;
            if (scrollHeight - scrollTop - clientHeight < 200) scrollToBottom();
          }
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        (payload) => {
          setMessages((prev) =>
            prev.map((msg) => (msg.id === payload.new.id ? payload.new : msg)),
          );
        },
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages' },
        (payload) => {
          setMessages((prev) =>
            prev.filter((msg) => msg.id !== payload.old.id),
          );
        },
      )
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        setTypers((prev) => ({ ...prev, [payload.username]: Date.now() }));
        setTimeout(
          () =>
            setTypers((prev) => {
              const n = { ...prev };
              delete n[payload.username];
              return n;
            }),
          3000,
        );
      })
      .on('broadcast', { event: 'fireworks' }, () => runLocalFireworks())
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users = {};
        Object.keys(state).forEach((key) =>
          state[key].forEach((p) => (users[p.user_id] = p)),
        );
        setOnlineUsers(users);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED')
          await channel.track({
            user_id: user.id,
            username,
            avatar_url: userAvatar,
            badge_type: myBadges,
          });
      });

    if (myBadges.length > 0)
      channel.track({
        user_id: user.id,
        username,
        avatar_url: userAvatar,
        badge_type: myBadges,
      });

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, myBadges, resolveAvatar]);

  const handleScroll = () => {
    if (
      messagesBoxRef.current.scrollTop === 0 &&
      hasMore &&
      !isLoadingMore &&
      messages.length > 0
    )
      loadMoreMessages();
  };
  const loadMoreMessages = async () => {
    setIsLoadingMore(true);
    if (messagesBoxRef.current)
      previousScrollHeightRef.current = messagesBoxRef.current.scrollHeight;
    const oldestMsg = messages[0];
    if (!oldestMsg) {
      setIsLoadingMore(false);
      return;
    }
    const { data } = await supabase
      .from('messages')
      .select('*')
      .lt('timestamp', oldestMsg.timestamp)
      .order('timestamp', { ascending: false })
      .limit(50);
    if (data && data.length > 0)
      setMessages((prev) => [...data.reverse(), ...prev]);
    else setHasMore(false);
    setIsLoadingMore(false);
  };
  useLayoutEffect(() => {
    if (previousScrollHeightRef.current > 0 && messagesBoxRef.current) {
      messagesBoxRef.current.scrollTop =
        messagesBoxRef.current.scrollHeight - previousScrollHeightRef.current;
      previousScrollHeightRef.current = 0;
    }
  }, [messages]);

  const scrollToBottom = () =>
    setTimeout(
      () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }),
      100,
    );

  // === ACTIONS ===
  const handleTriggerFireworks = async () => {
    runLocalFireworks();
    if (channelRef.current)
      await channelRef.current.send({
        type: 'broadcast',
        event: 'fireworks',
        payload: {},
      });
  };

  const handleSendMessage = async () => {
    if (chatLocked && !profile?.is_verified) {
      alert('This discussion is currently locked.');
      return;
    }
    if (!inputHtml.trim() || isSending || isTimedOut || isBanned) return;
    setIsSending(true);
    const user = session.user;
    const username = user.user_metadata?.username || user.email.split('@')[0];
    const currentAvatar = resolveAvatar(user);

    try {
      if (editingId) {
        await supabase
          .from('messages')
          .update({ message: inputHtml, is_edited: true })
          .eq('id', editingId);
      } else {
        await supabase.from('messages').insert([
          {
            message: inputHtml,
            user_id: user.id,
            username,
            avatar_url: currentAvatar,
            timestamp: new Date().toISOString(),
            badge_type: myBadges,
            parent_id: replyingTo ? replyingTo.id : null,
          },
        ]);
      }
      if (editorRef.current) editorRef.current.innerHTML = '';
      setInputHtml('');
      setReplyingTo(null);
      setEditingId(null);
      scrollToBottom();
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleTyping = () => {
    if (
      channelRef.current &&
      !isTimedOut &&
      !isBanned &&
      (!chatLocked || profile?.is_verified)
    ) {
      const username = session.user.user_metadata?.username || 'Someone';
      channelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { username },
      });
    }
  };

  const handleDeleteMessage = async (msgId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    try {
      await supabase
        .from('messages')
        .update({ is_deleted: true, message: '<i>[Content Deleted]</i>' })
        .eq('id', msgId);
    } catch (error) {
      console.error(error);
    }
  };

  const execCmd = (cmd) => {
    document.execCommand(cmd, false, null);
    editorRef.current?.focus();
  };

  const getTypingText = () => {
    const myName = session?.user?.user_metadata?.username;
    const names = Object.keys(typers).filter((n) => n !== myName);
    if (names.length === 0) return '';
    return names.length === 1
      ? `${names[0]} is typing...`
      : `${names.length} people are typing...`;
  };

  const initReply = (msg) => {
    setReplyingTo(msg);
    setEditingId(null);
    if (editorRef.current) editorRef.current.focus();
  };
  const initEdit = (msg) => {
    setEditingId(msg.id);
    setReplyingTo(null);
    setInputHtml(msg.message);
    if (editorRef.current) {
      editorRef.current.innerHTML = msg.message;
      editorRef.current.focus();
    }
  };
  const cancelAction = () => {
    setReplyingTo(null);
    setEditingId(null);
    setInputHtml('');
    if (editorRef.current) editorRef.current.innerHTML = '';
  };

  return (
    <div className='canvas-wrapper'>
      <canvas
        ref={fireworksCanvasRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 9999,
        }}
      />
      <WarningModal warnings={warnings} onClose={handleDismissWarning} />
      {isBanned && <BannedOverlay reason={banReason} />}
      {!isBanned && isTimedOut && profile?.chat_timeout_until && (
        <TimeoutOverlay
          timeoutUntil={profile.chat_timeout_until}
          onExpire={() => setIsTimedOut(false)}
        />
      )}

      {/* --- CANVAS GLOBAL NAV (LEFT) --- */}
      <nav className='canvas-nav'>
        <div className='canvas-logo-mark'>
          <img src='/canvlogo.png' alt='Logo' />
        </div>
        <ul>
          <li className='nav-item'>
            <i className='fa-solid fa-gauge-high'></i>
            <span>Dashboard</span>
          </li>
          <li className='nav-item active'>
            <i className='fa-solid fa-book'></i>
            <span>Courses</span>
          </li>
          <li className='nav-item'>
            <i className='fa-regular fa-calendar'></i>
            <span>Calendar</span>
          </li>
          <li className='nav-item'>
            <i className='fa-solid fa-inbox'></i>
            <span>Inbox</span>
          </li>
          <li className='nav-item' onClick={() => navigate('/')}>
            <i className='fa-solid fa-right-from-bracket'></i>
            <span>Exit</span>
          </li>
        </ul>
      </nav>

      {/* --- MAIN CONTENT AREA --- */}
      <div className='canvas-content'>
        <header className='canvas-header'>
          <div className='breadcrumb'>
            <span className='course-code'>EASON</span>
            <span className='separator'>{'>'}</span>
            <span>Discussions</span>
            <span className='separator'>{'>'}</span>
            <span className='active'>Week 4: Project Ideas</span>
          </div>

          <div className='header-actions flex items-center gap-2'>
            {/* TIMER */}
            {periodName && timeLeft && (
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium ${timerStyle.bg} ${timerStyle.border} ${timerStyle.color}`}
              >
                <span className='uppercase tracking-wider text-xs opacity-80'>
                  {periodName}
                </span>
                <span
                  className={`font-mono font-bold ${timerStyle.blink ? 'animate-pulse' : ''}`}
                >
                  {timeLeft}
                </span>
              </div>
            )}
            {/* FIREWORKS BUTTON */}
            {profile?.is_verified && (
              <button
                onClick={handleTriggerFireworks}
                disabled={fireworkCooldown}
                className={`w-8 h-8 flex items-center justify-center rounded border border-yellow-500 bg-yellow-50 text-yellow-600 ${fireworkCooldown ? 'opacity-50' : 'hover:bg-yellow-100'}`}
              >
                <i className='fa-solid fa-wand-magic-sparkles'></i>
              </button>
            )}
            {chatLocked ? (
              <button className='btn-canvas-secondary bg-red-100 text-red-700 border-red-200'>
                <i className='fa-solid fa-lock'></i> Locked
              </button>
            ) : (
              <button className='btn-canvas-secondary'>
                <i className='fa-solid fa-check'></i> Subscribed
              </button>
            )}
          </div>
        </header>

        <div className='canvas-layout-grid'>
          <div className='messages-region'>
            <div
              className='discussion-container'
              ref={messagesBoxRef}
              onScroll={handleScroll}
            >
              {isLoadingMore && (
                <div className='loading-text'>Loading older posts...</div>
              )}

              {messages.map((msg) => {
                const isSelf = session?.user?.id === msg.user_id;
                const isAdmin = profile?.is_verified;
                const canDelete = isSelf || isAdmin;
                const canEdit = isSelf && !msg.is_deleted;
                const parentMsg = msg.parent_id
                  ? messages.find((m) => m.id === msg.parent_id)
                  : null;

                return (
                  <div key={msg.id} className='discussion-card'>
                    <div
                      className='card-header'
                      style={{
                        borderLeft: `4px solid ${getUserColor(msg.username)}`,
                      }}
                    >
                      <div className='author-info flex items-center'>
                        <span
                          className='author-name'
                          style={{ color: getUserColor(msg.username) }}
                        >
                          {msg.username}
                        </span>
                        <BadgeList badgeData={msg.badge_type} />
                        <span className='post-date ml-2'>
                          {new Date(msg.timestamp).toLocaleDateString()} at{' '}
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {msg.is_edited && !msg.is_deleted && (
                          <span className='text-xs text-gray-400 italic ml-2'>
                            (edited)
                          </span>
                        )}
                      </div>
                      <i className='fa-solid fa-ellipsis-vertical options-icon'></i>
                    </div>

                    {parentMsg && (
                      <div className='mx-4 mt-2 mb-1 p-2 bg-gray-50 border-l-2 border-gray-300 text-xs text-gray-500 italic rounded'>
                        Replying to <strong>{parentMsg.username}</strong>:
                        &quot;
                        {parentMsg.message
                          .replace(/<[^>]+>/g, '')
                          .substring(0, 50)}
                        ...&quote;
                      </div>
                    )}

                    <div
                      className={`card-body ${msg.is_deleted ? 'text-gray-400 italic' : ''}`}
                      dangerouslySetInnerHTML={{ __html: msg.message }}
                    />

                    <div className='card-footer flex justify-between items-center'>
                      <div className='flex gap-4'>
                        {!msg.is_deleted && (
                          <span
                            className='action-link cursor-pointer'
                            onClick={() => initReply(msg)}
                          >
                            <i className='fa-solid fa-reply'></i> Reply
                          </span>
                        )}
                        {canEdit && (
                          <span
                            className='action-link cursor-pointer text-blue-600'
                            onClick={() => initEdit(msg)}
                          >
                            <i className='fa-solid fa-pencil'></i> Edit
                          </span>
                        )}
                        <span className='action-link cursor-pointer'>
                          <i className='fa-regular fa-thumbs-up'></i> Like
                        </span>
                      </div>
                      {canDelete && !msg.is_deleted && (
                        <button
                          onClick={() => handleDeleteMessage(msg.id)}
                          className='text-gray-400 hover:text-red-600 text-xs font-medium transition-colors flex items-center gap-1'
                        >
                          <i className='fa-solid fa-trash'></i> Delete
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* REPLY BOX */}
            <div className='reply-region'>
              {(replyingTo || editingId) && (
                <div className='flex items-center justify-between bg-blue-50 px-4 py-2 border border-blue-200 text-sm text-blue-800 rounded-t mb-0'>
                  <span className='font-semibold'>
                    {replyingTo
                      ? `Replying to ${replyingTo.username}`
                      : 'Editing message'}
                  </span>
                  <button
                    onClick={cancelAction}
                    className='text-blue-500 hover:text-blue-700'
                  >
                    <i className='fa-solid fa-xmark'></i>
                  </button>
                </div>
              )}

              {chatLocked &&
              !profile?.is_verified &&
              !isTimedOut &&
              !isBanned ? (
                <div className='bg-gray-100 border border-gray-300 p-6 text-center rounded-lg shadow-inner'>
                  <i className='fa-solid fa-lock text-gray-400 text-2xl mb-2'></i>
                  <h3 className='text-gray-600 font-bold'>
                    This topic is closed for comments.
                  </h3>
                </div>
              ) : (
                <div className='reply-box-wrapper relative'>
                  {/* Toolbar */}
                  <div className='flex gap-1 p-1 bg-gray-50 border border-b-0 border-gray-300 rounded-t-md'>
                    <button
                      className='p-1 text-gray-500 hover:bg-gray-200 rounded'
                      onClick={() => execCmd('bold')}
                    >
                      <i className='fa-solid fa-bold'></i>
                    </button>
                    <button
                      className='p-1 text-gray-500 hover:bg-gray-200 rounded'
                      onClick={() => execCmd('italic')}
                    >
                      <i className='fa-solid fa-italic'></i>
                    </button>
                    <button
                      className='p-1 text-gray-500 hover:bg-gray-200 rounded'
                      onClick={() => execCmd('underline')}
                    >
                      <i className='fa-solid fa-underline'></i>
                    </button>
                    <button
                      className='p-1 text-gray-500 hover:bg-gray-200 rounded'
                      onClick={() => execCmd('insertUnorderedList')}
                    >
                      <i className='fa-solid fa-list-ul'></i>
                    </button>
                  </div>

                  <div
                    ref={editorRef}
                    className={`canvas-editor rounded-b-md ${chatLocked && !profile?.is_verified ? 'opacity-50 cursor-not-allowed' : ''}`}
                    contentEditable={
                      !isTimedOut &&
                      !isBanned &&
                      (!chatLocked || profile?.is_verified)
                    }
                    placeholder={chatLocked ? 'Locked' : 'Write a reply...'}
                    onInput={(e) => {
                      setInputHtml(e.currentTarget.innerHTML);
                      handleTyping();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  ></div>

                  <div className='reply-actions flex justify-between items-center mt-2'>
                    <div className='text-xs text-gray-500 italic'>
                      {getTypingText()}
                    </div>
                    <button
                      className='btn-canvas-primary'
                      onClick={handleSendMessage}
                      disabled={
                        isSending ||
                        (chatLocked && !profile?.is_verified) ||
                        !inputHtml.trim()
                      }
                    >
                      {isSending
                        ? 'Posting...'
                        : editingId
                          ? 'Save Edit'
                          : 'Post Reply'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* --- RIGHT SIDEBAR --- */}
          <aside className='canvas-sidebar-right'>
            <div className='todo-section'>
              <h3>To Do</h3>
              <div className='todo-item'>
                <i className='fa-solid fa-bullhorn icon-todo'></i>
                <div className='todo-details'>
                  <span className='todo-title'>Read Chapter 4</span>
                  <span className='todo-sub'>
                    EASON • 10 points • Due Jan 12
                  </span>
                </div>
                <i className='fa-solid fa-xmark close-todo'></i>
              </div>
            </div>
            <div className='todo-section' style={{ marginTop: '20px' }}>
              <h3>Coming Up</h3>
              <div className='todo-link'>
                <i className='fa-regular fa-calendar'></i> View Calendar
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default CanvasChat;
