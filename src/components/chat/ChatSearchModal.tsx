import { useState, useEffect, useRef, type FC, type ReactElement } from 'react';
import { supabase } from '../../supabaseClient'; // Adjust path if needed
import type { ChatMessage } from '../../utils/databaseDefinitions';

type StrippedMessage = Omit<
  ChatMessage,
  'is_bot' | 'is_edited' | 'badge_type' | 'parent_id'
>;

const ChatSearchModal: FC<{
  onClose: () => void;
  onJumpToMessage: (msg: StrippedMessage) => void;
  blockedUsers: string[];
}> = ({ onClose, onJumpToMessage, blockedUsers = [] }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StrippedMessage[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Smart Filters
  const [filterDate, setFilterDate] = useState(''); // YYYY-MM-DD
  const [filterUser, setFilterUser] = useState(''); // Username
  const [filterType, setFilterType] = useState<'all' | 'images' | 'links'>(
    'all',
  );

  // Pagination State
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const PAGE_SIZE = 50;

  const inputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLInputElement>(null);

  // Helper to format Date and Time explicitly
  const formatDateTime = (timestamp: string): string => {
    return new Date(timestamp).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // Reset pagination when search parameters change
  useEffect(() => {
    setPage(0);
    setResults([]);
  }, [query, filterDate, filterUser, filterType]);

  // Fetch logic
  useEffect(() => {
    const fetchResults = async (): Promise<void> => {
      if (
        !query.trim() &&
        !filterDate &&
        !filterUser.trim() &&
        filterType === 'all'
      ) {
        setResults([]);
        setIsSearching(false);
        setHasMore(false);
        return;
      }

      if (page === 0) setIsSearching(true);
      else setIsLoadingMore(true);

      try {
        // Base Query (Messages only, exclude deleted, newest first)
        let dbQuery = supabase
          .from('messages')
          .select(
            'id, message, timestamp, username, user_id, avatar_url, is_deleted',
          )
          .eq('is_deleted', false)
          .order('timestamp', { ascending: false });

        // 1. Text Matching
        if (query.trim()) {
          dbQuery = dbQuery.ilike('message', `%${query.trim()}%`);
        }

        // 2. Specific Date Filter
        if (filterDate) {
          const startOfDay = new Date(filterDate + 'T00:00:00');
          const endOfDay = new Date(filterDate + 'T23:59:59.999');
          dbQuery = dbQuery
            .gte('timestamp', startOfDay.toISOString())
            .lte('timestamp', endOfDay.toISOString());
        }

        // 3. Specific User Filter
        if (filterUser.trim()) {
          dbQuery = dbQuery.ilike('username', `%${filterUser.trim()}%`);
        }

        // 4. Type Filters
        if (filterType === 'images') {
          dbQuery = dbQuery.ilike('message', '%<img%');
        } else if (filterType === 'links') {
          dbQuery = dbQuery.ilike('message', '%href=%');
        }

        // 5. Pagination Range
        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;
        dbQuery = dbQuery.range(from, to);

        const { data, error } = await dbQuery;
        if (error) throw error;

        // 6. Client-side Strip & Verify (Fixes Base64 False Positives)
        const safeData = (data || []).filter((msg) => {
          // Blocked user check
          if (blockedUsers.includes(msg.username)) return false;

          // Exclude base64/HTML attribute matches
          if (query.trim()) {
            const plainText = msg.message
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ');
            if (!plainText.toLowerCase().includes(query.trim().toLowerCase())) {
              return false;
            }
          }
          return true;
        });

        if (page === 0) {
          setResults(safeData);
          setSelectedIndex(0);
        } else {
          setResults((prev) => [...prev, ...safeData]);
        }

        // If we received a full page of raw data, there MIGHT be more in the database
        setHasMore((data || []).length === PAGE_SIZE);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
        setIsLoadingMore(false);
      }
    };

    // Debounce to prevent spamming the DB while typing
    const debounce = setTimeout(fetchResults, page === 0 ? 300 : 0);
    return () => clearTimeout(debounce);
  }, [query, filterDate, filterUser, filterType, blockedUsers, page]);

  // Keyboard Navigation (Arrow keys, Enter, Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          Math.min(prev + 1, Math.max(0, results.length - 1)),
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (results[selectedIndex]) {
          onJumpToMessage(results[selectedIndex]);
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [results, selectedIndex, onClose, onJumpToMessage]);

  // Auto-scroll the selected item into view
  useEffect(() => {
    const activeEl = document.getElementById(`search-result-${selectedIndex}`);
    if (activeEl && resultsContainerRef.current) {
      activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex]);

  // Format Snippet and Highlight Match
  const renderSnippet = (htmlString: string): ReactElement => {
    const plainText = htmlString
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!query.trim())
      return (
        <span className='text-gray-400'>{plainText.substring(0, 100)}</span>
      );

    const regex = new RegExp(`(${query.trim()})`, 'gi');
    const matchIndex = plainText
      .toLowerCase()
      .search(query.trim().toLowerCase());

    const start = Math.max(0, matchIndex - 40);
    const end = Math.min(
      plainText.length,
      matchIndex + query.trim().length + 40,
    );
    let snippet = plainText.substring(start, end);
    if (start > 0) snippet = '...' + snippet;
    if (end < plainText.length) snippet = snippet + '...';

    const parts = snippet.split(regex);

    return (
      <span className='text-gray-300 text-sm break-words line-clamp-2'>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <mark
              key={i}
              className='bg-blue-500/40 text-blue-100 rounded px-1 font-bold'
            >
              {part}
            </mark>
          ) : (
            part
          ),
        )}
      </span>
    );
  };

  return (
    <div className='fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[10vh] sm:pt-[15vh] p-4 transition-opacity'>
      <div className='absolute inset-0' onClick={onClose}></div>

      <div className='relative w-full max-w-2xl bg-slate-900 border border-slate-700 shadow-2xl rounded-2xl overflow-hidden flex flex-col max-h-[70vh] animate-fade-in'>
        {/* Search Input Area */}
        <div className='flex items-center px-4 py-4 bg-slate-800/50 border-b border-slate-700 gap-3'>
          <i className='fa-solid fa-magnifying-glass text-slate-400 text-lg'></i>
          <input
            ref={inputRef}
            type='text'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Search messages, people, or keywords...'
            className='flex-1 bg-transparent border-none outline-none text-white text-lg placeholder-slate-500'
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className='text-slate-400 hover:text-white transition-colors'
            >
              <i className='fa-solid fa-circle-xmark'></i>
            </button>
          )}
        </div>

        {/* Smart Filters Bar */}
        <div className='flex px-4 py-2 bg-slate-800/80 border-b border-slate-700/50 gap-2 overflow-x-auto no-scrollbar items-center'>
          <span className='text-xs text-slate-400 uppercase font-bold mr-2'>
            <i className='fa-solid fa-filter mr-1'></i>Filters:
          </span>

          <input
            type='text'
            placeholder='From User...'
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            className='bg-slate-700 text-white text-xs px-2 py-1 rounded outline-none border border-slate-600 focus:border-blue-500 w-28 placeholder-slate-400'
          />

          <input
            type='date'
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className='bg-slate-700 text-white text-xs px-2 py-1 rounded cursor-pointer border border-slate-600 focus:border-blue-500 outline-none'
            title='Search by Exact Date'
          />

          <select
            value={filterType}
            onChange={(e) => {
              if (['all', 'images', 'links'].includes(e.target.value))
                setFilterType(e.target.value as 'all' | 'images' | 'links');
            }}
            className='bg-slate-700 text-white text-xs px-2 py-1 rounded cursor-pointer border border-slate-600 outline-none hover:bg-slate-600 transition-colors'
          >
            <option value='all'>Any Type</option>
            <option value='images'>Has Image</option>
            <option value='links'>Has Link</option>
          </select>

          {(filterUser || filterDate || filterType !== 'all') && (
            <button
              onClick={() => {
                setFilterUser('');
                setFilterDate('');
                setFilterType('all');
              }}
              className='text-xs text-red-400 hover:text-red-300 ml-auto flex-shrink-0'
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Results List */}
        <div
          ref={resultsContainerRef}
          className='flex-1 overflow-y-auto bg-slate-900 min-h-[100px]'
        >
          {isSearching ? (
            <div className='flex flex-col items-center justify-center py-10 text-slate-400 gap-3'>
              <i className='fa-solid fa-circle-notch fa-spin text-2xl text-blue-500'></i>
              <span>Searching records...</span>
            </div>
          ) : results.length > 0 ? (
            <div className='py-2 flex flex-col'>
              {results.map((msg, index) => {
                const isSelected = index === selectedIndex;
                return (
                  <div
                    key={`${msg.id}-${index}`}
                    id={`search-result-${index}`}
                    onClick={() => {
                      onJumpToMessage(msg);
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`px-4 py-3 flex gap-3 cursor-pointer transition-colors border-l-2 ${isSelected ? 'bg-slate-800 border-blue-500' : 'border-transparent hover:bg-slate-800/50'}`}
                  >
                    <img
                      src={msg.avatar_url || 'https://via.placeholder.com/40'}
                      alt='Avatar'
                      className='w-10 h-10 rounded-full object-cover shrink-0'
                    />
                    <div className='flex flex-col overflow-hidden w-full'>
                      <div className='flex items-baseline gap-2 mb-0.5'>
                        <span className='font-bold text-slate-200'>
                          {msg.username}
                        </span>
                        <span className='text-xs text-slate-500'>
                          {formatDateTime(msg.timestamp)}
                        </span>
                      </div>
                      {renderSnippet(msg.message)}
                    </div>
                  </div>
                );
              })}

              {/* Load More Button */}
              {hasMore && (
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={isLoadingMore}
                  className='my-4 mx-auto block px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-colors disabled:opacity-50'
                >
                  {isLoadingMore ? (
                    <>
                      <i className='fa-solid fa-spinner fa-spin mr-2'></i>
                      Loading older messages...
                    </>
                  ) : (
                    'Load More Results'
                  )}
                </button>
              )}
            </div>
          ) : (
            <div className='flex flex-col items-center justify-center py-12 text-slate-500'>
              <p>No messages match your search.</p>
              <p className='text-xs mt-1 opacity-60'>
                Try changing your filters or using different keywords.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatSearchModal;
