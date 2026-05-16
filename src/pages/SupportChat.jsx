import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useTheme } from '../hooks/useTheme';

const CATEGORIES = [
  'Account Issues',
  'Bug Fixes',
  'Reporting a User',
  'Therapeutic Help',
  'Other Questions',
];
const DEFAULT_AVATAR =
  'https://ui-avatars.com/api/?name=User&background=3b82f6&color=ffffff';
const ADMIN_AVATAR =
  'https://ui-avatars.com/api/?name=Support&background=10b981&color=ffffff';

const SupportChat = ({ session }) => {
  const { themeClass, themeStyle } = useTheme();

  const [, setProfile] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // App StatEE
  const [activeTicket, setActiveTicket] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showStupidPopup, setShowStupidPopup] = useState(true);

  // User Cache
  const [userProfiles, setUserProfiles] = useState({});

  // UI States
  const [confirmCloseId, setConfirmCloseId] = useState(null);

  const messagesEndRef = useRef(null);

  // Show popup on mount
  useEffect(() => {
    setShowStupidPopup(true);
  }, []);

  // 1. Initialize Profile & Mod Detection
  useEffect(() => {
    if (!session) return;

    const initProfile = async () => {
      try {
        const { data: userData, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (error) console.error('Support Auth Error:', error.message);
        if (userData) setProfile(userData);

        const meta = session.user?.user_metadata || {};
        const isMod =
          (userData && userData.is_verified === true) ||
          (userData && userData.is_admin === true) ||
          (userData && userData.is_mod === true) ||
          (userData && userData.role === 'admin') ||
          meta.is_verified === true ||
          meta.role === 'admin';

        setIsAdmin(!!isMod);
      } catch (err) {
        console.error('Critical error in support auth check:', err);
      }
    };
    initProfile();
  }, [session]);

  // 2. Fetch Tickets & Live Subscription
  useEffect(() => {
    if (!session) return;

    const fetchTickets = async () => {
      try {
        let query = supabase
          .from('support_tickets')
          .select('*')
          .order('created_at', { ascending: false });
        // Non-admins only see their own open tickets
        if (!isAdmin)
          query = query.eq('user_id', session.user.id).eq('status', 'open');

        const { data, error } = await query;
        if (data && !error) {
          setTickets(data);
          // Auto-select first ticket for non-admins if they have one open
          if (!isAdmin && data.length > 0 && !activeTicket) {
            setActiveTicket(data[0]);
          }
        }
      } catch (err) {
        console.error('Failed to fetch tickets:', err);
      }
    };

    fetchTickets();

    const ticketSub = supabase
      .channel('support-tickets-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_tickets' },
        (payload) => {
          fetchTickets(); // Refresh the list

          // RELIABILITY FIX: Live-update the active ticket if its status changes
          if (
            payload.new &&
            activeTicket &&
            payload.new.id === activeTicket.id
          ) {
            setActiveTicket((prev) => ({ ...prev, ...payload.new }));
          }
        },
      )
      .subscribe();

    return () => supabase.removeChannel(ticketSub);
  }, [isAdmin, session, activeTicket]); // Added activeTicket to dependencies for the live update check

  // 3. Fetch Messages for Active Ticket
  useEffect(() => {
    if (!activeTicket || !session) return;

    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('support_messages')
          .select('*')
          .eq('ticket_id', activeTicket.id)
          .order('created_at', { ascending: true });

        if (data && !error) {
          setMessages(data);
          scrollToBottom();
        }
      } catch (err) {
        console.error('Message fetch error:', err);
      }
    };

    fetchMessages();

    const messageSub = supabase
      .channel(`ticket-messages-${activeTicket.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `ticket_id=eq.${activeTicket.id}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
          scrollToBottom();
        },
      )
      .subscribe();

    return () => supabase.removeChannel(messageSub);
  }, [activeTicket, session]);

  // 4. Reliable Profile Fetching
  useEffect(() => {
    const fetchMissingProfiles = async () => {
      // Create a set of all IDs we need (Ticket creator + all message senders)
      const idsToFetch = new Set();
      if (activeTicket?.user_id) idsToFetch.add(activeTicket.user_id);

      messages.forEach((m) => {
        if (m.sender_id && m.sender_id !== 'system')
          idsToFetch.add(m.sender_id);
      });

      // Filter out IDs we already have or invalid UUIDs
      const missingIds = Array.from(idsToFetch).filter(
        (id) =>
          id && typeof id === 'string' && id.length === 36 && !userProfiles[id],
      );

      if (missingIds.length > 0) {
        const { data: profilesData, error } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url, is_verified, is_admin')
          .in('id', missingIds);

        if (profilesData && !error) {
          setUserProfiles((prev) => {
            const newProfiles = { ...prev };
            profilesData.forEach((p) => (newProfiles[p.id] = p));
            return newProfiles;
          });
        }
      }
    };

    fetchMissingProfiles();
  }, [messages, activeTicket, userProfiles]);

  const scrollToBottom = () => {
    setTimeout(
      () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }),
      150,
    );
  };

  // 5. Create a new Ticket
  const handleCreateTicket = async () => {
    if (!selectedCategory || !inputText.trim() || isSending || !session) return;
    setIsSending(true);

    try {
      const { data: ticketData, error: ticketError } = await supabase
        .from('support_tickets')
        .insert([
          {
            user_id: session.user.id,
            category: selectedCategory,
            is_anonymous: isAnonymous,
            status: 'open', // Explicitly set status just in case
          },
        ])
        .select()
        .single();

      if (ticketError) throw ticketError;

      await supabase.from('support_messages').insert([
        {
          ticket_id: ticketData.id,
          sender_id: session.user.id,
          message: inputText,
        },
      ]);

      await supabase.from('support_messages').insert([
        {
          ticket_id: ticketData.id,
          sender_id: session.user.id,
          message:
            "We've received your ticket! Our support team has been notified and will be with you as soon as possible. Thank you for your patience.",
          is_system: true,
        },
      ]);

      setInputText('');
      setIsAnonymous(false);
      setActiveTicket(ticketData);
    } catch (err) {
      console.error('Ticket creation failed:', err);
      alert(
        'Failed to create ticket. Please check your connection and try again.',
      );
    } finally {
      setIsSending(false);
    }
  };

  // 6. Send a standard Message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activeTicket || isSending || !session) return;

    setIsSending(true);
    const sentText = inputText;
    setInputText('');

    try {
      await supabase.from('support_messages').insert([
        {
          ticket_id: activeTicket.id,
          sender_id: session.user.id,
          message: sentText,
        },
      ]);
    } catch (err) {
      console.error('Message send failed:', err);
      setInputText(sentText);
    } finally {
      setIsSending(false);
    }
  };

  // 7. Admin Actions (Close & Reopen)
  const handleInitiateClose = () => setConfirmCloseId(activeTicket.id);

  const handleConfirmClose = async () => {
    if (!isAdmin || !activeTicket) return;
    await supabase
      .from('support_tickets')
      .update({ status: 'closed' })
      .eq('id', activeTicket.id);
    setActiveTicket((prev) => ({ ...prev, status: 'closed' }));
    setConfirmCloseId(null);
  };

  const handleCancelClose = () => setConfirmCloseId(null);

  const handleReopenTicket = async () => {
    if (!isAdmin || !activeTicket) return;
    await supabase
      .from('support_tickets')
      .update({ status: 'open' })
      .eq('id', activeTicket.id);
    setActiveTicket((prev) => ({ ...prev, status: 'open' }));
  };

  const renderDisclaimer = () => (
    <div className='bg-red-500/10 border border-red-500/30 text-red-200 p-4 rounded-xl mb-6 text-sm shadow-sm'>
      <div className='font-bold mb-1 text-red-400'>
        <i className='fa-solid fa-triangle-exclamation mr-2'></i> Peer Support
        Disclaimer
      </div>
      We are community volunteers and{' '}
      <strong>are not licensed medical professionals.</strong> If you are
      experiencing a mental health crisis, please call or text 988 (in the US)
      or contact local emergency services immediately.
    </div>
  );

  if (!session) {
    return (
      <div
        className={`flex flex-col items-center justify-center h-screen w-screen bg-[#0a1021] text-white font-sans fixed top-0 left-0 z-50 ${themeClass}`}
        style={themeStyle}
      >
        <div className='bg-[#1e293b] border border-[#334155] p-8 rounded-xl shadow-xl max-w-sm w-full text-center'>
          <i className='fa-solid fa-lock text-4xl text-blue-500 mb-4'></i>
          <h2 className='text-2xl font-bold mb-2'>Authentication Required</h2>
          <p className='text-slate-400 text-sm mb-6'>
            You must be logged into Crooms Connect to access the Support portal.
          </p>
          <a
            href='/auth'
            className='bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-xl transition-colors inline-block w-full'
          >
            Log In
          </a>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex h-screen w-full font-sans fixed top-0 left-0 z-50 ${themeClass} bg-[#0a1021]`}
      style={themeStyle}
    >
      {/* STUPID POPUP MODAL */}
      {showStupidPopup && (
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-[100]'>
          <div className='bg-[#1e293b] border border-[#334155] p-8 rounded-xl shadow-2xl max-w-sm w-full text-center'>
            <h2 className='text-2xl font-bold text-white mb-4'>
              Are you here to submit something stupid?
            </h2>
            <div className='flex gap-4'>
              <button
                onClick={() => {
                  window.location.href =
                    'https://www.youtube.com/watch?v=e_04ZrNroTo';
                }}
                className='flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-xl transition-colors'
              >
                Yes
              </button>
              <button
                onClick={() => setShowStupidPopup(false)}
                className='flex-1 bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-xl transition-colors'
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN SIDEBAR */}
      {isAdmin && (
        <div className='w-1/3 max-w-xs md:max-w-sm border-r border-[#334155] bg-[#1e293b] p-5 overflow-y-auto flex flex-col'>
          <h2 className='text-xl font-bold mb-6 text-white flex items-center gap-2'>
            <i className='fa-solid fa-inbox text-blue-400'></i> Support Inbox
          </h2>

          {tickets.length === 0 ? (
            <div className='text-center mt-10 text-slate-400 text-sm'>
              No tickets at the moment.
            </div>
          ) : null}

          <div className='space-y-3 flex-1 overflow-y-auto pr-1'>
            {tickets.map((t) => (
              <div
                key={t.id}
                onClick={() => {
                  setActiveTicket(t);
                  setConfirmCloseId(null);
                }}
                className={`p-4 rounded-xl cursor-pointer transition-all duration-200 border ${
                  activeTicket?.id === t.id
                    ? 'bg-blue-600/20 border-blue-500 text-white'
                    : 'bg-[#0f172a] border-[#334155] hover:bg-slate-800 text-slate-300'
                }`}
              >
                <div className='flex justify-between items-start mb-2'>
                  <span className='font-bold text-sm flex items-center gap-2'>
                    {t.is_anonymous ? (
                      <>
                        <i className='fa-solid fa-ghost opacity-70'></i>{' '}
                        Anonymous
                      </>
                    ) : (
                      t.category
                    )}
                  </span>
                  <span
                    className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${t.status === 'open' ? 'bg-green-500/20 text-green-400' : 'bg-slate-500/20 text-slate-400'}`}
                  >
                    {t.status}
                  </span>
                </div>
                <div className='text-xs opacity-70'>
                  {t.category} • #{t.id.split('-')[0]}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MAIN CHAT AREA */}
      <div
        className={`flex flex-col h-full bg-[#1e293b] ${isAdmin ? 'flex-1' : 'w-full max-w-4xl mx-auto border-x border-[#334155] shadow-xl'}`}
      >
        {/* State 1: User needs to create a ticket */}
        {!isAdmin && !activeTicket && (
          <div className='m-auto p-8 bg-[#1e293b] rounded-xl border border-[#334155] shadow-lg w-full max-w-md'>
            <div className='text-center mb-8'>
              <h2 className='text-2xl font-bold text-white mb-2'>
                Welcome to ConnectSupport
              </h2>
              <p className='text-sm text-slate-300'>
                How can our team assist you today?
              </p>
            </div>

            {selectedCategory === 'Therapeutic Help' && renderDisclaimer()}

            {selectedCategory === 'Account Issues' && (
              <div className='bg-blue-500/10 border border-blue-500/30 text-blue-100 p-4 rounded-xl mb-6 text-sm shadow-sm'>
                <div className='font-bold mb-1 text-blue-200'>
                  <i className='fa-solid fa-triangle-exclamation mr-2'></i>
                  Account Issues Requirements
                </div>
                before reporting account issues if it is problems with a 59
                number please state your 59 number in the message of reporting
                before hand! then after message 5927000244 with confirm using
                said 59 number to confirm idenity lost access to acc? provided
                acc username beforehand and we will give you a temp password for
                this we do ask for your 59 number to ensure security please
                check your email often. if you do not follow these steps your
                ticket will be closed
              </div>
            )}

            {selectedCategory === 'Reporting a User' && (
              <div className='bg-blue-500/10 border border-blue-500/30 text-blue-100 p-4 rounded-xl mb-6 text-sm shadow-sm'>
                <div className='font-bold mb-1 text-blue-200'>
                  <i className='fa-solid fa-triangle-exclamation mr-2'></i>
                  Reporting Users Requirements
                </div>
                for reporting users provided the users username and a brief
                summary of what happened any attempts to make tickets to attack
                users or insult users / threats in any forms will be closed and
                possibly reported to law enforcement
              </div>
            )}

            <div className='space-y-4'>
              <div>
                <label className='block mb-1 text-sm font-bold text-slate-300'>
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className='w-full p-3 bg-[#0f172a] border border-[#334155] rounded-xl text-white outline-none focus:border-blue-500 transition-colors'
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <label className='flex items-center space-x-3 p-3 rounded-xl bg-[#0f172a] border border-[#334155] cursor-pointer hover:bg-slate-800 transition-colors'>
                <input
                  type='checkbox'
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className='w-4 h-4 rounded border-slate-600 text-blue-500 bg-[#0f172a]'
                />
                <span className='text-sm text-slate-200'>
                  Keep me anonymous to Admins
                </span>
              </label>

              <div>
                <label className='block mb-1 text-sm font-bold text-slate-300'>
                  Describe your issue
                </label>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className='w-full p-3 bg-[#0f172a] border border-[#334155] rounded-xl text-white h-32 outline-none focus:border-blue-500 transition-colors resize-none placeholder-slate-500'
                  placeholder='Provide details here...'
                />
              </div>

              <button
                onClick={handleCreateTicket}
                disabled={!inputText.trim() || isSending}
                className='w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:bg-slate-600 text-white font-bold py-3 px-4 rounded-xl transition-colors flex justify-center items-center'
              >
                {isSending ? (
                  <i className='fa-solid fa-circle-notch fa-spin'></i>
                ) : (
                  'Start Chat'
                )}
              </button>
            </div>
          </div>
        )}

        {/* State 2: Active Chat Session */}
        {activeTicket && (
          <>
            <div className='bg-[#1e293b] border-b border-[#334155] p-4 px-6 flex justify-between items-center z-10 shadow-sm'>
              <div>
                <h3 className='font-bold text-lg text-white'>
                  {activeTicket.category}
                </h3>
                <span className='text-xs text-slate-400'>
                  {isAdmin
                    ? activeTicket.is_anonymous
                      ? 'Assisting: Anonymous'
                      : 'Assisting User'
                    : 'Chatting with Support Team'}
                </span>
              </div>

              {isAdmin && activeTicket.status === 'open' && (
                <div>
                  {confirmCloseId === activeTicket.id ? (
                    <div className='flex gap-2'>
                      <button
                        onClick={handleCancelClose}
                        className='bg-[#475569] hover:bg-[#64748b] px-4 py-2 text-sm font-bold text-white rounded-xl transition-colors'
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleConfirmClose}
                        className='bg-red-600 hover:bg-red-500 px-4 py-2 text-sm font-bold text-white rounded-xl transition-colors'
                      >
                        Confirm Close
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleInitiateClose}
                      className='bg-[#475569] hover:bg-[#64748b] px-4 py-2 text-sm font-bold text-white rounded-xl transition-colors flex items-center gap-2'
                    >
                      <i className='fa-solid fa-lock'></i> Close Ticket
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className='flex-1 overflow-y-auto p-4 md:p-6 space-y-4'>
              {activeTicket.category === 'Therapeutic Help' &&
                renderDisclaimer()}

              {messages.map((msg) => {
                if (msg.is_system) {
                  return (
                    <div key={msg.id} className='flex justify-center my-4'>
                      <div className='bg-[#334155] border border-[#475569] text-slate-200 text-sm py-2 px-4 rounded-xl max-w-[85%] flex items-center gap-3'>
                        <i className='fa-solid fa-robot text-blue-400'></i>
                        <span style={{ wordBreak: 'break-word' }}>
                          {msg.message}
                        </span>
                      </div>
                    </div>
                  );
                }

                const isMe = msg.sender_id === session?.user?.id;
                const senderProfile = userProfiles[msg.sender_id];

                // Fallbacks: If username is empty, try full_name, otherwise just say "User"
                let displayName =
                  senderProfile?.username ||
                  senderProfile?.full_name ||
                  (msg.sender_id === activeTicket?.user_id
                    ? 'User'
                    : 'Support Team');
                let displayAvatar =
                  senderProfile?.avatar_url ||
                  (msg.sender_id === activeTicket?.user_id
                    ? DEFAULT_AVATAR
                    : ADMIN_AVATAR);

                let isVerifiedAdmin =
                  senderProfile?.is_verified ||
                  senderProfile?.is_admin ||
                  (!isMe && msg.sender_id !== activeTicket.user_id);

                // Hide user identity if they requested anonymity
                if (
                  isAdmin &&
                  activeTicket.is_anonymous &&
                  msg.sender_id === activeTicket.user_id
                ) {
                  displayName = 'Anonymous User';
                  displayAvatar = DEFAULT_AVATAR;
                }

                const showAdminBadge = isVerifiedAdmin && (!isMe || isAdmin);

                return (
                  <div
                    key={msg.id}
                    className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`flex max-w-[80%] md:max-w-[70%] ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end gap-2`}
                    >
                      <img
                        src={displayAvatar}
                        alt={displayName}
                        className='w-8 h-8 rounded-full object-cover border border-[#334155] shrink-0 bg-[#0f172a]'
                        onError={(e) => {
                          e.target.src = DEFAULT_AVATAR;
                        }}
                      />

                      <div
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div className='flex items-center gap-1 mb-1 px-1'>
                          <span className='text-xs font-bold text-slate-400'>
                            {displayName}
                          </span>
                          {showAdminBadge && (
                            <i
                              className='fa-solid fa-circle-check text-blue-400 text-[10px]'
                              title='Support Team'
                            ></i>
                          )}
                        </div>

                        <div
                          className={`py-2 px-3.5 shadow-sm ${
                            isMe
                              ? 'bg-blue-600 text-white rounded-xl rounded-br-sm'
                              : 'bg-[#334155] text-slate-100 rounded-xl rounded-bl-sm'
                          }`}
                        >
                          <div
                            style={{ wordBreak: 'break-word' }}
                            className='text-sm leading-relaxed'
                          >
                            {msg.message}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} className='h-2' />
            </div>

            {activeTicket.status === 'open' ? (
              <form
                onSubmit={handleSendMessage}
                className='p-4 bg-[#1e293b] border-t border-[#334155] flex gap-2'
              >
                <input
                  type='text'
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder='Type a message...'
                  className='flex-1 bg-[#0f172a] border border-[#334155] rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 transition-colors text-sm'
                />
                <button
                  type='submit'
                  disabled={!inputText.trim() || isSending}
                  className='bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:bg-[#475569] px-5 rounded-xl font-bold text-white transition-colors flex items-center justify-center'
                >
                  Send
                </button>
              </form>
            ) : (
              <div className='p-4 bg-[#1e293b] border-t border-[#334155] flex flex-col items-center justify-center gap-3 text-sm'>
                <div className='text-slate-400 flex items-center gap-2'>
                  <i className='fa-solid fa-lock'></i> This support ticket has
                  been closed.
                </div>
                {isAdmin && (
                  <button
                    onClick={handleReopenTicket}
                    className='bg-[#475569] hover:bg-blue-600 px-4 py-2 text-sm font-bold text-white rounded-xl transition-colors flex items-center gap-2'
                  >
                    <i className='fa-solid fa-unlock'></i> Reopen Ticket
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SupportChat;
