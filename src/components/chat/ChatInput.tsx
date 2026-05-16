import React, {
  useState,
  useRef,
  useMemo,
  useCallback,
  useEffect,
  type RefObject,
  type KeyboardEventHandler,
  type ClipboardEventHandler,
  type ChangeEventHandler,
  type ReactElement,
} from 'react';
import { supabase } from '../../supabaseClient';
import { emojiList, type Emoji } from '../../data/emojis';
import type { Profile } from '../../utils/databaseDefinitions';

type StrippedProfileBadge = {
  username: string;
  avatar_url: string;
  is_verified: boolean;
  badge_type?: string[];
};

// Define the shape of what Supabase actually returns
type MentionResultRow = {
  username: string;
  avatar_url: string | null;
  is_verified: boolean | null;
};

const ChatInput = ({
  inputHtml,
  setInputHtml,
  handleSendMessage,
  handleTyping,
  isSending,
  chatLocked,
  trustedOnly,
  profile,
  isTimedOut,
  isBanned,
  replyingTo,
  editingId,
  cancelAction,
  getTypingText,
  editorRef,
  cooldown,
  execCmd,
  onOpenUploadModal,
}: {
  inputHtml: string;
  setInputHtml: (newInput: string) => void;
  handleSendMessage: (msg: string) => void;
  handleTyping: () => void;
  isSending: boolean;
  chatLocked: boolean;
  trustedOnly: boolean;
  profile: Profile;
  isTimedOut: boolean;
  isBanned: boolean;
  replyingTo: Profile | null;
  editingId: string | null;
  cancelAction: React.MouseEventHandler<HTMLButtonElement>;
  getTypingText: () => string;
  editorRef: RefObject<HTMLDivElement>;
  cooldown: number;
  execCmd: (cmd: string, url?: string) => void;
  onOpenUploadModal: () => void;
}): ReactElement => {
  // =====================
  // State
  // =====================
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // === MENTION STATE (Ref-backed to prevent contentEditable re-renders) ===
  const [mentionQuery, _setMentionQuery] = useState<string | null>(null);
  const mentionQueryRef = useRef<string | null>(null);
  const setMentionQuery = useCallback((val: string | null) => {
    mentionQueryRef.current = val;
    _setMentionQuery(val);
  }, []);

  const [mentionResults, _setMentionResults] = useState<StrippedProfileBadge[]>(
    [],
  );
  const mentionResultsRef = useRef<StrippedProfileBadge[]>([]);
  const setMentionResults = useCallback((val: StrippedProfileBadge[]) => {
    mentionResultsRef.current = val;
    _setMentionResults(val);
  }, []);

  const [selectedIndex, _setSelectedIndex] = useState(0);
  const selectedIndexRef = useRef(0);
  const setSelectedIndex = useCallback(
    (val: number | ((prev: number) => number)) => {
      _setSelectedIndex((prev) => {
        const next = typeof val === 'function' ? val(prev) : val;
        selectedIndexRef.current = next;
        return next;
      });
    },
    [],
  );

  // === POLL STATE ===
  const [showPollUI, setShowPollUI] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // =====================
  // DATABASE LOOKUP (Effect)
  // =====================
  useEffect((): (() => void) | void => {
    console.log(
      '[Mention Debug] useEffect triggered with query:',
      mentionQuery,
    );
    if (mentionQuery === null) {
      setMentionResults([]);
      return;
    }

    const fetchUsers = async (): Promise<void> => {
      console.log('[Mention Debug] Fetching users for query:', mentionQuery);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('username, avatar_url, is_verified')
          .ilike('username', `${mentionQuery}%`)
          .or('is_banned.eq.false,is_banned.is.null') // Hides banned users
          .limit(5);

        if (error) {
          console.error(
            '[Mention Debug] Supabase error fetching mentions:',
            error,
          );
          return;
        }

        console.log('[Mention Debug] Fetched users:', data);
        setMentionResults(
          data?.map((result: MentionResultRow) => ({
            username: result.username,
            avatar_url: result.avatar_url ?? '',
            badge_type: [], // Hardcoded to empty array since it doesn't exist on DB
            is_verified: !!result.is_verified,
          })) ?? [],
        );
        setSelectedIndex(0);
      } catch (err) {
        console.error('[Mention Debug] Error fetching mentions:', err);
      }
    };

    const timeoutId = setTimeout(fetchUsers, 300);
    return (): void => clearTimeout(timeoutId);
  }, [mentionQuery, setMentionResults, setSelectedIndex]);

  // =====================
  // Logic & Validation
  // =====================

  const getAccurateTextLength = (html: string): number => {
    if (!html) return 0;

    let text = html
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<\/div>/gi, ' ')
      .replace(/<div[^>]*>/gi, ' ')
      .replace(/<p[^>]*>/gi, ' ')
      .replace(/<\/p>/gi, ' ')
      .replace(/<[^>]*>/g, '');

    try {
      const doc = new DOMParser().parseFromString(text, 'text/html');
      text = doc.documentElement.textContent || '';
    } catch {
      // Ignore parser errors
    }

    return text.replace(/\s+/g, ' ').trim().length;
  };

  const cleanHtmlForCount = inputHtml.replace(
    /<div class="file-card"[\s\S]*?<\/div>/g,
    '',
  );

  const textLength = getAccurateTextLength(cleanHtmlForCount);

  const imageCount = (inputHtml.match(/<img/g) || []).length;
  const videoCount = (inputHtml.match(/<video/g) || []).length;
  const iframeCount = (inputHtml.match(/<iframe/g) || []).length;
  const audioCount = (inputHtml.match(/<audio/g) || []).length;
  const fileCount = (inputHtml.match(/class="file-card"/g) || []).length;

  const currentLength =
    textLength +
    imageCount * 5 +
    videoCount * 5 +
    iframeCount * 5 +
    audioCount * 5 +
    fileCount * 5;

  const isTrusted = profile?.croomie || profile?.is_verified;

  const hasVisibleContent =
    getAccurateTextLength(inputHtml) > 0 ||
    imageCount > 0 ||
    videoCount > 0 ||
    iframeCount > 0 ||
    audioCount > 0 ||
    fileCount > 0;

  const canSend =
    !isSending &&
    !isUploading &&
    hasVisibleContent &&
    currentLength <= 5000 &&
    cooldown <= 0;

  const canSendRef = useRef<boolean>(canSend);
  canSendRef.current = canSend;

  const handleTypingRef = useRef<() => void>(handleTyping);
  handleTypingRef.current = handleTyping;

  const onSendClickRef = useRef<(() => Promise<void>) | null>(null);

  // =====================
  // AUTO-EMBED LOGIC
  // =====================
  const processAutoEmbeds = (html: string): string => {
    const div = document.createElement('div');
    div.innerHTML = html;

    const createImg = (src: string): string =>
      `<br><img src="${src}" alt="img" style="max-width:100%; border-radius:8px; margin: 5px 0;" /><br>`;
    const createVid = (src: string): string =>
      `<br><video src="${src}" controls style="max-width:100%; border-radius:8px; margin: 5px 0;"></video><br>`;
    const createYT = (id: string): string =>
      `<br><iframe width="100%" height="200" src="https://www.youtube.com/embed/${id}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="border-radius:8px; margin: 5px 0;"></iframe><br>`;
    const createSpotify = (type: string, id: string): string =>
      `<br><iframe style="border-radius:12px; margin: 5px 0;" src="https://open.spotify.com/embed/${type}/${id}" width="100%" height="152" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe><br>`;
    const createSoundCloud = (url: string): string =>
      `<br><iframe width="100%" height="166" scrolling="no" frameborder="0" allow="autoplay" style="border-radius:8px; margin: 5px 0;" src="https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true"></iframe><br>`;

    const imgRegex = /\.(gif|jpe?g|png|webp|bmp|tiff)(\?.*)?$/i;
    const vidRegex = /\.(mp4|webm|ogg|mov)(\?.*)?$/i;
    const ytRegex =
      /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/;
    const spotifyRegex =
      /open\.spotify\.com\/(track|album|playlist|episode)\/([a-zA-Z0-9]+)/;
    const scRegex = /soundcloud\.com\/([a-zA-Z0-9-_]+)\/([a-zA-Z0-9-_]+)/;

    div.querySelectorAll('a').forEach((a): void => {
      const href = a.getAttribute('href');
      if (!href) return;

      const ytMatch = href.match(ytRegex);
      const spotifyMatch = href.match(spotifyRegex);
      const scMatch = href.match(scRegex);

      if (imgRegex.test(href)) {
        const span = document.createElement('span');
        span.innerHTML = createImg(href);
        a.replaceWith(span);
      } else if (vidRegex.test(href)) {
        const span = document.createElement('span');
        span.innerHTML = createVid(href);
        a.replaceWith(span);
      } else if (ytMatch && ytMatch[1]) {
        const span = document.createElement('span');
        span.innerHTML = createYT(ytMatch[1]);
        a.replaceWith(span);
      } else if (spotifyMatch && spotifyMatch[1] && spotifyMatch[2]) {
        const span = document.createElement('span');
        span.innerHTML = createSpotify(spotifyMatch[1], spotifyMatch[2]);
        a.replaceWith(span);
      } else if (scMatch) {
        const span = document.createElement('span');
        span.innerHTML = createSoundCloud(href);
        a.replaceWith(span);
      }
    });

    return div.innerHTML;
  };

  // =====================
  // SEND HANDLER
  // =====================
  const onSendClick = async (): Promise<void> => {
    if (!canSend) return;

    const cleanText = inputHtml.replace(/<[^>]*>/g, '').trim();

    if (cleanText.startsWith('/unlock ') && profile?.is_verified) {
      const targetName = cleanText.split(' ')[1]?.replace('@', '');
      if (!targetName) {
        alert('Usage: /unlock @username');
        return;
      }
      try {
        const { data: user, error: findError } = await supabase
          .from('profiles')
          .select('id')
          .ilike('username', targetName)
          .single();
        if (findError || !user) {
          alert(`User '${targetName}' not found.`);
          return;
        }
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ lock_in_until: null })
          .eq('id', user.id);
        if (updateError) throw updateError;
        alert(`✅ ${targetName} has been force-unlocked.`);
        setInputHtml('');
        if (editorRef.current) editorRef.current.innerHTML = '';
      } catch (err) {
        console.error('Unlock failed:', err);
        alert('Failed to execute unlock command.');
      }
      return;
    }

    const finalHtml = processAutoEmbeds(inputHtml);

    if (finalHtml !== inputHtml) {
      setInputHtml(finalHtml);
      if (editorRef.current) editorRef.current.innerHTML = finalHtml;
    }

    setTimeout((): void => handleSendMessage(finalHtml), 0);
    setMentionQuery(null);
    setMentionResults([]);
  };

  onSendClickRef.current = onSendClick;

  // =====================
  // UPLOAD LOGIC (Maintained for Drag and Drop / Paste support)
  // =====================
  const uploadFile = async (file: File): Promise<void> => {
    if (!file) return;

    const userId = profile?.id || 'unknown_user';

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-uploads')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('chat-uploads')
        .getPublicUrl(filePath);

      if (data?.publicUrl) {
        let msgHtml = '';
        if (file.type.startsWith('image/')) {
          msgHtml = `<img src="${data.publicUrl}" alt="Uploaded Image" class="chat-uploaded-image" style="max-width: 250px; border-radius: 8px; cursor: zoom-in; margin-top: 4px;" />`;
        } else {
          msgHtml = `<a href="${data.publicUrl}" target="_blank" rel="noopener noreferrer" style="color: #60a5fa; text-decoration: underline;">📎 ${file.name}</a>`;
        }

        if (editorRef?.current) {
          editorRef.current.focus();
          if (!editorRef.current.innerHTML.includes(data.publicUrl)) {
            editorRef.current.innerHTML +=
              (editorRef.current.innerHTML ? '<br>' : '') + msgHtml;
          }

          setInputHtml(editorRef.current.innerHTML);
          handleTypingRef.current();
          editorRef.current.focus();
        }
      }
    } catch (err) {
      console.error('Upload failed', err);
      alert('File upload failed.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // =====================
  // DRAG & DROP HANDLERS
  // =====================
  const handleDragOver = useCallback<React.DragEventHandler<HTMLDivElement>>(
    (e): void => {
      e.preventDefault();
      e.stopPropagation();
      if (!isUploading) setIsDragging(true);
    },
    [isUploading],
  );

  const handleDragLeave = useCallback<React.DragEventHandler<HTMLDivElement>>(
    (e): void => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
    },
    [],
  );

  const uploadFileRef = useRef(uploadFile);
  uploadFileRef.current = uploadFile;

  const handleDrop = useCallback<React.DragEventHandler<HTMLDivElement>>(
    (e): void => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (
        e.dataTransfer &&
        e.dataTransfer.files &&
        e.dataTransfer.files.length > 0
      ) {
        const file = e.dataTransfer.files[0];
        uploadFileRef.current(file);
      }
    },
    [],
  );

  // =====================
  // BULLETPROOF MENTION INSERTION
  // =====================
  const insertMention = useCallback(
    (username: string): void => {
      console.log('[Mention Debug] Inserting mention for:', username);
      if (!editorRef.current) return;
      editorRef.current.focus();

      const selection = window.getSelection();
      if (!selection) return;
      if (selection.rangeCount > 0) {
        const deleteCount =
          (mentionQuery !== null ? mentionQuery.length : 0) + 1;

        console.log('[Mention Debug] Deleting characters:', deleteCount);

        for (let i = 0; i < deleteCount; i++) {
          document.execCommand('delete', false);
        }

        // Added &nbsp; so the cursor doesn't get trapped in contentEditable
        const mentionHtml = `<span class="mention-tag font-bold px-1 rounded mx-1" contenteditable="false" style="color: #60a5fa; background-color: rgba(59, 130, 246, 0.1);" data-username="${username}">@${username}</span>&nbsp;`;
        document.execCommand('insertHTML', false, mentionHtml);
      }

      setMentionQuery(null);
      setMentionResults([]);
      if (editorRef.current) setInputHtml(editorRef.current.innerHTML);
    },
    [mentionQuery, setInputHtml, editorRef, setMentionQuery, setMentionResults],
  );

  // =====================
  // BULLETPROOF INPUT HANDLERS
  // =====================
  const handleInput = useCallback((): void => {
    const selection = window.getSelection();
    if (!selection) return;

    if (selection.rangeCount > 0 && editorRef.current) {
      const range = selection.getRangeAt(0);

      // Prioritize checking text strictly inside the current text node
      // contentEditable gets confused grabbing toString() over mixed DOM elements
      const node = range.endContainer;
      let textBeforeCaret = '';

      if (node.nodeType === Node.TEXT_NODE) {
        textBeforeCaret = node.textContent?.substring(0, range.endOffset) || '';
      } else {
        // Fallback if the cursor somehow lands on an element boundary
        const clonedRange = range.cloneRange();
        clonedRange.selectNodeContents(editorRef.current);
        clonedRange.setEnd(range.endContainer, range.endOffset);
        textBeforeCaret = clonedRange.toString();
      }

      console.log(
        '[Mention Debug] Extracted textBeforeCaret:',
        `"${textBeforeCaret}"`,
      );

      const mentionMatch = textBeforeCaret.match(/(?:^|\s|\n)(@[\w.-]*)$/);
      console.log('[Mention Debug] mentionMatch Result:', mentionMatch);

      if (mentionMatch) {
        const query = mentionMatch[1].substring(1);
        console.log('[Mention Debug] Setting Search Query:', `"${query}"`);
        setMentionQuery(query);
      } else {
        setMentionQuery(null);
        setMentionResults([]);
      }

      // Handle Emoji Replacements
      if (node.nodeType === Node.TEXT_NODE) {
        const cursorOffset = range.startOffset;
        const text = node.textContent;
        if (text) {
          const textBeforeCursorNode = text.slice(0, cursorOffset);
          for (const emoji of emojiList) {
            if (textBeforeCursorNode.endsWith(emoji.trigger)) {
              const replaceRange = document.createRange();
              replaceRange.setStart(node, cursorOffset - emoji.trigger.length);
              replaceRange.setEnd(node, cursorOffset);
              selection.removeAllRanges();
              selection.addRange(replaceRange);

              document.execCommand(
                'insertHTML',
                false,
                `
                  <img src="${emoji.src}" alt="${emoji.alt}" style="height:1.5em;width:auto;vertical-align:middle;margin:0 2px;" />
                `,
              );
              break;
            }
          }
        }
      }
    }

    if (editorRef.current) setInputHtml(editorRef.current.innerHTML);
    if (handleTypingRef.current) handleTypingRef.current();
  }, [setInputHtml, editorRef, setMentionQuery, setMentionResults]);

  const handleKeyDown = useCallback<KeyboardEventHandler<HTMLDivElement>>(
    (e): void => {
      if (mentionQuery !== null && mentionResults.length > 0) {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : mentionResults.length - 1,
          );
          return;
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < mentionResults.length - 1 ? prev + 1 : 0,
          );
          return;
        }
        if (e.key === 'Enter' || e.key === 'Tab') {
          e.preventDefault();
          insertMention(mentionResults[selectedIndex].username);
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          setMentionQuery(null);
          setMentionResults([]);
          return;
        }
      }

      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (canSendRef.current && onSendClickRef.current) {
          onSendClickRef.current();
        }
      }
    },
    [
      mentionQuery,
      mentionResults,
      selectedIndex,
      insertMention,
      setMentionQuery,
      setMentionResults,
      setSelectedIndex,
    ],
  );

  const stableHandlePaste = useCallback<ClipboardEventHandler<HTMLDivElement>>(
    (e): void => {
      setTimeout((): void => {
        if (editorRef.current) {
          setInputHtml(editorRef.current.innerHTML);
          if (handleTypingRef.current) handleTypingRef.current();
        }
      }, 0);

      if (e.clipboardData && e.clipboardData.files.length > 0) {
        const file = e.clipboardData.files[0];
        e.preventDefault();
        uploadFileRef.current(file);
      }
    },
    [setInputHtml, editorRef],
  );

  // =====================
  // HELPERS
  // =====================
  const focusEditor = (): void => {
    if (editorRef?.current) {
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
        /* continue */
      }
    }
  };

  const insertEmoji = (emoji: Emoji): void => {
    focusEditor();
    document.execCommand(
      'insertHTML',
      false,
      `
            <img src="${emoji.src}" alt="${emoji.alt}" data-trigger="${emoji.trigger}"
                style="height:1.5em;width:auto;vertical-align:middle;margin:0 2px;" />
        `,
    );
    if (editorRef.current) setInputHtml(editorRef.current.innerHTML);
    handleTyping();
  };

  const handleFileUpload: ChangeEventHandler<HTMLInputElement> = (
    event,
  ): void => {
    const file = event.target.files?.[0];
    if (file) uploadFile(file);
  };

  // =====================
  // RENDER
  // =====================
  const editorDiv = useMemo(
    (): ReactElement => (
      <div
        ref={editorRef}
        className='chat-editor'
        contentEditable={!isTimedOut && !isBanned && !isUploading}
        onInput={handleInput}
        onPaste={stableHandlePaste}
        onKeyDown={handleKeyDown}
      />
    ),
    [
      isTimedOut,
      isBanned,
      isUploading,
      handleInput,
      stableHandlePaste,
      handleKeyDown,
      editorRef,
    ],
  );

  return (
    <div
      className='input-area relative flex flex-col'
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* DRAG OVERLAY */}
      {isDragging && (
        <div className='absolute inset-0 z-50 bg-slate-800/90 border-2 border-dashed border-blue-400 rounded-lg flex flex-col items-center justify-center text-blue-200 pointer-events-none'>
          <i className='fa-solid fa-cloud-arrow-up text-4xl mb-2'></i>
          <span className='font-bold'>Drop file to upload</span>
        </div>
      )}

      {/* --- MENTION POPUP (Forced Z-Index and Absolute Positioning) --- */}
      {mentionQuery !== null && mentionResults.length > 0 && (
        <div
          className='bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden'
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '10px',
            marginBottom: '8px',
            width: '250px',
            zIndex: 99999,
          }}
        >
          <div className='text-xs text-slate-400 px-3 py-2 border-b border-slate-700 bg-slate-900/50'>
            Suggestions matching &quot;{mentionQuery}&quot;
          </div>
          <div className='max-h-48 overflow-y-auto'>
            {mentionResults.map((u, index): ReactElement => {
              const isVerified =
                u.is_verified ||
                (u.badge_type &&
                  ['admin', 'dev', 'vip'].some((t): boolean =>
                    u.badge_type!.includes(t),
                  ));
              const isSelected = index === selectedIndex;

              return (
                <button
                  key={u.username}
                  className={`w-full text-left px-3 py-2 flex items-center gap-2 transition-colors ${isSelected ? 'bg-slate-600' : 'hover:bg-slate-700'}`}
                  onMouseDown={(e): void => {
                    e.preventDefault();
                    insertMention(u.username);
                  }}
                >
                  <img
                    src={
                      u.avatar_url ||
                      `https://ui-avatars.com/api/?name=${u.username}&background=random`
                    }
                    className='w-6 h-6 rounded-full object-cover'
                    alt='av'
                  />
                  <span className='text-sm font-medium text-slate-200'>
                    {u.username}
                  </span>
                  {isVerified && (
                    <i className='fa-solid fa-circle-check text-blue-400 text-xs ml-auto'></i>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {(replyingTo || editingId) && (
        <div className='flex items-center justify-between bg-slate-800 px-4 py-2 border-b border-slate-700 text-sm text-slate-300 rounded-t-lg mx-2 mt-2'>
          <div className='flex items-center gap-2 overflow-hidden'>
            {replyingTo ? (
              <>
                <i className='fa-solid fa-reply text-blue-400'></i>
                <span className='font-bold'>
                  Replying to {replyingTo.username}
                </span>
              </>
            ) : (
              <>
                <i className='fa-solid fa-pencil text-yellow-400'></i>
                <span className='font-bold'>Editing</span>
              </>
            )}
          </div>
          <button
            onClick={cancelAction}
            className='text-slate-500 hover:text-red-400'
          >
            <i className='fa-solid fa-xmark'></i>
          </button>
        </div>
      )}

      {/* POLL UI OVERLAY */}
      {showPollUI && profile?.is_verified && (
        <div className='bg-slate-800 p-4 rounded-t-lg border-b border-slate-700 shadow-lg mx-2 mt-2 mb-1'>
          <div className='flex justify-between items-center mb-3'>
            <span className='text-white text-sm font-bold flex items-center gap-2'>
              <i className='fa-solid fa-square-poll-horizontal text-blue-400'></i>{' '}
              Create a Poll
            </span>
            <button
              onClick={(): void => setShowPollUI(false)}
              className='text-gray-400 hover:text-white transition-colors'
            >
              <i className='fa-solid fa-xmark'></i>
            </button>
          </div>
          <input
            type='text'
            placeholder='Ask your question...'
            className='w-full bg-slate-900 text-white text-sm px-3 py-2 rounded mb-3 border border-slate-700 focus:outline-none focus:border-blue-500 transition-colors'
            value={pollQuestion}
            onChange={(e): void => setPollQuestion(e.target.value)}
          />
          <div className='space-y-2 mb-3'>
            {pollOptions.map(
              (opt, idx): ReactElement => (
                <div key={idx} className='flex gap-2'>
                  <input
                    type='text'
                    placeholder={`Option ${idx + 1}`}
                    className='flex-1 bg-slate-900 text-white text-sm px-3 py-1.5 rounded border border-slate-700 focus:outline-none focus:border-blue-500 transition-colors'
                    value={opt}
                    onChange={(e): void => {
                      const newOpts = [...pollOptions];
                      newOpts[idx] = e.target.value;
                      setPollOptions(newOpts);
                    }}
                  />
                  {pollOptions.length > 2 && (
                    <button
                      onClick={(): void =>
                        setPollOptions(
                          pollOptions.filter((_, i): boolean => i !== idx),
                        )
                      }
                      className='text-red-400 hover:text-red-300 px-2 transition-colors'
                    >
                      <i className='fa-solid fa-trash'></i>
                    </button>
                  )}
                </div>
              ),
            )}
          </div>
          <div className='flex justify-between items-center mt-3'>
            {pollOptions.length < 5 ? (
              <button
                onClick={(): void => setPollOptions([...pollOptions, ''])}
                className='text-blue-400 hover:text-blue-300 text-xs font-bold px-2 py-1 transition-colors'
              >
                + Add Option
              </button>
            ) : (
              <div className='text-xs text-gray-500 px-2'>
                Max options reached
              </div>
            )}

            <button
              onClick={(): void => {
                if (
                  !pollQuestion.trim() ||
                  pollOptions.some((o): boolean => !o.trim())
                ) {
                  alert('Please fill out the question and all options.');
                  return;
                }
                const pollObj = {
                  question: pollQuestion.trim(),
                  options: pollOptions.map((opt, idx) => ({
                    id: idx + 1,
                    text: opt.trim(),
                    votes: [],
                  })),
                };
                handleSendMessage(`[POLL]${JSON.stringify(pollObj)}[/POLL]`);
                setShowPollUI(false);
                setPollQuestion('');
                setPollOptions(['', '']);
              }}
              className='bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded text-xs font-bold transition-colors'
            >
              Send Poll
            </button>
          </div>
        </div>
      )}

      {chatLocked && !profile?.is_verified ? (
        <div className='bg-red-950/50 border border-red-900 p-6 text-center text-red-400 font-bold rounded-lg m-2'>
          <i className='fa-solid fa-lock mr-2 text-xl'></i> <br />
          Chat Locked
        </div>
      ) : trustedOnly && !isTrusted ? (
        <div className='bg-indigo-950/50 border border-indigo-900 p-6 text-center text-indigo-400 font-bold rounded-lg m-2'>
          <i className='fa-solid fa-shield-heart mr-2 text-xl'></i> <br />
          Trusted Only
        </div>
      ) : (
        <>
          <div className='toolbar relative'>
            <button
              className='toolbar-btn'
              onClick={(): void => execCmd('bold')}
              title='Bold'
            >
              <i className='fa-solid fa-bold'></i>
            </button>
            <button
              className='toolbar-btn'
              onClick={(): void => execCmd('italic')}
              title='Italic'
            >
              <i className='fa-solid fa-italic'></i>
            </button>
            <button
              className='toolbar-btn'
              onClick={(): void => execCmd('underline')}
              title='Underline'
            >
              <i className='fa-solid fa-underline'></i>
            </button>
            <button
              className='toolbar-btn'
              onClick={(): void => execCmd('insertUnorderedList')}
              title='List'
            >
              <i className='fa-solid fa-list-ul'></i>
            </button>

            <button
              className='toolbar-btn'
              onClick={(): void => {
                const url = prompt('Enter URL:');
                if (url) execCmd('createLink', url);
              }}
              title='Link'
            >
              <i className='fa-solid fa-link'></i>
            </button>

            <div className='w-px h-4 bg-slate-700 mx-1'></div>

            <button
              className='toolbar-btn'
              title='Emojis'
              onClick={(): void => setShowEmojiPicker((v) => !v)}
            >
              <i className='fa-regular fa-face-smile'></i>
            </button>

            <div className='relative group'>
              <button
                className='toolbar-btn'
                onClick={onOpenUploadModal}
                title='Upload File'
                disabled={isUploading}
              >
                {isUploading ? (
                  <i className='fa-solid fa-circle-notch fa-spin'></i>
                ) : (
                  <i className='fa-solid fa-upload'></i>
                )}
              </button>
              <div className='absolute bottom-full mb-1 left-0 hidden group-hover:block bg-black text-xs text-white p-1 rounded whitespace-nowrap z-50'>
                Open Media Gallery
              </div>
            </div>

            {profile?.is_verified && (
              <>
                <div className='w-px h-4 bg-slate-700 mx-1'></div>
                <button
                  className={`toolbar-btn ${showPollUI ? 'text-blue-400' : ''}`}
                  onClick={(): void => setShowPollUI(!showPollUI)}
                  title='Create Poll'
                >
                  <i className='fa-solid fa-square-poll-horizontal'></i>
                </button>
              </>
            )}

            <input
              type='file'
              accept='image/*,audio/*,video/*,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document'
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />

            {showEmojiPicker && (
              <div className='emoji-picker absolute z-50 top-full mt-2 bg-slate-800 border border-slate-700 rounded-lg p-3 w-72 max-h-60 overflow-y-auto shadow-xl left-0'>
                <div className='grid grid-cols-8 gap-2'>
                  {emojiList.map(
                    (emoji): ReactElement => (
                      <button
                        key={emoji.trigger}
                        className='hover:bg-slate-700 rounded p-1 transition-colors'
                        onClick={(): void => {
                          insertEmoji(emoji);
                          setShowEmojiPicker(false);
                        }}
                        title={emoji.trigger}
                      >
                        <img
                          src={emoji.src}
                          alt={emoji.alt}
                          className='w-6 h-6 object-contain'
                        />
                      </button>
                    ),
                  )}
                </div>
              </div>
            )}
          </div>

          {editorDiv}

          <div className='send-row'>
            <div className='typing-indicator'>{getTypingText()}</div>

            <div className='flex items-center gap-3'>
              <span
                className={`text-xs ${currentLength > 5000 ? 'text-red-500 font-bold' : 'text-slate-500'}`}
              >
                {currentLength}/5000
              </span>

              <div className='flex gap-2'>
                {(replyingTo || editingId) && (
                  <button
                    className='px-3 py-1 bg-slate-700 text-white text-xs rounded hover:bg-slate-600'
                    onClick={cancelAction}
                  >
                    Cancel
                  </button>
                )}
                <button
                  className={`send-btn ${!canSend ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={onSendClick}
                  disabled={!canSend}
                >
                  {isSending || isUploading ? (
                    <i className='fa-solid fa-circle-notch fa-spin'></i>
                  ) : cooldown > 0 ? (
                    `${cooldown}s`
                  ) : editingId ? (
                    'Update'
                  ) : (
                    'Send'
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ChatInput;
