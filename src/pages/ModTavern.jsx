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
import './Chat.css';

// === IMPORT HELPERS & LOGIC ===
import {
  getFallbackName,
  resolveAvatar,
  getCharacterCount,
} from '../utils/chatUtils';
import { runFireworks } from '../utils/fireworks';
import { useTheme } from '../hooks/useTheme';
import { validateMessage } from '../utils/chatFilter';

// === IMPORT COMPONENTS ===
import {
  BannedOverlay,
  TimeoutOverlay,
  WarningModal,
  LockInSetupModal,
  LockInScreen,
} from '../components/chat/ChatOverlays';
import ChatHeader from '../components/chat/ChatHeader';
import ChatSidebar from '../components/chat/ChatSidebar';
import ChatMessageComponent from '../components/chat/ChatMessageComponent';
import ChatInput from '../components/chat/ChatInput';
import ChatSearchModal from '../components/chat/ChatSearchModal';
import ChatLeaderboard from '../components/chat/ChatLeaderboard';
import ChatTOSModal from '../components/chat/ChatTOSModal';

// === IMPORT THEMES ===
import AeroOS from '../themes/AeroOS';
import CrimNet from '../themes/CrimNet';

// === IMPORT ASSETS ===
import bannedImg from '../assets/banned.jpg';

// === HARDCODED RANK BYPASS (mirrors Admin Panel pattern) ===
import {
  DEVELOPER_EMAILS,
  SENIOR_DEV_EMAILS,
  ACAPOCO_SPECIAL_EMAILS,
  SPECIAL_FRESHMAN_EMAILS,
} from '../utils/adminConstants';

const ModTavern = () => {
  const navigate = useNavigate();
  const { theme, setTheme, themeClass, themeStyle } = useTheme();

  // === UI STATE ===
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // === LOADING STATE ===
  const [isLoading, setIsLoading] = useState(true);
  const [isHardcodedAdmin, setIsHardcodedAdmin] = useState(false);

  // === STATE ===
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState({});
  const [typers, setTypers] = useState({});
  const [session, setSession] = useState(null);

  // Input State
  const [inputHtml, setInputHtml] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Interaction State
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingId, setEditingId] = useState(null);

  // Mentions State
  const [unreadMentions, setUnreadMentions] = useState([]);

  // Discipline & Settings
  const [profile, setProfile] = useState(null);
  const [isTimedOut, setIsTimedOut] = useState(false);
  const [warnings, setWarnings] = useState([]);
  const [, setChatLocked] = useState(false);
  const [, setTrustedOnly] = useState(false);
  const [myBadges, setMyBadges] = useState([]);
  const [isBanned, setIsBanned] = useState(false);
  const [banReason, setBanReason] = useState('');

  const [showSettings, setShowSettings] = useState(false);
  const [fireworkCooldown, setFireworkCooldown] = useState(false);
  const [allowFireworks, setAllowFireworks] = useState(true);

  // === Lock-In State ===
  const [showLockInSetup, setShowLockInSetup] = useState(false);
  const [lockInUntil, setLockInUntil] = useState(null);
  const [lockInStart, setLockInStart] = useState(null);

  // Scroll State
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // === TOS State ===
  const [tosAccepted, setTosAccepted] = useState(
    () => localStorage.getItem('tosAccepted_v2') === 'true',
  );
  const [showTosModal, setShowTosModal] = useState(
    () => !(localStorage.getItem('tosAccepted_v2') === 'true'),
  );

  // === SERVER-SIDE BLOCKING STATE ===
  const [blockedUsers, setBlockedUsers] = useState([]);

  // === MODAL STATE ===
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // Refs
  const messagesEndRef = useRef(null);
  const messagesBoxRef = useRef(null);
  const previousScrollHeightRef = useRef(0);
  const lastMessageIdRef = useRef(null);
  const editorRef = useRef(null);
  const channelRef = useRef(null);
  const fireworksCanvasRef = useRef(null);
  const particlesRef = useRef([]);
  const animationFrameRef = useRef(null);
  const scrollTimeoutRef = useRef(null); // FIX: track timeout to prevent memory leak on unmount

  // Presence Debounce Refs to prevent dipping to 0
  const presenceTimerRef = useRef(null);
  const onlineCountRef = useRef(0);

  // === PERFORMANCE OPTIMIZATION: MEMOIZE FILTERED LIST ===
  const filteredMessages = useMemo(() => {
    return messages.filter(
      (msg) => msg && msg.username && !blockedUsers.includes(msg.username),
    );
  }, [messages, blockedUsers]);

  // === CTRL + K SEARCH LISTENER ===
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowSearchModal((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // === COOLDOWN LOGIC ===
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // === SCROLL TIMEOUT CLEANUP on unmount ===
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, []);

  // === FETCH BLOCKED USERS ===
  const fetchBlockedUsers = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('user_blocks')
        .select('blocked_username')
        .eq('blocker_id', userId);
      if (error) throw error;
      const names = data.map((r) => r.blocked_username);
      setBlockedUsers(names);
    } catch (err) {
      console.error('Error fetching blocks:', err);
    }
  };

  // === MESSAGE LOADING ===
  // FIX: clears previous timeout before setting a new one to prevent state
  // updates firing on an unmounted component
  const scrollToBottom = () => {
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      localStorage.setItem('lastModChatReadTime', Date.now().toString());
      setUnreadMentions([]);
    }, 100);
  };

  const loadInitialMessages = useCallback(async () => {
    if (isBanned) return;
    try {
      const { data } = await supabase
        .from('mod_messages')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(50);
      if (data) {
        setMessages((prev) => {
          if (prev.length === 0) {
            scrollToBottom();
            return data.reverse();
          }

          const combined = [...data.reverse(), ...prev];
          const uniqueMap = new Map();
          combined.forEach((msg) => uniqueMap.set(msg.id, msg));
          return Array.from(uniqueMap.values()).sort(
            (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
          );
        });
      }
    } catch (error) {
      console.error('Error loading initial messages', error);
    }
  }, [isBanned]);

  useEffect(() => {
    if (isBanned) {
      setMessages([]);
      setHasMore(false);
      setUnreadMentions([]);
    } else if (session && messages.length === 0 && !isLoading) {
      loadInitialMessages();
    }
  }, [isBanned, session, isLoading, loadInitialMessages, messages.length]);

  // === BROWSER WAKE UP / ONLINE DETECTOR ===
  useEffect(() => {
    const handleOnline = () => loadInitialMessages();
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [isBanned, loadInitialMessages]);

  // === INITIALIZATION ===
  useEffect(() => {
    let cleanupFunctions = [];
    const initialize = async () => {
      setIsLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }
      setSession(session);

      // Hardcoded rank bypass — same pattern as Admin Panel
      const email = session.user.email ?? '';
      const hardcoded =
        DEVELOPER_EMAILS.includes(email) ||
        SENIOR_DEV_EMAILS.includes(email) ||
        ACAPOCO_SPECIAL_EMAILS.includes(email) ||
        SPECIAL_FRESHMAN_EMAILS.includes(email);
      setIsHardcodedAdmin(hardcoded);

      const savedFireworks = localStorage.getItem('allow_fireworks');
      if (savedFireworks !== null) setAllowFireworks(savedFireworks === 'true');

      await fetchBlockedUsers(session.user.id);
      await fetchChatSettings();

      const { cleanup } = await fetchProfileAndWarnings(session.user.id);
      if (cleanup) cleanupFunctions.push(cleanup);

      const blockSub = supabase
        .channel(`blocks:${session.user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_blocks',
            filter: `blocker_id=eq.${session.user.id}`,
          },
          () => {
            fetchBlockedUsers(session.user.id);
          },
        )
        .subscribe();

      cleanupFunctions.push(() => supabase.removeChannel(blockSub));

      setIsLoading(false);
    };
    initialize();
    return () => cleanupFunctions.forEach((fn) => fn());
  }, [navigate]);

  // FIX: wrapped in useCallback so it has a stable reference and can be safely
  // included in the useEffect dependency array below
  const parseAndSetBadges = useCallback((rawBadges) => {
    let badges = [];
    if (Array.isArray(rawBadges)) {
      badges = rawBadges;
    } else if (typeof rawBadges === 'string') {
      try {
        if (rawBadges.startsWith('[')) badges = JSON.parse(rawBadges);
        else if (rawBadges) badges = [rawBadges];
      } catch {
        badges = [rawBadges];
      }
    }
    setMyBadges(badges);
  }, []);

  // === REALTIME RESTRICTIONS EVALUATOR ===
  // FIX: added parseAndSetBadges to the dependency array
  useEffect(() => {
    if (!profile) return;

    parseAndSetBadges(profile.selected_badge);

    if (profile.is_banned) {
      setIsBanned(true);
      setBanReason(profile.ban_reason);
      setMessages([]);
    } else {
      setIsBanned(false);
    }

    if (
      profile.chat_timeout_until &&
      new Date(profile.chat_timeout_until) > new Date()
    ) {
      setIsTimedOut(true);
    } else {
      setIsTimedOut(false);
    }

    if (profile.lock_in_until && new Date(profile.lock_in_until) > new Date()) {
      setLockInUntil(profile.lock_in_until);
      setLockInStart(profile.lock_in_start);
    } else {
      setLockInUntil(null);
      setLockInStart(null);
    }
  }, [profile, parseAndSetBadges]);

  const fetchProfileAndWarnings = async (userId) => {
    const { data: userData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (userData) {
      setProfile(userData);
    }

    const { data: warnData } = await supabase
      .from('user_warnings')
      .select('*')
      .eq('user_id', userId);
    if (warnData) setWarnings(warnData);

    const profileChannel = supabase
      .channel(`profile:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          setProfile((prev) => ({ ...prev, ...payload.new }));
        },
      )
      .subscribe();

    const warningChannel = supabase
      .channel(`warnings:${userId}`)
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

    return {
      cleanup: () => {
        supabase.removeChannel(profileChannel);
        supabase.removeChannel(warningChannel);
      },
    };
  };

  const fetchChatSettings = async () => {
    const { data } = await supabase
      .from('system_settings')
      .select('*')
      .in('key', ['chat_locked', 'trusted_only']);
    if (data) {
      data.forEach((setting) => {
        if (setting.key === 'chat_locked')
          setChatLocked(setting.value === 'true' || setting.value === true);
        if (setting.key === 'trusted_only')
          setTrustedOnly(setting.value === 'true' || setting.value === true);
      });
    }

    const settingsSub = supabase
      .channel('settings-updates')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'system_settings' },
        (payload) => {
          if (payload.new.key === 'chat_locked')
            setChatLocked(
              payload.new.value === 'true' || payload.new.value === true,
            );
          if (payload.new.key === 'trusted_only')
            setTrustedOnly(
              payload.new.value === 'true' || payload.new.value === true,
            );
        },
      )
      .subscribe();

    return () => supabase.removeChannel(settingsSub);
  };

  const handleDismissWarning = async (warningId) => {
    if (typeof warningId === 'string' && warningId.startsWith('local-')) {
      setWarnings((prev) => prev.filter((w) => w.id !== warningId));
      return;
    }
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

  const handleStartLockIn = async (durationMs) => {
    const now = new Date();
    const unlockDate = new Date(now.getTime() + durationMs).toISOString();
    const startDate = now.toISOString();
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          lock_in_until: unlockDate,
          lock_in_start: startDate,
        })
        .eq('id', session.user.id);
      if (error) throw error;

      setLockInUntil(unlockDate);
      setLockInStart(startDate);
      setShowLockInSetup(false);
    } catch (err) {
      console.error('Failed to start lock-in:', err);
      alert('Error starting Lock-In mode.');
    }
  };

  const handleUnlockIn = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ lock_in_until: null, lock_in_start: null })
        .eq('id', session.user.id);
      if (error) throw error;
      setLockInUntil(null);
      setLockInStart(null);
    } catch (err) {
      console.error('Unlock failed', err);
    }
  };

  // === REALTIME PRESENCE & CHAT ===
  const profileRef = useRef(profile);
  const myBadgesRef = useRef(myBadges);
  const allowFireworksRef = useRef(allowFireworks);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);
  useEffect(() => {
    myBadgesRef.current = myBadges;
  }, [myBadges]);
  useEffect(() => {
    allowFireworksRef.current = allowFireworks;
  }, [allowFireworks]);

  useEffect(() => {
    if (
      !session?.user ||
      isBanned ||
      isLoading ||
      (!profile?.is_verified && !isHardcodedAdmin)
    )
      return; // Guard for connection

    let channel;
    let isMounted = true;
    let reconnectTimeout;

    const connectChannel = () => {
      if (channel) supabase.removeChannel(channel);

      const user = session.user;

      // Isolated Channel for Mod Tavern
      channel = supabase.channel('public:mod_tavern', {
        config: { presence: { key: user.id } },
      });
      channel
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'mod_messages' },
          (payload) => {
            setMessages((prevMessages) => {
              if (prevMessages.some((msg) => msg.id === payload.new.id))
                return prevMessages;
              return [...prevMessages, payload.new];
            });
          },
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'mod_messages' },
          (payload) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === payload.new.id ? payload.new : msg,
              ),
            );
          },
        )
        .on('broadcast', { event: 'typing' }, ({ payload }) => {
          if (!payload || !payload.username) return;
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
        .on('broadcast', { event: 'fireworks' }, () => {
          if (allowFireworksRef.current)
            runFireworks(
              fireworksCanvasRef.current,
              particlesRef,
              animationFrameRef,
            );
        })
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          const users = {};

          Object.keys(state).forEach((key) => {
            state[key].forEach((p) => {
              if (p.user_id) {
                users[p.user_id] = {
                  ...p,
                  username: p.username || 'Unknown User',
                };
              }
            });
          });

          const newCount = Object.keys(users).length;

          if (newCount < onlineCountRef.current) {
            clearTimeout(presenceTimerRef.current);
            presenceTimerRef.current = setTimeout(() => {
              setOnlineUsers(users);
              onlineCountRef.current = newCount;
            }, 2500);
          } else {
            clearTimeout(presenceTimerRef.current);
            setOnlineUsers(users);
            onlineCountRef.current = newCount;
          }
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            loadInitialMessages();

            const username =
              getFallbackName(user, profileRef.current) || 'Unknown User';
            const userAvatar = resolveAvatar(user, profileRef.current);

            await channel.track({
              user_id: user.id,
              username,
              avatar_url: userAvatar,
              badge_type: myBadgesRef.current,
              status: profileRef.current?.status || 'online',
            });
          } else if (
            status === 'CLOSED' ||
            status === 'CHANNEL_ERROR' ||
            status === 'TIMED_OUT'
          ) {
            if (isMounted) {
              clearTimeout(reconnectTimeout);
              reconnectTimeout = setTimeout(() => {
                if (isMounted) connectChannel();
              }, 2500);
            }
          }
        });

      channelRef.current = channel;
    };

    connectChannel();
    return () => {
      isMounted = false;
      clearTimeout(reconnectTimeout);
      clearTimeout(presenceTimerRef.current);
      if (channel) supabase.removeChannel(channel);
    };
  }, [
    session?.user,
    session?.user?.id,
    isBanned,
    isLoading,
    profile?.is_verified,
    isHardcodedAdmin,
    loadInitialMessages,
  ]);

  // Keep presence strictly up to date
  useEffect(() => {
    if (
      channelRef.current &&
      session?.user &&
      channelRef.current.state === 'joined'
    ) {
      const username = getFallbackName(session.user, profile) || 'Unknown User';
      const userAvatar = resolveAvatar(session.user, profile);
      channelRef.current
        .track({
          user_id: session.user.id,
          username,
          avatar_url: userAvatar,
          badge_type: myBadges,
          status: profile?.status || 'online',
        })
        .catch(console.error);
    }
  }, [profile, myBadges, session?.user]);

  // === AUTO SCROLL LOGIC ===
  useEffect(() => {
    if (messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];

    const isNewMessage = lastMessageIdRef.current !== lastMsg.id;
    lastMessageIdRef.current = lastMsg.id;

    if (!isNewMessage) return;
    if (lastMsg.username && blockedUsers.includes(lastMsg.username)) return;

    if (messagesBoxRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesBoxRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 200;
      const isMyMessage = lastMsg.user_id === session?.user?.id;

      if (isNearBottom || isMyMessage) {
        scrollToBottom();
      } else {
        if (profile?.username && lastMsg.user_id !== session?.user?.id) {
          const myUsername = profile.username.toLowerCase();
          const msgContent = lastMsg.message
            ? lastMsg.message.toLowerCase()
            : '';
          const isMention = msgContent.includes(`@${myUsername}`);
          const isReply =
            lastMsg.parent_id &&
            messages.find((m) => m.id === lastMsg.parent_id)?.user_id ===
              session?.user?.id;
          if (isMention || isReply) {
            setUnreadMentions((prev) => {
              if (prev.find((m) => m.id === lastMsg.id)) return prev;
              return [...prev, lastMsg];
            });
          }
        }
      }
    }
  }, [messages, blockedUsers, profile, session]);

  const handleScroll = () => {
    if (!messagesBoxRef.current) return;
    if (
      messagesBoxRef.current.scrollTop === 0 &&
      hasMore &&
      !isLoadingMore &&
      messages.length > 0
    ) {
      loadMoreMessages();
    }
    const { scrollTop, scrollHeight, clientHeight } = messagesBoxRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight < 50;
    if (atBottom) {
      localStorage.setItem('lastModChatReadTime', Date.now().toString());
      if (unreadMentions.length > 0) {
        setUnreadMentions([]);
      }
    }
  };

  const loadMoreMessages = async () => {
    if (isBanned) return;
    setIsLoadingMore(true);
    if (messagesBoxRef.current)
      previousScrollHeightRef.current = messagesBoxRef.current.scrollHeight;
    const oldestMsg = messages[0];
    if (!oldestMsg) {
      setIsLoadingMore(false);
      return;
    }

    const { data } = await supabase
      .from('mod_messages')
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

  const handleTriggerFireworks = async () => {
    setFireworkCooldown(true);
    setTimeout(() => setFireworkCooldown(false), 6000);
    if (allowFireworks)
      runFireworks(fireworksCanvasRef.current, particlesRef, animationFrameRef);
    if (channelRef.current && channelRef.current.state === 'joined') {
      await channelRef.current.send({
        type: 'broadcast',
        event: 'fireworks',
        payload: {},
      });
    }
  };

  const handleSendMessage = async (customHtml = null) => {
    if (!tosAccepted) {
      alert('You must accept the Terms of Service first.');
      return;
    }
    if (isBanned) return;

    const contentToSend =
      typeof customHtml === 'string' && customHtml.trim().length > 0
        ? customHtml
        : inputHtml;

    const validation = validateMessage(contentToSend);
    if (!validation.isValid) {
      setWarnings((prev) => [
        ...prev,
        {
          id: `local-${Date.now()}`,
          user_id: session?.user?.id,
          reason: validation.error,
          warning: validation.error,
          message: validation.error,
          warning_reason: validation.error,
          created_at: new Date().toISOString(),
        },
      ]);
      return;
    }

    const charCount = getCharacterCount(contentToSend);

    if (!contentToSend.trim() || isSending || charCount > 1000) return;
    if (cooldown > 0) return;
    if (isTimedOut) return;

    setIsSending(true);
    const user = session.user;
    const username = getFallbackName(user, profile) || 'Unknown User';
    const currentAvatar = resolveAvatar(user, profile);

    try {
      if (editingId) {
        await supabase
          .from('mod_messages')
          .update({ message: contentToSend, is_edited: true })
          .eq('id', editingId);
      } else {
        const { data, error } = await supabase
          .from('mod_messages')
          .insert([
            {
              message: contentToSend,
              user_id: user.id,
              username,
              avatar_url: currentAvatar,
              timestamp: new Date().toISOString(),
              badge_type: myBadges,
              parent_id: replyingTo ? replyingTo.id : null,
            },
          ])
          .select();
        if (error) throw error;

        if (data && data.length > 0) {
          const newMessage = data[0];
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
        }
        setCooldown(3);
      }
      if (editorRef.current) editorRef.current.innerHTML = '';
      setInputHtml('');
      setReplyingTo(null);
      setEditingId(null);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleTyping = () => {
    if (!tosAccepted) return;
    if (
      channelRef.current &&
      channelRef.current.state === 'joined' &&
      !isTimedOut &&
      !isBanned
    ) {
      const username = getFallbackName(session.user, profile) || 'Unknown User';
      channelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { username },
      });
    }
  };

  const toggleTheme = (t) => {
    setTheme(t);
    localStorage.setItem('chatTheme', t);
  };

  const execCmd = (cmd, value = null) => {
    document.execCommand(cmd, false, value);
    editorRef.current?.focus();
  };

  const getTypingText = () => {
    const myName = getFallbackName(session?.user, profile) || 'Unknown User';
    const names = Object.keys(typers).filter(
      (n) => n !== myName && n !== 'undefined' && !blockedUsers.includes(n),
    );
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

  const handleDeleteMessage = async (msgId) => {
    if (!window.confirm('Delete this message?')) return;
    try {
      await supabase
        .from('mod_messages')
        .update({ is_deleted: true })
        .eq('id', msgId);
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, is_deleted: true } : m)),
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleJumpToMention = () => {
    if (unreadMentions.length > 0) {
      const firstMsgId = unreadMentions[0].id;
      const element = document.getElementById(`msg-${firstMsgId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('message-highlight');
        setTimeout(() => element.classList.remove('message-highlight'), 2000);
      }
    }
  };

  const scrollToSpecificMessage = (msgId) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('message-highlight');
      setTimeout(() => el.classList.remove('message-highlight'), 2000);
    }
  };

  const handleJumpToSearchResult = async (targetMsg) => {
    if (!targetMsg) return;
    const isLoaded = messages.some((m) => m.id === targetMsg.id);

    if (isLoaded) {
      scrollToSpecificMessage(targetMsg.id);
    } else {
      setIsLoadingMore(true);
      try {
        const { data: olderData, error: olderError } = await supabase
          .from('mod_messages')
          .select('*')
          .lte('timestamp', targetMsg.timestamp)
          .order('timestamp', { ascending: false })
          .limit(30);

        if (olderError) throw olderError;

        const { data: newerData, error: newerError } = await supabase
          .from('mod_messages')
          .select('*')
          .gt('timestamp', targetMsg.timestamp)
          .order('timestamp', { ascending: true })
          .limit(30);

        if (newerError) throw newerError;

        const combined = [...(olderData || []).reverse(), ...(newerData || [])];
        const uniqueMap = new Map();
        combined.forEach((msg) => uniqueMap.set(msg.id, msg));
        const finalWindow = Array.from(uniqueMap.values()).sort(
          (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
        );

        setMessages(finalWindow);
        setHasMore(true);

        setTimeout(() => scrollToSpecificMessage(targetMsg.id), 500);
      } catch (err) {
        console.error('Error loading message context:', err);
      } finally {
        setIsLoadingMore(false);
      }
    }
  };

  const handleAcceptTos = () => {
    localStorage.setItem('tosAccepted_v2', 'true');
    setTosAccepted(true);
    setShowTosModal(false);
  };

  const isRestricted =
    isBanned ||
    isTimedOut ||
    (lockInUntil && new Date(lockInUntil) > new Date());

  // === RENDER STATES ===

  if (isLoading) {
    return (
      <div
        className={`chat-wrapper ${themeClass} flex flex-col h-screen w-full`}
        style={{
          ...themeStyle,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ color: 'var(--text-secondary)', fontSize: '1.2rem' }}>
          <i className='fa-solid fa-circle-notch fa-spin'></i> Checking account
          status...
        </div>
      </div>
    );
  }

  // Strict Mod verification check — hardcoded ranks bypass is_verified
  if (profile && !profile.is_verified && !isHardcodedAdmin) {
    return (
      <div
        className={`chat-wrapper ${themeClass} flex flex-col h-screen w-full`}
        style={{
          ...themeStyle,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div className='bg-red-500/10 border border-red-500 p-8 rounded-lg text-center max-w-md shadow-lg shadow-red-500/20 backdrop-blur-sm'>
          <i className='fa-solid fa-shield-halved text-red-500 text-5xl mb-4'></i>
          <h2 className='text-2xl font-bold text-white mb-2'>Access Denied</h2>
          <p className='text-gray-300 mb-6'>
            You must be a verified moderator to access the Mod Tavern.
          </p>
          <button
            onClick={() => navigate(-1)}
            className='px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-md transition-colors shadow-md'
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const TopHeader = (
    <ChatHeader
      navigate={navigate}
      chatLocked={false}
      profile={profile}
      theme={theme}
      toggleTheme={toggleTheme}
      handleTriggerFireworks={handleTriggerFireworks}
      fireworkCooldown={fireworkCooldown}
      showSettings={showSettings}
      setShowSettings={setShowSettings}
      unreadMentions={unreadMentions}
      onJumpToMention={handleJumpToMention}
      onOpenLockIn={() => setShowLockInSetup(true)}
      onOpenSearch={() => setShowSearchModal(true)}
      onOpenLeaderboard={() => setShowLeaderboard(true)}
    />
  );

  const SidebarContent = (
    <ChatSidebar
      onlineUsers={onlineUsers}
      navigate={navigate}
      profile={profile}
      isOpen={sidebarOpen}
      toggleSidebar={() => setSidebarOpen((prev) => !prev)}
    />
  );

  const MainContent = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        position: 'relative',
      }}
    >
      {!sidebarOpen && theme !== 'crimnet' && (
        <button
          onClick={() => setSidebarOpen(true)}
          className='absolute top-4 left-4 z-50 px-3 py-2 bg-black/40 hover:bg-black/60 text-white/90 hover:text-white rounded-full transition-all backdrop-blur-sm border border-white/10 flex items-center gap-2 font-bold shadow-md'
          title='Open Sidebar'
        >
          <i className='fa-solid fa-users text-blue-400'></i>
          <span className='text-xs font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full'>
            {Object.keys(onlineUsers).length}
          </span>
        </button>
      )}

      {isRestricted ? (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            textAlign: 'center',
          }}
        >
          <img
            src={bannedImg}
            alt='Restricted'
            style={{
              maxWidth: '300px',
              borderRadius: '10px',
              marginBottom: '20px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            }}
          />
          <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>
            Nice try buddy
          </h2>
        </div>
      ) : (
        <div className='w-full h-full flex flex-col relative'>
          <div
            className='messages-box flex-1'
            ref={messagesBoxRef}
            onScroll={handleScroll}
          >
            {isLoadingMore && (
              <div className='w-full text-center py-2 opacity-50 text-xs'>
                <i className='fa-solid fa-circle-notch fa-spin mr-1'></i>{' '}
                Loading
              </div>
            )}

            {filteredMessages.map((msg) => {
              const isSelf = session?.user?.id === msg.user_id;
              let isHighlight = false;

              if (!isSelf && session?.user?.id) {
                const isMentioningMe =
                  profile?.username &&
                  msg.message
                    ?.toLowerCase()
                    .includes(`@${profile.username.toLowerCase()}`);
                const isReplyToMe =
                  msg.parent_id &&
                  messages.find((m) => m.id === msg.parent_id)?.user_id ===
                    session.user.id;
                isHighlight = isMentioningMe || isReplyToMe;
              }

              const alignClass = isSelf
                ? 'flex justify-end'
                : 'flex justify-start';
              const highlightClass = isHighlight
                ? 'bg-yellow-500/10 border-l-4 border-yellow-500 rounded-r-md transition-colors my-1'
                : '';

              return (
                <div key={msg.id} className={`${alignClass} ${highlightClass}`}>
                  <ChatMessageComponent
                    msg={
                      msg.is_deleted
                        ? { ...msg, message: 'Message deleted' }
                        : msg
                    }
                    isSelf={isSelf}
                    currentUserId={session?.user?.id}
                    profile={profile}
                    navigate={navigate}
                    handlers={{
                      initReply,
                      initEdit,
                      handleDeleteMessage,
                      parentMsg: msg.parent_id
                        ? messages.find((m) => m.id === msg.parent_id)
                        : null,
                    }}
                  />
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <ChatInput
            inputHtml={inputHtml}
            setInputHtml={setInputHtml}
            handleSendMessage={handleSendMessage}
            handleTyping={handleTyping}
            isSending={isSending}
            chatLocked={false}
            trustedOnly={false}
            profile={profile}
            isTimedOut={isTimedOut}
            isBanned={isBanned}
            replyingTo={replyingTo}
            editingId={editingId}
            cancelAction={cancelAction}
            getTypingText={getTypingText}
            editorRef={editorRef}
            cooldown={cooldown}
            execCmd={execCmd}
            onlineUsers={onlineUsers}
            tosAccepted={tosAccepted}
          />
        </div>
      )}
    </div>
  );

  if (theme === 'aero-os') {
    return (
      <div
        className={`chat-wrapper ${themeClass} flex flex-col h-screen w-full`}
        style={themeStyle}
      >
        {TopHeader}
        <div className='flex-1 overflow-hidden'>
          <AeroOS
            chatSidebar={sidebarOpen ? SidebarContent : null}
            chatMain={MainContent}
          />
        </div>
      </div>
    );
  }

  if (theme === 'crimnet') {
    return (
      <div
        className={`chat-wrapper ${themeClass} flex flex-col h-screen w-full`}
        style={themeStyle}
      >
        {TopHeader}
        <div className='flex-1 overflow-hidden'>
          <CrimNet chatSidebar={SidebarContent} chatMain={MainContent} />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`chat-wrapper ${themeClass} flex flex-col h-screen w-full`}
      style={themeStyle}
    >
      <style>{`
        @keyframes highlightFade { 0% { background-color: rgba(59, 130, 246, 0.4); } 100% { background-color: transparent; } }
        .message-highlight { animation: highlightFade 2s ease-out; }
      `}</style>

      {showSearchModal && (
        <ChatSearchModal
          onClose={() => setShowSearchModal(false)}
          onJumpToMessage={handleJumpToSearchResult}
          blockedUsers={blockedUsers}
          profile={profile}
        />
      )}

      {showLeaderboard && (
        <ChatLeaderboard
          onClose={() => setShowLeaderboard(false)}
          blockedUsers={blockedUsers}
        />
      )}

      {allowFireworks && (
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
      )}

      {showLockInSetup && (
        <LockInSetupModal
          onClose={() => setShowLockInSetup(false)}
          onConfirm={handleStartLockIn}
        />
      )}
      {lockInUntil && (
        <LockInScreen
          unlockTime={lockInUntil}
          startTime={lockInStart}
          onUnlock={handleUnlockIn}
        />
      )}
      <WarningModal warnings={warnings} onClose={handleDismissWarning} />
      {isBanned && <BannedOverlay reason={banReason} />}
      {!isBanned && isTimedOut && profile?.chat_timeout_until && (
        <TimeoutOverlay
          timeoutUntil={profile.chat_timeout_until}
          reason={banReason}
          onExpire={() => setIsTimedOut(false)}
        />
      )}

      {showTosModal && (
        <ChatTOSModal
          onAccept={handleAcceptTos}
          onDecline={() => {
            localStorage.setItem('tosAccepted_v2', 'false');
            alert('You must agree to the Terms of Service to use the chat.');
          }}
        />
      )}

      {TopHeader}

      <div
        className='main-layout'
        style={{
          display: 'flex',
          flex: 1,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {sidebarOpen ? SidebarContent : null}

        <div
          className='chat-area'
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
            position: 'relative',
          }}
        >
          {MainContent}
        </div>
      </div>
    </div>
  );
};

export default ModTavern;
