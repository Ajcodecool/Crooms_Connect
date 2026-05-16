// src/pages/ConnectDirect.js

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useTheme } from '../hooks/useTheme';
import { useServerSchedule } from '../hooks/useServerSchedule';
import { formatMessageTimestamp } from '../utils/chatUtils';
import AeroOS from '../themes/AeroOS';
import CrimNet from '../themes/CrimNet';
import './Chat.css';

// === Helper to determine file category by extension ===
const getFileType = (fileName) => {
  if (!fileName) return 'unknown';
  const ext = fileName.split('.').pop().toLowerCase();
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(ext))
    return 'image';
  if (['mp4', 'webm', 'ogg', 'mov', 'avi'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'm4a'].includes(ext)) return 'audio';
  return 'document';
};

// === INTERNAL UPLOAD MODAL COMPONENT ===
const StorageUploadModal = ({ session, onClose, onSelect }) => {
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const FETCH_LIMIT = 20; // Load 20 files at a time

  useEffect(() => {
    if (!session?.user?.id) return;
    fetchFiles(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const fetchFiles = async (isLoadMore = false) => {
    if (isLoadMore) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }

    const currentOffset = isLoadMore ? offset + FETCH_LIMIT : 0;

    try {
      const { data, error } = await supabase.storage
        .from('chat-uploads')
        .list(session.user.id, {
          limit: FETCH_LIMIT,
          offset: currentOffset,
          sortBy: { column: 'created_at', order: 'desc' },
        });

      if (error) throw error;

      // Filter out hidden files or empty folder placeholders
      const validFiles = (data || []).filter(
        (f) => f.name !== '.emptyFolderPlaceholder',
      );

      if (isLoadMore) {
        setFiles((prev) => [...prev, ...validFiles]);
      } else {
        setFiles(validFiles);
      }

      // If we got exactly the limit back, there might be more files
      setHasMore(data.length === FETCH_LIMIT);
      setOffset(currentOffset);
    } catch (err) {
      console.error('Error fetching files:', err);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const rawFileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const bucketPath = `${session.user.id}/${rawFileName}`;

      const { error } = await supabase.storage
        .from('chat-uploads')
        .upload(bucketPath, file, { cacheControl: '3600', upsert: false });

      if (error) throw error;

      const { data } = supabase.storage
        .from('chat-uploads')
        .getPublicUrl(bucketPath);

      if (data?.publicUrl) {
        onSelect(data.publicUrl, rawFileName);
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('Failed to upload file.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSelectExisting = (file) => {
    const { data } = supabase.storage
      .from('chat-uploads')
      .getPublicUrl(`${session.user.id}/${file.name}`);
    if (data?.publicUrl) {
      onSelect(data.publicUrl, file.name);
    }
  };

  const getImageUrl = (filename) => {
    return supabase.storage
      .from('chat-uploads')
      .getPublicUrl(`${session.user.id}/${filename}`).data.publicUrl;
  };

  // Helper to get nice display name without timestamp clutter
  const getDisplayName = (filename) => {
    const parts = filename.split('_');
    if (parts.length > 2) return parts.slice(2).join('_');
    if (parts.length === 2) return parts[1];
    return filename;
  };

  return (
    <div className='fixed inset-0 z-[999999] bg-black/80 flex items-center justify-center p-2 sm:p-4 backdrop-blur-sm'>
      <div className='bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl h-[90vh] sm:h-auto sm:max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300'>
        <div className='flex justify-between items-center p-3 sm:p-4 border-b border-slate-700 shrink-0'>
          <h2 className='text-white text-base sm:text-lg font-bold flex items-center'>
            <i className='fa-solid fa-folder-open mr-2 text-blue-400'></i> Media
            Gallery
          </h2>
          <button
            onClick={onClose}
            className='text-slate-400 hover:text-white transition-colors p-2 -mr-2 rounded-full hover:bg-slate-800'
          >
            <i className='fa-solid fa-xmark text-xl'></i>
          </button>
        </div>

        <div className='p-3 sm:p-4 flex-1 overflow-y-auto custom-scrollbar'>
          <div className='mb-4 sm:mb-6 shrink-0'>
            <label className='flex items-center justify-center w-full h-24 sm:h-32 border-2 border-dashed border-slate-600 rounded-xl hover:border-blue-500 hover:bg-slate-800/50 transition-all cursor-pointer'>
              <div className='text-center px-4'>
                {isUploading ? (
                  <i className='fa-solid fa-circle-notch fa-spin text-blue-500 text-2xl sm:text-3xl mb-1 sm:mb-2 block'></i>
                ) : (
                  <i className='fa-solid fa-upload text-slate-400 text-2xl sm:text-3xl mb-1 sm:mb-2 block'></i>
                )}
                <p className='text-slate-300 font-medium text-sm sm:text-base'>
                  {isUploading
                    ? 'Uploading...'
                    : 'Tap or Click to Upload New File'}
                </p>
                <p className='text-slate-500 text-xs mt-1'>
                  Images, Videos, Audio, Documents
                </p>
              </div>
              <input
                type='file'
                accept='image/*,video/*,audio/*,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain'
                className='hidden'
                onChange={handleUpload}
                disabled={isUploading}
              />
            </label>
          </div>

          <h3 className='text-slate-400 text-xs sm:text-sm font-semibold mb-3 uppercase tracking-wider'>
            Your Previous Uploads
          </h3>

          {isLoading ? (
            <div className='text-center text-slate-500 py-8 text-sm'>
              <i className='fa-solid fa-spinner fa-spin mr-2'></i>Loading
              files...
            </div>
          ) : files.length === 0 ? (
            <div className='text-center text-slate-500 py-8 text-sm bg-slate-800/50 rounded-lg border border-slate-700/50'>
              No previous uploads found.
            </div>
          ) : (
            <>
              <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3'>
                {files.map((file) => {
                  const fileType = getFileType(file.name);

                  return (
                    <div
                      key={file.id}
                      onClick={() => handleSelectExisting(file)}
                      className='aspect-square bg-slate-800 rounded-lg border border-slate-700 overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all group relative shadow-md flex items-center justify-center flex-col'
                    >
                      {fileType === 'image' && (
                        <img
                          src={getImageUrl(file.name)}
                          alt={file.name}
                          className='w-full h-full object-cover group-hover:scale-110 transition-transform duration-300'
                          loading='lazy'
                        />
                      )}
                      {fileType === 'video' && (
                        <i className='fa-solid fa-video text-4xl text-slate-500 group-hover:scale-110 transition-transform duration-300'></i>
                      )}
                      {fileType === 'audio' && (
                        <i className='fa-solid fa-music text-4xl text-slate-500 group-hover:scale-110 transition-transform duration-300'></i>
                      )}
                      {fileType === 'document' && (
                        <i className='fa-solid fa-file-lines text-4xl text-slate-500 group-hover:scale-110 transition-transform duration-300'></i>
                      )}
                      {fileType === 'unknown' && (
                        <i className='fa-solid fa-file text-4xl text-slate-500 group-hover:scale-110 transition-transform duration-300'></i>
                      )}

                      {fileType !== 'image' && (
                        <div className='absolute bottom-2 left-2 right-2 text-xs text-center truncate text-slate-400 font-medium px-1 bg-slate-900/60 rounded'>
                          {getDisplayName(file.name)}
                        </div>
                      )}

                      <div className='absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center justify-center z-10'>
                        <span className='text-white text-xs sm:text-sm font-bold bg-blue-600 px-2 py-1 sm:px-3 sm:py-1 rounded-full shadow-lg shadow-blue-900/50'>
                          Select
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {hasMore && (
                <div className='mt-6 mb-2 flex justify-center'>
                  <button
                    onClick={() => fetchFiles(true)}
                    disabled={isLoadingMore}
                    className='bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 px-6 py-2.5 sm:py-2 rounded-full text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg w-full sm:w-auto justify-center'
                  >
                    {isLoadingMore ? (
                      <>
                        <i className='fa-solid fa-spinner fa-spin'></i>{' '}
                        Loading...
                      </>
                    ) : (
                      <>
                        <i className='fa-solid fa-arrow-down'></i> Load More
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const ConnectDirect = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, themeClass, themeStyle } = useTheme();

  // === Auth & User State ===
  const [session, setSession] = useState(null);
  const [username, setUsername] = useState('Guest');
  const [isLoading, setIsLoading] = useState(true);

  // === Timer State ===
  const { periodName, timeLeft } = useServerSchedule(session);

  const [onlineUsers, setOnlineUsers] = useState({});

  // === ToS State ===
  const [, setDmTosAccepted] = useState(
    () => localStorage.getItem('dmTosAccepted_v1') === 'true',
  );
  const [showDmTosModal, setShowDmTosModal] = useState(
    () => !(localStorage.getItem('dmTosAccepted_v1') === 'true'),
  );

  // === Messenger State ===
  const [allUsers, setAllUsers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);

  // === DM Lock State ===
  const [dmLocks, setDmLocks] = useState({});
  const [unlockedChats, setUnlockedChats] = useState([]);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  const [activeLockedChat, setActiveLockedChat] = useState(null);

  // === Pagination State ===
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // === Input, Search, & Edit/Reply State ===
  const [inputHtml, setInputHtml] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingMessage, setEditingMessage] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);

  // === Mobile Accessibility State ===
  const [tappedMessageId, setTappedMessageId] = useState(null);

  // === Reporting State ===
  const [reportingMessage, setReportingMessage] = useState(null);
  const [reportReason, setReportReason] = useState('');
  const [reportOtherText, setReportOtherText] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  // === Image Zoom State ===
  const [zoomedImage, setZoomedImage] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  // === Toast Message State ===
  const [toastMessage, setToastMessage] = useState(null);

  // === Typing Indicator State & Refs ===
  const [typingUsers, setTypingUsers] = useState({});
  const typingTimeoutsRef = useRef({});
  const lastTypingSentTime = useRef(0);

  // === Cache Optimization ===
  const profileCacheRef = useRef({});

  // === Upload Modal State ===
  const [showUploadModal, setShowUploadModal] = useState(false);

  // === Refs ===
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const activeChatRef = useRef(null);
  const dmLocksRef = useRef(dmLocks);
  const editorRef = useRef(null);
  const unsubscribersRef = useRef([]);
  const dmChannelRef = useRef(null);

  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  useEffect(() => {
    dmLocksRef.current = dmLocks;
  }, [dmLocks]);

  // Tab visibility listener for locking chats
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Clear all unlocked sessions globally
        setUnlockedChats([]);
        // Force the active chat to close if it relies on a lock
        if (
          activeChatRef.current &&
          dmLocksRef.current[activeChatRef.current.id]
        ) {
          setActiveChat(null);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Cleanup typing timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(typingTimeoutsRef.current).forEach(clearTimeout);
    };
  }, []);

  const showToast = useCallback(
    (message, icon = 'fa-circle-exclamation', color = 'text-blue-400') => {
      setToastMessage({ message, icon, color });
      setTimeout(() => setToastMessage(null), 3000);
    },
    [],
  );

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }, 100);
  }, []);

  const getAvatarUrl = useCallback((userId) => {
    if (!userId) return null;
    const { data } = supabase.storage
      .from('profile-pictures')
      .getPublicUrl(`${userId}.png`);
    return data?.publicUrl || null;
  }, []);

  const getDefaultAvatar = useCallback((name) => {
    if (!name) return '/DP1.jpg';
    let hash = 0;
    for (let i = 0; i < name.length; i++)
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return `/DP${(Math.abs(hash) % 4) + 1}.jpg`;
  }, []);

  const searchResults = useMemo(() => {
    if (searchQuery.trim() === '') return [];
    const q = searchQuery.toLowerCase();
    return allUsers.filter(
      (u) => u.username && u.username.toLowerCase().includes(q),
    );
  }, [searchQuery, allUsers]);

  const handleAcceptTos = useCallback(() => {
    localStorage.setItem('dmTosAccepted_v1', 'true');
    setDmTosAccepted(true);
    setShowDmTosModal(false);
  }, []);

  const handleDeclineTos = useCallback(() => {
    navigate('/');
  }, [navigate]);

  useEffect(() => {
    const initData = async () => {
      setIsLoading(true);
      const {
        data: { session: activeSession },
      } = await supabase.auth.getSession();
      if (!activeSession) {
        navigate('/auth');
        return;
      }
      setSession(activeSession);

      const [myProfileRes, profilesResponse, dmsResponse, locksResponse] =
        await Promise.all([
          supabase
            .from('profiles')
            .select('username, is_banned')
            .eq('id', activeSession.user.id)
            .single(),
          supabase
            .from('profiles')
            .select('id, username, is_banned, allow_dms')
            .neq('id', activeSession.user.id)
            .neq('is_banned', true),
          supabase
            .from('direct_messages')
            .select(
              'id, sender_id, receiver_id, message, timestamp, is_read, is_deleted',
            )
            .or(
              `sender_id.eq.${activeSession.user.id},receiver_id.eq.${activeSession.user.id}`,
            )
            .order('timestamp', { ascending: false }),
          supabase
            .from('dm_locks')
            .select('locked_user_id')
            .eq('owner_id', activeSession.user.id),
        ]);

      const myProfile = myProfileRes.data;

      // BLOCK BANNED USERS
      if (myProfile?.is_banned) {
        navigate('/');
        return;
      }

      if (myProfile?.username) setUsername(myProfile.username);

      const validProfiles = profilesResponse.data || [];
      const dmsData = (dmsResponse.data || []).filter((dm) => !dm.is_deleted);
      const locksData = locksResponse.data || [];

      // Map locks
      const locksMap = {};
      locksData.forEach((lock) => {
        locksMap[lock.locked_user_id] = true;
      });
      setDmLocks(locksMap);

      validProfiles.forEach((p) => {
        profileCacheRef.current[p.id] = p;
      });
      profileCacheRef.current[activeSession.user.id] = {
        id: activeSession.user.id,
        username: myProfile?.username,
      };

      setAllUsers(validProfiles);

      const convosMap = {};

      dmsData.forEach((dm) => {
        const otherId =
          dm.sender_id === activeSession.user.id
            ? dm.receiver_id
            : dm.sender_id;

        if (!convosMap[otherId]) {
          const profile = validProfiles.find((p) => p.id === otherId);
          if (profile) {
            convosMap[otherId] = {
              type: 'dm',
              id: profile.id,
              contact: profile,
              lastMessage: dm,
              unreadCount: 0,
            };
          }
        }

        if (
          convosMap[otherId] &&
          dm.receiver_id === activeSession.user.id &&
          dm.is_read !== true
        ) {
          convosMap[otherId].unreadCount++;
        }
      });

      const sortedConvos = Object.values(convosMap).sort((a, b) => {
        const timeA = a.lastMessage
          ? new Date(a.lastMessage.timestamp).getTime()
          : 0;
        const timeB = b.lastMessage
          ? new Date(b.lastMessage.timestamp).getTime()
          : 0;
        return timeB - timeA;
      });

      setConversations(sortedConvos);
      setIsLoading(false);
    };
    initData();
  }, [navigate]);

  useEffect(() => {
    const targetUser = location.state?.openChatWith;
    if (targetUser && allUsers.length > 0 && !isLoading) {
      handleSelectChat(targetUser);
      window.history.replaceState({}, document.title);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, allUsers, isLoading]);

  // === Unified Presence & Broadcast Channel ===
  useEffect(() => {
    if (!session || !username) return;

    // 1. Initialize ONE channel for both Presence and Broadcasts
    const channel = supabase.channel('global:chat_room', {
      config: { presence: { key: session.user.id } },
    });

    // 2. Set up Presence Sync
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const onlineMap = {};
        Object.keys(state).forEach((key) => {
          const userPresences = state[key];
          if (userPresences?.[0]) {
            onlineMap[userPresences[0].user_id] = true;
          }
        });
        setOnlineUsers((prev) =>
          JSON.stringify(prev) === JSON.stringify(onlineMap) ? prev : onlineMap,
        );
      })
      // 3. Set up Broadcast Listeners (Typing)
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.receiver_id === session.user.id) {
          const senderId = payload.sender_id;
          setTypingUsers((prev) => ({ ...prev, [senderId]: true }));

          if (typingTimeoutsRef.current[senderId]) {
            clearTimeout(typingTimeoutsRef.current[senderId]);
          }

          typingTimeoutsRef.current[senderId] = setTimeout(() => {
            setTypingUsers((prev) => ({ ...prev, [senderId]: false }));
          }, 3000);
        }
      })
      // 4. Subscribe and Track Presence
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: session.user.id,
            username: username,
            in_connect_direct: true,
            online_at: new Date().toISOString(),
          });
        }
      });

    // Save to ref for sending broadcasts later
    dmChannelRef.current = channel;
    unsubscribersRef.current.push(() => supabase.removeChannel(channel));

    // Cleanup
    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, username]);

  const loadChatHistory = useCallback(
    async (chatObj) => {
      if (!session) return;
      setHasMoreMessages(true);
      try {
        const { data, error } = await supabase
          .from('direct_messages')
          .select('*')
          .or(
            `and(sender_id.eq.${session.user.id},receiver_id.eq.${chatObj.contact.id}),and(sender_id.eq.${chatObj.contact.id},receiver_id.eq.${session.user.id})`,
          )
          .order('timestamp', { ascending: false })
          .limit(50);

        if (!error && data) {
          const markedData = data.map((msg) => {
            if (msg.receiver_id === session.user.id && !msg.is_read) {
              return { ...msg, is_read: true };
            }
            return msg;
          });

          const visibleMessages = markedData.filter((msg) => !msg.is_deleted);
          setMessages(visibleMessages.reverse());
          scrollToBottom();
        }
      } catch (err) {
        console.error('Error loading history:', err);
      }
    },
    [session, scrollToBottom],
  );

  const loadMoreMessages = async () => {
    if (
      !hasMoreMessages ||
      isLoadingMore ||
      messages.length === 0 ||
      !activeChat ||
      !session
    )
      return;

    setIsLoadingMore(true);
    const oldestMsg = messages[0];
    const currentScrollHeight = chatContainerRef.current?.scrollHeight || 0;

    try {
      const { data, error } = await supabase
        .from('direct_messages')
        .select('*')
        .or(
          `and(sender_id.eq.${session.user.id},receiver_id.eq.${activeChat.contact.id}),and(sender_id.eq.${activeChat.contact.id},receiver_id.eq.${session.user.id})`,
        )
        .lt('timestamp', oldestMsg.timestamp)
        .order('timestamp', { ascending: false })
        .limit(50);

      if (!error && data && data.length > 0) {
        const markedData = data.map((msg) => {
          if (msg.receiver_id === session.user.id && !msg.is_read) {
            return { ...msg, is_read: true };
          }
          return msg;
        });

        const visibleData = markedData.filter((msg) => !msg.is_deleted);

        setMessages((prev) => [...visibleData.reverse(), ...prev]);
        if (data.length < 50) setHasMoreMessages(false);

        setTimeout(() => {
          if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop =
              chatContainerRef.current.scrollHeight - currentScrollHeight;
          }
        }, 0);
      } else {
        setHasMoreMessages(false);
      }
    } catch (err) {
      console.error('Error loading older messages:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleScroll = (e) => {
    if (e.target.scrollTop === 0) {
      loadMoreMessages();
    }
  };

  const handleSelectChat = useCallback(
    (chatObj, bypassLock = false) => {
      if (!chatObj.type) {
        chatObj = { type: 'dm', id: chatObj.id, contact: chatObj };
      }

      // Password Lock Check
      if (
        !bypassLock &&
        dmLocks[chatObj.id] &&
        !unlockedChats.includes(chatObj.id)
      ) {
        setActiveLockedChat(chatObj);
        setIsSettingPassword(false);
        setPasswordInput('');
        setShowPasswordModal(true);
        return;
      }

      setActiveChat(chatObj);
      setSearchQuery('');
      setMessages([]);
      setEditingMessage(null);
      setReplyingTo(null);
      setTappedMessageId(null);
      setInputHtml('');
      if (editorRef.current) editorRef.current.innerHTML = '';

      setConversations((prev) => {
        const exists = prev.find((c) => c.id === chatObj.id);
        if (!exists)
          return [{ ...chatObj, lastMessage: null, unreadCount: 0 }, ...prev];
        return prev.map((c) =>
          c.id === chatObj.id ? { ...c, unreadCount: 0 } : c,
        );
      });

      loadChatHistory(chatObj);

      supabase
        .from('direct_messages')
        .update({ is_read: true })
        .eq('sender_id', chatObj.id)
        .eq('receiver_id', session?.user?.id)
        .or('is_read.eq.false,is_read.is.null')
        .then(({ error }) => {
          if (error) console.error('Error updating read status:', error);
        });
    },
    [session, loadChatHistory, dmLocks, unlockedChats],
  );

  const handleForgotPassword = async () => {
    if (!window.confirm('Send a password reset request to the moderators?'))
      return;
    try {
      const { error } = await supabase.from('dm_lock_resets').insert([
        {
          owner_id: session.user.id,
          locked_user_id: activeLockedChat.id,
          username: username,
          locked_username: activeLockedChat.contact.username,
        },
      ]);
      if (error) throw error;
      showToast(
        'Reset request sent to moderators.',
        'fa-check',
        'text-green-400',
      );
      setShowPasswordModal(false);
      setPasswordInput('');
    } catch (err) {
      console.error(err);
      showToast('Failed to send reset request.', 'fa-xmark', 'text-red-400');
    }
  };

  const submitPassword = async () => {
    if (!passwordInput.trim())
      return showToast(
        'Password cannot be empty.',
        'fa-triangle-exclamation',
        'text-yellow-400',
      );

    if (isSettingPassword) {
      try {
        const { error } = await supabase.from('dm_locks').upsert({
          owner_id: session.user.id,
          locked_user_id: activeLockedChat.id,
          password: passwordInput,
        });

        if (error) throw error;

        setDmLocks((prev) => ({ ...prev, [activeLockedChat.id]: true }));
        setUnlockedChats((prev) => [...prev, activeLockedChat.id]);
        setShowPasswordModal(false);
        setPasswordInput('');
        showToast(
          'Chat password updated successfully.',
          'fa-check',
          'text-green-400',
        );
      } catch (err) {
        console.error(err);
        showToast('Failed to set password.', 'fa-xmark', 'text-red-400');
      }
    } else {
      try {
        const { data, error } = await supabase
          .from('dm_locks')
          .select('password')
          .eq('owner_id', session.user.id)
          .eq('locked_user_id', activeLockedChat.id)
          .single();

        if (error) throw error;

        if (data.password === passwordInput) {
          setUnlockedChats((prev) => [...prev, activeLockedChat.id]);
          setShowPasswordModal(false);
          setPasswordInput('');
          handleSelectChat(activeLockedChat, true);
        } else {
          showToast('Incorrect password.', 'fa-lock', 'text-red-400');
        }
      } catch (err) {
        console.error(err);
        showToast('Error verifying password.', 'fa-xmark', 'text-red-400');
      }
    }
  };

  useEffect(() => {
    if (!session) return;

    const handlePayload = async (payload) => {
      if (payload.eventType === 'DELETE') {
        const deletedId = payload.old?.id;
        if (deletedId) {
          setMessages((prev) => prev.filter((m) => m.id !== deletedId));
        }
        return;
      }

      const msg = payload.new;
      if (!msg?.sender_id) return;

      const isMeSender = msg.sender_id === session.user.id;

      if (payload.eventType === 'INSERT') {
        if (msg.is_deleted) return;

        const targetChatId = isMeSender ? msg.receiver_id : msg.sender_id;

        if (activeChatRef.current?.id === targetChatId) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            const newMsg = !isMeSender ? { ...msg, is_read: true } : msg;
            return [...prev, newMsg];
          });

          if (chatContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } =
              chatContainerRef.current;
            if (scrollHeight - scrollTop - clientHeight < 150) {
              scrollToBottom();
            }
          }

          if (!isMeSender) {
            supabase
              .from('direct_messages')
              .update({ is_read: true })
              .eq('id', msg.id)
              .then(({ error }) => {
                if (error) console.error(error);
              });
          }
        }

        setConversations((prev) => {
          const existingIdx = prev.findIndex((c) => c.id === targetChatId);

          if (existingIdx !== -1) {
            const updated = [...prev];
            updated[existingIdx] = {
              ...updated[existingIdx],
              lastMessage: msg,
              unreadCount:
                !isMeSender &&
                (!activeChatRef.current ||
                  activeChatRef.current.id !== targetChatId)
                  ? updated[existingIdx].unreadCount + 1
                  : 0,
            };
            return [
              updated[existingIdx],
              ...updated.filter((_, i) => i !== existingIdx),
            ];
          } else {
            const cachedProfile = profileCacheRef.current[targetChatId];
            if (cachedProfile) {
              return [
                {
                  type: 'dm',
                  id: targetChatId,
                  contact: cachedProfile,
                  lastMessage: msg,
                  unreadCount: isMeSender ? 0 : 1,
                },
                ...prev,
              ];
            }
          }
          return prev;
        });
      } else if (payload.eventType === 'UPDATE') {
        if (msg.is_deleted) {
          setMessages((prev) => prev.filter((m) => m.id !== msg.id));
        } else {
          setMessages((prev) => prev.map((m) => (m.id === msg.id ? msg : m)));
        }

        setConversations((prev) =>
          prev.map((c) => {
            if (c.lastMessage?.id === msg.id) {
              return { ...c, lastMessage: msg.is_deleted ? null : msg };
            }
            return c;
          }),
        );
      }
    };

    const dmChannel = supabase
      .channel(`dms_sync_${session.user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'direct_messages',
          filter: `receiver_id=eq.${session.user.id}`,
        },
        handlePayload,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'direct_messages',
          filter: `sender_id=eq.${session.user.id}`,
        },
        handlePayload,
      )
      .subscribe();

    unsubscribersRef.current.push(() => supabase.removeChannel(dmChannel));

    return () => {
      supabase.removeChannel(dmChannel);
    };
  }, [session, scrollToBottom, conversations]);

  const sendMessageDirectly = useCallback(
    async (contentToSend) => {
      if (!activeChat) return;

      try {
        if (activeChat.contact.allow_dms === false) return;
        await supabase.from('direct_messages').insert([
          {
            sender_id: session.user.id,
            receiver_id: activeChat.contact.id,
            message: contentToSend,
            is_read: false,
            parent_id: replyingTo ? replyingTo.id : null,
          },
        ]);
        setReplyingTo(null);
      } catch (err) {
        console.error('Error sending message:', err);
        showToast('Failed to send message.', 'fa-xmark', 'text-red-400');
      }
    },
    [activeChat, session, replyingTo, showToast],
  );

  const updateMessage = useCallback(
    async (msgId, newContent) => {
      try {
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, message: newContent } : m)),
        );
        setEditingMessage(null);

        const { error } = await supabase
          .from('direct_messages')
          .update({
            message: newContent,
          })
          .eq('id', msgId)
          .select();

        if (error) throw error;
      } catch (err) {
        console.error('Error updating message:', err);
        showToast('Failed to edit message.', 'fa-xmark', 'text-red-400');
      }
    },
    [showToast],
  );

  const deleteMessage = useCallback(
    async (msgId) => {
      if (
        !window.confirm(
          'Are you sure you want to unsend this message?',
        )
      )
        return;
      try {
        setMessages((prev) => prev.filter((m) => m.id !== msgId));

        const { error } = await supabase
          .from('direct_messages')
          .update({ is_deleted: true })
          .eq('id', msgId)
          .select();

        if (error) throw error;
      } catch (err) {
        console.error('Error soft-deleting message:', err);
        showToast('Failed to unsend message.', 'fa-xmark', 'text-red-400');
      }
    },
    [showToast],
  );

  const handleSubmitReport = async () => {
    if (
      !reportReason ||
      (reportReason === 'Other' && !reportOtherText.trim())
    ) {
      showToast(
        'Please provide a reason for reporting.',
        'fa-triangle-exclamation',
        'text-yellow-400',
      );
      return;
    }

    setIsSubmittingReport(true);
    const finalReason =
      reportReason === 'Other' ? `Other: ${reportOtherText}` : reportReason;

    try {
      const reporterPfp =
        getAvatarUrl(session.user.id) || getDefaultAvatar(username);

      const reportedUsername = activeChat.contact.username;
      const reportedPfp =
        getAvatarUrl(activeChat.contact.id) ||
        getDefaultAvatar(reportedUsername);

      const { error } = await supabase.from('reports').insert([
        {
          reporter_username: username,
          reported_username: reportedUsername,
          reporter_pfp: reporterPfp,
          reported_pfp: reportedPfp,
          reported_message: reportingMessage.message,
          reason: finalReason,
        },
      ]);

      if (error) throw error;

      showToast('Report submitted successfully.', 'fa-check', 'text-green-400');
      setReportingMessage(null);
      setReportReason('');
      setReportOtherText('');
    } catch (err) {
      console.error('Error reporting:', err);
      showToast(
        'There was an issue submitting your report.',
        'fa-xmark',
        'text-red-400',
      );
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const handleTyping = useCallback(() => {
    if (!activeChatRef.current || !session || !dmChannelRef.current) return;

    // Prevent REST API fallback by ensuring socket is fully joined
    if (dmChannelRef.current.state !== 'joined') return;

    const now = Date.now();
    // Throttle: Send typing indicator max once every 2.5 seconds
    if (now - lastTypingSentTime.current > 2500) {
      lastTypingSentTime.current = now;

      dmChannelRef.current
        .send({
          type: 'broadcast',
          event: 'typing',
          payload: {
            sender_id: session.user.id,
            receiver_id: activeChatRef.current.contact.id,
          },
        })
        .catch((err) => console.log('Typing broadcast ignored', err));
    }
  }, [session]);

  const handleInput = useCallback(
    (e) => {
      setInputHtml(e.currentTarget.innerHTML);
      handleTyping();
    },
    [handleTyping],
  );

  const handleModalSelect = async (publicUrl, fileName) => {
    setShowUploadModal(false);
    let msgHtml = '';
    const type = getFileType(fileName);

    if (type === 'image') {
      msgHtml = `<img src="${publicUrl}" alt="Uploaded Image" class="dm-uploaded-image" style="max-width: 250px; border-radius: 8px; cursor: zoom-in; margin-top: 4px;" />`;
    } else if (type === 'video') {
      msgHtml = `<video controls src="${publicUrl}" style="max-width: 250px; border-radius: 8px; margin-top: 4px;"></video>`;
    } else if (type === 'audio') {
      msgHtml = `<audio controls src="${publicUrl}" style="max-width: 250px; margin-top: 4px;"></audio>`;
    } else {
      msgHtml = `<a href="${publicUrl}" target="_blank" rel="noopener noreferrer" style="color: #60a5fa; text-decoration: underline;">📎 ${fileName || 'Attachment'}</a>`;
    }

    await sendMessageDirectly(msgHtml);
  };

  const uploadFile = useCallback(
    async (file) => {
      if (
        !file ||
        !session ||
        !activeChat ||
        activeChat.contact.allow_dms === false
      )
        return;

      setIsUploading(true);
      try {
        const fileExt = file.name ? file.name.split('.').pop() : 'png';
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${session.user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('chat-uploads')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from('chat-uploads')
          .getPublicUrl(filePath);

        if (data?.publicUrl) {
          let msgHtml = '';
          const fType = getFileType(file.name || 'image.png');
          if (fType === 'image' || file.type.startsWith('image/')) {
            msgHtml = `<img src="${data.publicUrl}" alt="Uploaded Image" class="dm-uploaded-image" style="max-width: 250px; border-radius: 8px; cursor: zoom-in; margin-top: 4px;" />`;
          } else if (fType === 'video' || file.type.startsWith('video/')) {
            msgHtml = `<video controls src="${data.publicUrl}" style="max-width: 250px; border-radius: 8px; margin-top: 4px;"></video>`;
          } else if (fType === 'audio' || file.type.startsWith('audio/')) {
            msgHtml = `<audio controls src="${data.publicUrl}" style="max-width: 250px; margin-top: 4px;"></audio>`;
          } else {
            msgHtml = `<a href="${data.publicUrl}" target="_blank" rel="noopener noreferrer" style="color: #60a5fa; text-decoration: underline;">📎 ${file.name || 'Attachment'}</a>`;
          }
          await sendMessageDirectly(msgHtml);
        }
      } catch (err) {
        console.error('Upload failed', err);
        showToast('File upload failed.', 'fa-xmark', 'text-red-400');
      } finally {
        setIsUploading(false);
      }
    },
    [session, activeChat, sendMessageDirectly, showToast],
  );

  const handlePaste = useCallback(
    async (e) => {
      e.preventDefault();

      const items = e.clipboardData.items;
      let imagePasted = false;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          imagePasted = true;
          await uploadFile(blob);
          break;
        }
      }

      if (!imagePasted) {
        const text = e.clipboardData.getData('text/plain');
        document.execCommand('insertText', false, text);
      }
    },
    [uploadFile],
  );

  const onSendClick = useCallback(async () => {
    if (
      !inputHtml.replace(/<[^>]*>/g, '').trim() &&
      !inputHtml.includes('<img')
    )
      return;
    if (isSending) return;

    setIsSending(true);
    const textToSend = inputHtml;

    setInputHtml('');
    if (editorRef.current) editorRef.current.innerHTML = '';

    if (editingMessage) {
      await updateMessage(editingMessage.id, textToSend);
    } else {
      await sendMessageDirectly(textToSend);
      scrollToBottom();
    }

    setIsSending(false);
  }, [
    inputHtml,
    isSending,
    editingMessage,
    updateMessage,
    sendMessageDirectly,
    scrollToBottom,
  ]);

  const startEditing = (msg) => {
    setReplyingTo(null);
    setEditingMessage(msg);
    setInputHtml(msg.message);
    if (editorRef.current) {
      editorRef.current.innerHTML = msg.message;
      editorRef.current.focus();
    }
  };

  const cancelEditing = () => {
    setEditingMessage(null);
    setInputHtml('');
    if (editorRef.current) editorRef.current.innerHTML = '';
  };

  const startReplying = (msg) => {
    setEditingMessage(null);
    setReplyingTo(msg);
    if (editorRef.current) editorRef.current.focus();
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  const formatSidebarTime = (timestamp) =>
    timestamp ? formatMessageTimestamp(timestamp) : '';

  const handleChatAreaClick = useCallback((e) => {
    setTappedMessageId(null);

    if (
      e.target.tagName?.toLowerCase() === 'img' &&
      e.target.classList.contains('dm-uploaded-image')
    ) {
      setZoomedImage(e.target.src);
      setZoomLevel(1);
    }
  }, []);

  useEffect(() => {
    const unsubscribers = unsubscribersRef.current;
    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, []);

  // === UI Components ===

  const ToastNotification = toastMessage ? (
    <div className='fixed top-20 left-1/2 transform -translate-x-1/2 bg-gray-900 border border-gray-700 text-white px-6 py-3 rounded-full shadow-2xl z-[9999999] flex items-center gap-3 animate-in slide-in-from-top-5 fade-in duration-300'>
      <i className={`fa-solid ${toastMessage.icon} ${toastMessage.color}`}></i>
      <span className='font-semibold text-sm tracking-wide'>
        {toastMessage.message}
      </span>
    </div>
  ) : null;

  const PasswordModal = showPasswordModal ? (
    <div className='fixed inset-0 z-[999999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4'>
      <div className='bg-black/90 border border-white/20 rounded-xl max-w-sm w-full shadow-2xl p-6 flex flex-col relative overflow-hidden animate-in fade-in zoom-in duration-300'>
        <h2 className='text-xl font-bold text-white mb-4 flex items-center gap-2'>
          <i className='fa-solid fa-lock text-blue-400'></i>
          {isSettingPassword ? 'Set DM Password' : 'Enter DM Password'}
        </h2>
        <div className='space-y-4 mb-6'>
          <p className='text-sm text-white/70'>
            {isSettingPassword
              ? `Create a password to lock your chat with ${activeLockedChat?.contact?.username}.`
              : `This chat is locked. Enter your password to view messages.`}
          </p>
          <div className='flex flex-col gap-2'>
            <input
              type='password'
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder='Password'
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitPassword();
              }}
              className='w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-400 transition-colors'
            />
            {!isSettingPassword && (
              <div className='flex justify-end'>
                <button
                  onClick={handleForgotPassword}
                  className='text-xs text-blue-400 hover:text-blue-300 underline transition-colors'
                >
                  Forgot Password?
                </button>
              </div>
            )}
          </div>
        </div>
        <div className='flex items-center gap-3 justify-end'>
          <button
            onClick={() => {
              setShowPasswordModal(false);
              setPasswordInput('');
            }}
            className='px-4 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors font-medium text-sm'
          >
            Cancel
          </button>
          <button
            onClick={submitPassword}
            className='bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg font-bold text-sm transition-all shadow-lg'
          >
            {isSettingPassword ? 'Lock Chat' : 'Unlock'}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  const DmTosModal = showDmTosModal ? (
    <div className='fixed inset-0 z-[999999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4'>
      <div className='bg-white/5 border border-white/20 rounded-xl max-w-lg w-full shadow-2xl p-6 flex flex-col relative overflow-hidden animate-in fade-in zoom-in duration-300'>
        <h2 className='text-xl font-bold text-white mb-4 flex items-center gap-2'>
          <i className='fa-solid fa-shield-halved text-blue-400'></i>
          Direct Messaging Agreement
        </h2>
        <div className='space-y-4 text-sm text-white/80 leading-relaxed mb-6 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2'>
          <p>
            Welcome to ConnectDirect. Before you begin using direct messages,
            please read and agree to the following terms:
          </p>
          <div className='bg-white/5 border border-white/10 p-4 rounded-lg space-y-3 shadow-inner'>
            <p>
              <strong>1. No Affiliation:</strong> This platform is an
              independently run student/community project.
            </p>
            <p>
              <strong>2. User Responsibility:</strong> You are solely
              responsible for all content, messages, images, and files you
              transmit.
            </p>
            <p>
              <strong>3. Moderation & Safety:</strong> Site moderators reserve
              the right to access and review direct messages if inappropriate
              behavior is detected.
            </p>
          </div>
          <p className='text-xs text-white/50'>
            By clicking &quot;I Accept&quot;, you acknowledge that you have read
            and agreed to these terms.
          </p>
        </div>
        <div className='flex items-center gap-3 justify-end mt-auto pt-2'>
          <button
            onClick={handleDeclineTos}
            className='px-4 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors font-medium text-sm border border-transparent hover:border-white/10'
          >
            Decline & Exit
          </button>
          <button
            onClick={handleAcceptTos}
            className='bg-blue-600/20 text-blue-400 border border-blue-500/50 hover:bg-blue-600 hover:text-white px-6 py-2 rounded font-bold uppercase text-xs tracking-wider transition-all'
          >
            I Accept
          </button>
        </div>
      </div>
    </div>
  ) : null;

  const ReportModal = reportingMessage ? (
    <div className='fixed inset-0 z-[999999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4'>
      <div className='bg-black/90 border border-white/20 rounded-xl max-w-md w-full shadow-2xl p-6 flex flex-col max-h-[80vh]'>
        <h2 className='text-xl font-bold text-white mb-4 flex items-center gap-2'>
          <i className='fa-solid fa-flag text-red-400'></i> Report Message
        </h2>
        <div className='space-y-3 mb-6 flex-1 overflow-y-auto custom-scrollbar pr-2'>
          <p className='text-white/80 text-sm mb-3'>
            <strong>Reported:</strong>{' '}
            {reportingMessage.message.replace(/<[^>]*>/g, '').substring(0, 100)}
            ...
          </p>
          <div>
            <label className='block text-white/70 text-xs uppercase tracking-wider font-bold mb-1.5'>
              Reason
            </label>
            <select
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className='w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-red-400 text-sm'
            >
              <option value=''>Select reason...</option>
              <option value='Spam/Advertising'>Spam or Advertising</option>
              <option value='Harassment/Abuse'>Harassment or Abuse</option>
              <option value='Inappropriate Content'>
                Inappropriate Content
              </option>
              <option value='Impersonation'>Impersonation</option>
              <option value='Other'>Other...</option>
            </select>
          </div>
          {reportReason === 'Other' && (
            <div>
              <label className='block text-white/70 text-xs uppercase tracking-wider font-bold mb-1.5'>
                Details
              </label>
              <textarea
                value={reportOtherText}
                onChange={(e) => setReportOtherText(e.target.value)}
                placeholder='Describe the issue...'
                rows={3}
                className='w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-red-400 resize-none text-sm'
              />
            </div>
          )}
        </div>
        <div className='flex items-center gap-3 pt-2'>
          <button
            onClick={() => setReportingMessage(null)}
            className='flex-1 text-sm text-slate-300 px-4 py-2.5 hover:bg-white/10 rounded-lg border border-transparent transition-all'
          >
            Cancel
          </button>
          <button
            onClick={handleSubmitReport}
            disabled={
              isSubmittingReport ||
              !reportReason ||
              (reportReason === 'Other' && !reportOtherText.trim())
            }
            className='flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all'
          >
            {isSubmittingReport ? (
              <>
                <i className='fa-solid fa-spinner fa-spin'></i>
                Submitting...
              </>
            ) : (
              <>
                <i className='fa-solid fa-paper-plane'></i>
                Submit Report
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  const Header = (
    <div className='chat-header-ui p-4 flex items-center justify-between bg-black/40 border-b border-white/10 backdrop-blur-md shrink-0'>
      <div className='flex items-center gap-3'>
        <button
          onClick={() => navigate('/')}
          className='text-white/70 hover:text-white p-2 md:hidden'
        >
          <i className='fa-solid fa-chevron-left text-xl'></i>
        </button>
        <h1 className='text-white font-bold text-xl drop-shadow-md hidden md:block tracking-wide'>
          Messages
        </h1>
      </div>
      <div className='flex items-center gap-3'>
        <button
          onClick={() => navigate('/')}
          className='hidden md:flex px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/80 hover:text-white font-medium transition-all shadow-sm border border-white/5 items-center gap-2'
        >
          <i className='fa-solid fa-arrow-left text-sm'></i> Dashboard
        </button>
      </div>
    </div>
  );

  const SidebarContent = (
    <div
      className={`w-full md:w-85 flex flex-col bg-black/40 backdrop-blur-md border-r border-white/10 shrink-0 transition-all ${activeChat && theme !== 'aero-os' && theme !== 'crimnet' ? 'hidden md:flex' : 'flex'}`}
    >
      <div className='p-4 border-b border-white/10 bg-black/20 shrink-0'>
        <div className='relative'>
          <i className='fa-solid fa-search absolute left-3.5 top-1/2 transform -translate-y-1/2 text-white/40'></i>
          <input
            type='text'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder='Search users...'
            className='w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder-white/40 focus:outline-none focus:border-blue-500/50 shadow-inner text-[14px]'
          />
        </div>
      </div>

      <div className='flex-1 overflow-y-auto custom-scrollbar p-3'>
        {searchQuery && (
          <div className='mb-4'>
            <h3 className='text-[11px] font-bold text-white/50 uppercase tracking-wider px-2 mb-2'>
              Search Results
            </h3>
            {searchResults.length === 0 ? (
              <div className='text-white/40 text-center text-sm py-4'>
                No users found.
              </div>
            ) : (
              searchResults.map((user) => (
                <div
                  key={user.id}
                  onClick={() => handleSelectChat(user)}
                  className='flex items-center gap-3 p-3 rounded-2xl cursor-pointer hover:bg-white/10 transition-all'
                >
                  <img
                    src={
                      getAvatarUrl(user.id) || getDefaultAvatar(user.username)
                    }
                    alt='PFP'
                    className='w-10 h-10 rounded-full object-cover border border-white/10'
                    onError={(e) => {
                      e.target.src = getDefaultAvatar(user.username);
                    }}
                  />
                  <div className='flex-1 min-w-0'>
                    <h3 className='text-white font-bold text-[14px] truncate flex items-center gap-1.5'>
                      {user.username}
                      {dmLocks[user.id] && (
                        <i className='fa-solid fa-lock text-white/50 text-[10px]'></i>
                      )}
                    </h3>
                    <p
                      className={`text-[12px] font-medium ${onlineUsers[user.id] ? 'text-green-400' : 'text-white/40'}`}
                    >
                      {onlineUsers[user.id] ? 'Active Now' : 'Offline'}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {!searchQuery && (
          <div>
            <h3 className='text-[11px] font-bold text-white/50 uppercase tracking-wider px-2 mb-2 mt-1'>
              Recent
            </h3>
            {conversations.length === 0 ? (
              <div className='text-center text-white/40 mt-10 text-sm px-4'>
                Search for a user above to start messaging.
              </div>
            ) : (
              conversations.map((chat) => {
                const isActive = activeChat?.id === chat.id;
                const isUnread = chat.unreadCount > 0;

                const title = chat.contact.username;
                const isOnline = onlineUsers[chat.id];
                const isLocked = dmLocks[chat.id];
                const isTyping = typingUsers[chat.id];

                let previewText = 'Start a chat';
                if (chat.lastMessage) {
                  if (chat.lastMessage.message.includes('<video'))
                    previewText = '🎥 Video';
                  else if (chat.lastMessage.message.includes('<img'))
                    previewText = '📷 Image';
                  else if (chat.lastMessage.message.includes('<audio'))
                    previewText = '🎵 Audio';
                  else
                    previewText = chat.lastMessage.message.replace(
                      /<[^>]*>?/gm,
                      '',
                    );
                }

                return (
                  <div
                    key={chat.id}
                    onClick={() => handleSelectChat(chat)}
                    className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all mb-1 ${isActive ? 'bg-blue-600/20 border border-blue-500/30 shadow-sm' : 'hover:bg-white/5'}`}
                  >
                    <div className='relative shrink-0'>
                      <img
                        src={
                          getAvatarUrl(chat.contact.id) ||
                          getDefaultAvatar(chat.contact.username)
                        }
                        alt='PFP'
                        className='w-12 h-12 rounded-full object-cover border border-white/10'
                        onError={(e) => {
                          e.target.src = getDefaultAvatar(
                            chat.contact.username,
                          );
                        }}
                      />
                      {isOnline && (
                        <div className='absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#1a1b2f]'></div>
                      )}
                    </div>
                    <div className='flex-1 min-w-0 flex flex-col justify-center gap-0.5'>
                      <div className='flex justify-between items-center'>
                        <h3
                          className={`font-bold truncate text-[14px] flex items-center gap-1.5 ${isUnread ? 'text-white' : 'text-white/90'}`}
                        >
                          {title}
                          {isLocked && (
                            <i className='fa-solid fa-lock text-white/50 text-[10px]'></i>
                          )}
                        </h3>
                        <span
                          className={`text-[10px] shrink-0 ml-2 font-medium ${isUnread ? 'text-blue-400' : 'text-white/40'}`}
                        >
                          {formatSidebarTime(chat.lastMessage?.timestamp)}
                        </span>
                      </div>
                      <div className='flex justify-between items-center'>
                        <p
                          className={`text-[12px] truncate max-w-[85%] ${isUnread ? 'text-white font-semibold' : 'text-white/50'}`}
                        >
                          {isTyping ? (
                            <span className='italic text-blue-400'>
                              Typing...
                            </span>
                          ) : chat.lastMessage?.sender_id ===
                            session?.user?.id ? (
                            `You: ${isLocked && !unlockedChats.includes(chat.id) ? 'Locked Message' : previewText}`
                          ) : isLocked && !unlockedChats.includes(chat.id) ? (
                            'Locked Message'
                          ) : (
                            previewText
                          )}
                        </p>
                        {isUnread && (
                          <div className='w-2.5 h-2.5 bg-blue-500 rounded-full shadow-md shrink-0'></div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );

  const MainContent = (
    <div
      className={`flex-1 flex flex-col bg-black/20 backdrop-blur-md overflow-hidden transition-all ${!activeChat && theme !== 'aero-os' && theme !== 'crimnet' ? 'hidden md:flex' : 'flex'}`}
    >
      {activeChat ? (
        <>
          <div className='px-5 py-4 border-b border-white/10 bg-black/40 flex items-center gap-4 shrink-0 shadow-sm z-10'>
            <button
              className='md:hidden text-white/60 hover:text-white flex items-center justify-center w-8 h-8 rounded-full hover:bg-white/10 transition-colors -ml-2'
              onClick={() => setActiveChat(null)}
            >
              <i className='fa-solid fa-arrow-left'></i>
            </button>

            <div className='relative shrink-0'>
              <img
                src={
                  getAvatarUrl(activeChat.contact.id) ||
                  getDefaultAvatar(activeChat.contact.username)
                }
                alt='PFP'
                className='w-10 h-10 rounded-full object-cover border border-white/10 shadow-md'
                onError={(e) => {
                  e.target.src = getDefaultAvatar(activeChat.contact.username);
                }}
              />
              {onlineUsers[activeChat.contact.id] && (
                <div className='absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#1a1b2f]'></div>
              )}
            </div>

            <div className='flex flex-col flex-1'>
              <h2 className='text-white font-bold text-[15px] leading-tight flex items-center gap-2'>
                {activeChat.contact.username}
                <button
                  onClick={() => {
                    setActiveLockedChat(activeChat);
                    setIsSettingPassword(true);
                    setShowPasswordModal(true);
                  }}
                  className='text-[10px] text-white/40 hover:text-white transition-colors bg-white/5 px-2 py-0.5 rounded-full border border-white/10 flex items-center gap-1 ml-1'
                  title='Lock this chat'
                >
                  <i
                    className={`fa-solid ${dmLocks[activeChat.id] ? 'fa-lock' : 'fa-unlock'}`}
                  ></i>
                  {dmLocks[activeChat.id] ? 'Locked' : 'Lock'}
                </button>
              </h2>
              <p
                className={`text-[11px] mt-0.5 ${onlineUsers[activeChat.contact.id] ? 'text-green-400 font-medium' : 'text-white/40'}`}
              >
                {onlineUsers[activeChat.contact.id] ? 'Active Now' : 'Offline'}
              </p>
            </div>
            <div className='flex flex-col items-end text-right ml-auto'>
              <div className='text-xs font-bold text-yellow-400 bg-yellow-900/50 px-2 py-1 rounded-full border border-yellow-500/50 backdrop-blur-sm shadow-lg'>
                {periodName}
              </div>
              <div className='text-lg font-mono text-white/90 tracking-wider'>
                {timeLeft}
              </div>
            </div>
          </div>

          <div
            className='flex-1 overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar relative'
            onClick={handleChatAreaClick}
            ref={chatContainerRef}
            onScroll={handleScroll}
          >
            {isLoadingMore && (
              <div className='flex justify-center py-2'>
                <i className='fa-solid fa-circle-notch fa-spin text-white/40'></i>
              </div>
            )}

            {messages.length === 0 ? (
              <div className='flex-1 flex flex-col items-center justify-center text-white/40 h-full p-6 text-center'>
                <img
                  src={
                    getAvatarUrl(activeChat.contact.id) ||
                    getDefaultAvatar(activeChat.contact.username)
                  }
                  alt='PFP'
                  className='w-24 h-24 rounded-full object-cover mb-4 opacity-50 grayscale border-2 border-white/10'
                  onError={(e) => {
                    e.target.src = getDefaultAvatar(
                      activeChat.contact.username,
                    );
                  }}
                />
                <p className='text-lg font-bold text-white/80'>
                  Say hi to {activeChat.contact.username}
                </p>
                <p className='text-sm mt-2 max-w-xs leading-relaxed'>
                  This is the beginning of your message history in this chat.
                  Messages are end-to-end encrypted.
                </p>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isSelf = msg.sender_id === session?.user?.id;
                const showTail =
                  idx === messages.length - 1 ||
                  messages[idx + 1].sender_id !== msg.sender_id;
                const isSeen = msg.is_read === true;

                const msgDate = new Date(msg.timestamp);
                const prevMsgDate =
                  idx > 0 ? new Date(messages[idx - 1].timestamp) : null;
                const showDateSeparator =
                  !prevMsgDate ||
                  msgDate.toDateString() !== prevMsgDate.toDateString();

                const parentMsg = msg.parent_id
                  ? messages.find((m) => m.id === msg.parent_id)
                  : null;

                const isTapped = tappedMessageId === msg.id;

                return (
                  <React.Fragment key={msg.id}>
                    {showDateSeparator && (
                      <div className='flex justify-center my-4'>
                        <span className='bg-black/40 text-white/50 text-[11px] font-medium px-4 py-1.5 rounded-full border border-white/5 shadow-sm'>
                          {msgDate.toLocaleDateString([], {
                            weekday: 'long',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    )}

                    <div
                      id={`msg-${msg.id}`}
                      className={`flex w-full group ${isSelf ? 'justify-end' : 'justify-start'}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setTappedMessageId(isTapped ? null : msg.id);
                      }}
                    >
                      {isSelf ? (
                        <div
                          className={`transition-opacity flex items-center gap-4 md:gap-2 pr-3 md:pr-2 shrink-0 ${isTapped ? 'opacity-100' : 'opacity-0 md:group-hover:opacity-100'}`}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              startReplying(msg);
                              setTappedMessageId(null);
                            }}
                            className='text-white/60 hover:text-white transition-colors p-1.5 md:p-0'
                            title='Reply'
                          >
                            <i className='fa-solid fa-reply text-[15px] md:text-xs'></i>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditing(msg);
                              setTappedMessageId(null);
                            }}
                            className='text-white/60 hover:text-white transition-colors p-1.5 md:p-0'
                            title='Edit'
                          >
                            <i className='fa-solid fa-pen text-[15px] md:text-xs'></i>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteMessage(msg.id);
                              setTappedMessageId(null);
                            }}
                            className='text-white/60 hover:text-red-400 transition-colors p-1.5 md:p-0'
                            title='Unsend'
                          >
                            <i className='fa-solid fa-trash text-[15px] md:text-xs'></i>
                          </button>
                        </div>
                      ) : (
                        <div
                          className={`transition-opacity flex items-center gap-4 md:gap-2 pl-3 md:pl-2 shrink-0 order-last ${isTapped ? 'opacity-100' : 'opacity-0 md:group-hover:opacity-100'}`}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              startReplying(msg);
                              setTappedMessageId(null);
                            }}
                            className='text-white/60 hover:text-white transition-colors p-1.5 md:p-0'
                            title='Reply'
                          >
                            <i className='fa-solid fa-reply text-[15px] md:text-xs'></i>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setReportingMessage(msg);
                              setTappedMessageId(null);
                            }}
                            className='text-white/60 hover:text-red-400 transition-colors p-1.5 md:p-0'
                            title='Report'
                          >
                            <i className='fa-solid fa-flag text-[15px] md:text-xs'></i>
                          </button>
                        </div>
                      )}

                      <div
                        className={`max-w-[85%] md:max-w-[70%] flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}
                      >
                        {parentMsg && (
                          <div
                            className={`flex items-center gap-1.5 text-[11px] text-white/50 mb-1 px-2 cursor-pointer hover:text-white/80 transition-colors ${isSelf ? 'flex-row-reverse' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              const el = document.getElementById(
                                `msg-${parentMsg.id}`,
                              );
                              if (el) {
                                el.scrollIntoView({
                                  behavior: 'smooth',
                                  block: 'center',
                                });
                              }
                            }}
                          >
                            <i
                              className={`fa-solid fa-reply ${isSelf ? '' : 'fa-flip-horizontal'} text-[9px]`}
                            ></i>
                            <span className='truncate max-w-[150px] md:max-w-[250px]'>
                              {parentMsg.sender_id === session?.user?.id
                                ? 'You'
                                : profileCacheRef.current[parentMsg.sender_id]
                                    ?.username || 'User'}
                              :{' '}
                              {parentMsg.message.replace(/<[^>]*>?/gm, '') ||
                                'Attachment'}
                            </span>
                          </div>
                        )}

                        <div
                          className={`w-full px-4 py-2.5 relative flex flex-col ${
                            isSelf
                              ? `bg-blue-600 text-white ${showTail && !parentMsg ? 'rounded-2xl rounded-br-sm' : 'rounded-2xl'}`
                              : `bg-[#262628] text-white ${showTail && !parentMsg ? 'rounded-2xl rounded-bl-sm' : 'rounded-2xl'} border border-white/5`
                          }`}
                          style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }}
                        >
                          <div
                            className='break-words text-[15px] whitespace-pre-wrap leading-relaxed dm-content'
                            dangerouslySetInnerHTML={{ __html: msg.message }}
                          />
                          <div
                            className={`text-[10px] mt-1 flex items-center gap-1.5 select-none ${isSelf ? 'text-blue-200 justify-end' : 'text-white/40 justify-start'}`}
                          >
                            {formatMessageTimestamp(msg.timestamp)}
                            {isSelf &&
                              (isSeen ? (
                                <i
                                  className='fa-solid fa-check-double text-blue-300'
                                  title='Read'
                                ></i>
                              ) : (
                                <i
                                  className='fa-solid fa-check text-blue-200/60'
                                  title='Delivered'
                                ></i>
                              ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })
            )}

            {/* In-chat Typing Indicator */}
            {activeChat && typingUsers[activeChat.contact.id] && (
              <div className='flex w-full justify-start items-center gap-2 text-white/50 text-[11px] px-2 mt-1 mb-2 italic'>
                <div className='flex gap-1'>
                  <span
                    className='w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce'
                    style={{ animationDuration: '1s' }}
                  ></span>
                  <span
                    className='w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce'
                    style={{ animationDuration: '1s', animationDelay: '0.2s' }}
                  ></span>
                  <span
                    className='w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce'
                    style={{ animationDuration: '1s', animationDelay: '0.4s' }}
                  ></span>
                </div>
                <span>{activeChat.contact.username} is typing...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {activeChat.contact.allow_dms === false ? (
            <div className='p-4 bg-black/40 shrink-0 border-t border-white/5 flex flex-col items-center justify-center text-white/40 gap-1.5 py-6'>
              <div className='w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 mb-1'>
                <i className='fa-solid fa-user-lock text-lg'></i>
              </div>
              <p className='text-sm font-medium'>
                {activeChat.contact.username} has direct messages disabled.
              </p>
            </div>
          ) : (
            <div className='p-4 bg-black/40 shrink-0 border-t border-white/5 flex flex-col'>
              {(editingMessage || replyingTo) && (
                <div className='flex items-center justify-between bg-blue-500/10 border border-blue-500/20 text-blue-200 px-4 py-2 rounded-t-xl text-xs -mb-2 z-10 mx-auto max-w-4xl w-full'>
                  <span className='truncate'>
                    {editingMessage ? (
                      <>
                        <i className='fa-solid fa-pen mr-1.5'></i> Editing
                        Message
                      </>
                    ) : (
                      <>
                        <i className='fa-solid fa-reply mr-1.5'></i> Replying to{' '}
                        {replyingTo.sender_id === session?.user?.id
                          ? 'yourself'
                          : profileCacheRef.current[replyingTo.sender_id]
                              ?.username || 'User'}
                      </>
                    )}
                  </span>
                  <button
                    onClick={editingMessage ? cancelEditing : cancelReply}
                    className='hover:text-white transition-colors shrink-0 ml-2'
                  >
                    <i className='fa-solid fa-times'></i> Cancel
                  </button>
                </div>
              )}

              <div
                className={`flex gap-2 relative max-w-4xl mx-auto w-full items-end ${editingMessage || replyingTo ? 'mt-2' : ''}`}
              >
                <button
                  type='button'
                  onClick={() => setShowUploadModal(true)}
                  disabled={isUploading || editingMessage}
                  className='text-white/50 hover:text-white p-3 transition-colors disabled:opacity-50 flex items-center justify-center shrink-0 mb-0.5'
                  title='Attach File/Image'
                >
                  {isUploading ? (
                    <i className='fa-solid fa-spinner fa-spin text-xl'></i>
                  ) : (
                    <i className='fa-solid fa-paperclip text-xl'></i>
                  )}
                </button>

                <div
                  className={`relative flex-1 bg-black/20 border border-white/10 flex items-end overflow-hidden focus-within:border-blue-500/50 focus-within:bg-black/40 transition-colors ${editingMessage || replyingTo ? 'rounded-b-xl rounded-tr-xl' : 'rounded-2xl'}`}
                >
                  <div
                    contentEditable
                    ref={editorRef}
                    onInput={handleInput}
                    onPaste={handlePaste}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        onSendClick();
                      }
                    }}
                    className='w-full px-4 py-3.5 text-white focus:outline-none text-[15px] overflow-y-auto max-h-32 custom-scrollbar empty:before:content-[attr(data-placeholder)] empty:before:text-white/40'
                    data-placeholder={
                      editingMessage
                        ? 'Edit your message...'
                        : replyingTo
                          ? `Reply to ${replyingTo.sender_id === session?.user?.id ? 'yourself' : profileCacheRef.current[replyingTo.sender_id]?.username || 'User'}...`
                          : 'Type a message...'
                    }
                  />
                  <button
                    onClick={onSendClick}
                    disabled={
                      isSending ||
                      (!inputHtml.replace(/<[^>]*>/g, '').trim() &&
                        !inputHtml.includes('<img'))
                    }
                    className='m-1.5 mb-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:bg-white/10 disabled:text-white/30 text-white w-9 h-9 rounded-xl flex items-center justify-center transition-all shrink-0'
                  >
                    {isSending ? (
                      <i className='fa-solid fa-circle-notch fa-spin'></i>
                    ) : editingMessage ? (
                      <i className='fa-solid fa-check text-sm'></i>
                    ) : (
                      <i className='fa-solid fa-paper-plane text-sm'></i>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className='flex-1 flex flex-col items-center justify-center text-white/50 p-6 text-center'>
          <div className='w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/10 shadow-inner'>
            <i className='fa-solid fa-message text-3xl opacity-40'></i>
          </div>
          <h2 className='text-xl font-bold mb-1 text-white/80 tracking-wide'>
            ConnectDirect
          </h2>
          <p className='text-sm max-w-xs'>
            Select a conversation or search for a user to start messaging.
          </p>
        </div>
      )}
    </div>
  );

  const ImageLightbox = zoomedImage ? (
    <div
      className='fixed inset-0 z-[999999] bg-black/90 flex flex-col items-center justify-center p-4 backdrop-blur-sm'
      onClick={() => setZoomedImage(null)}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
      }}
    >
      <button
        className='absolute top-4 right-6 text-white text-4xl hover:text-gray-300 z-50 transition-colors'
        onClick={() => setZoomedImage(null)}
        title='Close'
      >
        &times;
      </button>
      <div
        className='absolute bottom-8 flex gap-4 z-50'
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.5))}
          className='bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg backdrop-blur-md transition-all border border-white/20 shadow-lg'
        >
          −
        </button>
        <button
          onClick={() => setZoomLevel(1)}
          className='bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg backdrop-blur-md transition-all border border-white/20 shadow-lg font-semibold'
        >
          Reset
        </button>
        <button
          onClick={() => setZoomLevel((z) => Math.min(5, z + 0.5))}
          className='bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg backdrop-blur-md transition-all border border-white/20 shadow-lg'
        >
          +
        </button>
      </div>
      <div
        className='overflow-auto w-full h-full flex items-center justify-center'
        style={{ cursor: zoomLevel > 1 ? 'grab' : 'zoom-out' }}
      >
        <img
          src={zoomedImage}
          alt='Enlarged view'
          style={{
            transform: `scale(${zoomLevel})`,
            transition: 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          }}
          className='max-w-full max-h-[85vh] object-contain shadow-2xl rounded-sm'
          onClick={(e) => {
            e.stopPropagation();
            if (zoomLevel === 1) setZoomLevel(2);
            else setZoomLevel(1);
          }}
          onDragStart={(e) => e.preventDefault()}
        />
      </div>
    </div>
  ) : null;

  const LoadingScreen = (
    <div
      className={`flex items-center justify-center h-screen w-full ${themeClass}`}
      style={themeStyle}
    >
      <div className='text-white text-xl flex items-center gap-3'>
        <i className='fa-solid fa-circle-notch fa-spin'></i> Loading Messages...
      </div>
    </div>
  );

  return (
    <div
      className={`chat-wrapper ${themeClass} flex flex-col h-screen w-full`}
      style={themeStyle}
    >
      {isLoading ? (
        LoadingScreen
      ) : (
        <>
          {ToastNotification}
          {PasswordModal}
          {DmTosModal}
          {ReportModal}
          {showUploadModal && (
            <StorageUploadModal
              session={session}
              onClose={() => setShowUploadModal(false)}
              onSelect={handleModalSelect}
            />
          )}
          {Header}

          {theme === 'aero-os' ? (
            <div className='flex-1 overflow-hidden'>
              <AeroOS chatSidebar={SidebarContent} chatMain={MainContent} />
            </div>
          ) : theme === 'crimnet' ? (
            <div className='flex-1 overflow-hidden'>
              <CrimNet chatSidebar={SidebarContent} chatMain={MainContent} />
            </div>
          ) : (
            <div className='flex flex-1 overflow-hidden relative z-0'>
              {SidebarContent}
              {MainContent}
            </div>
          )}

          {ImageLightbox}
        </>
      )}
    </div>
  );
};

export default ConnectDirect;
