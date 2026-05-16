import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useServerSchedule } from '../hooks/useServerSchedule';
import { useServerMonitor } from '../hooks/useServerMonitor';
import { useTheme } from '../hooks/useTheme';
import { getGreeting } from '../utils/greetingHandler';

// === DRAG & DROP GRID IMPORTS ===
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import './Chat.css';

// === FIXED IMPORT PATH ===
import {
  SPECIAL_FRESHMAN_EMAILS,
  ACAPOCO_SPECIAL_EMAILS,
  SENIOR_DEV_EMAILS,
  DEV_EMAILS,
} from '../utils/adminConstants';

const ResponsiveGridLayout = WidthProvider(Responsive);

// Default grid layout for new users, explicitly forcing Timer to the top on mobile (xs & xxs)
const DEFAULT_LAYOUTS = {
  lg: [
    { i: 'greeting', x: 0, y: 0, w: 8, h: 2, minW: 4, minH: 2 },
    { i: 'navbuttons', x: 0, y: 2, w: 8, h: 2, minW: 5, minH: 2 },
    { i: 'admin_post', x: 0, y: 4, w: 8, h: 5, minW: 4, minH: 4 },
    { i: 'announcements', x: 0, y: 9, w: 8, h: 6, minW: 4, minH: 4 },
    { i: 'timer', x: 8, y: 0, w: 4, h: 5, minW: 3, minH: 4 },
    { i: 'weather', x: 8, y: 5, w: 4, h: 5, minW: 3, minH: 4 },
    { i: 'server', x: 8, y: 10, w: 4, h: 5, minW: 3, minH: 4 },
    { i: 'surveys', x: 8, y: 15, w: 4, h: 4, minW: 3, minH: 3 },
    { i: 'social', x: 8, y: 19, w: 4, h: 3, minW: 3, minH: 2 },
    { i: 'incident', x: 8, y: 22, w: 4, h: 3, minW: 3, minH: 3 },
  ],
  xs: [
    { i: 'timer', x: 0, y: 0, w: 1, h: 5, static: true }, // Locked at top
    { i: 'greeting', x: 0, y: 5, w: 1, h: 2 },
    { i: 'navbuttons', x: 0, y: 7, w: 1, h: 4 }, // Increased height for better mobile tap targets
    { i: 'admin_post', x: 0, y: 11, w: 1, h: 5 },
    { i: 'announcements', x: 0, y: 16, w: 1, h: 6 },
    { i: 'weather', x: 0, y: 22, w: 1, h: 5 },
    { i: 'server', x: 0, y: 27, w: 1, h: 5 },
    { i: 'surveys', x: 0, y: 32, w: 1, h: 4 },
    { i: 'social', x: 0, y: 36, w: 1, h: 3 },
    { i: 'incident', x: 0, y: 39, w: 1, h: 3 },
  ],
  xxs: [
    { i: 'timer', x: 0, y: 0, w: 1, h: 5, static: true }, // Locked at top
    { i: 'greeting', x: 0, y: 5, w: 1, h: 2 },
    { i: 'navbuttons', x: 0, y: 7, w: 1, h: 4 }, // Increased height
    { i: 'admin_post', x: 0, y: 11, w: 1, h: 5 },
    { i: 'announcements', x: 0, y: 16, w: 1, h: 6 },
    { i: 'weather', x: 0, y: 22, w: 1, h: 5 },
    { i: 'server', x: 0, y: 27, w: 1, h: 5 },
    { i: 'surveys', x: 0, y: 32, w: 1, h: 4 },
    { i: 'social', x: 0, y: 36, w: 1, h: 3 },
    { i: 'incident', x: 0, y: 39, w: 1, h: 3 },
  ],
};

const ALL_APPS = [
  {
    id: 'chat',
    icon: 'fa-comments',
    label: 'Chat',
    color: 'text-blue-400',
    path: '/chat',
    hasBadge: true,
    hasMentions: true,
  },
  {
    id: 'tools',
    icon: 'fa-toolbox',
    label: 'Tools',
    color: 'text-emerald-400',
    path: '/tools',
  },
  {
    id: 'mindful',
    icon: 'fa-leaf',
    label: 'Mindful',
    color: 'text-teal-400',
    path: '/mindful',
  },
  {
    id: 'radio',
    icon: 'fa-radio',
    label: 'ConnectRadio',
    color: 'text-pink-400',
    path: '/radio',
  },
  {
    id: 'news',
    icon: 'fa-newspaper',
    label: 'News',
    color: 'text-purple-400',
    path: '/news',
  },
  {
    id: 'settings',
    icon: 'fa-gear',
    label: 'Settings',
    color: 'text-gray-400',
    path: '/settings',
  },
  {
    id: 'artwall',
    icon: 'fa-palette',
    label: 'Artwall',
    color: 'text-orange-400',
    path: '/artwall',
  },
  {
    id: 'users',
    icon: 'fa-users',
    label: 'Users',
    color: 'text-indigo-400',
    path: '/users',
  },
  {
    id: 'admin',
    icon: 'fa-lock',
    label: 'Admin',
    color: 'text-red-500',
    path: '/admin',
    reqAdmin: true,
  },
];

const Dashboard = ({ session }) => {
  const navigate = useNavigate();
  const { themeClass, themeStyle } = useTheme();

  // Schedule & User Info
  const { periodName, timeLeft, scheduleData, lunchType } =
    useServerSchedule(session);
  const {
    serverStatus,
    responseTime,
    lastChecked,
    alerts,
    refresh,
    dismissAlert,
  } = useServerMonitor();
  const user = session?.user;

  // State
  const [username, setUsername] = useState(
    user?.user_metadata?.username || user?.email?.split('@')[0] || 'Guest',
  );
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const getDisplayRole = () => {
    if (!isAdmin) return 'Student';
    const email = user?.email;
    if (!email) return 'Admin';
    if (SPECIAL_FRESHMAN_EMAILS.includes(email)) return 'Special Freshman';
    if (ACAPOCO_SPECIAL_EMAILS.includes(email)) return 'Acapoco Special';
    if (SENIOR_DEV_EMAILS.includes(email)) return 'Senior Dev';
    if (DEV_EMAILS.includes(email)) return 'Dev';
    return 'Admin';
  };
  const displayRole = getDisplayRole();

  const [greeting, setGreeting] = useState('Welcome back');
  const [allowDms, setAllowDms] = useState(false);

  // Layout & Customization State
  const [layouts, setLayouts] = useState(DEFAULT_LAYOUTS);
  const [layoutLoaded, setLayoutLoaded] = useState(false);
  const [allowDashboardCustomization, setAllowDashboardCustomization] =
    useState(false);

  // Dock State
  const [dockApps, setDockApps] = useState(ALL_APPS.map((app) => app.id));
  const [isEditingDock, setIsEditingDock] = useState(false);

  // Announcement State
  const [announcements, setAnnouncements] = useState([]);
  const [isPosting, setIsPosting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(null);
  const editorRef = useRef(null);

  // Survey State
  const [surveys, setSurveys] = useState([]);
  const [newSurveyTitle, setNewSurveyTitle] = useState('');
  const [newSurveyLink, setNewSurveyLink] = useState('');
  const [isPostingSurvey, setIsPostingSurvey] = useState(false);
  const [, setIsDeletingSurvey] = useState(null);
  const [showSurveyForm, setShowSurveyForm] = useState(false);

  // Weather & UI State
  const [weather, setWeather] = useState(null);
  const [loadingWeather, setLoadingWeather] = useState(true);
  const [expandedAlerts, setExpandedAlerts] = useState(new Set());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [progress, setProgress] = useState(0);

  // Global Presence & Ping State
  const [onlineCount, setOnlineCount] = useState(1);
  const [mentionCount, setMentionCount] = useState(0);
  const [displayPing, setDisplayPing] = useState(0);
  const [unreadDMs, setUnreadDMs] = useState(0);
  const pingHistory = useRef([]);

  const [piStatus, setPiStatus] = useState('checking');
  const [piPing, setPiPing] = useState(0);
  const [clientInternetStatus, setClientInternetStatus] = useState('checking');
  const [lastIncidentDate, setLastIncidentDate] = useState(
    new Date().toISOString(),
  );

  // --- RASPBERRY PI DIRECT SERVER PING ---
  const checkPiServer = useCallback(async () => {
    const start = Date.now();
    try {
      const piAnonKey =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzcwODcyNDAwLCJleHAiOjE5Mjg2Mzg4MDB9.ERk3z98oi6l_oT0p-yY-fVMEZUrlfplSCeVDtDooGw4';
      const baseUrl = supabase.supabaseUrl || 'http://raspberrypi.local';

      const res = await fetch(`${baseUrl}/rest/v1/`, {
        method: 'GET',
        headers: {
          apikey: piAnonKey,
          Authorization: `Bearer ${piAnonKey}`,
        },
      });

      setPiPing(Date.now() - start);
      if (res.ok || res.status === 400 || res.status === 404) {
        setPiStatus('online');
      } else {
        setPiStatus('slow');
      }
    } catch {
      setPiStatus('offline');
    }
  }, []);

  // --- CLIENT INTERNET PING ---
  const checkClientInternet = useCallback(async () => {
    if (!navigator.onLine) {
      setClientInternetStatus('offline');
      return;
    }
    const start = Date.now();
    try {
      await fetch('https://1.1.1.1/cdn-cgi/trace', {
        mode: 'no-cors',
        cache: 'no-store',
      });
      const latency = Date.now() - start;
      setClientInternetStatus(latency > 1000 ? 'slow' : 'online');
    } catch {
      setClientInternetStatus('offline');
    }
  }, []);

  useEffect(() => {
    checkPiServer();
    checkClientInternet();

    const piInterval = setInterval(checkPiServer, 10000);
    const internetInterval = setInterval(checkClientInternet, 15000);

    const handleOnline = () => checkClientInternet();
    const handleOffline = () => setClientInternetStatus('offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(piInterval);
      clearInterval(internetInterval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkPiServer, checkClientInternet]);

  // --- ONLINE PRESENCE EFFECT ---
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel('public:room1', {
      config: { presence: { key: user.id } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setOnlineCount(Object.keys(state).length || 1);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => supabase.removeChannel(channel);
  }, [user]);

  // --- UNREAD DMs TRACKER ---
  const fetchUnreadDMs = useCallback(async () => {
    if (!user) return;
    try {
      const { count, error } = await supabase
        .from('direct_messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('status', 'sent');

      if (!error && count !== null) {
        setUnreadDMs(count);
      }
    } catch (err) {
      console.error('Error fetching unread DMs:', err);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    fetchUnreadDMs();

    const dmSub = supabase
      .channel(`dms_notifs_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        () => {
          fetchUnreadDMs();
        },
      )
      .subscribe();

    return () => supabase.removeChannel(dmSub);
  }, [user, fetchUnreadDMs]);

  // --- UNREAD MENTIONS TRACKER ---
  const fetchMentionsCount = useCallback(async () => {
    if (!user || !username) return;

    const lastReadStr = localStorage.getItem('lastChatReadTime');
    const lastReadTime = lastReadStr
      ? Number(lastReadStr)
      : Date.now() - 24 * 3600 * 1000;

    try {
      const { data } = await supabase
        .from('messages')
        .select('id, message, parent_id, user_id, timestamp')
        .neq('user_id', user.id)
        .gt('timestamp', new Date(lastReadTime).toISOString())
        .order('timestamp', { ascending: false })
        .limit(50);

      if (!data || data.length === 0) {
        setMentionCount(0);
        return;
      }

      const parentIds = data.map((m) => m.parent_id).filter(Boolean);
      let myParentIds = new Set();

      if (parentIds.length > 0) {
        const { data: parents } = await supabase
          .from('messages')
          .select('id, user_id')
          .in('id', parentIds);
        if (parents) {
          parents.forEach((p) => {
            if (p.user_id === user.id) myParentIds.add(p.id);
          });
        }
      }

      let count = 0;
      data.forEach((msg) => {
        const isMention =
          msg.message &&
          msg.message.toLowerCase().includes(`@${username.toLowerCase()}`);
        const isReplyToMe = myParentIds.has(msg.parent_id);
        if (isMention || isReplyToMe) count++;
      });

      setMentionCount(count);
    } catch (err) {
      console.error('Error fetching dashboard mentions:', err);
    }
  }, [user, username]);

  useEffect(() => {
    if (user && username) {
      fetchMentionsCount();

      const mentionSub = supabase
        .channel('dashboard_mentions')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages' },
          () => {
            fetchMentionsCount();
          },
        )
        .subscribe();

      const handleStorage = (e) => {
        if (e.key === 'lastChatReadTime') fetchMentionsCount();
      };
      window.addEventListener('storage', handleStorage);

      return () => {
        supabase.removeChannel(mentionSub);
        window.removeEventListener('storage', handleStorage);
      };
    }
  }, [user, username, fetchMentionsCount]);

  useEffect(() => {
    if (responseTime) {
      pingHistory.current.push(responseTime);
      if (pingHistory.current.length > 5) pingHistory.current.shift();
      const avg = Math.round(
        pingHistory.current.reduce((a, b) => a + b, 0) /
          pingHistory.current.length,
      );
      setDisplayPing(avg);
    }
  }, [responseTime]);

  // --- HELPERS ---
  const getDefaultAvatar = (name) => {
    if (!name) return '/DP1.jpg';
    let hash = 0;
    for (let i = 0; i < name.length; i++)
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return `/DP${(Math.abs(hash) % 4) + 1}.jpg`;
  };

  const getStorageAvatar = (userId) => {
    if (!userId) return null;
    const { data } = supabase.storage
      .from('profile-pictures')
      .getPublicUrl(`${userId}.png`);
    return data?.publicUrl || null;
  };

  const getWeatherIcon = (code) => {
    if (code === 0) return 'fa-sun';
    if (code >= 1 && code <= 3) return 'fa-cloud-sun';
    if (code >= 45 && code <= 48) return 'fa-smog';
    if (code >= 51 && code <= 67) return 'fa-cloud-rain';
    return 'fa-cloud';
  };

  const isRaining = (code) =>
    [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(
      code,
    );

  const toggleAlert = (id) => {
    setExpandedAlerts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const calculateProgress = useCallback(() => {
    if (!scheduleData || !periodName) return 0;
    const activeBlock = scheduleData.find((block) =>
      periodName.includes('Lunch')
        ? block.period_name.includes('Lunch')
        : block.period_name === periodName,
    );
    if (!activeBlock) return 0;
    const now = new Date();
    const getMinutes = (t) =>
      parseInt(t.split(':')[0]) * 60 + parseInt(t.split(':')[1]);
    const currentMinutes =
      now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
    const start = getMinutes(activeBlock.start_time);
    const end = getMinutes(activeBlock.end_time);
    if (end <= start) return 0;
    return Math.min(
      Math.max(((currentMinutes - start) / (end - start)) * 100, 0),
      100,
    );
  }, [scheduleData, periodName]);

  useEffect(() => {
    const timer = setInterval(() => setProgress(calculateProgress()), 1000);
    return () => clearInterval(timer);
  }, [calculateProgress]);

  // --- FETCHING ---
  const fetchIncidentDate = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'last_incident')
        .single();
      if (!error && data?.value) {
        setLastIncidentDate(data.value);
      }
    } catch (e) {
      console.log('Incident date fetch error:', e);
    }
  }, []);

  const fetchAnnouncements = useCallback(async () => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 25);

      const { data, error } = await supabase
        .from('announcements')
        .select(
          'id, content, created_at, author_id, profiles ( username, selected_badge, is_verified )',
        )
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      if (!error) setAnnouncements(data || []);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    }
  }, []);

  const fetchSurveys = useCallback(async () => {
    try {
      const { data: surveysData, error } = await supabase
        .from('surveys')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (!surveysData?.length) {
        setSurveys([]);
        return;
      }
      const authorIds = [
        ...new Set(surveysData.map((s) => s.author_id).filter(Boolean)),
      ];
      let profilesMap = {};
      if (authorIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', authorIds);
        profilesData?.forEach((p) => {
          profilesMap[p.id] = p;
        });
      }
      setSurveys(
        surveysData.map((survey) => ({
          ...survey,
          profiles: profilesMap[survey.author_id] || { username: 'Unknown' },
        })),
      );
    } catch (error) {
      console.error('Error fetching surveys:', error);
    }
  }, []);

  const fetchWeather = useCallback(async () => {
    setLoadingWeather(true);
    try {
      const [alertsRes, forecastRes] = await Promise.all([
        fetch(
          'https://api.weather.gov/alerts/active?point=28.8029,-81.2695',
        ).catch(() => null),
        fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=28.80&longitude=-81.27&current_weather=true&hourly=temperature_2m,weathercode,precipitation_probability&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&temperature_unit=fahrenheit&timezone=auto&forecast_days=2',
        ),
      ]);
      const alertsData = alertsRes?.ok
        ? await alertsRes.json()
        : { features: [] };
      const data = await forecastRes.json();
      if (data?.hourly) {
        const todayStr = new Date().toISOString().slice(0, 10);
        const getHourData = (hour) => {
          const idx = data.hourly.time.findIndex(
            (t) => t === `${todayStr}T${hour}`,
          );
          return {
            temp: Math.round(data.hourly.temperature_2m[idx] || 0),
            code: data.hourly.weathercode[idx] || 0,
          };
        };
        let rainStartTime = null;
        if (!isRaining(data.current_weather.weathercode)) {
          const currentIso = new Date().toISOString().slice(0, 13);
          const currentIdx = data.hourly.time.findIndex((t) =>
            t.startsWith(currentIso),
          );
          if (currentIdx !== -1) {
            for (let i = 1; i <= 12; i++) {
              if (data.hourly.precipitation_probability[currentIdx + i] >= 50) {
                rainStartTime = new Date(
                  data.hourly.time[currentIdx + i],
                ).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                });
                break;
              }
            }
          }
        }
        setWeather({
          alerts: alertsData.features || [],
          current: {
            temp: Math.round(data.current_weather.temperature),
            code: data.current_weather.weathercode,
          },
          daily: {
            high: Math.round(data.daily.temperature_2m_max[0]),
            low: Math.round(data.daily.temperature_2m_min[0]),
            rainChance: data.daily.precipitation_probability_max[0],
          },
          timeline: {
            morning: getHourData('07:00'),
            noon: getHourData('12:00'),
            afternoon: getHourData('17:00'),
          },
          rainStart: rainStartTime,
        });
      }
    } catch (err) {
      console.error('Weather fetch failed', err);
    } finally {
      setLoadingWeather(false);
    }
  }, []);

  useEffect(() => {
    setGreeting(getGreeting());
    fetchIncidentDate();
    fetchAnnouncements();
    fetchSurveys();
    fetchWeather();

    if (user) {
      supabase
        .from('profiles')
        .select(
          'username, is_verified, lunch_type, allow_dms, dashboard_layout, allow_dashboard_customization, dock_apps',
        )
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            if (data.username) setUsername(data.username);
            if (data.is_verified) setIsAdmin(true);
            if (data.allow_dms !== undefined) setAllowDms(data.allow_dms);
            if (data.allow_dashboard_customization !== undefined)
              setAllowDashboardCustomization(
                data.allow_dashboard_customization,
              );
            if (data.dock_apps) setDockApps(data.dock_apps);

            if (data.dashboard_layout) {
              let savedLayouts = data.dashboard_layout;
              // Enforce timer on top for mobile layouts if they loaded from database
              ['xs', 'xxs'].forEach((bp) => {
                if (!savedLayouts[bp]) {
                  savedLayouts[bp] = DEFAULT_LAYOUTS[bp];
                } else {
                  const timerObj = savedLayouts[bp].find(
                    (l) => l.i === 'timer',
                  );
                  if (timerObj) {
                    if (timerObj.y !== 0) {
                      savedLayouts[bp].forEach((l) => {
                        if (l.i !== 'timer') l.y += timerObj.h || 5; // Shift others down
                      });
                      timerObj.y = 0; // Force to top
                    }
                    timerObj.static = true; // Lock item entirely
                  }
                }
              });
              setLayouts(savedLayouts);
            }
          }
          setLayoutLoaded(true);
        });
      const { data } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(`${user.id}.png`);
      if (data) setAvatarUrl(`${data.publicUrl}?t=${new Date().getTime()}`);
    } else {
      setLayoutLoaded(true);
    }
  }, [user, fetchAnnouncements, fetchWeather, fetchSurveys, fetchIncidentDate]);

  // Save layout to Supabase when dragged/resized
  const handleLayoutChange = async (_, allLayouts) => {
    const newLayouts = JSON.parse(JSON.stringify(allLayouts)); // Deep Clone

    // Strict Guard: Force timer to stay at y=0 on xs and xxs to ensure convenience
    ['xs', 'xxs'].forEach((bp) => {
      if (newLayouts[bp]) {
        const timerObj = newLayouts[bp].find((l) => l.i === 'timer');
        if (timerObj) {
          if (timerObj.y !== 0) {
            newLayouts[bp].forEach((l) => {
              if (l.i !== 'timer') l.y += timerObj.h || 5;
            });
            timerObj.y = 0;
          }
          timerObj.static = true; // Keep lock enforced
        }
      }
    });

    setLayouts(newLayouts);
    if (user && allowDashboardCustomization) {
      await supabase
        .from('profiles')
        .update({ dashboard_layout: newLayouts })
        .eq('id', user.id);
    }
  };

  // Toggle app visibility in the Dock
  const handleDockChange = async (appId) => {
    let newApps;
    if (dockApps.includes(appId)) {
      newApps = dockApps.filter((id) => id !== appId);
    } else {
      newApps = [...dockApps, appId];
    }
    setDockApps(newApps);
    if (user) {
      await supabase
        .from('profiles')
        .update({ dock_apps: newApps })
        .eq('id', user.id);
    }
  };

  const logAction = async (action, details) => {
    await supabase
      .from('mod_logs')
      .insert([{ admin_id: user?.id, action, details }])
      .catch(console.error);
  };

  const handleResetIncident = async () => {
    if (
      !isAdmin ||
      !window.confirm(
        'Are you sure you want to reset the Days Without Incident counter?',
      )
    )
      return;
    const now = new Date().toISOString();
    setLastIncidentDate(now);
    try {
      await supabase
        .from('settings')
        .upsert({ key: 'last_incident', value: now });
      await logAction('incident_reset', 'Reset the incident counter to 0');
    } catch (e) {
      console.error('Failed to reset incident date', e);
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    if (!window.confirm('Delete this announcement?')) return;
    setIsDeleting(id);
    try {
      if (!(await supabase.from('announcements').delete().eq('id', id)).error) {
        await logAction('announcement_deleted', `Deleted ID: ${id}`);
        setAnnouncements((prev) => prev.filter((post) => post.id !== id));
      }
    } catch {
      alert('Failed.');
    } finally {
      setIsDeleting(null);
    }
  };

  // --- RICH TEXT HANDLERS ---
  const handleExecCmd = (cmd, value = null) => {
    document.execCommand(cmd, false, value);
    editorRef.current?.focus();
  };

  const handleInsertImage = () => {
    const url = prompt('Enter Image URL:');
    if (url) handleExecCmd('insertImage', url);
  };

  const handleInsertLink = () => {
    const url = prompt('Enter link URL:');
    if (url) handleExecCmd('createLink', url);
  };

  const handlePaste = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (!file || !user) continue;

        setIsPosting(true);
        try {
          const fileExt = file.name ? file.name.split('.').pop() : 'png';
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
          const filePath = `${user.id}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('chat-uploads')
            .upload(filePath, file);

          if (uploadError) throw uploadError;

          const { data } = supabase.storage
            .from('chat-uploads')
            .getPublicUrl(filePath);

          if (data?.publicUrl) {
            handleExecCmd('insertImage', data.publicUrl);
          }
        } catch (err) {
          console.error('Paste upload error', err);
          alert('Failed to upload pasted image.');
        } finally {
          setIsPosting(false);
        }
      }
    }
  };

  const handlePostAnnouncement = async () => {
    const content = editorRef.current?.innerHTML;
    if (!content || !content.trim() || !user) return;
    setIsPosting(true);
    try {
      if (
        !(
          await supabase
            .from('announcements')
            .insert([{ content: content, author_id: user.id }])
        ).error
      ) {
        if (editorRef.current) editorRef.current.innerHTML = '';
        fetchAnnouncements();
      }
    } catch {
      alert('Failed.');
    } finally {
      setIsPosting(false);
    }
  };

  const handlePostSurvey = async () => {
    if (!newSurveyTitle.trim() || !newSurveyLink.trim()) return;
    setIsPostingSurvey(true);
    try {
      if (
        !(
          await supabase.from('surveys').insert([
            {
              title: newSurveyTitle,
              link: newSurveyLink,
              author_id: user?.id,
            },
          ])
        ).error
      ) {
        setNewSurveyTitle('');
        setNewSurveyLink('');
        setShowSurveyForm(false);
        fetchSurveys();
      }
    } catch {
      alert('Failed.');
    } finally {
      setIsPostingSurvey(false);
    }
  };

  const handleDeleteSurvey = async (id) => {
    if (!isAdmin || !window.confirm('Delete?')) return;
    setIsDeletingSurvey(id);
    try {
      if (!(await supabase.from('surveys').delete().eq('id', id)).error) {
        await logAction('survey_deleted', `Deleted Survey: ${id}`);
        setSurveys((prev) => prev.filter((s) => s.id !== id));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsDeletingSurvey(null);
    }
  };

  const formatTime = (iso) =>
    new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  const currentUserDefaultAvatar = getDefaultAvatar(username);
  const currentPeriodDisplay =
    periodName === 'Lunch' && lunchType === 'B' ? 'B Lunch' : periodName;
  const daysWithoutIncident = Math.max(
    0,
    Math.floor(
      (new Date() - new Date(lastIncidentDate)) / (1000 * 60 * 60 * 24),
    ),
  );

  const DragHandle = () => {
    if (!allowDashboardCustomization) return null;
    return (
      <div className='drag-handle absolute top-2 right-2 md:top-3 md:right-3 opacity-30 hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing z-20 text-white p-2'>
        <i className='fa-solid fa-grip-vertical text-lg md:text-base'></i>
      </div>
    );
  };

  return (
    <div
      className={`min-h-screen font-sans ${themeClass} bg-white/5`}
      style={themeStyle}
    >
      <style>{`
        .rich-editor[data-placeholder]:empty:before {
            content: attr(data-placeholder);
            color: rgba(255, 255, 255, 0.4);
            pointer-events: none;
            display: block;
        }
        .announcement-content img {
            max-width: 100%;
            border-radius: 8px;
            margin-top: 10px;
            margin-bottom: 10px;
            max-height: 400px;
            object-fit: contain;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .announcement-content a {
            color: #60a5fa;
            text-decoration: underline;
        }
        .announcement-content b, .announcement-content strong {
            font-weight: bold;
            color: #ffffff;
        }
        
        /* React Grid Layout Overrides */
        .react-grid-item { transition: all 200ms ease; transition-property: left, top; }
        .react-grid-item.cssTransforms { transition-property: transform; }
        .react-grid-item.resizing { z-index: 10; will-change: width, height; }
        .react-grid-item.react-draggable-dragging { transition: none; z-index: 20; will-change: transform; }
        .drag-handle { cursor: grab; }
        .drag-handle:active { cursor: grabbing; }

        /* Custom Scrollbar for inner widgets */
        .widget-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .widget-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .widget-scroll::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 4px;
        }
        .widget-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
        
        /* Mobile Touch Enhancements */
        @media (max-width: 768px) {
          .widget-scroll::-webkit-scrollbar { width: 3px; }
          .dashboard-card, button, a { -webkit-tap-highlight-color: transparent; }
        }
      `}</style>

      {/* ALERTS OVERLAY */}
      {Array.isArray(alerts) && alerts.length > 0 && (
        <div className='fixed top-20 right-4 z-[200] space-y-2 max-w-sm'>
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-3 rounded-lg shadow-lg border text-sm animate-in slide-in-from-right-2 ${
                alert.type === 'error'
                  ? 'bg-red-500/90 text-white border-red-400'
                  : 'bg-yellow-500/90 text-black border-yellow-400'
              }`}
            >
              <div className='flex items-start justify-between'>
                <div className='flex items-center gap-2 flex-1'>
                  <i
                    className={`fa-solid ${alert.type === 'error' ? 'fa-exclamation-triangle' : 'fa-exclamation-circle'}`}
                  ></i>
                  <span className='font-medium'>{alert.message}</span>
                </div>
                <button
                  onClick={() => dismissAlert(alert.id)}
                  className='text-xs opacity-50 hover:opacity-100 ml-2 p-1'
                  title='Dismiss'
                >
                  <i className='fa-solid fa-times'></i>
                </button>
              </div>
              <div className='text-xs opacity-75 mt-1'>
                {alert.timestamp.toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FULLSCREEN OVERLAY (Outside of layout grid) */}
      {isFullscreen && (
        <div className='fixed inset-0 z-[100] flex flex-col items-center justify-center p-8 dashboard-card bg-black/80 backdrop-blur-md border border-white/20'>
          <button
            onClick={() => setIsFullscreen(false)}
            className='absolute top-6 right-6 p-4 hover:text-red-500 transition'
          >
            <i className='fa-solid fa-compress text-3xl'></i>
          </button>
          <div className='text-center w-full max-w-5xl space-y-12'>
            <div>
              <h2 className='text-4xl md:text-6xl font-bold uppercase mb-4 opacity-70'>
                {currentPeriodDisplay}
              </h2>
              <div className='text-[20vw] md:text-[12rem] font-mono font-bold leading-none tracking-tighter'>
                {timeLeft}
              </div>
            </div>
            <div className='w-full bg-white/10 rounded-full h-8 border border-white/20 p-1 relative overflow-hidden'>
              <div
                className='h-full bg-blue-500 rounded-full relative overflow-hidden transition-all duration-1000 ease-linear'
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* NAVBAR */}
      <nav className='dashboard-nav shadow-lg sticky top-0 z-50 border-b border-white/20 bg-white/5'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex items-center justify-between h-16'>
            <div className='flex items-center gap-3'>
              <img
                src='/CC.png'
                alt='Logo'
                className='w-9 h-9 object-contain'
              />
              <span className='font-bold text-lg tracking-wide'></span>
            </div>

            <div className='flex items-center gap-4'>
              {/* VOICE BUTTON */}
              <button
                onClick={() => navigate('/voice')}
                className='relative p-2 text-slate-300 hover:text-white transition group flex items-center justify-center'
                title='Voice Chat'
              >
                <i className='fa-solid fa-microphone-lines text-xl group-hover:scale-110 transition-transform text-green-400'></i>
              </button>

              {/* NOTIFICATIONS BUTTON (Replaced Support) */}
              <button
                onClick={() => navigate('/notifications')}
                className='relative p-2 text-slate-300 hover:text-white transition group flex items-center justify-center'
                title='Notifications'
              >
                <i className='fa-solid fa-bell text-xl group-hover:scale-110 transition-transform text-yellow-400'></i>
              </button>

              {/* DMs BUTTON */}
              {allowDms && (
                <button
                  onClick={() => navigate('/messages')}
                  className='relative p-2 text-slate-300 hover:text-white transition group flex items-center justify-center'
                  title='Direct Messages'
                >
                  {unreadDMs > 0 && (
                    <span
                      className='absolute -top-1 -right-1 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold min-w-[20px] h-5 px-1 rounded-full border border-slate-900 shadow-sm animate-pulse'
                      title={`${unreadDMs} unread message(s)`}
                    >
                      {unreadDMs}
                    </span>
                  )}
                  <i className='fa-solid fa-comment-dots text-xl group-hover:scale-110 transition-transform text-blue-400'></i>
                </button>
              )}

              <div className='flex items-center gap-3'>
                <div className='hidden md:flex flex-col items-end'>
                  <span className='text-sm font-medium'>{username}</span>
                  <span className='text-xs opacity-70'>{displayRole}</span>
                </div>
                <img
                  src={avatarUrl || currentUserDefaultAvatar}
                  alt='Profile'
                  className='w-9 h-9 rounded-full border-2 border-slate-700 object-cover bg-slate-800'
                  onError={(e) => {
                    if (
                      e.target.src !==
                      window.location.origin + currentUserDefaultAvatar
                    )
                      e.target.src = currentUserDefaultAvatar;
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* MAIN CONTENT (DRAG AND DROP GRID) */}
      <main className='max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8'>
        {layoutLoaded && (
          <ResponsiveGridLayout
            className='layout'
            layouts={layouts}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            cols={{ lg: 12, md: 10, sm: 6, xs: 1, xxs: 1 }}
            rowHeight={50}
            onLayoutChange={handleLayoutChange}
            draggableHandle='.drag-handle'
            isDraggable={allowDashboardCustomization}
            isResizable={allowDashboardCustomization}
            margin={[20, 20]}
            containerPadding={[0, 0]}
          >
            {/* GREETING CARD */}
            <div key='greeting' className='relative h-full'>
              <div className='dashboard-card rounded-xl p-6 shadow-md flex justify-between items-center border border-white/20 bg-white/5 h-full overflow-hidden relative'>
                <DragHandle />
                <div>
                  <h1 className='text-2xl font-bold'>Dashboard</h1>
                  <p className='opacity-70 mt-1'>
                    {greeting},{' '}
                    <span className='text-blue-500 font-bold'>{username}</span>
                  </p>
                </div>
                <div className='hidden sm:block text-right pr-4'>
                  <div className='text-xs opacity-50 uppercase tracking-wide font-bold'>
                    Today is
                  </div>
                  <div className='text-lg font-medium'>
                    {new Date().toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* NAV BUTTONS */}
            <div key='navbuttons' className='relative h-full'>
              <div className='dashboard-card rounded-xl p-2 shadow-md border border-white/20 bg-white/5 h-full relative flex flex-col overflow-hidden'>
                {allowDashboardCustomization && (
                  <button
                    onClick={() => setIsEditingDock(!isEditingDock)}
                    className='absolute top-2 left-2 z-20 text-xs bg-blue-600/50 hover:bg-blue-500 text-white px-2 py-1 rounded transition'
                  >
                    {isEditingDock ? 'Done' : 'Edit Dock'}
                  </button>
                )}
                <DragHandle />
                <div
                  className={`grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 w-full h-full gap-2 p-2 pt-8 md:pt-2 overflow-y-auto widget-scroll`}
                >
                  {isEditingDock && allowDashboardCustomization
                    ? ALL_APPS.map((app) => {
                        if (app.reqAdmin && !isAdmin) return null;
                        const isActive = dockApps.includes(app.id);
                        return (
                          <button
                            key={`edit-${app.id}`}
                            onClick={() => handleDockChange(app.id)}
                            className={`min-h-[80px] w-full relative flex flex-col items-center justify-center p-2 rounded-xl shadow-sm border transition-all ${isActive ? 'bg-green-500/20 border-green-500/50' : 'bg-white/5 border-white/20 opacity-50'}`}
                          >
                            <i
                              className={`fa-solid ${app.icon} text-xl md:text-2xl mb-1 md:mb-2 ${app.color}`}
                            ></i>
                            <span className='text-xs md:text-sm font-medium'>
                              {app.label}
                            </span>
                            <i
                              className={`absolute top-1 right-1 fa-solid ${isActive ? 'fa-check text-green-400' : 'fa-plus text-slate-400'}`}
                            ></i>
                          </button>
                        );
                      })
                    : ALL_APPS.filter(
                        (app) =>
                          dockApps.includes(app.id) &&
                          (!app.reqAdmin || isAdmin),
                      ).map((app) => (
                        <NavButton
                          key={app.id}
                          icon={app.icon}
                          label={app.label}
                          color={app.color}
                          onClick={() => navigate(app.path || '#')}
                          badge={app.hasBadge ? onlineCount : undefined}
                          mentions={app.hasMentions ? mentionCount : undefined}
                        />
                      ))}
                </div>
              </div>
            </div>

            {/* ADMIN INPUT (RICH TEXT) */}
            {isAdmin && (
              <div key='admin_post' className='relative h-full'>
                <div className='dashboard-card rounded-xl shadow-md border border-white/20 bg-white/5 h-full flex flex-col relative overflow-hidden'>
                  <DragHandle />
                  <div className='flex justify-between items-center p-4 border-b border-white/10 shrink-0'>
                    <h3 className='text-sm font-bold opacity-80 uppercase tracking-wider'>
                      <i className='fa-solid fa-pen-to-square mr-2 text-blue-400'></i>{' '}
                      Post Announcement
                    </h3>
                    <button
                      onClick={handlePostAnnouncement}
                      disabled={isPosting}
                      className='bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2 border border-blue-400 mr-6'
                    >
                      {isPosting ? (
                        <i className='fa-solid fa-circle-notch fa-spin'></i>
                      ) : (
                        <>
                          <i className='fa-solid fa-paper-plane'></i> Post
                        </>
                      )}
                    </button>
                  </div>

                  <div className='flex flex-col flex-1 overflow-hidden p-4'>
                    <div className='flex items-center gap-2 bg-white/10 p-2 border border-white/20 rounded-t-lg text-slate-300 shrink-0'>
                      <button
                        onClick={() => handleExecCmd('bold')}
                        className='p-1.5 hover:bg-white/10 rounded hover:text-white transition'
                      >
                        <i className='fa-solid fa-bold'></i>
                      </button>
                      <button
                        onClick={() => handleExecCmd('italic')}
                        className='p-1.5 hover:bg-white/10 rounded hover:text-white transition'
                      >
                        <i className='fa-solid fa-italic'></i>
                      </button>
                      <button
                        onClick={() => handleExecCmd('underline')}
                        className='p-1.5 hover:bg-white/10 rounded hover:text-white transition'
                      >
                        <i className='fa-solid fa-underline'></i>
                      </button>
                      <div className='w-px h-5 bg-white/20 mx-1'></div>
                      <button
                        onClick={handleInsertLink}
                        className='p-1.5 hover:bg-white/10 rounded hover:text-white transition'
                        title='Insert Link'
                      >
                        <i className='fa-solid fa-link'></i>
                      </button>
                      <button
                        onClick={handleInsertImage}
                        className='p-1.5 hover:bg-white/10 rounded hover:text-white transition'
                        title='Insert Image'
                      >
                        <i className='fa-solid fa-image'></i>
                      </button>
                    </div>
                    <div
                      ref={editorRef}
                      contentEditable
                      onPaste={handlePaste}
                      className='rich-editor w-full flex-1 overflow-y-auto widget-scroll p-3 bg-white/5 border border-t-0 border-white/20 rounded-b-lg focus:outline-none focus:bg-white/10 transition-colors'
                      data-placeholder='Type a new announcement... (Images can be pasted directly!)'
                    ></div>
                  </div>
                </div>
              </div>
            )}

            {/* ANNOUNCEMENTS LIST */}
            <div key='announcements' className='relative h-full'>
              <div className='dashboard-card rounded-xl shadow-md border border-white/20 bg-white/5 h-full flex flex-col relative overflow-hidden'>
                <DragHandle />
                <div className='p-4 border-b border-white/10 shrink-0'>
                  <h2 className='text-xl font-bold flex items-center gap-2'>
                    <i className='fa-solid fa-bullhorn text-orange-400'></i>{' '}
                    Announcements
                  </h2>
                </div>
                <div className='flex-1 overflow-y-auto widget-scroll p-4 space-y-4'>
                  {announcements.length > 0 ? (
                    announcements.map((post) => (
                      <div
                        key={post.id}
                        className='bg-white/5 border border-white/20 p-4 rounded-lg relative group transition-all hover:bg-white/10'
                      >
                        <div className='flex items-start justify-between'>
                          <div className='flex gap-3 w-full'>
                            <img
                              src={
                                getStorageAvatar(post.author_id) ||
                                getDefaultAvatar(post.profiles?.username)
                              }
                              alt='Avatar'
                              className='w-10 h-10 rounded-full border border-slate-600 object-cover shrink-0 cursor-pointer hover:opacity-80 transition-opacity bg-slate-800'
                              onClick={() =>
                                navigate(
                                  `/${post.profiles?.username || 'admin'}`,
                                )
                              }
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = getDefaultAvatar(
                                  post.profiles?.username,
                                );
                              }}
                            />
                            <div className='flex-1 min-w-0 overflow-hidden'>
                              <div className='flex items-center gap-1 mb-2 flex-wrap'>
                                <span
                                  className='font-bold text-blue-400 text-sm cursor-pointer hover:underline'
                                  onClick={() =>
                                    navigate(
                                      `/${post.profiles?.username || 'admin'}`,
                                    )
                                  }
                                >
                                  @{post.profiles?.username || 'Admin'}
                                </span>
                                {post.profiles?.is_verified && (
                                  <i
                                    className='fa-solid fa-circle-check text-blue-400 text-xs ml-1'
                                    title='Verified'
                                  ></i>
                                )}
                                <span className='text-xs opacity-50 ml-1'>
                                  • {formatTime(post.created_at)}
                                </span>
                              </div>
                              <div
                                className='text-sm leading-relaxed announcement-content break-words'
                                dangerouslySetInnerHTML={{
                                  __html: post.content,
                                }}
                              />
                            </div>
                          </div>
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteAnnouncement(post.id)}
                              className='text-slate-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 ml-2 shrink-0'
                            >
                              {isDeleting === post.id ? (
                                <i className='fa-solid fa-circle-notch fa-spin'></i>
                              ) : (
                                <i className='fa-solid fa-trash-can'></i>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className='text-center opacity-50 py-8 italic'>
                      No recent announcements.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* TIMER WIDGET */}
            <div key='timer' className='relative h-full'>
              <div className='dashboard-card rounded-xl shadow-md p-6 relative flex flex-col border border-white/20 bg-white/5 h-full overflow-hidden'>
                <DragHandle />
                <button
                  onClick={() => setIsFullscreen(true)}
                  className='absolute top-4 right-12 opacity-50 hover:opacity-100 p-2 z-10'
                >
                  <i className='fa-solid fa-expand'></i>
                </button>
                <div className='shrink-0 mb-4'>
                  <h2 className='text-lg font-bold opacity-70 uppercase tracking-wide mb-2 pr-12'>
                    Current Period
                  </h2>
                  <div className='text-3xl font-bold text-blue-400 mb-1'>
                    {currentPeriodDisplay}
                  </div>
                  <div className='text-5xl font-mono font-bold tracking-tight mb-4'>
                    {timeLeft}
                  </div>
                  <div className='w-full bg-white/10 rounded-full h-2.5 mb-2 border border-white/20 overflow-hidden'>
                    <div
                      className='bg-blue-500 h-2.5 rounded-full transition-all duration-1000 ease-linear'
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>
                <div className='flex-1 overflow-y-auto widget-scroll space-y-2 text-sm border-t border-white/20 pt-4'>
                  {scheduleData &&
                    scheduleData.map((block, i) => (
                      <div
                        key={i}
                        className='flex justify-between items-center opacity-70'
                      >
                        <span>{block.period_name}</span>
                        <span className='font-mono text-xs'>
                          {block.start_time} - {block.end_time}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* WEATHER */}
            <div key='weather' className='relative h-full'>
              <div className='dashboard-card rounded-xl shadow-md flex flex-col border border-white/20 bg-white/5 h-full overflow-hidden relative'>
                <DragHandle />
                <div className='p-4 pb-0 shrink-0'>
                  <h2 className='text-lg font-bold mb-4 flex items-center gap-2'>
                    <i className='fa-solid fa-cloud-sun text-yellow-400'></i>{' '}
                    Weather
                  </h2>
                </div>
                <div className='flex-1 overflow-y-auto widget-scroll p-4 pt-0'>
                  {loadingWeather ? (
                    <div className='flex justify-center py-8'>
                      <i className='fa-solid fa-circle-notch fa-spin text-2xl text-blue-500'></i>
                    </div>
                  ) : weather ? (
                    <div className='space-y-4'>
                      {weather.alerts.length > 0 && (
                        <div className='space-y-2'>
                          {weather.alerts.map((alert, idx) => (
                            <div
                              key={idx}
                              className='bg-red-500/10 border border-red-500/30 rounded p-2 text-xs'
                            >
                              <div
                                className='flex justify-between items-center cursor-pointer'
                                onClick={() => toggleAlert(alert.properties.id)}
                              >
                                <span className='font-bold text-red-400 flex items-center gap-1'>
                                  <i className='fa-solid fa-triangle-exclamation'></i>{' '}
                                  {alert.properties.event}
                                </span>
                              </div>
                              {expandedAlerts.has(alert.properties.id) && (
                                <div className='mt-2 opacity-80 border-t border-red-500/20 pt-1 leading-relaxed'>
                                  {alert.properties.description}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-3'>
                          <i
                            className={`fa-solid ${getWeatherIcon(weather.current.code)} text-4xl text-slate-300`}
                          ></i>
                          <div>
                            <div className='text-3xl font-bold'>
                              {weather.current.temp}°
                            </div>
                            <div className='text-xs opacity-60'>
                              High {weather.daily.high}° • Low{' '}
                              {weather.daily.low}°
                            </div>
                          </div>
                        </div>
                        <div className='text-right'>
                          <div className='text-blue-400 font-bold text-sm'>
                            <i className='fa-solid fa-droplet'></i>{' '}
                            {weather.daily.rainChance}% Rain
                          </div>
                          {weather.rainStart && (
                            <div className='text-xs text-orange-400 mt-1'>
                              Rain starting ~{weather.rainStart}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className='grid grid-cols-3 gap-2 pt-4 border-t border-white/20 mt-4'>
                        {['morning', 'noon', 'afternoon'].map((t) => (
                          <div
                            key={t}
                            className='text-center bg-white/5 border border-white/10 rounded p-2'
                          >
                            <div className='text-xs opacity-50 mb-1 capitalize'>
                              {t}
                            </div>
                            <i
                              className={`fa-solid ${getWeatherIcon(weather.timeline[t].code)} mb-1 text-slate-400`}
                            ></i>
                            <div className='font-bold'>
                              {weather.timeline[t].temp}°
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className='text-center opacity-50 text-sm'>
                      Weather unavailable
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* SERVER STATUS */}
            <div key='server' className='relative h-full'>
              <div className='dashboard-card rounded-xl shadow-md p-6 border border-white/20 bg-white/5 h-full flex flex-col relative overflow-hidden'>
                <DragHandle />
                <div className='flex justify-between items-center mb-4 pr-6 shrink-0'>
                  <h2 className='text-lg font-bold flex items-center gap-2'>
                    <i
                      className={`fa-solid fa-server ${serverStatus === 'online' ? 'text-green-400' : serverStatus === 'slow' ? 'text-yellow-400' : 'text-red-400'}`}
                    ></i>
                    Server Status
                  </h2>
                  <div className='flex items-center gap-2'>
                    <button
                      onClick={() => {
                        refresh();
                        checkPiServer();
                        checkClientInternet();
                      }}
                      className='text-sm opacity-50 hover:opacity-100 p-1'
                      title='Refresh'
                    >
                      <i className='fa-solid fa-refresh'></i>
                    </button>
                  </div>
                </div>
                <div className='flex-1 overflow-y-auto widget-scroll space-y-3'>
                  {/* 1. Raspberry Pi Status */}
                  {piStatus === 'offline' ? (
                    <div className='flex flex-col items-center justify-center p-4 bg-red-900/30 border-2 border-red-500 rounded-lg text-center mt-1 mb-3 animate-pulse'>
                      <div className='text-xl md:text-2xl font-black text-red-500 uppercase tracking-widest leading-tight'>
                        THE PI HAS BEEN EATEN.
                      </div>
                      <div className='text-xs md:text-sm font-bold text-red-400 mt-2 opacity-90'>
                        (stay tuned for updates.)
                      </div>
                    </div>
                  ) : (
                    <div className='flex items-center justify-between'>
                      <span className='text-sm opacity-70'>
                        Raspberry Pi Server
                      </span>
                      <div className='flex items-center gap-2'>
                        {piStatus === 'checking' ? (
                          <i className='fa-solid fa-circle-notch fa-spin text-blue-400'></i>
                        ) : (
                          <i
                            className={`fa-solid fa-circle ${piStatus === 'online' ? 'text-green-400' : 'text-yellow-400'}`}
                          ></i>
                        )}
                        <span
                          className={`text-sm font-medium ${piStatus === 'online' ? 'text-green-400' : 'text-yellow-400'}`}
                        >
                          {piStatus === 'checking'
                            ? 'Checking...'
                            : piStatus === 'online'
                              ? 'Online'
                              : 'Slow'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 2. Global Services Server / Client Internet */}
                  <div className='flex items-center justify-between border-t border-white/20 pt-3'>
                    <span className='text-sm opacity-70'>Client Internet</span>
                    <div className='flex items-center gap-2'>
                      {clientInternetStatus === 'checking' ? (
                        <i className='fa-solid fa-circle-notch fa-spin text-blue-400'></i>
                      ) : (
                        <i
                          className={`fa-solid fa-circle ${clientInternetStatus === 'online' ? 'text-green-400' : clientInternetStatus === 'slow' ? 'text-yellow-400' : 'text-red-400'}`}
                        ></i>
                      )}
                      <span
                        className={`text-sm font-medium ${clientInternetStatus === 'online' ? 'text-green-400' : clientInternetStatus === 'slow' ? 'text-yellow-400' : 'text-red-400'}`}
                      >
                        {clientInternetStatus === 'checking'
                          ? 'Checking...'
                          : clientInternetStatus === 'online'
                            ? 'Stable'
                            : clientInternetStatus === 'slow'
                              ? 'Unstable'
                              : 'Offline'}
                      </span>
                    </div>
                  </div>

                  {/* Ping Times */}
                  <div className='flex items-center justify-between border-t border-white/20 pt-2 mt-2'>
                    <span className='text-xs opacity-50'>Local Latency</span>
                    <span className='text-xs font-mono opacity-80'>
                      {displayPing > 0 ? `${displayPing}ms` : '--'}
                    </span>
                  </div>
                  <div className='flex items-center justify-between'>
                    <span className='text-xs opacity-50'>
                      Pi Server Latency
                    </span>
                    <span className='text-xs font-mono opacity-80'>
                      {piPing > 0 ? `${piPing}ms` : '--'}
                    </span>
                  </div>

                  {lastChecked && (
                    <div className='text-xs opacity-40 text-center border-t border-white/20 pt-2 mt-2'>
                      Last checked: {lastChecked.toLocaleTimeString()}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* SURVEYS */}
            <div key='surveys' className='relative h-full'>
              <div className='dashboard-card rounded-xl shadow-md border border-white/20 bg-white/5 h-full flex flex-col relative overflow-hidden'>
                <DragHandle />
                <div className='flex justify-between items-center p-4 border-b border-white/10 shrink-0'>
                  <h2 className='text-xl font-bold flex items-center gap-2'>
                    <i className='fa-solid fa-square-poll-vertical text-purple-400'></i>{' '}
                    Surveys
                  </h2>
                  {isAdmin && (
                    <button
                      onClick={() => setShowSurveyForm(!showSurveyForm)}
                      className='text-sm bg-blue-600/20 text-blue-400 px-3 py-1 rounded hover:bg-blue-600/40 transition border border-white/10 mr-6'
                    >
                      {showSurveyForm ? 'Cancel' : 'Add'}
                    </button>
                  )}
                </div>
                <div className='flex-1 overflow-y-auto widget-scroll p-4'>
                  {isAdmin && showSurveyForm && (
                    <div className='mb-4 bg-white/5 p-4 rounded-lg border border-white/20 animate-in fade-in slide-in-from-top-2'>
                      <div className='grid gap-3'>
                        <input
                          type='text'
                          placeholder='Title'
                          value={newSurveyTitle}
                          onChange={(e) => setNewSurveyTitle(e.target.value)}
                          className='w-full px-3 py-2 rounded focus:border-blue-500 dashboard-input border border-white/20 bg-white/5'
                        />
                        <input
                          type='text'
                          placeholder='Link'
                          value={newSurveyLink}
                          onChange={(e) => setNewSurveyLink(e.target.value)}
                          className='w-full px-3 py-2 rounded focus:border-blue-500 dashboard-input border border-white/20 bg-white/5'
                        />
                        <button
                          onClick={handlePostSurvey}
                          disabled={isPostingSurvey}
                          className='bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-500 transition border border-blue-400'
                        >
                          {isPostingSurvey ? '...' : 'Post'}
                        </button>
                      </div>
                    </div>
                  )}
                  <div className='grid gap-3'>
                    {surveys.length > 0 ? (
                      surveys.map((survey) => (
                        <div
                          key={survey.id}
                          className='flex items-center justify-between bg-white/5 border border-white/20 p-4 rounded-lg hover:bg-white/10 transition group'
                        >
                          <a
                            href={survey.link}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='flex-1 flex items-center gap-3'
                          >
                            <div className='bg-purple-500/20 text-purple-400 w-10 h-10 rounded-full flex items-center justify-center shrink-0 border border-purple-500/30'>
                              <i className='fa-solid fa-clipboard-question'></i>
                            </div>
                            <div>
                              <h3 className='font-bold text-sm group-hover:text-blue-400 transition-colors'>
                                {survey.title}
                              </h3>
                              <p className='text-xs opacity-50'>
                                Posted by {survey.profiles?.username || 'Staff'}{' '}
                                • {formatTime(survey.created_at)}
                              </p>
                            </div>
                          </a>
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteSurvey(survey.id)}
                              className='text-slate-500 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition'
                            >
                              <i className='fa-solid fa-trash-can'></i>
                            </button>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className='text-center opacity-50 py-4 italic'>
                        No active surveys.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* SOCIAL LINKS */}
            <div key='social' className='relative h-full'>
              <div className='dashboard-card rounded-xl shadow-md flex flex-col border border-white/20 bg-white/5 h-full relative overflow-hidden'>
                <DragHandle />
                <div className='p-4 shrink-0'>
                  <h2 className='text-lg font-bold flex items-center gap-2'>
                    <i className='fa-solid fa-link text-green-400'></i> Social
                    Links
                  </h2>
                </div>
                <div className='flex-1 overflow-y-auto widget-scroll p-4 pt-0 space-y-4'>
                  <a
                    href='https://discord.gg/PEcu3d2eK'
                    target='_blank'
                    rel='noopener noreferrer'
                    className='flex items-center gap-3 p-3 bg-indigo-600/20 border border-indigo-500/30 rounded-lg hover:bg-indigo-600/40 transition group'
                  >
                    <div className='bg-indigo-600 w-10 h-10 rounded-full flex items-center justify-center shrink-0'>
                      <i className='fa-brands fa-discord text-white text-xl'></i>
                    </div>
                    <div className='flex-1'>
                      <div className='font-bold text-sm group-hover:text-indigo-400 transition-colors'>
                        Join Discord
                      </div>
                      <div className='text-xs opacity-50'>
                        Click to join our server
                      </div>
                    </div>
                    <i className='fa-solid fa-arrow-right text-indigo-400 opacity-50 group-hover:opacity-100 transition-opacity'></i>
                  </a>

                  <a
                    href='https://www.instagram.com/croomsconnect/'
                    target='_blank'
                    rel='noopener noreferrer'
                    className='flex items-center gap-3 p-3 bg-pink-600/20 border border-pink-500/30 rounded-lg hover:bg-pink-600/40 transition group'
                  >
                    <div className='bg-pink-600 w-10 h-10 rounded-full flex items-center justify-center shrink-0'>
                      <i className='fa-brands fa-instagram text-white text-xl'></i>
                    </div>
                    <div className='flex-1'>
                      <div className='font-bold text-sm group-hover:text-pink-400 transition-colors'>
                        Follow on Instagram
                      </div>
                      <div className='text-xs opacity-50'>@croomsconnect</div>
                    </div>
                    <i className='fa-solid fa-arrow-right text-pink-400 opacity-50 group-hover:opacity-100 transition-opacity'></i>
                  </a>
                </div>
              </div>
            </div>

            {/* INCIDENT TRACKRER */}
            <div key='incident' className='relative h-full'>
              <div className='dashboard-card rounded-xl shadow-md p-4 border border-white/20 bg-white/5 text-center h-full relative flex flex-col justify-center overflow-hidden'>
                <DragHandle />
                <div className='border-4 border-green-600 rounded-lg p-2 bg-white/10 relative overflow-hidden h-full flex flex-col justify-center'>
                  <h2 className='text-[16px] md:text-xl font-black uppercase tracking-widest text-green-500 mb-2'>
                    Days Without Incident
                  </h2>

                  <div className='bg-black text-red-500 text-4xl md:text-6xl font-mono font-bold py-2 md:py-4 rounded-md mx-auto w-24 md:w-32 shadow-inner border-2 border-slate-800 tracking-wider'>
                    {daysWithoutIncident.toString().padStart(3, '0')}
                  </div>

                  {isAdmin && (
                    <button
                      onClick={handleResetIncident}
                      className='mt-3 bg-red-600/20 text-red-400 border border-red-500/50 hover:bg-red-600 hover:text-white px-3 py-1.5 rounded font-bold uppercase text-[10px] md:text-xs tracking-wider transition-all'
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            </div>
          </ResponsiveGridLayout>
        )}
      </main>
    </div>
  );
};

// NavButton Component
const NavButton = ({ icon, label, color, onClick, badge, mentions }) => (
  <button
    onClick={onClick}
    className='min-h-[80px] h-full w-full relative flex flex-col items-center justify-center p-2 rounded-xl shadow-sm hover:brightness-110 hover:-translate-y-1 transition-all group border border-white/20 bg-white/5'
  >
    <div className='absolute top-1 right-1 flex gap-1'>
      {badge !== undefined && badge > 0 && (
        <div
          className='flex items-center justify-center bg-green-500 text-white text-[10px] font-bold min-w-[20px] h-5 px-1 rounded-full border border-black/20 shadow-sm transition-all'
          title={`${badge} user(s) online`}
        >
          {badge}
        </div>
      )}
      {mentions !== undefined && mentions > 0 && (
        <div
          className='flex items-center justify-center bg-yellow-500 text-white text-[10px] font-bold min-w-[20px] h-5 px-1 rounded-full border border-black/20 shadow-sm transition-all animate-pulse'
          title={`${mentions} unread mention(s)`}
        >
          <i className='fa-solid fa-at mr-0.5'></i> {mentions}
        </div>
      )}
    </div>

    <i
      className={`fa-solid ${icon} text-xl md:text-2xl mb-1 md:mb-2 ${color}`}
    ></i>
    <span className='text-xs md:text-sm font-medium opacity-70 group-hover:opacity-100 truncate'>
      {label}
    </span>
  </button>
);

export default Dashboard;
