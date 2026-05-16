import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './Chat.css';

const DMMod = ({ session }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  // Auth State
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Viewer StateS
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!session?.user) {
        navigate('/auth');
        return;
      }
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('is_verified')
        .eq('id', session.user.id)
        .single();
      if (error || !profile?.is_verified) {
        setAccessDenied(true);
      }
      setLoading(false);
    };
    checkAdmin();
  }, [session, navigate]);

  // Handle User Search Debouncing
  useEffect(() => {
    const searchUsers = async (query) => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`username.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(20);

      if (error) console.error('Search error:', error);
      if (data) setUsers(data);
    };

    const timer = setTimeout(() => {
      // Strip commas so it doesn't break the PostgREST .or() syntax
      const safeQuery = searchQuery.trim().replace(/,/g, '');
      if (safeQuery) searchUsers(safeQuery);
      else setUsers([]);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleAuth = async (e) => {
    e.preventDefault();
    if (!agreed) return alert('You must agree to the terms.');
    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: session.user.email,
        password,
      });
      if (error) throw error;

      await supabase.from('mod_logs').insert([
        {
          admin_id: session.user.id,
          action: 'dm_mod_access',
          details: 'Authenticated into DM Moderation Panel',
        },
      ]);

      setAuthenticated(true);
    } catch {
      alert('Auth failed: Incorrect password');
    }
    setAuthLoading(false);
  };

  const handleSelectUser = async (user) => {
    setSelectedUser(user);
    setSelectedPartner(null);
    setMessages([]);
    setConversations([]); // Clear previous conversations to avoid flashing

    await supabase.from('mod_logs').insert([
      {
        admin_id: session.user.id,
        action: 'dm_scan_user',
        target_user_id: user.id,
        details: `Scanned active DMs for ${user.username}`,
      },
    ]);

    // Increased limit to 3000 to ensure we don't chop off active connections for power users
    const { data: dms, error: dmsError } = await supabase
      .from('direct_messages')
      .select('*')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('timestamp', { ascending: false })
      .limit(3000);

    if (dmsError) {
      console.error('Error fetching DMs:', dmsError);
      return;
    }

    if (dms) {
      const partnersMap = {};
      const partnerIdsToFetch = new Set();

      dms.forEach((dm) => {
        const partnerId =
          dm.sender_id === user.id ? dm.receiver_id : dm.sender_id;
        if (!partnersMap[partnerId]) {
          partnersMap[partnerId] = { lastMessage: dm };
          partnerIdsToFetch.add(partnerId);
        }
      });

      if (partnerIdsToFetch.size > 0) {
        const partnerIdsArray = Array.from(partnerIdsToFetch);
        const allProfiles = [];

        // FIX: Fetch profiles in chunks of 50 to prevent "414 URI Too Long" crashes
        for (let i = 0; i < partnerIdsArray.length; i += 50) {
          const chunk = partnerIdsArray.slice(i, i + 50);
          const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .in('id', chunk);

          if (profileError)
            console.error('Chunk profile fetch error:', profileError);
          if (profiles) {
            allProfiles.push(...profiles);
          }
        }

        allProfiles.forEach((p) => {
          if (partnersMap[p.id]) partnersMap[p.id].profile = p;
        });
      }
      setConversations(Object.values(partnersMap).filter((c) => c.profile));
    }
  };

  const handleSelectConversation = async (partner) => {
    setSelectedPartner(partner);
    setMessages([]); // Show loading state briefly

    await supabase.from('mod_logs').insert([
      {
        admin_id: session.user.id,
        action: 'dm_read_convo',
        target_user_id: selectedUser.id,
        details: `Read DMs between ${selectedUser.username} and ${partner.profile.username}`,
      },
    ]);

    // FIX: Much safer query that doesn't rely on nested .or() logic, preventing parse fails
    const { data, error } = await supabase
      .from('direct_messages')
      .select('*')
      .in('sender_id', [selectedUser.id, partner.profile.id])
      .in('receiver_id', [selectedUser.id, partner.profile.id])
      .order('timestamp', { ascending: true })
      .limit(2000);

    if (error) console.error('Error fetching transcript:', error);
    if (data) setMessages(data);
  };

  const getDefaultAvatar = (name) => {
    if (!name) return '/DP1.jpg';
    let hash = 0;
    for (let i = 0; i < name.length; i++)
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return `/DP${(Math.abs(hash) % 4) + 1}.jpg`;
  };

  if (loading)
    return (
      <div className='h-screen flex items-center justify-center bg-slate-950 text-white'>
        <i className='fa-solid fa-circle-notch fa-spin text-3xl'></i>
      </div>
    );
  if (accessDenied)
    return (
      <div className='h-screen flex items-center justify-center bg-slate-950 text-red-500 font-bold text-2xl tracking-widest uppercase'>
        Access Denied
      </div>
    );

  if (!authenticated) {
    return (
      <div className='min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden'>
        <div className='absolute inset-0 pointer-events-none opacity-20'>
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className='absolute w-1 h-1 bg-white rounded-full'
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animation: `pulse ${Math.random() * 3 + 2}s infinite`,
              }}
            ></div>
          ))}
        </div>

        <div className='w-full max-w-md bg-slate-900 rounded-2xl border border-red-900/50 shadow-2xl p-8 animate-in fade-in zoom-in duration-300 relative z-10'>
          <div className='text-center mb-8'>
            <div className='inline-flex items-center justify-center w-16 h-16 bg-red-500/10 rounded-full mb-4 border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]'>
              <i className='fa-solid fa-user-secret text-3xl text-red-500'></i>
            </div>
            <h1 className='text-2xl font-bold text-white tracking-tight'>
              DM Moderation
            </h1>
            <p className='text-red-400 text-sm mt-2 font-bold uppercase tracking-widest'></p>
          </div>

          <div className='mb-6 p-4 rounded-xl text-sm font-medium border border-red-800 bg-red-950/30 text-red-300 flex items-start gap-3'>
            <i className='fa-solid fa-triangle-exclamation mt-0.5 text-red-500'></i>
            <div className='leading-relaxed text-xs'>
              <p className='mb-2'>
                Accessing user direct messages is a{' '}
                <strong className='text-red-400'>
                  severe breach of privacy
                </strong>{' '}
                and must ONLY be used in emergencies.
              </p>
              <p className='mb-2'>
                Your attempt to view any DM will be{' '}
                <strong className='text-red-400'>permanently logged</strong> and
                monitored by developers.
              </p>
              <p>
                You will violate the admin honor code if you abuse this tool.
              </p>
            </div>
          </div>

          <form onSubmit={handleAuth} className='space-y-5'>
            <div className='space-y-1'>
              <label className='text-xs font-bold text-slate-500 uppercase tracking-wider ml-1'>
                Admin Password
              </label>
              <div className='relative group'>
                <div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none'>
                  <i className='fa-solid fa-lock text-slate-500 group-focus-within:text-red-400 transition-colors'></i>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder='••••••••'
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className='w-full bg-slate-950 border border-slate-700 text-white pl-11 pr-11 py-3.5 rounded-xl focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:outline-none transition-all placeholder-slate-600'
                  required
                />
                <button
                  type='button'
                  onClick={() => setShowPassword(!showPassword)}
                  className='absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-slate-400 transition-colors'
                >
                  <i
                    className={`fa-solid text-sm ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}
                  ></i>
                </button>
              </div>
            </div>

            <label className='flex items-start gap-3 cursor-pointer group bg-slate-950/50 p-3 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors mt-2'>
              <input
                type='checkbox'
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className='mt-0.5 w-4 h-4 rounded border-slate-700 text-red-500 focus:ring-red-500 focus:ring-offset-slate-900 bg-slate-950 cursor-pointer'
              />
              <span className='text-sm text-slate-400 group-hover:text-slate-300 transition-colors select-none font-medium'>
                I agree and understand the consequences.
              </span>
            </label>

            <button
              type='submit'
              disabled={!agreed || !password || authLoading}
              className='w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-red-900/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2'
            >
              {authLoading ? (
                <i className='fa-solid fa-circle-notch fa-spin'></i>
              ) : (
                'Authenticate & Proceed'
              )}
              {!authLoading && <i className='fa-solid fa-arrow-right'></i>}
            </button>
          </form>

          <div className='mt-6 text-center pt-6 border-t border-slate-800'>
            <button
              onClick={() => navigate('/admin')}
              className='text-slate-400 text-sm hover:text-white transition-colors hover:underline flex items-center justify-center gap-2 w-full'
            >
              <i className='fa-solid fa-arrow-left'></i> Cancel & Return
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='h-screen bg-slate-950 flex flex-col font-sans overflow-hidden'>
      {/* Header */}
      <div className='h-16 border-b border-red-900/30 bg-slate-900 flex items-center justify-between px-6 shrink-0 shadow-md z-10'>
        <div className='flex items-center gap-3'>
          <div className='w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center border border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.2)]'>
            <i className='fa-solid fa-user-secret text-red-500'></i>
          </div>
          <h1 className='text-white font-bold text-lg tracking-wide'>
            DM Moderation Panel
          </h1>
        </div>
        <button
          onClick={() => navigate('/admin')}
          className='text-slate-400 hover:text-white px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors border border-slate-700'
        >
          Exit Panel
        </button>
      </div>

      <div className='flex flex-1 overflow-hidden'>
        {/* 1. Sidebar: Search Users */}
        <div className='w-80 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0'>
          <div className='p-4 border-b border-slate-800 bg-slate-900'>
            <div className='relative'>
              <i className='fa-solid fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500'></i>
              <input
                type='text'
                placeholder='Search users by name/email...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className='w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500/50 shadow-inner'
              />
            </div>
          </div>
          <div className='flex-1 overflow-y-auto custom-scrollbar p-3'>
            {users.length === 0 && searchQuery && (
              <p className='text-slate-500 text-center text-sm py-4'>
                No users found.
              </p>
            )}
            {!searchQuery && users.length === 0 && (
              <p className='text-slate-600 text-center text-sm py-4'>
                Type to search users
              </p>
            )}

            {users.map((u) => (
              <div
                key={u.id}
                onClick={() => handleSelectUser(u)}
                className={`p-3 rounded-2xl cursor-pointer flex items-center gap-3 mb-1.5 transition-all ${selectedUser?.id === u.id ? 'bg-red-900/20 border border-red-900/40 shadow-sm' : 'hover:bg-slate-800 border border-transparent'}`}
              >
                <img
                  src={u.avatar_url || getDefaultAvatar(u.username)}
                  alt='Avatar'
                  className='w-10 h-10 rounded-full border border-slate-700 object-cover shrink-0'
                  onError={(e) => {
                    e.target.src = getDefaultAvatar(u.username);
                  }}
                />
                <div className='overflow-hidden'>
                  <p
                    className={`font-bold text-[14px] truncate ${selectedUser?.id === u.id ? 'text-white' : 'text-slate-200'}`}
                  >
                    {u.username}
                  </p>
                  <p className='text-slate-500 text-[11px] truncate font-medium'>
                    {u.email}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Middle: Active Conversations */}
        <div className='w-80 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0'>
          <div className='p-4 border-b border-slate-800 bg-slate-950/30 shrink-0 h-[73px] flex flex-col justify-center'>
            <h2 className='text-white font-bold text-sm'>
              Active Conversations
            </h2>
            <p className='text-xs text-slate-500 truncate'>
              {selectedUser
                ? `Showing DMs for ${selectedUser.username}`
                : 'Select a user first'}
            </p>
          </div>
          <div className='flex-1 overflow-y-auto custom-scrollbar p-3'>
            {!selectedUser && (
              <div className='text-center mt-10 text-slate-600'>
                <i className='fa-solid fa-users text-2xl mb-2 opacity-50'></i>
                <p className='text-sm font-medium'>Select a user</p>
              </div>
            )}
            {selectedUser && conversations.length === 0 && (
              <p className='text-slate-600 text-center mt-10 text-sm font-medium'>
                No active conversations found.
              </p>
            )}

            {conversations.map((convo) => (
              <div
                key={convo.profile.id}
                onClick={() => handleSelectConversation(convo)}
                className={`p-3 rounded-2xl cursor-pointer flex items-center gap-3 mb-1.5 transition-all ${selectedPartner?.profile.id === convo.profile.id ? 'bg-red-900/20 border border-red-900/40 shadow-sm' : 'hover:bg-slate-800 border border-transparent'}`}
              >
                <img
                  src={
                    convo.profile.avatar_url ||
                    getDefaultAvatar(convo.profile.username)
                  }
                  alt='Avatar'
                  className='w-10 h-10 rounded-full border border-slate-700 object-cover shrink-0'
                  onError={(e) => {
                    e.target.src = getDefaultAvatar(convo.profile.username);
                  }}
                />
                <div className='overflow-hidden flex-1'>
                  <div className='flex justify-between items-center mb-0.5'>
                    <p
                      className={`font-bold text-[14px] truncate ${selectedPartner?.profile.id === convo.profile.id ? 'text-white' : 'text-slate-200'}`}
                    >
                      {convo.profile.username}
                    </p>
                  </div>
                  <p className='text-slate-500 text-[12px] truncate'>
                    {convo.lastMessage.message.replace(/<[^>]*>?/gm, '')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Main: Message Transcript */}
        <div className='flex-1 bg-[#0b0f19] flex flex-col relative overflow-hidden'>
          <div className='p-4 border-b border-slate-800 bg-slate-900 flex items-center justify-between shrink-0 h-[73px]'>
            <div>
              <h2 className='text-white font-bold'>Transcript Viewer</h2>
              <p className='text-xs text-slate-500 truncate max-w-md'>
                {selectedPartner
                  ? `${selectedUser.username} ↔ ${selectedPartner.profile.username}`
                  : 'Select a conversation'}
              </p>
            </div>
            {selectedPartner && (
              <div className='bg-red-500/10 text-red-400 text-xs px-3 py-1.5 rounded-full border border-red-500/20 flex items-center gap-2 font-bold shadow-[0_0_10px_rgba(239,68,68,0.1)]'>
                <i className='fa-solid fa-circle text-[8px] animate-pulse'></i>{' '}
                LIVE MONITOR
              </div>
            )}
          </div>
          <div className='flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar'>
            {!selectedPartner && (
              <div className='h-full flex flex-col items-center justify-center text-slate-600'>
                <i className='fa-solid fa-shield-halved text-5xl mb-4 opacity-30'></i>
                <p className='font-medium text-sm'>
                  Select a conversation to load the transcript
                </p>
              </div>
            )}
            {messages.map((msg, idx) => {
              const isTarget = msg.sender_id === selectedUser.id;
              const showName =
                idx === 0 || messages[idx - 1].sender_id !== msg.sender_id;

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isTarget ? 'items-end' : 'items-start'}`}
                >
                  {showName && (
                    <span className='text-[10px] text-slate-500 font-bold mb-1 ml-1 mr-1 uppercase tracking-wider'>
                      {isTarget
                        ? selectedUser.username
                        : selectedPartner.profile.username}
                    </span>
                  )}
                  <div
                    className={`max-w-[75%] px-4 py-2.5 relative ${isTarget ? 'bg-slate-800 text-white rounded-2xl rounded-tr-sm' : 'bg-[#151b2b] text-white border border-slate-800 rounded-2xl rounded-tl-sm shadow-sm'}`}
                  >
                    <div
                      dangerouslySetInnerHTML={{ __html: msg.message }}
                      className='text-[14px] break-words whitespace-pre-wrap dm-content leading-relaxed'
                    />
                  </div>
                  <span className='text-[9px] text-slate-600 mt-1.5 font-medium ml-1 mr-1'>
                    {new Date(msg.timestamp).toLocaleString([], {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DMMod;
