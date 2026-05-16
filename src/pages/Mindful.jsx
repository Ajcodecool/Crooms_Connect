import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

// === CONSTANTS & HELPERS ===
const PROMPTS = [
  'What stayed with you today?',
  'What brought you a moment of peace?',
  'What was the most challenging part of today?',
  'Did you learn anything new about yourself?',
  'What are you grateful for right now?',
  'How did you take care of yourself today?',
  'What is a thought you need to let go of?',
  'Describe a small detail you noticed today.',
  'What made you smile today?',
  'What is bothering you in life?',
  'I love you.',
];

const MOODS = ['😊', '😐', '😔', '😡'];

const TAB_ICONS = {
  write: 'fa-solid fa-pen-nib',
  calendar: 'fa-solid fa-calendar-days',
  history: 'fa-solid fa-book-open',
  shared: 'fa-solid fa-user-group',
};

const getLocalToday = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .split('T')[0];
};

const getTheme = (isLight) => ({
  bg: isLight ? 'bg-[#f4f4f0]' : 'bg-black',
  text: isLight ? 'text-gray-800' : 'text-gray-300',
  muted: isLight ? 'text-gray-400' : 'text-gray-600',
  border: isLight ? 'border-gray-300' : 'border-gray-800',
  activeBorder: isLight ? 'border-black text-black' : 'border-white text-white',
  placeholder: isLight ? 'placeholder-gray-400' : 'placeholder-gray-800',
  textArea: isLight
    ? 'text-gray-900 caret-black selection:bg-black/10'
    : 'text-gray-200 caret-white selection:bg-white/20',
  hoverList: isLight ? 'hover:bg-gray-200' : 'hover:bg-gray-900',
  selectedList: isLight ? 'bg-gray-300 text-black' : 'bg-gray-800 text-white',
  dot: isLight ? 'bg-gray-400' : 'bg-gray-600',
  cardBg: isLight ? 'bg-[#fcfcfc]' : 'bg-[#0a0a0a]',
  glow: isLight
    ? 'bg-[#f0f0eb] shadow-[0_0_40px_rgba(0,0,0,0.05)] scale-[1.01]'
    : 'bg-[#111111] shadow-[0_0_40px_rgba(255,255,255,0.03)] scale-[1.01]',
});

// Secure hashing function for custom journal passwords
const hashText = async (text) => {
  const msgBuffer = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
};

// ==========================================
// 1. WRITE VIEW COMPONENT
// ==========================================
const WriteView = ({
  session,
  currentDate,
  entries,
  setEntries,
  editingSharedItem,
  setSharedEntries,
  onCancelSharedEdit,
  theme,
}) => {
  const [content, setContent] = useState('');
  const [mood, setMood] = useState('😐');
  const [saveStatus, setSaveStatus] = useState('');
  const [displayedPrompt, setDisplayedPrompt] = useState('');

  const [typingGlow, setTypingGlow] = useState(false);
  const [wordBump, setWordBump] = useState(false);
  const glowTimeoutRef = useRef(null);
  const prevWordCount = useRef(0);

  const lastSavedContent = useRef('');
  const lastSavedMood = useRef('😐');
  const typingTimeoutRef = useRef(null);

  const isSharedMode = !!editingSharedItem;
  const activeEntryId = isSharedMode
    ? editingSharedItem.mindful_entries.id
    : null;

  const currentPrompt = useMemo(() => {
    const hash = currentDate
      .split('-')
      .reduce((acc, part) => acc + parseInt(part, 10), 0);
    return PROMPTS[hash % PROMPTS.length];
  }, [currentDate]);

  useEffect(() => {
    if (isSharedMode) return;

    setDisplayedPrompt('');
    let currentIndex = 0;

    const intervalId = setInterval(() => {
      if (currentIndex <= currentPrompt.length) {
        setDisplayedPrompt(currentPrompt.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(intervalId);
      }
    }, 50);

    return () => clearInterval(intervalId);
  }, [currentPrompt, isSharedMode]);

  useEffect(() => {
    if (isSharedMode) {
      const e = editingSharedItem.mindful_entries;
      setContent(e.content || '');
      setMood(e.mood || '😐');
      lastSavedContent.current = e.content || '';
      lastSavedMood.current = e.mood || '😐';
    } else {
      const e = entries.find((entry) => entry.entry_date === currentDate);
      setContent(e ? e.content : '');
      setMood(e ? e.mood || '😐' : '😐');
      lastSavedContent.current = e ? e.content : '';
      lastSavedMood.current = e ? e.mood || '😐' : '😐';
    }
    setSaveStatus('');
  }, [currentDate, entries, editingSharedItem, isSharedMode]);

  const saveEntry = useCallback(async () => {
    if (!content.trim() && !isSharedMode) return;
    if (content === lastSavedContent.current && mood === lastSavedMood.current)
      return;

    setSaveStatus('Saving...');
    try {
      if (isSharedMode) {
        const { error } = await supabase
          .from('mindful_entries')
          .update({ content, mood, updated_at: new Date().toISOString() })
          .eq('id', activeEntryId);
        if (error) throw error;

        setSharedEntries((prev) =>
          prev.map((s) =>
            s.mindful_entries.id === activeEntryId
              ? {
                  ...s,
                  mindful_entries: { ...s.mindful_entries, content, mood },
                }
              : s,
          ),
        );
      } else {
        const { data, error } = await supabase
          .from('mindful_entries')
          .upsert(
            {
              user_id: session?.user?.id,
              entry_date: currentDate,
              content,
              mood,
            },
            { onConflict: 'user_id, entry_date' },
          )
          .select()
          .single();
        if (error) throw error;

        setEntries((prev) => {
          const exists = prev.find((e) => e.entry_date === currentDate);
          if (exists)
            return prev.map((e) =>
              e.entry_date === currentDate ? { ...e, content, mood } : e,
            );
          return [data, ...prev].sort(
            (a, b) => new Date(b.entry_date) - new Date(a.entry_date),
          );
        });
      }

      lastSavedContent.current = content;
      lastSavedMood.current = mood;
      setSaveStatus('Saved');
      setTimeout(() => setSaveStatus(''), 2000);
    } catch (err) {
      console.error('Save failed:', err);
      setSaveStatus('Error saving');
    }
  }, [
    activeEntryId,
    content,
    currentDate,
    isSharedMode,
    mood,
    session?.user?.id,
    setEntries,
    setSharedEntries,
  ]);

  useEffect(() => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => saveEntry(), 1500);
    return () => clearTimeout(typingTimeoutRef.current);
  }, [content, mood, saveEntry]);

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  useEffect(() => {
    if (wordCount > prevWordCount.current) {
      setWordBump(true);
      const timer = setTimeout(() => setWordBump(false), 300);
      prevWordCount.current = wordCount;
      return () => clearTimeout(timer);
    } else {
      prevWordCount.current = wordCount;
    }
  }, [wordCount]);

  const handleContentChange = (e) => {
    setContent(e.target.value);
    setTypingGlow(true);
    if (glowTimeoutRef.current) clearTimeout(glowTimeoutRef.current);
    glowTimeoutRef.current = setTimeout(() => setTypingGlow(false), 800);
  };

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      clearTimeout(typingTimeoutRef.current);
      saveEntry();
    }
  };

  return (
    <div
      key={`write-${currentDate}`}
      className='w-full max-w-2xl flex flex-col h-full slow-fade'
    >
      <div className={`mb-6 md:mb-8 text-center ${theme.muted} select-none`}>
        {isSharedMode ? (
          <div className='flex flex-col items-center gap-2'>
            <span
              className={`px-3 py-1 rounded-full text-xs border ${theme.border} break-all`}
            >
              Editing Shared Entry (@{editingSharedItem.profiles?.username})
            </span>
            <button
              onClick={onCancelSharedEdit}
              className='text-xs hover:text-current transition-colors p-2'
            >
              &larr; Return to Personal Journal
            </button>
          </div>
        ) : (
          <>
            <p className='text-sm md:text-base tracking-widest'>
              {new Date(currentDate + 'T00:00:00').toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </p>
            <p className='mt-2 text-xs md:text-sm italic min-h-[20px]'>
              {displayedPrompt}
              <span className='animate-pulse ml-[1px]'>|</span>
            </p>
          </>
        )}
      </div>

      <div
        className={`relative flex-1 flex flex-col rounded-2xl transition-all duration-700 ease-out p-4 md:p-6 -mx-4 md:-mx-6 ${
          typingGlow ? theme.glow : 'bg-transparent shadow-none scale-100'
        }`}
      >
        <textarea
          value={content}
          onChange={handleContentChange}
          onKeyDown={handleKeyDown}
          placeholder='Start typing...'
          className={`w-full flex-1 bg-transparent border-none outline-none resize-none textarea-satisfying text-base md:text-lg transition-colors duration-1000 ${theme.textArea} ${theme.placeholder}`}
          spellCheck='false'
          autoFocus
        />
      </div>

      <div className='mt-4 flex flex-col md:flex-row justify-between items-center border-t border-transparent pt-4 gap-4'>
        <div className='flex gap-4 md:gap-3 flex-wrap justify-center'>
          {MOODS.map((m) => (
            <button
              key={m}
              onClick={() => setMood(m === mood ? null : m)}
              className={`text-2xl md:text-xl p-2 md:p-0 transition-all duration-300 ${
                mood === m
                  ? 'opacity-100 scale-125'
                  : 'opacity-30 hover:opacity-70 grayscale'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <div className='flex items-center gap-4 w-full md:w-auto justify-between md:justify-end'>
          <span
            className={`italic text-xs transition-opacity duration-500 ${theme.muted}`}
          >
            {saveStatus}
          </span>
          <div
            className={`text-xs tracking-widest transition-all duration-300 ${
              wordBump
                ? `text-current opacity-100 word-bump`
                : `opacity-50 ${theme.muted}`
            }`}
          >
            {wordCount} words
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 2. CALENDAR VIEW COMPONENT
// ==========================================
const CalendarView = ({
  entries,
  currentDate,
  setCurrentDate,
  setView,
  theme,
}) => {
  const [calendarMonth, setCalendarMonth] = useState(() =>
    new Date().getMonth(),
  );
  const [calendarYear, setCalendarYear] = useState(() =>
    new Date().getFullYear(),
  );
  const localToday = getLocalToday();

  const generateCalendarDays = () => {
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const firstDayIndex = new Date(calendarYear, calendarMonth, 1).getDay();
    const days = [];
    for (let i = 0; i < firstDayIndex; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) {
      const monthStr = String(calendarMonth + 1).padStart(2, '0');
      const dayStr = String(i).padStart(2, '0');
      days.push(`${calendarYear}-${monthStr}-${dayStr}`);
    }
    return days;
  };

  return (
    <div
      key='calendar-view'
      className='w-full max-w-md mx-auto slow-fade px-2 md:px-0'
    >
      <div
        className={`flex justify-between items-center mb-8 md:mb-10 ${theme.muted}`}
      >
        <div className='flex gap-2 md:gap-5'>
          <button
            onClick={() => setCalendarYear((y) => y - 1)}
            className='hover:opacity-60 transition-opacity p-2'
          >
            <i className='fa-solid fa-angles-left'></i>
          </button>
          <button
            onClick={() => {
              if (calendarMonth === 0) {
                setCalendarMonth(11);
                setCalendarYear((y) => y - 1);
              } else setCalendarMonth((m) => m - 1);
            }}
            className='hover:opacity-60 transition-opacity p-2'
          >
            <i className='fa-solid fa-angle-left'></i>
          </button>
        </div>

        <h2 className='text-base md:text-lg tracking-widest uppercase text-current select-none text-center'>
          {new Date(calendarYear, calendarMonth).toLocaleString('default', {
            month: 'long',
            year: 'numeric',
          })}
        </h2>

        <div className='flex gap-2 md:gap-5'>
          <button
            onClick={() => {
              if (calendarMonth === 11) {
                setCalendarMonth(0);
                setCalendarYear((y) => y + 1);
              } else setCalendarMonth((m) => m + 1);
            }}
            className='hover:opacity-60 transition-opacity p-2'
          >
            <i className='fa-solid fa-angle-right'></i>
          </button>
          <button
            onClick={() => setCalendarYear((y) => y + 1)}
            className='hover:opacity-60 transition-opacity p-2'
          >
            <i className='fa-solid fa-angles-right'></i>
          </button>
        </div>
      </div>

      <div className='grid grid-cols-7 gap-2 md:gap-4 text-center'>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
          <div
            key={i}
            className={`text-xs mb-2 md:mb-4 select-none ${theme.muted}`}
          >
            {day}
          </div>
        ))}

        {generateCalendarDays().map((dateString, i) => {
          if (!dateString) return <div key={`empty-${i}`} />;
          const hasEntry = entries?.some((e) => e?.entry_date === dateString);
          const isSelected = currentDate === dateString;
          const isFuture = dateString > localToday;
          const dayNumber = parseInt(dateString.split('-')[2], 10);

          return (
            <button
              key={dateString}
              disabled={isFuture}
              onClick={() => {
                setCurrentDate(dateString);
                setView('write');
              }}
              className={`
                relative flex justify-center items-center h-10 w-10 md:h-12 md:w-12 mx-auto rounded-full transition-all duration-500
                ${
                  isFuture
                    ? 'opacity-20 cursor-not-allowed'
                    : isSelected
                      ? theme.activeBorder
                      : `${theme.muted} hover:opacity-70`
                }
              `}
            >
              <span className='text-sm md:text-base'>{dayNumber}</span>
              {hasEntry && (
                <span
                  className={`absolute bottom-1 md:bottom-2 w-1 h-1 rounded-full ${theme.dot}`}
                ></span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ==========================================
// 3. HISTORY VIEW COMPONENT
// ==========================================
const HistoryView = ({
  entries,
  setEntries,
  session,
  setCurrentDate,
  setView,
  setShareModalEntry,
  theme,
}) => {
  const localToday = getLocalToday();

  const heatmapDays = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date(localToday + 'T00:00:00');
      d.setDate(d.getDate() - (29 - i));
      return d.toISOString().split('T')[0];
    });
  }, [localToday]);

  const handleDelete = async (date) => {
    if (!window.confirm('Are you sure you want to delete this entry?')) return;
    try {
      await supabase
        .from('mindful_entries')
        .delete()
        .match({ user_id: session?.user?.id, entry_date: date });
      setEntries((prev) => prev.filter((e) => e.entry_date !== date));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  return (
    <div
      key='history-view'
      className='w-full max-w-2xl flex flex-col gap-8 md:gap-12 pb-12 slow-fade'
    >
      <div
        className={`flex flex-col items-center mb-4 md:mb-8 p-4 md:p-6 rounded-lg border ${theme.border} ${theme.cardBg}`}
      >
        <p
          className={`text-[10px] md:text-xs tracking-widest uppercase mb-3 md:mb-4 ${theme.muted}`}
        >
          30-Day Consistency
        </p>
        <div className='flex flex-wrap gap-[2px] md:gap-1 justify-center max-w-full'>
          {heatmapDays.map((date) => {
            const hasEntry = entries.some((e) => e.entry_date === date);
            return (
              <div
                key={date}
                title={date}
                className={`w-3 h-3 md:w-4 md:h-4 rounded-sm transition-colors duration-500 ${
                  hasEntry
                    ? 'bg-green-600/70 border border-green-500'
                    : `bg-transparent border ${theme.border}`
                }`}
              />
            );
          })}
        </div>
      </div>

      {!entries || entries.length === 0 ? (
        <p className={`text-center mt-10 ${theme.muted}`}>The page is blank.</p>
      ) : (
        entries
          .filter((e) => e != null)
          .map((entry) => (
            <div
              key={entry.id}
              className={`group relative pb-6 border-b ${theme.border} last:border-0`}
            >
              <div
                className={`text-xs mb-3 md:mb-4 tracking-widest flex flex-col md:flex-row md:justify-between md:items-center gap-3 md:gap-0 ${theme.muted}`}
              >
                <div className='flex items-center gap-3'>
                  <span className='text-sm md:text-base'>
                    {entry.mood || '😐'}
                  </span>
                  <span>
                    {new Date(
                      entry.entry_date + 'T00:00:00',
                    ).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>

                <div className='flex gap-4 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 ml-7 md:ml-0'>
                  <button
                    onClick={() => {
                      setCurrentDate(entry.entry_date);
                      setView('write');
                    }}
                    className='hover:text-current p-1 md:p-0'
                  >
                    <i className='fa-solid fa-pen mr-1'></i> Edit
                  </button>
                  <button
                    onClick={() => setShareModalEntry(entry)}
                    className='hover:text-current p-1 md:p-0'
                  >
                    <i className='fa-solid fa-share-nodes mr-1'></i> Share
                  </button>
                  <button
                    onClick={() => handleDelete(entry.entry_date)}
                    className='hover:text-red-900 p-1 md:p-0'
                  >
                    <i className='fa-solid fa-trash'></i>
                  </button>
                </div>
              </div>
              <p
                className={`mindful-font leading-relaxed whitespace-pre-wrap transition-colors duration-1000 text-sm md:text-base ${theme.text}`}
              >
                {entry.content}
              </p>
            </div>
          ))
      )}
    </div>
  );
};

// ==========================================
// 4. SHARED VIEW COMPONENT
// ==========================================
const SharedView = ({ sharedEntries, onEditShared, theme }) => (
  <div
    key='shared-view'
    className='w-full max-w-2xl flex flex-col gap-8 md:gap-12 pb-12 slow-fade'
  >
    {!sharedEntries || sharedEntries.length === 0 ? (
      <p className={`text-center mt-20 ${theme.muted}`}>
        No entries have been shared with you.
      </p>
    ) : (
      sharedEntries
        .filter((s) => s != null)
        .map((shareItem, idx) => {
          let entry = shareItem.mindful_entries;
          if (Array.isArray(entry)) entry = entry[0];
          if (!entry) return null;

          const sharerUsername = shareItem.profiles?.username || 'Unknown User';
          const canEdit = shareItem.permission === 'edit';

          return (
            <div
              key={entry.id || `shared-${idx}`}
              className={`group relative pb-6 border-b ${theme.border} last:border-0`}
            >
              <div
                className={`text-xs mb-3 md:mb-4 tracking-widest flex flex-col md:flex-row md:justify-between md:items-center gap-3 md:gap-0 ${theme.muted}`}
              >
                <div className='flex items-center gap-3'>
                  <span className='text-sm md:text-base'>
                    {entry.mood || '😐'}
                  </span>
                  <span>
                    {new Date(
                      entry.entry_date + 'T00:00:00',
                    ).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                <div className='flex gap-4 items-center ml-7 md:ml-0'>
                  <span className='italic opacity-70'>
                    Shared by @{sharerUsername}
                  </span>
                  {canEdit && (
                    <button
                      onClick={() => onEditShared(shareItem)}
                      className='opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity hover:text-current border px-2 py-1 rounded text-[10px] md:text-xs'
                    >
                      <i className='fa-solid fa-pen'></i> Edit
                    </button>
                  )}
                </div>
              </div>
              <p
                className={`mindful-font leading-relaxed whitespace-pre-wrap transition-colors duration-1000 text-sm md:text-base ${theme.text}`}
              >
                {entry.content}
              </p>
            </div>
          );
        })
    )}
  </div>
);

// ==========================================
// 5. SHARE MODAL COMPONENT
// ==========================================
const ShareModal = ({ entry, session, onClose, theme }) => {
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [permission, setPermission] = useState('view');
  const [status, setStatus] = useState('');

  useEffect(() => {
    const searchUsers = async () => {
      if (!userSearchQuery || userSearchQuery.trim().length < 2) {
        setSearchResults([]);
        return;
      }
      setIsSearchingUsers(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username')
          .neq('id', session?.user?.id)
          .ilike('username', `%${userSearchQuery}%`)
          .limit(10);
        if (!error) setSearchResults(data || []);
      } finally {
        setIsSearchingUsers(false);
      }
    };
    const timer = setTimeout(searchUsers, 300);
    return () => clearTimeout(timer);
  }, [userSearchQuery, session]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser) return setStatus('Please select a user.');
    setStatus('Sharing...');
    try {
      const { error } = await supabase.from('mindful_shares').upsert(
        {
          entry_id: entry.id,
          shared_by: session?.user?.id,
          shared_with_user_id: selectedUser.id,
          permission,
        },
        { onConflict: 'entry_id, shared_with_user_id' },
      );
      if (error) throw error;
      setStatus('Shared successfully!');
      setTimeout(onClose, 1500);
    } catch {
      setStatus('Error sharing.');
    }
  };

  return (
    <div className='fixed inset-0 bg-black/80 flex items-center justify-center z-50 slow-fade px-4'>
      <div
        className={`p-6 md:p-8 border ${theme.border} ${theme.bg} w-full max-w-[400px] shadow-2xl flex flex-col max-h-[85vh] rounded-lg md:rounded-none`}
      >
        <h3
          className={`text-base md:text-lg mb-1 tracking-widest ${theme.text}`}
        >
          Share Entry
        </h3>
        <p className={`text-[10px] md:text-xs mb-4 md:mb-6 ${theme.muted}`}>
          Date: {new Date(entry?.entry_date + 'T00:00:00').toLocaleDateString()}
        </p>
        <form
          onSubmit={handleSubmit}
          className='flex flex-col gap-4 overflow-hidden flex-1'
        >
          <input
            type='text'
            placeholder='Search usernames...'
            value={userSearchQuery}
            onChange={(e) => {
              setUserSearchQuery(e.target.value);
              setSelectedUser(null);
            }}
            className={`w-full bg-transparent border-b ${theme.border} outline-none p-2 ${theme.text} ${theme.placeholder} text-sm md:text-base`}
          />
          <div
            className={`flex-1 overflow-y-auto border ${theme.border} p-1 min-h-[120px] md:min-h-[150px]`}
          >
            {isSearchingUsers ? (
              <p className={`p-2 text-xs italic ${theme.muted}`}>
                Searching...
              </p>
            ) : searchResults.length === 0 &&
              userSearchQuery.trim().length > 1 ? (
              <p className={`p-2 text-xs italic ${theme.muted}`}>
                No users found.
              </p>
            ) : searchResults.length === 0 ? (
              <p className={`p-2 text-xs italic ${theme.muted}`}>
                Type at least 2 characters...
              </p>
            ) : (
              searchResults.map((user) => (
                <div
                  key={user.id}
                  onClick={() => setSelectedUser(user)}
                  className={`p-3 md:p-2 cursor-pointer text-sm transition-colors ${
                    selectedUser?.id === user.id
                      ? theme.selectedList
                      : `${theme.muted} ${theme.hoverList}`
                  }`}
                >
                  @{user.username}
                </div>
              ))
            )}
          </div>
          <select
            value={permission}
            onChange={(e) => setPermission(e.target.value)}
            className={`w-full bg-transparent border-b ${theme.border} outline-none p-2 ${theme.text} text-sm md:text-base`}
          >
            <option value='view' className='bg-black text-white'>
              View Only
            </option>
            <option value='edit' className='bg-black text-white'>
              Can Edit
            </option>
          </select>
          <div className='flex justify-end gap-4 mt-2 md:mt-4 tracking-widest text-xs md:text-sm uppercase'>
            <button
              type='button'
              onClick={onClose}
              className={`p-2 ${theme.muted} hover:opacity-70`}
            >
              Cancel
            </button>
            <button
              type='submit'
              className={`p-2 ${theme.text} hover:opacity-70 font-bold`}
              disabled={!selectedUser}
            >
              Share
            </button>
          </div>
          {status && (
            <p className={`text-xs italic mt-1 ${theme.muted}`}>{status}</p>
          )}
        </form>
      </div>
    </div>
  );
};

// ==========================================
// 6. PASSWORD LOCK SCREEN COMPONENT
// ==========================================
const MindfulLockScreen = ({ session, onUnlock, theme }) => {
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [mode, setMode] = useState('login'); // login, forgot_custom

  const meta = session?.user?.user_metadata || {};
  const isCustom = meta.mindful_lock_type === 'custom';

  const handleUnlock = async (e) => {
    e.preventDefault();
    setStatus('Verifying...');

    if (isCustom) {
      const hashedPass = await hashText(password);
      if (hashedPass === meta.mindful_custom_hash) {
        onUnlock();
      } else {
        setStatus('Incorrect custom password.');
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: session.user.email,
        password,
      });
      if (error) {
        setStatus('Incorrect account password.');
      } else {
        onUnlock();
      }
    }
  };

  const handleForgot = async () => {
    if (isCustom) {
      setMode('forgot_custom');
      setStatus('');
      setPassword('');
    } else {
      setStatus('Sending reset link...');
      const { error } = await supabase.auth.resetPasswordForEmail(
        session.user.email,
      );
      if (error) {
        setStatus('Error sending reset email.');
      } else {
        setStatus('A password reset link has been sent to your email.');
      }
    }
  };

  const handleResetCustomLock = async (e) => {
    e.preventDefault();
    setStatus('Verifying account password...');
    const { error } = await supabase.auth.signInWithPassword({
      email: session.user.email,
      password,
    });

    if (error) {
      setStatus('Incorrect account password.');
    } else {
      // Clear the custom lock in metadata to reset it
      await supabase.auth.updateUser({
        data: {
          mindful_lock_enabled: false,
          mindful_lock_type: null,
          mindful_custom_hash: null,
        },
      });
      onUnlock();
    }
  };

  return (
    <div
      className={`flex flex-col h-screen w-full items-center justify-center font-mono ${theme.bg} ${theme.text} slow-fade px-4`}
    >
      <div
        className={`w-full max-w-sm p-8 border ${theme.border} ${theme.cardBg} shadow-xl flex flex-col`}
      >
        <h2 className='text-xl mb-2 tracking-widest text-center uppercase'>
          {mode === 'forgot_custom' ? 'Reset Journal Lock' : 'Journal Locked'}
        </h2>

        <p className={`text-xs mb-6 text-center ${theme.muted}`}>
          {mode === 'forgot_custom'
            ? 'Enter your main account password to bypass and reset your custom journal lock.'
            : `Enter your ${isCustom ? 'custom journal' : 'account'} password to continue.`}
        </p>

        <form
          onSubmit={
            mode === 'forgot_custom' ? handleResetCustomLock : handleUnlock
          }
          className='flex flex-col gap-4'
        >
          <input
            type='password'
            placeholder='Password...'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`w-full bg-transparent border-b ${theme.border} outline-none p-2 ${theme.text} ${theme.placeholder} text-sm`}
            autoFocus
          />

          <button
            type='submit'
            className={`p-2 border ${theme.border} hover:opacity-70 mt-2 transition-opacity tracking-widest text-xs uppercase`}
          >
            {mode === 'forgot_custom' ? 'Verify & Reset' : 'Unlock'}
          </button>
        </form>

        {mode === 'login' && (
          <button
            onClick={handleForgot}
            className={`mt-4 text-[10px] tracking-widest uppercase hover:underline ${theme.muted}`}
          >
            Forgot Password?
          </button>
        )}

        {mode === 'forgot_custom' && (
          <button
            onClick={() => setMode('login')}
            className={`mt-4 text-[10px] tracking-widest uppercase hover:underline ${theme.muted}`}
          >
            Cancel
          </button>
        )}

        {status && (
          <p className={`text-xs italic mt-4 text-center ${theme.muted}`}>
            {status}
          </p>
        )}
      </div>
    </div>
  );
};

// ==========================================
// 7. PASSWORD LOCK SETTINGS MODAL
// ==========================================
const MindfulLockSettings = ({ session, onClose, theme }) => {
  const meta = session?.user?.user_metadata || {};
  const [isEnabled, setIsEnabled] = useState(
    meta.mindful_lock_enabled || false,
  );
  const [lockType, setLockType] = useState(meta.mindful_lock_type || 'account'); // 'account' or 'custom'

  const [customPass, setCustomPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [accountPass, setAccountPass] = useState(''); // Required to confirm identity when saving
  const [status, setStatus] = useState('');

  const handleSave = async (e) => {
    e.preventDefault();
    if (isEnabled && lockType === 'custom' && customPass !== confirmPass) {
      return setStatus('Custom passwords do not match.');
    }
    if (!accountPass) {
      return setStatus('Account password required to save changes.');
    }

    setStatus('Verifying identity...');
    const { error: authErr } = await supabase.auth.signInWithPassword({
      email: session.user.email,
      password: accountPass,
    });

    if (authErr) {
      return setStatus('Incorrect account password.');
    }

    setStatus('Saving settings...');
    const updates = {
      mindful_lock_enabled: isEnabled,
      mindful_lock_type: isEnabled ? lockType : null,
    };

    if (isEnabled && lockType === 'custom' && customPass) {
      updates.mindful_custom_hash = await hashText(customPass);
    }

    const { error } = await supabase.auth.updateUser({ data: updates });
    if (error) {
      setStatus('Error saving settings.');
    } else {
      setStatus('Saved successfully!');
      setTimeout(onClose, 1000);
    }
  };

  return (
    <div className='fixed inset-0 bg-black/80 flex items-center justify-center z-50 slow-fade px-4'>
      <div
        className={`p-6 md:p-8 border ${theme.border} ${theme.bg} w-full max-w-[400px] shadow-2xl flex flex-col rounded-lg md:rounded-none max-h-[90vh] overflow-y-auto`}
      >
        <h3
          className={`text-base md:text-lg mb-6 tracking-widest uppercase ${theme.text}`}
        >
          Privacy Settings
        </h3>

        <form onSubmit={handleSave} className='flex flex-col gap-6 flex-1'>
          {/* Enable Toggle */}
          <label
            className={`flex items-center gap-3 text-sm cursor-pointer ${theme.text}`}
          >
            <input
              type='checkbox'
              checked={isEnabled}
              onChange={(e) => setIsEnabled(e.target.checked)}
              className='accent-gray-600 w-4 h-4'
            />
            Require password to open Journal
          </label>

          {/* Type Selection */}
          {isEnabled && (
            <div className={`flex flex-col gap-3 pl-7 ${theme.muted} text-xs`}>
              <label className='flex items-center gap-2 cursor-pointer'>
                <input
                  type='radio'
                  name='lockType'
                  value='account'
                  checked={lockType === 'account'}
                  onChange={() => setLockType('account')}
                  className='accent-gray-600'
                />
                Use Account Password
              </label>
              <label className='flex items-center gap-2 cursor-pointer'>
                <input
                  type='radio'
                  name='lockType'
                  value='custom'
                  checked={lockType === 'custom'}
                  onChange={() => setLockType('custom')}
                  className='accent-gray-600'
                />
                Use Custom Password
              </label>
            </div>
          )}

          {/* Custom Password Inputs */}
          {isEnabled && lockType === 'custom' && (
            <div className='flex flex-col gap-3 pl-7 border-l-2 border-gray-500/20'>
              <input
                type='password'
                placeholder='New Custom Password'
                value={customPass}
                onChange={(e) => setCustomPass(e.target.value)}
                className={`w-full bg-transparent border-b ${theme.border} outline-none p-2 ${theme.text} ${theme.placeholder} text-xs`}
                required={!meta.mindful_custom_hash} // Require if not already set
              />
              <input
                type='password'
                placeholder='Confirm Custom Password'
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                className={`w-full bg-transparent border-b ${theme.border} outline-none p-2 ${theme.text} ${theme.placeholder} text-xs`}
                required={!meta.mindful_custom_hash}
              />
              {meta.mindful_custom_hash && !customPass && (
                <span className={`text-[10px] italic ${theme.muted}`}>
                  Leave blank to keep existing custom password.
                </span>
              )}
            </div>
          )}

          <hr className={`border-t ${theme.border} my-2`} />

          {/* Auth Confirmation */}
          <div className='flex flex-col gap-2'>
            <label
              className={`text-[10px] tracking-widest uppercase ${theme.muted}`}
            >
              Confirm Account Password to Save Changes
            </label>
            <input
              type='password'
              placeholder='Account Password'
              value={accountPass}
              onChange={(e) => setAccountPass(e.target.value)}
              className={`w-full bg-transparent border-b ${theme.border} outline-none p-2 ${theme.text} ${theme.placeholder} text-sm`}
              required
            />
          </div>

          <div className='flex justify-end gap-4 mt-2 tracking-widest text-xs uppercase'>
            <button
              type='button'
              onClick={onClose}
              className={`p-2 ${theme.muted} hover:opacity-70`}
            >
              Cancel
            </button>
            <button
              type='submit'
              className={`p-2 ${theme.text} hover:opacity-70 font-bold`}
              disabled={!accountPass}
            >
              Save
            </button>
          </div>
          {status && (
            <p className={`text-xs italic text-center ${theme.muted}`}>
              {status}
            </p>
          )}
        </form>
      </div>
    </div>
  );
};

// ==========================================
// 8. MAIN MINDFUL COMPONENT
// ==========================================
const Mindful = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Privacy Lock State
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showLockSettings, setShowLockSettings] = useState(false);

  const [view, setView] = useState('write');
  const [isLightMode, setIsLightMode] = useState(false);
  const [currentDate, setCurrentDate] = useState(getLocalToday());

  const [entries, setEntries] = useState(() => {
    try {
      const cached = localStorage.getItem('mindful_entries_cache');
      return cached ? JSON.parse(cached) : [];
    } catch (error) {
      console.error('Failed to parse cached entries', error);
      return [];
    }
  });

  const [sharedEntries, setSharedEntries] = useState([]);

  const [shareModalEntry, setShareModalEntry] = useState(null);
  const [editingSharedItem, setEditingSharedItem] = useState(null);

  const theme = getTheme(isLightMode);

  useEffect(() => {
    if (entries.length > 0) {
      localStorage.setItem('mindful_entries_cache', JSON.stringify(entries));
    }
  }, [entries]);

  useEffect(() => {
    const init = async () => {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();
      if (!currentSession) return navigate('/auth');

      setSession(currentSession);

      // Check lock status
      if (currentSession.user.user_metadata?.mindful_lock_enabled) {
        setIsUnlocked(false);
      } else {
        setIsUnlocked(true);
      }

      try {
        const [myEntries, myShares] = await Promise.all([
          supabase
            .from('mindful_entries')
            .select('*')
            .eq('user_id', currentSession.user.id)
            .order('entry_date', { ascending: false }),
          supabase
            .from('mindful_shares')
            .select(
              'permission, profiles!fk_shared_by(username), mindful_entries(id, entry_date, content, mood, user_id)',
            )
            .eq('shared_with_user_id', currentSession.user.id),
        ]);

        if (myEntries.data) setEntries(myEntries.data);
        if (myShares.data) setSharedEntries(myShares.data);
      } catch (err) {
        console.error('Failed to sync with DB, using offline cache.', err);
      }
      setIsLoading(false);
    };
    init();
  }, [navigate]);

  const streak = useMemo(() => {
    if (!entries || entries.length === 0) return 0;
    const dates = entries
      .filter((e) => e != null && e.entry_date)
      .map((e) => e.entry_date)
      .sort((a, b) => new Date(b) - new Date(a));
    const today = getLocalToday();
    const d = new Date(today + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    const yesterday = d.toISOString().split('T')[0];

    let currentStreak = 0;
    let expectedDate = dates.includes(today)
      ? today
      : dates.includes(yesterday)
        ? yesterday
        : null;
    if (!expectedDate) return 0;

    for (const date of dates) {
      if (date === expectedDate) {
        currentStreak++;
        const prev = new Date(expectedDate + 'T00:00:00');
        prev.setDate(prev.getDate() - 1);
        expectedDate = prev.toISOString().split('T')[0];
      } else break;
    }
    return currentStreak;
  }, [entries]);

  if (isLoading && entries.length === 0) {
    return (
      <div
        className={`flex h-screen w-full items-center justify-center font-mono ${theme.bg} ${theme.muted}`}
      >
        Loading...
      </div>
    );
  }

  // Intercept with Lock Screen if necessary
  if (!isUnlocked) {
    return (
      <>
        <style>{`.slow-fade { animation: slowFade 1s ease-in-out forwards; } @keyframes slowFade { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        <MindfulLockScreen
          session={session}
          onUnlock={() => setIsUnlocked(true)}
          theme={theme}
        />
      </>
    );
  }

  return (
    <div
      className={`flex flex-col h-screen w-full ${theme.bg} ${theme.text} font-mono overflow-hidden relative transition-colors duration-1000`}
    >
      <style>{`
        .mindful-font { font-family: 'Cutive Mono', 'Courier New', Courier, monospace; }
        ::-webkit-scrollbar { display: none; }
        .slow-fade { animation: slowFade 1s ease-in-out forwards; }
        @keyframes slowFade { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .pb-safe { padding-bottom: env(safe-area-inset-bottom, 1rem); }
        .textarea-satisfying {
          font-family: 'Cutive Mono', 'Courier New', Courier, monospace;
          line-height: 2;
          letter-spacing: 0.03em;
          text-shadow: 0 0 1px transparent;
        }
        .word-bump {
          animation: wordBump 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        @keyframes wordBump {
          0% { transform: scale(1); }
          50% { transform: scale(1.35); }
          100% { transform: scale(1); }
        }
      `}</style>

      {shareModalEntry && (
        <ShareModal
          entry={shareModalEntry}
          session={session}
          theme={theme}
          onClose={() => setShareModalEntry(null)}
        />
      )}

      {showLockSettings && (
        <MindfulLockSettings
          session={session}
          theme={theme}
          onClose={() => setShowLockSettings(false)}
        />
      )}

      {/* TOP NAVIGATION */}
      <nav className='w-full flex justify-between items-center px-4 md:px-8 py-4 md:py-6 z-10'>
        <div className='hidden md:flex gap-6 text-sm tracking-widest uppercase'>
          {['write', 'calendar', 'history', 'shared'].map((v) => (
            <button
              key={v}
              onClick={() => {
                setView(v);
                setEditingSharedItem(null);
              }}
              className={`transition-colors duration-500 pb-1 ${
                view === v ? `border-b ${theme.activeBorder}` : theme.muted
              }`}
            >
              {v}
            </button>
          ))}
        </div>

        <div className='flex w-full md:w-auto justify-between md:justify-end items-center gap-6 text-sm'>
          {streak > 0 && (
            <div
              className={`flex items-center gap-2 ${theme.muted}`}
              title='Streak'
            >
              <i className='fa-solid fa-fire'></i> {streak}
            </div>
          )}

          <div className='flex items-center gap-5 md:gap-6'>
            <button
              onClick={() => setShowLockSettings(true)}
              className={`transition-opacity duration-500 p-2 -m-2 hover:opacity-70 ${theme.muted}`}
              title='Privacy Lock Settings'
            >
              <i className='fa-solid fa-lock'></i>
            </button>
            <button
              onClick={() => setIsLightMode(!isLightMode)}
              className={`transition-opacity duration-500 p-2 -m-2 hover:opacity-70 ${theme.muted}`}
              title='Toggle Theme'
            >
              {isLightMode ? (
                <i className='fa-solid fa-moon'></i>
              ) : (
                <i className='fa-solid fa-sun'></i>
              )}
            </button>
            <button
              onClick={() => navigate('/chat')}
              className={`transition-opacity duration-500 p-2 -m-2 hover:opacity-70 ${theme.muted}`}
              title='Exit'
            >
              <i className='fa-solid fa-arrow-right-from-bracket'></i>
            </button>
          </div>
        </div>
      </nav>

      {/* MAIN SCROLL AREA */}
      <main className='flex-1 flex justify-center items-start overflow-y-auto w-full pt-4 md:pt-10 pb-24 md:pb-20 px-4 md:px-8'>
        {view === 'write' && (
          <WriteView
            session={session}
            currentDate={currentDate}
            entries={entries}
            setEntries={setEntries}
            theme={theme}
            editingSharedItem={editingSharedItem}
            setSharedEntries={setSharedEntries}
            onCancelSharedEdit={() => {
              setEditingSharedItem(null);
              setView('shared');
            }}
          />
        )}
        {view === 'calendar' && (
          <CalendarView
            entries={entries}
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
            setView={setView}
            theme={theme}
          />
        )}
        {view === 'history' && (
          <HistoryView
            entries={entries}
            setEntries={setEntries}
            session={session}
            setCurrentDate={setCurrentDate}
            setView={setView}
            setShareModalEntry={setShareModalEntry}
            theme={theme}
          />
        )}
        {view === 'shared' && (
          <SharedView
            sharedEntries={sharedEntries}
            theme={theme}
            onEditShared={(item) => {
              setEditingSharedItem(item);
              setView('write');
            }}
          />
        )}
      </main>

      {/* MOBILE BOTTOM NAVIGATION */}
      <div
        className={`md:hidden fixed bottom-0 left-0 w-full border-t ${theme.border} ${theme.bg} z-50 flex justify-around items-center py-3 pb-safe`}
      >
        {['write', 'calendar', 'history', 'shared'].map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setView(tab);
              setEditingSharedItem(null);
            }}
            className={`flex flex-col items-center gap-1 p-2 w-16 transition-colors duration-300 ${
              view === tab ? theme.text : theme.muted
            }`}
          >
            <i className={`${TAB_ICONS[tab]} text-lg`}></i>
            <span className='text-[9px] tracking-widest uppercase font-sans mt-1'>
              {tab}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default Mindful;
