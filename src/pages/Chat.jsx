import {
  useState,
  useReducer,
  useEffect,
  useRef,
  useLayoutEffect,
  useMemo,
  useCallback,
} from 'react';

import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './Chat.css';

// === IMPORT HELPERS & LOGGGGIC ===
import {
  getFallbackName,
  resolveAvatar,
  getCharacterCount,
} from '../utils/chatUtils';
import { runFireworks } from '../utils/fireworks';
import { useTheme } from '../hooks/useTheme';
import WeatherEffects from '../components/WeatherEffects';
import { validateMessage } from '../utils/chatFilter';
// chatReducer removed from runtime usage for performance; messages state is local in this component.
import { chatReducer, initialChatState } from './chatReducer';

import { DEVELOPER_EMAILS, BANNED_EMAILS } from '../utils/adminConstants';

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
import ChatFooter from '../components/chat/ChatFooter';

// === IMPORT THEMES ===
import AeroOS from '../themes/AeroOS';
import CrimNet from '../themes/CrimNet';

// === IMPORT ASSETS ===
import bannedImg from '../assets/banned.jpg';

// Helper to determine file category by extension
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

  const PREFERS_REDUCED_MOTION =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [isUploading, setIsUploading] = useState(false);

  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const FETCH_LIMIT = 20;

  // === DELETE STATE ===
  const [selectedFiles, setSelectedFiles] = useState(new Set());
  const [isSelecting, setIsSelecting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // === FAVORITES STATE ===
  const [favorites, setFavorites] = useState(() => {
    try {
      return new Set(
        JSON.parse(
          localStorage.getItem(
            `gallery_favorites_${session?.user?.id}`
          ) || '[]'
        )
      );
    } catch {
      return new Set();
    }
  });

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

      const validFiles = (data || []).filter(
        (f) => f.name !== '.emptyFolderPlaceholder'
      );

      if (isLoadMore) {
        setFiles((prev) => [...prev, ...validFiles]);
      } else {
        setFiles(validFiles);
      }

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
      const rawFileName = `${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}.${fileExt}`;
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

  const getDisplayName = (filename) => {
    const parts = filename.split('_');
    if (parts.length > 2) return parts.slice(2).join('_');
    if (parts.length === 2) return parts[1];
    return filename;
  };

  // === DELETE HANDLERS ===
  const handleDeleteSingle = async (e, file) => {
    e.stopPropagation();
    if (!confirm(`Delete "${getDisplayName(file.name)}"?`)) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.storage
        .from('chat-uploads')
        .remove([`${session.user.id}/${file.name}`]);
      if (error) throw error;
      setFiles((prev) => prev.filter((f) => f.name !== file.name));
      setSelectedFiles((prev) => {
        const next = new Set(prev);
        next.delete(file.name);
        return next;
      });
      // Also remove from favorites if it was favorited
      setFavorites((prev) => {
        const next = new Set(prev);
        if (next.has(file.name)) {
          next.delete(file.name);
          localStorage.setItem(
            `gallery_favorites_${session.user.id}`,
            JSON.stringify([...next])
          );
        }
        return next;
      });
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete file.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedFiles.size === 0) return;
    if (!confirm(`Delete ${selectedFiles.size} selected file(s)?`)) return;
    setIsDeleting(true);
    try {
      const paths = [...selectedFiles].map(
        (name) => `${session.user.id}/${name}`
      );
      const { error } = await supabase.storage
        .from('chat-uploads')
        .remove(paths);
      if (error) throw error;
      setFiles((prev) => prev.filter((f) => !selectedFiles.has(f.name)));
      // Also clean deleted files out of favorites
      setFavorites((prev) => {
        const next = new Set(prev);
        selectedFiles.forEach((name) => next.delete(name));
        localStorage.setItem(
          `gallery_favorites_${session.user.id}`,
          JSON.stringify([...next])
        );
        return next;
      });
      setSelectedFiles(new Set());
      setIsSelecting(false);
    } catch (err) {
      console.error('Bulk delete failed:', err);
      alert('Failed to delete selected files.');
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleSelect = (e, fileName) => {
    if (e) e.stopPropagation();
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      next.has(fileName) ? next.delete(fileName) : next.add(fileName);
      return next;
    });
  };

  // === FAVORITE HANDLER ===
  const toggleFavorite = (e, fileName) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const next = new Set(prev);
      next.has(fileName) ? next.delete(fileName) : next.add(fileName);
      localStorage.setItem(
        `gallery_favorites_${session.user.id}`,
        JSON.stringify([...next])
      );
      return next;
    });
  };

  // === SORT: favorites float to top ===
  const sortedFiles = useMemo(() => {
    return [...files].sort((a, b) => {
      const aFav = favorites.has(a.name) ? 0 : 1;
      const bFav = favorites.has(b.name) ? 0 : 1;
      return aFav - bFav;
    });
  }, [files, favorites]);

  return (
    <div className='fixed inset-0 z-[999999] bg-black/80 flex items-center justify-center p-2 sm:p-4 backdrop-blur-sm'>
      <div
        className={
          PREFERS_REDUCED_MOTION
            ? 'bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl h-[90vh] sm:h-auto sm:max-h-[85vh] flex flex-col overflow-hidden'
            : 'bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl h-[90vh] sm:h-auto sm:max-h-[85vh] flex flex-col overflow-hidden animate-fade-in-down'
        }
      >
        {/* HEADER */}
        <div className='flex justify-between items-center p-3 sm:p-4 border-b border-slate-700 shrink-0'>
          <h2 className='text-white text-base sm:text-lg font-bold flex items-center'>
            <i className='fa-solid fa-folder-open mr-2 text-blue-400'></i> Media
            Gallery
          </h2>
          <div className='flex items-center gap-2'>
            {/* Multi-select toggle */}
            {files.length > 0 && (
              <button
                onClick={() => {
                  setIsSelecting((v) => !v);
                  setSelectedFiles(new Set());
                }}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors font-semibold ${
                  isSelecting
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'border-slate-600 text-slate-400 hover:text-white hover:border-slate-400'
                }`}
              >
                {isSelecting ? 'Cancel' : 'Select'}
              </button>
            )}
            {/* Bulk delete button — only shown when items are checked */}
            {isSelecting && selectedFiles.size > 0 && (
              <button
                onClick={handleDeleteSelected}
                disabled={isDeleting}
                className='text-xs px-3 py-1.5 rounded-full bg-red-600 hover:bg-red-500 text-white font-semibold transition-colors disabled:opacity-50 flex items-center gap-1'
              >
                <i className='fa-solid fa-trash'></i>
                {isDeleting ? 'Deleting...' : `Delete (${selectedFiles.size})`}
              </button>
            )}
            <button
              onClick={onClose}
              className='text-slate-400 hover:text-white transition-colors p-2 -mr-2 rounded-full hover:bg-slate-800'
            >
              <i className='fa-solid fa-xmark text-xl'></i>
            </button>
          </div>
        </div>

        <div className='p-3 sm:p-4 flex-1 overflow-y-auto'>
          {/* UPLOAD ZONE */}
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

          {/* SECTION LABEL */}
          <h3 className='text-slate-400 text-xs sm:text-sm font-semibold mb-3 uppercase tracking-wider flex items-center gap-2'>
            Your Previous Uploads
            {favorites.size > 0 && (
              <span className='text-yellow-500 font-normal normal-case tracking-normal text-xs flex items-center gap-1'>
                <i className='fa-solid fa-star text-[10px]'></i>
                {favorites.size} favorited
              </span>
            )}
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
                {sortedFiles.map((file) => {
                  const fileType = getFileType(file.name);
                  const isFavorited = favorites.has(file.name);
                  const isSelected = selectedFiles.has(file.name);

                  return (
                    <div
                      key={file.id}
                      onClick={() => {
                        if (isSelecting) {
                          toggleSelect(null, file.name);
                        } else {
                          handleSelectExisting(file);
                        }
                      }}
                      className={`aspect-square bg-slate-800 rounded-lg border overflow-hidden cursor-pointer transition-all group relative shadow-md flex items-center justify-center flex-col ${
                        isSelecting && isSelected
                          ? 'border-blue-500 ring-2 ring-blue-500'
                          : isFavorited
                          ? 'border-yellow-500/50 hover:ring-2 hover:ring-blue-500'
                          : 'border-slate-700 hover:ring-2 hover:ring-blue-500'
                      }`}
                    >
                      {/* ── Checkbox (select mode only) ── */}
                      {isSelecting && (
                        <div
                          className='absolute top-1.5 left-1.5 z-20'
                          onClick={(e) => toggleSelect(e, file.name)}
                        >
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                              isSelected
                                ? 'bg-blue-500 border-blue-500'
                                : 'bg-slate-900/80 border-slate-500'
                            }`}
                          >
                            {isSelected && (
                              <i className='fa-solid fa-check text-white text-[10px]'></i>
                            )}
                          </div>
                        </div>
                      )}

                      {/* ── ⭐ Favorite button (normal mode, top-left) ── */}
                      {!isSelecting && (
                        <button
                          onClick={(e) => toggleFavorite(e, file.name)}
                          className={`absolute top-1.5 left-1.5 z-20 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                            isFavorited
                              ? 'bg-yellow-500/90 text-white opacity-100'
                              : 'bg-black/60 text-slate-300 opacity-0 group-hover:opacity-100 hover:bg-yellow-500/80 hover:text-white'
                          }`}
                          title={isFavorited ? 'Unfavorite' : 'Favorite'}
                        >
                          <i
                            className={`fa-star text-xs ${
                              isFavorited ? 'fa-solid' : 'fa-regular'
                            }`}
                          ></i>
                        </button>
                      )}

                      {/* ── ✕ Delete button (normal mode, top-right) ── */}
                      {!isSelecting && (
                        <button
                          onClick={(e) => handleDeleteSingle(e, file)}
                          disabled={isDeleting}
                          className='absolute top-1.5 right-1.5 z-20 w-6 h-6 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-all flex items-center justify-center disabled:cursor-not-allowed'
                          title='Delete'
                        >
                          <i className='fa-solid fa-xmark text-xs'></i>
                        </button>
                      )}

                      {/* ── File preview ── */}
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

                      {/* ── Select overlay (normal mode) ── */}
                      {!isSelecting && (
                        <div className='absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center justify-center z-10'>
                          <span className='text-white text-xs sm:text-sm font-bold bg-blue-600 px-2 py-1 sm:px-3 sm:py-1 rounded-full shadow-lg shadow-blue-900/50'>
                            Select
                          </span>
                        </div>
                      )}
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



const Chat = () => {
  const navigate = useNavigate();
  const { theme, setTheme, themeClass, themeStyle, backgroundEffect } =
    useTheme();

  // === UI STATE ===
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 768);
  const [isCompactMode, setIsCompactMode] = useState(
    () => localStorage.getItem('compactMode') === 'true',
  );
  const [isLoading, setIsLoading] = useState(true);

  // === STATE (useReducer for chat messages) ===
  const [messages, setMessages] = useState([]);

  // === CHAT-DOMAIN STATE (reducer single source of truth) ===
  const [chatState, dispatchChat] = useReducer(chatReducer, initialChatState);

  const typers = chatState.typers;
  const unreadMentions = chatState.unreadMentions;
  const missedMessages = chatState.missedMessages;

  // (legacy: kept earlier for UI prop compatibility, but currently unused)

  // keep online users as local state (not chat-domain state in this reducer)
  const [onlineUsers, setOnlineUsers] = useState({});

  const [session, setSession] = useState(null);

  // Input State
  const [inputHtml, setInputHtml] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Interaction State
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingId, setEditingId] = useState(null);

  // Discipline & Settings
  const [profile, setProfile] = useState(null);
  const [isTimedOut, setIsTimedOut] = useState(false);
  const [timeoutReason, setTimeoutReason] = useState('');
  const [warnings, setWarnings] = useState([]);
  const [chatLocked, setChatLocked] = useState(false);
  const [trustedOnly, setTrustedOnly] = useState(false);
  const [myBadges, setMyBadges] = useState([]);
  const [isBanned, setIsBanned] = useState(false);
  const [banReason, setBanReason] = useState('');

  const [showSettings, setShowSettings] = useState(false);
  const [fireworkCooldown, setFireworkCooldown] = useState(false);
  const [allowFireworks, setAllowFireworks] = useState(true);

  // === INVISIBLE MODE STATE ===
  const [isInvisible, setIsInvisible] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // === IN-APP DM NOTIFICATION STATE ===
  const [dmToast, setDmToast] = useState(null);
  const dmToastTimeoutRef = useRef(null);

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
  const [showUploadModal, setShowUploadModal] = useState(false);

  // === IMAGE ZOOM STATE ===
  const [zoomedImage, setZoomedImage] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  // === FORM POPUP STATE ===
  const [showFormPopup, setShowFormPopup] = useState(false);

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

  const isInvisibleRef = useRef(isInvisible);

  useEffect(() => {
    isInvisibleRef.current = isInvisible;
  }, [isInvisible]);

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

  // === GLOBAL / KEY => focus editor + caret end ===
  useEffect(() => {
    const focusEditorAtEnd = () => {
      if (!editorRef?.current) return;
      try {
        editorRef.current.focus();
        const range = document.createRange();
        range.selectNodeContents(editorRef.current);
        range.collapse(false);
        const sel = window.getSelection();
        if (!sel) return;
        sel.removeAllRanges();
        sel.addRange(range);
      } catch {
        /* ignore */
      }
    };

    const isTypingInFormElement = (el) => {
      if (!el) return false;
      const tag = (el.tagName || '').toLowerCase();
      const isForm = tag === 'input' || tag === 'textarea' || tag === 'select';
      if (isForm) return true;
      // contentEditable (except our chat editor)
      if (el.isContentEditable) return true;
      return false;
    };

    const handleGlobalKeyDown = (e) => {
      if (e.defaultPrevented) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key !== '/') return;
      // avoid stealing focus while user is typing elsewhere
      const active = document.activeElement;
      if (active && active === editorRef.current) return; // already focused
      if (isTypingInFormElement(active)) return;
      // avoid interfering when modals are open
      if (
        showSearchModal ||
        showLeaderboard ||
        showUploadModal ||
        showTosModal ||
        showLockInSetup
      )
        return;

      e.preventDefault();
      focusEditorAtEnd();
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [
    editorRef,
    showSearchModal,
    showLeaderboard,
    showUploadModal,
    showTosModal,
    showLockInSetup,
  ]);

  // === CTRL + O INVISIBLE MODE LISTENER (SERVER-SIDE) ===
  useEffect(() => {
    const handleGlobalKeyDown = async (e) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === 'i'
      ) {
        e.preventDefault();
        if (!session?.user?.id) return;

        const newValue = !isInvisibleRef.current;

        // Optimistic UI Update
        setIsInvisible(newValue);
        setToastMessage(
          newValue ? 'Invisible Mode: ON' : 'Invisible Mode: OFF',
        );
        setTimeout(() => setToastMessage(null), 3000);

        // Update database
        try {
          const { error } = await supabase
            .from('profiles')
            .update({ is_invisible: newValue })
            .eq('id', session.user.id);

          if (error) throw error;
        } catch (err) {
          console.error('Failed to update invisible status on server:', err);
          // Revert optimistic update on failure
          setIsInvisible(!newValue);
          setToastMessage('Failed to update invisible status.');
          setTimeout(() => setToastMessage(null), 3000);
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [session]);

  // === COOLDOWN LOGIC ===
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

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
  const scrollToBottom = useCallback((behavior = 'auto') => {
    // Use instant scroll for reliability; smooth can lag behind layout changes.
    const el = messagesEndRef.current;
    if (!el) return;

    requestAnimationFrame(() => {
      // Double rAF helps when DOM renders in batches.
      requestAnimationFrame(() => {
        el.scrollIntoView({ behavior, block: 'end' });
        localStorage.setItem('lastChatReadTime', Date.now().toString());
        dispatchChat({ type: 'CLEAR_UNREADS' });
        dispatchChat({ type: 'CLEAR_MISSED' });
      });
    });
  }, []);

  const [isLoadingPreviousMessages, setIsLoadingPreviousMessages] =
    useState(false);

  const loadInitialMessages = useCallback(async () => {
    if (isBanned) return;

    try {
      setIsLoadingPreviousMessages(true);
      const { data } = await supabase
        .from('messages')
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
    } finally {
      setIsLoadingPreviousMessages(false);
    }
  }, [isBanned]);

  useEffect(() => {
    if (isBanned) {
      setMessages([]);
      setHasMore(false);
      dispatchChat({ type: 'CLEAR_UNREADS' });
      dispatchChat({ type: 'CLEAR_MISSED' });
    } else if (session && messages.length === 0 && !isLoading) {
      loadInitialMessages();
    }
  }, [
    isBanned,
    session,
    isLoading,
    loadInitialMessages,
    messages.length,
    dispatchChat,
  ]);

  // === IN-APP DM LISTENER ===
  useEffect(() => {
    if (!session?.user?.id) return;

    const dmAlertChannel = supabase
      .channel(`dm_alerts_chat_${session.user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `receiver_id=eq.${session.user.id}`,
        },
        async (payload) => {
          const { data } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', payload.new.sender_id)
            .single();

          const senderName = data?.username || 'Someone';

          const rawMessage = payload.new.message || '';
          const previewText =
            rawMessage.replace(/<[^>]*>?/gm, '').trim() ||
            'Sent an attachment 📎';

          setDmToast({ senderName, previewText });

          if (dmToastTimeoutRef.current)
            clearTimeout(dmToastTimeoutRef.current);
          dmToastTimeoutRef.current = setTimeout(() => {
            setDmToast(null);
          }, 5000);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(dmAlertChannel);
      if (dmToastTimeoutRef.current) clearTimeout(dmToastTimeoutRef.current);
    };
  }, [session]);

  // === BROWSER WAKE UP / TAB FOCUS DETECTOR ===
  useEffect(() => {
    const handleOnline = () => loadInitialMessages();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadInitialMessages();
      }
    };

    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isBanned, loadInitialMessages]);

  // === INITIALIZATION ===
  useEffect(() => {
    let cleanupFunctions = [];
    const initialize = async () => {
      setIsLoading(true);

      const {
        data: { session: initialSession },
      } = await supabase.auth.getSession();
      if (!initialSession) {
        navigate('/auth');
        return;
      }
      setSession(initialSession);

      if (BANNED_EMAILS.includes(initialSession.user.email)) {
        setIsBanned(true);
        setBanReason('Your account has been permanently suspended.');
        setIsLoading(false);
        return;
      }

      const { data: authListener } = supabase.auth.onAuthStateChange(
        (event, newSession) => {
          if (event === 'SIGNED_OUT') {
            navigate('/auth');
          } else if (newSession) {
            setSession(newSession);
          }
        },
      );
      if (authListener?.subscription) {
        cleanupFunctions.push(() => authListener.subscription.unsubscribe());
      }

      const savedFireworks = localStorage.getItem('allow_fireworks');
      if (savedFireworks !== null) setAllowFireworks(savedFireworks === 'true');

      const savedBubbleColor = localStorage.getItem('chatBubbleColor');
      if (savedBubbleColor) {
        document.documentElement.style.setProperty(
          '--chat-bubble-color',
          savedBubbleColor,
        );
      }
      const savedBgColor = localStorage.getItem('chatBackgroundColor');
      if (savedBgColor) {
        document.documentElement.style.setProperty(
          '--chat-bg-color',
          savedBgColor,
        );
      }

      await fetchBlockedUsers(initialSession.user.id);
      await fetchChatSettings();

      const { cleanup } = await fetchProfileAndWarnings(initialSession.user.id);
      if (cleanup) cleanupFunctions.push(cleanup);

      const blockSub = supabase
        .channel(`blocks:${initialSession.user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_blocks',
            filter: `blocker_id=eq.${initialSession.user.id}`,
          },
          () => {
            fetchBlockedUsers(initialSession.user.id);
          },
        )
        .subscribe();

      cleanupFunctions.push(() => supabase.removeChannel(blockSub));

      setIsLoading(false);
    };
    initialize();
    return () => cleanupFunctions.forEach((fn) => fn());
  }, [navigate]);

  // === REALTIME RESTRICTIONS & PROFILE SYNC ===
  useEffect(() => {
    if (!profile) return;

    parseAndSetBadges(profile.selected_badge);

    // Sync Server-side Invisible Mode to Local State
    if (profile.is_invisible !== undefined) {
      setIsInvisible(profile.is_invisible);
    }

    // Sync survey state
    if (profile.has_seen_survey) {
      setShowFormPopup(false);
    } else {
      setShowFormPopup(true);
    }

    if (profile.compact_mode !== undefined) {
      setIsCompactMode(profile.compact_mode);
      localStorage.setItem('compactMode', profile.compact_mode);
    }

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
      setTimeoutReason(
        profile.timeout_reason ||
          profile.chat_timeout_reason ||
          profile.ban_reason ||
          'Violation of community guidelines',
      );
    } else {
      setIsTimedOut(false);
      setTimeoutReason('');
    }

    if (profile.lock_in_until && new Date(profile.lock_in_until) > new Date()) {
      setLockInUntil(profile.lock_in_until);
      setLockInStart(profile.lock_in_start);
    } else {
      setLockInUntil(null);
      setLockInStart(null);
    }
  }, [profile]);

  useEffect(() => {
    if (isBanned) {
      const refreshTimer = setTimeout(() => {
        window.location.reload();
      }, 100);
      return () => clearTimeout(refreshTimer);
    }
  }, [isBanned]);

  const fetchProfileAndWarnings = async (userId) => {
    const { data: userData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (userData) setProfile(userData);

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

  const parseAndSetBadges = (rawBadges) => {
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

  // Close Survey locally but don't prevent it from showing on next reload
  const handleCloseSurveyLocal = () => {
    setShowFormPopup(false);
  };

  // Permanent survey dismiss
  const handleDismissSurveyForever = async () => {
    if (!session?.user?.id) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ has_seen_survey: true })
        .eq('id', session.user.id);
      if (error) throw error;
      setShowFormPopup(false);
    } catch (err) {
      console.error('Failed to dismiss survey:', err);
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
    if (!session?.user || isBanned || isLoading) return;

    let channel;
    let isMounted = true;
    let reconnectTimeout;

    const connectChannel = () => {
      if (channel) supabase.removeChannel(channel);

      const user = session.user;

      channel = supabase.channel('public:room1', {
        config: { presence: { key: user.id } },
      });
      channel
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages' },
          (payload) => {
            setMessages((prevMessages) => {
              if (prevMessages.some((msg) => msg.id === payload.new.id)) {
                return prevMessages;
              }

              // Keep newest-first capped buffer for performance.
              const next = [...prevMessages, payload.new];

              // Insert in timestamp order only when necessary (avoid full-array sort each time).
              // Because most messages arrive newest-at-end, we only sort if the new msg breaks ordering.
              const newTs = new Date(payload.new.timestamp).getTime();
              const prevLast = prevMessages[prevMessages.length - 1];
              const prevLastTs = prevLast
                ? new Date(prevLast.timestamp).getTime()
                : null;

              let ordered = next;
              if (prevLastTs !== null && newTs < prevLastTs) {
                ordered = next
                  .slice()
                  .sort(
                    (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
                  );
              }

              const MAX_MESSAGES = 300;
              if (ordered.length > MAX_MESSAGES) {
                return ordered.slice(ordered.length - MAX_MESSAGES);
              }

              return ordered;
            });
          },
        )

        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'messages' },
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
          const username = payload.username;
          const now = Date.now();

          // Update local TTL cache.
          typingTtlByUsernameRef.current[username] = now + TYPING_TTL_MS;

          // Bump UI immediately.
          dispatchChat({
            type: 'BUMP_TYPING',
            payload: { username, at: now },
          });
        })
        .on('broadcast', { event: 'fireworks' }, () => {
          if (allowFireworksRef.current)
            runFireworks(
              fireworksCanvasRef.current,
              particlesRef,
              animationFrameRef,
            );
        })
        .on('broadcast', { event: 'force_refresh' }, () =>
          window.location.reload(),
        )
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          const users = {};

          Object.keys(state).forEach((key) => {
            const presences = state[key];
            if (presences && presences.length > 0) {
              const p = presences[0];
              if (p.user_id && p.status !== 'invisible') {
                users[p.user_id] = {
                  ...p,
                  username: p.username || 'Unknown User',
                };
              }
            }
          });

          setOnlineUsers(users);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            loadInitialMessages();

            const username =
              getFallbackName(user, profileRef.current) || 'Unknown User';
            const userAvatar = resolveAvatar(user, profileRef.current);
            const initialStatus = isInvisibleRef.current
              ? 'invisible'
              : profileRef.current?.status || 'online';

            await channel.track({
              user_id: user.id,
              username,
              avatar_url: userAvatar,
              badge_type: myBadgesRef.current,
              status: initialStatus,
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
      if (channel) supabase.removeChannel(channel);
    };
  }, [session?.user, isBanned, isLoading, loadInitialMessages]);

  // === PRESENCE TRACKING FIX ===
  const presencePayload = useMemo(() => {
    if (!session?.user) return null;
    return {
      user_id: session.user.id,
      username: getFallbackName(session.user, profile) || 'Unknown User',
      avatar_url: resolveAvatar(session.user, profile),
      badge_type: myBadges,
      status: isInvisible ? 'invisible' : profile?.status || 'online',
    };
  }, [session?.user, profile, myBadges, isInvisible]);

  const lastTrackedPayloadRef = useRef(null);

  useEffect(() => {
    if (
      channelRef.current &&
      presencePayload &&
      channelRef.current.state === 'joined'
    ) {
      const payloadStr = JSON.stringify(presencePayload);
      if (lastTrackedPayloadRef.current !== payloadStr) {
        channelRef.current.track(presencePayload).catch(console.error);
        lastTrackedPayloadRef.current = payloadStr;
      }
    }
  }, [presencePayload]);

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
        scrollToBottom('auto');
      } else {
        const lastReadTimeStr = localStorage.getItem('lastChatReadTime');
        const lastReadTime = lastReadTimeStr ? Number(lastReadTimeStr) : 0;
        const msAway = lastReadTime ? Date.now() - lastReadTime : 0;
        const AWAY_THRESHOLD_MS = 30 * 1000; // "wasn't on chat for log enough"

        // Track missed messages only if user has been away long enough
        if (
          msAway >= AWAY_THRESHOLD_MS &&
          lastMsg.user_id !== session?.user?.id
        ) {
          dispatchChat({
            type: 'ADD_MISSED_MESSAGE',
            payload: lastMsg,
          });
        }

        // Existing mentions logic
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
            dispatchChat({
              type: 'ADD_UNREAD_MENTION',
              payload: lastMsg,
            });
          }
        }
      }
    }
  }, [messages, blockedUsers, profile, session, scrollToBottom]);

  // Keep pinned to bottom when message content expands (images/videos loading late)
  useEffect(() => {
    if (!messagesBoxRef.current) return;

    const box = messagesBoxRef.current;
    const getIsNearBottom = () => {
      const { scrollTop, scrollHeight, clientHeight } = box;
      return scrollHeight - scrollTop - clientHeight < 200;
    };

    // Only auto-scroll when user is already near bottom.
    const observer = new ResizeObserver(() => {
      if (getIsNearBottom()) {
        scrollToBottom('auto');
      }
    });

    observer.observe(box);

    return () => observer.disconnect();
  }, [scrollToBottom]);

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
      localStorage.setItem('lastChatReadTime', Date.now().toString());

      if (unreadMentions.length > 0) dispatchChat({ type: 'CLEAR_UNREADS' });
      if (missedMessages.length > 0) dispatchChat({ type: 'CLEAR_MISSED' });
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

  const processImagesToSupabase = async (html) => {
    if (!html.includes('data:image/')) return html;

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const images = doc.querySelectorAll('img[src^="data:image/"]');

    for (let img of images) {
      const dataUrl = img.src;
      const matches = dataUrl.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
      if (matches?.length !== 3) continue;

      const mimeType = matches[1];
      const base64Data = matches[2];
      const extension = mimeType.split('/')[1] || 'png';
      const fileName = `${session?.user?.id}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${extension}`;

      try {
        const byteCharacters = atob(base64Data);
        const byteArrays = [];
        for (let offset = 0; offset < byteCharacters.length; offset += 512) {
          const slice = byteCharacters.slice(offset, offset + 512);
          const byteNumbers = new Array(slice.length);
          for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          byteArrays.push(byteArray);
        }
        const blob = new Blob(byteArrays, { type: mimeType });

        const { error } = await supabase.storage
          .from('chat-uploads')
          .upload(fileName, blob, {
            contentType: mimeType,
            cacheControl: '3600',
            upsert: false,
          });

        if (error) throw error;

        const { data: publicUrlData } = supabase.storage
          .from('chat-uploads')
          .getPublicUrl(fileName);

        if (publicUrlData?.publicUrl) {
          img.src = publicUrlData.publicUrl;
        }
      } catch (err) {
        console.error('Failed to upload image to bucket:', err);
        img.remove();
      }
    }

    return doc.body.innerHTML;
  };

  const handleSendMessage = async (customHtml = null) => {
    if (!tosAccepted) {
      alert('You must accept the Terms of Service first.');
      return;
    }
    if (isBanned) return;

    let contentToSend =
      typeof customHtml === 'string' && customHtml.trim().length > 0
        ? customHtml
        : inputHtml;

    if ((!contentToSend.trim() && !contentToSend.includes('<img')) || isSending)
      return;
    if (cooldown > 0) return;
    if (isTimedOut) return;
    if (chatLocked && !profile?.is_verified) {
      alert('Chat is locked.');
      return;
    }
    if (trustedOnly && !profile?.is_verified && !profile?.croomie) {
      alert('Chat is in Trusted Only mode.');
      return;
    }

    setIsSending(true);

    try {
      contentToSend = await processImagesToSupabase(contentToSend);

      const validation = await validateMessage(contentToSend, {
        session,
        DEVELOPER_EMAILS,
      });

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
        setIsSending(false);
        return;
      }

      const charCount = getCharacterCount(contentToSend);
      if (charCount > 5000) {
        alert('Message exceeds 5000 character limit.');
        setIsSending(false);
        return;
      }

      const user = session.user;
      const username = getFallbackName(user, profile) || 'Unknown User';
      const currentAvatar = resolveAvatar(user, profile);

      if (editingId) {
        const originalMsg = messages.find((m) => m.id === editingId);
        await supabase
          .from('messages')
          .update({ message: contentToSend, is_edited: true })
          .eq('id', editingId);

        if (originalMsg && originalMsg.message !== contentToSend) {
          await supabase.from('mod_logs').insert([
            {
              admin_id: session.user.id,
              target_user_id: originalMsg.user_id,
              action: 'message_edit',
              details: JSON.stringify({
                old: originalMsg.message,
                new: contentToSend,
              }),
            },
          ]);
        }
      } else {
        const { data, error } = await supabase
          .from('messages')
          .insert([
            {
              message: contentToSend,
              user_id: user.id,
              username,
              avatar_url: currentAvatar,
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
            return [...prev, newMessage].sort(
              (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
            );
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

  // Handles inserting the selected file from the modal into the chat input
  const handleFileSelectFromModal = (fileUrl, fileName) => {
    const fileType = getFileType(fileName);
    let tag = '';

    if (fileType === 'image') {
      tag = `<img src="${fileUrl}" alt="Uploaded image" />`;
    } else if (fileType === 'video') {
      tag = `<br><video src="${fileUrl}" controls style="max-width:100%; border-radius:8px; margin: 5px 0;"></video><br>`;
    } else if (fileType === 'audio') {
      tag = `<br><audio src="${fileUrl}" controls style="margin: 5px 0;"></audio><br>`;
    } else {
      // Document fallback
      tag = `<a href="${fileUrl}" target="_blank" rel="noopener noreferrer" style="color: #60a5fa; text-decoration: underline;">📎 ${fileName}</a>`;
    }

    if (editorRef.current) {
      editorRef.current.focus();
      editorRef.current.innerHTML +=
        (editorRef.current.innerHTML ? '<br>' : '') + tag;
      setInputHtml(editorRef.current.innerHTML);
    } else {
      setInputHtml((prev) => prev + (prev ? '<br>' : '') + tag);
    }

    setShowUploadModal(false);
  };

  // =====================
  // TYPING INDICATOR (fix: fast + throttle + low overhead)
  // =====================
  const typingLastSentAtRef = useRef(0);
  const typingCleanupTimerRef = useRef(null);
  const typingTtlByUsernameRef = useRef({});

  // Throttle outbound typing broadcasts to reduce broadcast spam.
  // (Previously it waited for 5s of continuous activity -> extremely delayed UI.)
  const TYPING_THROTTLE_MS = 1500;
  const TYPING_TTL_MS = 3500;

  const handleTyping = () => {
    if (!tosAccepted) return;
    if (isInvisible) return;
    if (!session?.user?.id) return;

    const now = Date.now();

    if (
      channelRef.current &&
      channelRef.current.state === 'joined' &&
      !isTimedOut &&
      !isBanned &&
      (!chatLocked || profile?.is_verified)
    ) {
      // throttle
      if (now - typingLastSentAtRef.current < TYPING_THROTTLE_MS) return;
      typingLastSentAtRef.current = now;

      const username = getFallbackName(session.user, profile) || 'Unknown User';

      channelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { username },
      });

      // Optimistically bump my own local typing TTL to keep UI consistent.
      typingTtlByUsernameRef.current[username] = now + TYPING_TTL_MS;
      dispatchChat({
        type: 'BUMP_TYPING',
        payload: { username, at: now },
      });
    }
  };

  // Single cleanup loop to remove stale typers without creating a setTimeout per event.
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const ttlMap = typingTtlByUsernameRef.current;
      if (!ttlMap || Object.keys(ttlMap).length === 0) return;

      let changed = false;
      for (const [username, expiresAt] of Object.entries(ttlMap)) {
        if (expiresAt <= now) {
          delete ttlMap[username];
          dispatchChat({ type: 'REMOVE_TYPING', payload: username });
          changed = true;
        }
      }

      if (changed) {
        // no-op; dispatchChat already applied removal
      }
    }, 500);

    typingCleanupTimerRef.current = interval;
    return () => {
      if (typingCleanupTimerRef.current)
        clearInterval(typingCleanupTimerRef.current);
    };
  }, []);

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
    const safeMsg = msg.is_deleted
      ? { ...msg, message: 'Message deleted' }
      : msg;
    setReplyingTo(safeMsg);
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
      const msgToDelete = messages.find((m) => m.id === msgId);
      await supabase
        .from('messages')
        .update({ is_deleted: true })
        .eq('id', msgId);
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, is_deleted: true } : m)),
      );

      if (msgToDelete) {
        await supabase.from('mod_logs').insert([
          {
            admin_id: session?.user?.id,
            target_user_id: msgToDelete.user_id,
            action: 'message_delete',
            details: JSON.stringify({ content: msgToDelete.message }),
          },
        ]);
      }
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

  const handleJumpToMissed = () => {
    if (missedMessages.length > 0) {
      const firstMsgId = missedMessages[0].id;
      const element = document.getElementById(`msg-${firstMsgId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('message-highlight');
        setTimeout(() => element.classList.remove('message-highlight'), 2000);
      }
      dispatchChat({ type: 'CLEAR_MISSED' });
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
          .from('messages')
          .select('*')
          .lte('timestamp', targetMsg.timestamp)
          .order('timestamp', { ascending: false })
          .limit(30);

        if (olderError) throw olderError;

        const { data: newerData, error: newerError } = await supabase
          .from('messages')
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

  const handleChatAreaClick = useCallback((e) => {
    if (e.target.tagName && e.target.tagName.toLowerCase() === 'img') {
      const isSmallIcon =
        e.target.clientWidth < 50 && e.target.clientHeight < 50;
      if (!isSmallIcon) {
        setZoomedImage(e.target.src);
        setZoomLevel(1);
      }
    }
  }, []);

  const isRestricted =
    isBanned ||
    isTimedOut ||
    (lockInUntil && new Date(lockInUntil) > new Date());

  // Account/session checks are handled in the background (initialize useEffect).
  // Do not block rendering with a loader.

  const DmNotificationToast = dmToast ? (
    <div
      onClick={() => {
        setDmToast(null);
        navigate('/direct');
      }}
      className='fixed top-20 right-4 md:right-6 bg-slate-900/95 border border-blue-500/50 text-white p-4 rounded-xl shadow-2xl z-[100000] flex flex-col gap-1 cursor-pointer hover:bg-slate-800 transition-colors animate-fade-in-down w-[calc(100%-2rem)] max-w-[320px] backdrop-blur-md'
      role='alert'
    >
      <div className='flex items-center gap-2 font-bold text-sm text-blue-400'>
        <i className='fa-solid fa-envelope'></i> New Direct Message
      </div>
      <div className='text-sm overflow-hidden pr-6'>
        <span className='font-semibold text-white'>{dmToast.senderName}</span>
        <span className='text-white/70 block truncate text-xs mt-0.5'>
          {dmToast.previewText}
        </span>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setDmToast(null);
        }}
        className='absolute top-3 right-3 text-white/40 hover:text-white transition-colors w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/10'
      >
        <i className='fa-solid fa-times text-sm'></i>
      </button>
    </div>
  ) : null;

  const TopHeader = (
    <ChatHeader
      navigate={navigate}
      chatLocked={chatLocked}
      profile={profile}
      theme={theme}
      toggleTheme={toggleTheme}
      handleTriggerFireworks={handleTriggerFireworks}
      fireworkCooldown={fireworkCooldown}
      showSettings={showSettings}
      setShowSettings={setShowSettings}
      unreadMentions={unreadMentions}
      onJumpToMention={handleJumpToMention}
      missedMessages={missedMessages}
      onJumpToMissed={handleJumpToMissed}
      onOpenLockIn={() => setShowLockInSetup(true)}
      onOpenSearch={() => setShowSearchModal(true)}
      onOpenLeaderboard={() => setShowLeaderboard(true)}
    />
  );

  const SidebarContent = (
    <>
      <div className='hidden md:block h-full'>
        <ChatSidebar
          onlineUsers={onlineUsers}
          navigate={navigate}
          profile={profile}
          isOpen={sidebarOpen}
          toggleSidebar={() => setSidebarOpen((prev) => !prev)}
        />
      </div>

      {sidebarOpen && (
        <div
          className='md:hidden fixed inset-0 z-[999999] flex mobile-drawer-wrapper'
          role='dialog'
          aria-modal='true'
          aria-label='Online Users'
        >
          <div
            className='absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity'
            onClick={() => setSidebarOpen(false)}
            aria-hidden='true'
          ></div>

          <div
            className='relative w-[85%] max-w-[320px] h-full bg-slate-900 shadow-2xl flex flex-col z-10'
            style={{
              animation:
                'mobileDrawerSlide 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards',
            }}
          >
            <style>{`
              @keyframes mobileDrawerSlide {
                from { transform: translateX(-100%); }
                to { transform: translateX(0); }
              }
              .mobile-drawer-wrapper .sidebar {
                display: flex !important;
                width: 100% !important;
                min-width: 100% !important;
                opacity: 1 !important;
                border: none !important;
              }
            `}</style>
            <ChatSidebar
              onlineUsers={onlineUsers}
              navigate={navigate}
              profile={profile}
              isOpen={true}
              toggleSidebar={() => setSidebarOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  );

  const ImageLightbox = zoomedImage ? (
    <div
      className='fixed inset-0 z-[999999] bg-black/95 flex flex-col items-center justify-center p-4 backdrop-blur-md'
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
        className='absolute top-4 right-4 md:right-6 text-white text-4xl hover:text-gray-300 z-50 transition-colors p-3 min-w-[44px] min-h-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-white rounded-full'
        onClick={() => setZoomedImage(null)}
        title='Close Image'
        aria-label='Close image view'
      >
        ×
      </button>

      <div
        className='absolute bottom-8 flex gap-4 z-50'
        onClick={(e) => e.stopPropagation()}
        role='group'
        aria-label='Image Zoom Controls'
      >
        <button
          onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.5))}
          aria-label='Zoom Out'
          className='bg-white/10 hover:bg-white/20 text-white p-3 md:px-4 md:py-2 min-w-[44px] min-h-[44px] rounded-lg backdrop-blur-md transition-all border border-white/20 shadow-lg flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-white'
          title='Zoom Out'
        >
          <i className='fa-solid fa-minus'></i>
        </button>
        <button
          onClick={() => setZoomLevel(1)}
          aria-label='Reset Zoom'
          className='bg-white/10 hover:bg-white/20 text-white px-4 py-2 min-h-[44px] rounded-lg backdrop-blur-md transition-all border border-white/20 shadow-lg font-semibold focus:outline-none focus:ring-2 focus:ring-white'
          title='Reset Zoom'
        >
          Reset
        </button>
        <button
          onClick={() => setZoomLevel((z) => Math.min(5, z + 0.5))}
          aria-label='Zoom In'
          className='bg-white/10 hover:bg-white/20 text-white p-3 md:px-4 md:py-2 min-w-[44px] min-h-[44px] rounded-lg backdrop-blur-md transition-all border border-white/20 shadow-lg flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-white'
          title='Zoom In'
        >
          <i className='fa-solid fa-plus'></i>
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

  const MainContent = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        position: 'relative',
      }}
    >
      <style>{`
            @keyframes highlightFade { 0% { background-color: rgba(59, 130, 246, 0.4); } 100% { background-color: transparent; } }
            .message-highlight { animation: highlightFade 2s ease-out; }

            @keyframes slideInFromRight {
              from {
                opacity: 0;
                transform: translateX(100%);
              }
              to {
                opacity: 1;
                transform: translateX(0);
              }
            }

            @keyframes fadeInDown {
              0% { opacity: 0; transform: translate(-50%, -20px); }
              100% { opacity: 1; transform: translate(-50%, 0); }
            }
            .animate-fade-in-down {
              animation: fadeInDown 0.3s ease-out forwards;
            }

            @keyframes chatBlink {
              0% { opacity: 0.25; }
              50% { opacity: 1; }
              100% { opacity: 0.25; }
            }




            .messages-box img:not([class*="avatar"]):not([class*="Avatar"]):not([class*="rounded-full"]):not([alt*="avatar"]):not([alt*="Avatar"]) {
                max-width: 300px !important;
                max-height: 300px !important;
                width: auto;
                height: auto;
                border-radius: 8px;
                object-fit: contain;
                transition: transform 0.2s ease, box-shadow 0.2s ease;
                display: inline-block;
                margin-top: 5px;
                margin-bottom: 5px;
                cursor: zoom-in;
            }
            
            .messages-box img:not([class*="avatar"]):not([class*="Avatar"]):not([class*="rounded-full"]):not([alt*="avatar"]):not([alt*="Avatar"]):hover {
                transform: scale(1.02);
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            }

            @media (max-width: 768px) {
                .messages-box img:not([class*="avatar"]):not([class*="Avatar"]):not([class*="rounded-full"]):not([alt*="avatar"]):not([alt*="Avatar"]) {
                    max-width: 220px !important;
                    max-height: 220px !important;
                }
            }

            /* COMPACT MODE OVERRIDES */
            .compact-mode {
              gap: 8px !important;
              padding: 10px 20px !important;
            }
            .compact-mode .message {
              gap: 6px !important;
            }
            .compact-mode .message-avatar {
              width: 26px !important;
              height: 26px !important;
            }
            .compact-mode .message-bubble {
              padding: 4px 10px !important;
              font-size: 0.85rem !important;
              line-height: 1.3 !important;
            }
            .compact-mode .message-username {
              font-size: 0.7rem !important;
              margin-bottom: 2px !important;
            }
        `}</style>

      {!sidebarOpen && theme !== 'crimnet' && (
        <button
          onClick={() => setSidebarOpen(true)}
          aria-label='View online users sidebar'
          aria-expanded={sidebarOpen}
          className='absolute top-3 right-3 md:top-4 md:left-4 z-[50] p-3 bg-slate-900/80 hover:bg-slate-800 text-white rounded-full transition-all backdrop-blur-md border border-white/20 flex items-center gap-2 shadow-lg min-h-[44px] min-w-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500'
          title='View Online Users'
        >
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
            className={`messages-box flex-1 ${isCompactMode ? 'compact-mode' : ''}`}
            ref={messagesBoxRef}
            onScroll={handleScroll}
            onClick={handleChatAreaClick}
          >
            {isLoadingPreviousMessages && messages.length === 0 && (
              <div className='w-full text-center py-2 opacity-70 text-xs select-none'>
                Loading previous messages
                <span className='inline-block ml-1'>
                  {Array.from({ length: 3 }).map((_, idx) => (
                    <span
                      key={idx}
                      style={{
                        display: 'inline-block',
                        opacity: 0.25 + 0.25 * idx,
                        animation: 'chatBlink 1s infinite',
                        animationDelay: `${idx * 150}ms`,
                      }}
                    >
                      .
                    </span>
                  ))}
                </span>
              </div>
            )}

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

              const rawParent = msg.parent_id
                ? messages.find((m) => m.id === msg.parent_id)
                : null;
              const safeParentMsg = rawParent?.is_deleted
                ? { ...rawParent, message: 'Message deleted' }
                : rawParent;

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
                      parentMsg: safeParentMsg,
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
            chatLocked={chatLocked}
            trustedOnly={trustedOnly}
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
            onOpenUploadModal={() => setShowUploadModal(true)}
          />
        </div>
      )}
    </div>
  );

  if (theme === 'aero-os') {
    return (
      <div
        className={`chat-wrapper ${themeClass} flex flex-col h-[100dvh] w-full`}
        style={themeStyle}
      >
        {toastMessage && (
          <div className='fixed top-20 left-1/2 bg-gray-900 border border-gray-700 text-white px-6 py-3 rounded-full shadow-2xl z-100000 flex items-center gap-3 animate-fade-in-down pointer-events-none'>
            <i
              className={`fa-solid ${isInvisible ? 'fa-eye-slash text-gray-400' : 'fa-eye text-green-400'}`}
            ></i>
            <span className='font-semibold'>{toastMessage}</span>
          </div>
        )}

        {DmNotificationToast}

        <WeatherEffects effect={backgroundEffect || null} />

        {TopHeader}
        <div className='flex-1 overflow-hidden'>
          <AeroOS chatSidebar={SidebarContent} chatMain={MainContent} />
        </div>

        <ChatFooter />
        {ImageLightbox}
        {showUploadModal && (
          <StorageUploadModal
            session={session}
            onClose={() => setShowUploadModal(false)}
            onSelect={handleFileSelectFromModal}
          />
        )}
      </div>
    );
  }

  if (theme === 'crimnet') {
    return (
      <div
        className={`chat-wrapper ${themeClass} flex flex-col h-dvh w-full`}
        style={themeStyle}
      >
        {toastMessage && (
          <div className='fixed top-20 left-1/2 bg-gray-900 border border-gray-700 text-white px-6 py-3 rounded-full shadow-2xl z-[100000] flex items-center gap-3 animate-fade-in-down pointer-events-none'>
            <i
              className={`fa-solid ${isInvisible ? 'fa-eye-slash text-gray-400' : 'fa-eye text-green-400'}`}
            ></i>
            <span className='font-semibold'>{toastMessage}</span>
          </div>
        )}

        {DmNotificationToast}

        <WeatherEffects effect={backgroundEffect || null} />

        {TopHeader}
        <div className='flex-1 overflow-hidden'>
          <CrimNet chatSidebar={SidebarContent} chatMain={MainContent} />
        </div>

        <ChatFooter />
        {ImageLightbox}
        {showUploadModal && (
          <StorageUploadModal
            session={session}
            onClose={() => setShowUploadModal(false)}
            onSelect={handleFileSelectFromModal}
          />
        )}
      </div>
    );
  }

  return (
    <div
      className={`chat-wrapper ${themeClass} flex flex-col h-dvh w-full`}
      style={themeStyle}
    >
      {toastMessage && (
        <div className='fixed top-20 left-1/2 bg-gray-900 border border-gray-700 text-white px-6 py-3 rounded-full shadow-2xl z-[100000] flex items-center gap-3 animate-fade-in-down pointer-events-none'>
          <i
            className={`fa-solid ${isInvisible ? 'fa-eye-slash text-gray-400' : 'fa-eye text-green-400'}`}
          ></i>
          <span className='font-semibold'>{toastMessage}</span>
        </div>
      )}

      {DmNotificationToast}

      <WeatherEffects effect={backgroundEffect || null} />

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

      {showUploadModal && (
        <StorageUploadModal
          session={session}
          onClose={() => setShowUploadModal(false)}
          onSelect={handleFileSelectFromModal}
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
          reason={timeoutReason}
          onExpire={() => setIsTimedOut(false)}
        />
      )}

      {/* === SLIDE-IN SURVEY NOTIFICATION === */}
      {showFormPopup && (
        <div
          className='fixed bottom-6 right-6 z-[10000] w-[calc(100vw-2rem)] max-w-[320px] bg-slate-900 border border-slate-700 p-4 rounded-lg shadow-lg'
          role='alert'
        >
          <div className='flex justify-between items-start mb-2'>
            <h3 className='font-bold text-base text-white'>Moderator Survey</h3>
            <button
              onClick={handleCloseSurveyLocal}
              className='text-slate-400 hover:text-white p-1'
              title='Dismiss for now'
            >
              <i className='fa-solid fa-times'></i>
            </button>
          </div>
          <p className='text-sm text-slate-300 mb-4'>
            Help improve Crooms Connect by rating our mod team!
          </p>
          <div className='flex flex-col gap-2'>
            <a
              href='https://docs.google.com/forms/d/e/1FAIpQLSdugLavuZJytVvEBXgmlokH-iY-uSSb1y6phhV4dRnkxl5MUA/viewform'
              target='_blank'
              rel='noopener noreferrer'
              onClick={handleCloseSurveyLocal}
              className='block text-center text-blue-400 hover:text-blue-300 py-2 rounded border border-blue-500/30 hover:border-blue-400/50 hover:bg-blue-500/10 text-sm font-semibold transition-colors'
            >
              Take Survey
            </a>
            <button
              onClick={handleDismissSurveyForever}
              className='block w-full text-center text-slate-400 hover:text-slate-300 py-2 rounded text-sm hover:bg-slate-800 transition-colors'
            >
              Don&apos;t Show Again
            </button>
          </div>
        </div>
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
        {SidebarContent}

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

      <ChatFooter />
      {ImageLightbox}
    </div>
  );
};

export default Chat;
