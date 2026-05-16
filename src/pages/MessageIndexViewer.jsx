import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

/**
 * MessageIndexViewer.jsx
 *
 * Features:
 * - Animated header with infinite completely random messages (no usernames)
 * - Prominent total message count (accurate for 180k+)
 * - Message lookup by chronological index
 * - Lifetime Leaderboard grouped by user_id & linked to 'profiles'
 * - Search messages by text (shows index, pfp, user, message)
 */

const MessageIndexViewer = () => {
  const [totalCount, setTotalCount] = useState(null);
  const [loadingCount, setLoadingCount] = useState(true);
  const [error, setError] = useState(null);
  const [isDeepScanning, setIsDeepScanning] = useState(false);

  // Random Header States
  const [randomMessages, setRandomMessages] = useState([]);
  const [loadingRandom, setLoadingRandom] = useState(true);

  // Lookup states
  const [inputIndex, setInputIndex] = useState('');
  const [loadingMessage, setLoadingMessage] = useState(false);
  const [message, setMessage] = useState(null);

  // User stats states (Leaderboard)
  const [userCounts, setUserCounts] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [leaderboardProgress, setLeaderboardProgress] = useState(0);

  // Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' or 'desc'
  const [searchResults, setSearchResults] = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [searchError, setSearchError] = useState(null);

  // Clipboard state
  const [copiedId, setCopiedId] = useState(null);

  // === FETCH TOTAL COUNT & RANDOM MESSAGES ===
  useEffect(() => {
    let intervalId;

    const fetchQuickStats = async () => {
      setLoadingCount(true);
      setLoadingRandom(true);
      setError(null);

      let foundCount = null;

      // 1. Cascade attempts to find the count instantly without timing out
      const attempts = ['exact', 'planned', 'estimated'];

      for (const method of attempts) {
        try {
          const res = await supabase
            .from('messages')
            .select('*', { count: method, head: true });

          // If Supabase returns a valid number, we take it and break the loop
          if (res.count !== null && res.count !== undefined) {
            foundCount = res.count;
            break;
          }
        } catch (err) {
          console.warn(`Count method ${method} failed:`, err);
        }
      }

      if (foundCount !== null) {
        setTotalCount(foundCount);
        setLoadingCount(false);
      } else {
        // If Supabase hides the count, we leave it null. The Leaderboard scanner will count it manually!
        setIsDeepScanning(true);
        setLoadingCount(false);
      }

      // 2. Fetch continuous random messages
      // Use 180,000 as a safe fallback pool if count is completely hidden
      const safePool = foundCount && foundCount > 0 ? foundCount : 180000;

      const fetchRandomBatch = async (numToFetch) => {
        const randomIndices = new Set();
        while (randomIndices.size < numToFetch) {
          randomIndices.add(Math.floor(Math.random() * safePool));
        }

        const randomFetches = Array.from(randomIndices).map(async (idx) => {
          const { data } = await supabase
            .from('messages')
            .select('message') // We no longer need username
            .range(idx, idx)
            .limit(1);
          return data?.[0];
        });

        const results = await Promise.all(randomFetches);
        return results.filter(Boolean);
      };

      // Initial large batch so the ticker is full
      const initialBatch = await fetchRandomBatch(20);
      setRandomMessages(initialBatch);
      setLoadingRandom(false);

      // Continually fetch new messages in the background to make it infinite
      intervalId = setInterval(async () => {
        const newBatch = await fetchRandomBatch(5);
        setRandomMessages((prev) => {
          const combined = [...prev, ...newBatch];
          // Keep a rolling window of 60 messages so it stays infinite without crashing the browser
          return combined.length > 60
            ? combined.slice(combined.length - 60)
            : combined;
        });
      }, 15000); // Every 15 seconds, inject 5 brand new random messages
    };

    fetchQuickStats();

    // Cleanup interval on unmount
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  // === FETCH LIFETIME LEADERBOARD & DEEP SCAN COUNT (BACKGROUND) ===
  useEffect(() => {
    const fetchLifetimeLeaderboard = async () => {
      setLoadingUsers(true);

      try {
        let allMessages = [];
        let page = 0;
        const pageSize = 1000;
        let fetchMore = true;

        // 1. Paginate through the ENTIRE messages table physically
        while (fetchMore) {
          const { data, error: fetchErr } = await supabase
            .from('messages')
            .select('user_id, username')
            .range(page * pageSize, (page + 1) * pageSize - 1);

          if (fetchErr) throw fetchErr;

          if (data && data.length > 0) {
            allMessages = [...allMessages, ...data];
            setLeaderboardProgress(allMessages.length);

            // CRITICAL FIX: If the quick-count failed, update the count visually as we scan!
            setTotalCount((prev) => {
              if (prev === null || allMessages.length > prev) {
                return allMessages.length;
              }
              return prev;
            });

            page++;
          } else {
            fetchMore = false;
            setIsDeepScanning(false); // Scan complete
          }
        }

        // 2. Tally up message counts per UNIQUE USER ID
        const userCountsMap = {};
        allMessages.forEach((msg) => {
          if (!msg.user_id) return;

          if (!userCountsMap[msg.user_id]) {
            userCountsMap[msg.user_id] = {
              user_id: msg.user_id,
              username: msg.username,
              count: 0,
            };
          }
          userCountsMap[msg.user_id].count += 1;
        });

        let sortedUsers = Object.values(userCountsMap).sort(
          (a, b) => b.count - a.count,
        );
        const userIds = sortedUsers.map((u) => u.user_id).filter(Boolean);

        // 3. Fetch the LIVE profile data in chunks
        const liveProfiles = {};
        const chunkSize = 200;

        if (userIds.length > 0) {
          for (let i = 0; i < userIds.length; i += chunkSize) {
            const chunk = userIds.slice(i, i + chunkSize);
            const { data: profilesData, error: profilesError } = await supabase
              .from('profiles')
              .select('id, avatar_url, username, email')
              .in('id', chunk);

            if (!profilesError && profilesData) {
              profilesData.forEach((p) => {
                liveProfiles[p.id] = p;
              });
            }
          }
        }

        // 4. Merge live data
        sortedUsers = sortedUsers.map((user) => {
          const profile = liveProfiles[user.user_id];
          return {
            ...user,
            username: profile?.username || user.username || 'Unknown',
            avatar_url: profile?.avatar_url || null,
            email: profile?.email || '',
          };
        });

        setUserCounts(sortedUsers);
      } catch (err) {
        console.error('Leaderboard error:', err);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchLifetimeLeaderboard();
  }, []);

  // === STRIP HTML FOR CLEAN STRINGS ===
  const stripHtml = (html) => {
    if (!html) return '';
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || '';
  };

  // === LOAD MESSAGE BY INDEX ===
  const handleLoadMessage = async () => {
    setError(null);
    setMessage(null);

    const index = parseInt(inputIndex, 10);

    if (isNaN(index) || index < 1) {
      setError('Please enter a valid positive number.');
      return;
    }

    if (totalCount !== null && index > totalCount) {
      setError(`There are only ${totalCount} messages.`);
      return;
    }

    setLoadingMessage(true);

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('timestamp', { ascending: true })
      .range(index - 1, index - 1);

    if (error || !data?.length) {
      setError('Failed to load message. Ensure RLS allows access.');
    } else {
      setMessage(data[0]);
    }

    setLoadingMessage(false);
  };

  // === SEARCH MESSAGES ===
  const handleSearch = async () => {
    if (!searchTerm.trim()) return;

    setSearchError(null);
    setLoadingSearch(true);
    setSearchResults([]);

    let query = supabase
      .from('messages')
      .select('*')
      .ilike('message', `%${searchTerm}%`)
      .order('timestamp', { ascending: sortOrder === 'asc' })
      .limit(50);

    if (startDate) {
      query = query.gte('timestamp', new Date(startDate).toISOString());
    }
    if (endDate) {
      query = query.lte(
        'timestamp',
        new Date(`${endDate}T23:59:59`).toISOString(),
      );
    }

    const { data, error: fetchError } = await query;

    if (fetchError) {
      setSearchError('Failed to search messages.');
      console.error(fetchError);
      setLoadingSearch(false);
      return;
    }

    if (!data || data.length === 0) {
      setSearchResults([]);
      setLoadingSearch(false);
      return;
    }

    const resultsWithIndex = await Promise.all(
      data.map(async (msg) => {
        const { count, error: countErr } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .lte('timestamp', msg.timestamp);

        return {
          ...msg,
          messageNumber: countErr ? '?' : count,
        };
      }),
    );

    setSearchResults(resultsWithIndex);
    setLoadingSearch(false);
  };

  // === COPY TO CLIPBOARD ===
  const handleCopy = (htmlText, id) => {
    const cleanText = stripHtml(htmlText);
    navigator.clipboard.writeText(cleanText);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Build the random string safely without usernames
  const randomHeaderString = randomMessages
    .filter((m) => m && m.message)
    .map((m) => `"${stripHtml(m.message)}"`)
    .join('  ✦  ');

  return (
    <div
      style={{
        padding: '0 0 24px 0',
        maxWidth: '900px',
        margin: '0 auto',
        color: 'var(--text-primary, #e5e7eb)',
        background: 'var(--bg-primary, #111827)',
        fontFamily: 'system-ui, sans-serif',
        borderRadius: '12px',
        overflow: 'hidden',
      }}
    >
      <style>
        {`
          @keyframes ticker {
            0% { transform: translateX(100%); }
            100% { transform: translateX(-100%); }
          }
        `}
      </style>

      {/* CONTINUOUS RANDOM MESSAGES HEADER TICKER */}
      <div
        style={{
          background: '#3b82f6',
          color: 'white',
          padding: '10px 0',
          marginBottom: '24px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          height: '40px',
        }}
      >
        <div
          style={{
            flex: 1,
            overflow: 'hidden',
            position: 'relative',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              display: 'inline-block',
              animation: 'ticker 120s linear infinite', // Slower animation to accommodate the massive infinite string
              paddingLeft: '100%',
              opacity: loadingRandom ? 0.5 : 1,
            }}
          >
            {loadingRandom
              ? 'Pulling random messages from the void...'
              : randomHeaderString || 'No random messages could be generated.'}
          </div>
        </div>
      </div>

      <div style={{ padding: '0 24px' }}>
        <h1 style={{ fontSize: '1.8rem', marginBottom: '12px' }}>
          Message Dashboard
        </h1>

        {/* TOTAL COUNT */}
        <div style={{ marginBottom: '20px' }}>
          {loadingCount ? (
            <div style={{ color: '#9ca3af' }}>Loading total message count…</div>
          ) : (
            <div
              style={{
                fontSize: '1.2rem',
                padding: '16px',
                background:
                  'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(16, 185, 129, 0.1) 100%)',
                borderRadius: '8px',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <span style={{ fontSize: '2rem' }}>💬</span>
              <div>
                <div
                  style={{
                    fontSize: '0.9rem',
                    color: '#9ca3af',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                  }}
                >
                  Total Messages In Database
                </div>
                <strong
                  style={{
                    color: '#3b82f6',
                    fontSize: '1.8rem',
                    lineHeight: '1.2',
                  }}
                >
                  {totalCount === null
                    ? 'Scanning...'
                    : totalCount.toLocaleString()}
                </strong>
                {isDeepScanning && (
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: '0.85rem',
                      color: '#fbbf24',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <i className='fa-solid fa-circle-notch fa-spin'></i>{' '}
                    Performing deep scan to bypass database limits...
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <hr
          style={{
            border: '1px solid var(--border-color, #374151)',
            margin: '20px 0',
          }}
        />

        {/* MESSAGE LOOKUP BY NUMBER */}
        <h2 style={{ fontSize: '1.4rem', marginBottom: '12px' }}>
          Lookup by Number
        </h2>
        <div
          style={{
            display: 'flex',
            gap: '10px',
            alignItems: 'center',
            marginBottom: '20px',
          }}
        >
          <input
            type='number'
            min='1'
            placeholder='Enter message number (e.g. 1)'
            value={inputIndex}
            onChange={(e) => setInputIndex(e.target.value)}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '6px',
              border: '1px solid var(--border-color, #374151)',
              background: 'var(--input-bg, #1f2937)',
              color: 'inherit',
            }}
          />
          <button
            onClick={handleLoadMessage}
            disabled={loadingMessage}
            style={{
              padding: '10px 16px',
              borderRadius: '6px',
              border: 'none',
              background: '#3b82f6',
              color: 'white',
              cursor: 'pointer',
              opacity: loadingMessage ? 0.6 : 1,
            }}
          >
            {loadingMessage ? 'Loading…' : 'Load'}
          </button>
          {message && (
            <button
              onClick={() => setMessage(null)}
              style={{
                padding: '10px 16px',
                borderRadius: '6px',
                border: '1px solid #ef4444',
                background: 'transparent',
                color: '#ef4444',
                cursor: 'pointer',
              }}
            >
              Clear
            </button>
          )}
        </div>

        {error && (
          <div style={{ color: '#ef4444', marginBottom: '20px' }}>{error}</div>
        )}

        {message && (
          <div
            style={{
              border: '1px solid var(--border-color, #374151)',
              borderRadius: '8px',
              padding: '16px',
              background: 'var(--panel-bg, #1f2937)',
              marginBottom: '40px',
              position: 'relative',
            }}
          >
            <button
              onClick={() => handleCopy(message.message, 'lookup')}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: '#374151',
                border: 'none',
                color: '#e5e7eb',
                padding: '4px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.8rem',
              }}
            >
              {copiedId === 'lookup' ? 'Copied!' : 'Copy'}
            </button>
            <strong>Message #{inputIndex}</strong>
            <div style={{ color: '#9ca3af' }}>
              User: {message.username ?? 'Unknown'}
            </div>
            <div style={{ color: '#9ca3af', marginBottom: '10px' }}>
              Sent: {new Date(message.timestamp).toLocaleString()}
            </div>
            <div
              style={{
                padding: '12px',
                background: 'rgba(0,0,0,0.2)',
                borderRadius: '6px',
              }}
              dangerouslySetInnerHTML={{ __html: message.message }}
            />
          </div>
        )}

        <hr
          style={{
            border: '1px solid var(--border-color, #374151)',
            margin: '20px 0',
          }}
        />

        {/* SEARCH MESSAGES */}
        <h2 style={{ fontSize: '1.4rem', marginBottom: '12px' }}>
          Search Messages
        </h2>

        <div
          style={{
            display: 'flex',
            gap: '10px',
            flexWrap: 'wrap',
            marginBottom: '12px',
          }}
        >
          <input
            type='date'
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{
              padding: '8px',
              borderRadius: '6px',
              border: '1px solid #374151',
              background: '#1f2937',
              color: 'white',
            }}
          />
          <span style={{ display: 'flex', alignItems: 'center' }}>to</span>
          <input
            type='date'
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{
              padding: '8px',
              borderRadius: '6px',
              border: '1px solid #374151',
              background: '#1f2937',
              color: 'white',
            }}
          />
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            style={{
              padding: '8px',
              borderRadius: '6px',
              border: '1px solid #374151',
              background: '#1f2937',
              color: 'white',
              marginLeft: 'auto',
            }}
          >
            <option value='asc'>Oldest First</option>
            <option value='desc'>Newest First</option>
          </select>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '10px',
            alignItems: 'center',
            marginBottom: '20px',
          }}
        >
          <input
            type='text'
            placeholder='Search text...'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '6px',
              border: '1px solid var(--border-color, #374151)',
              background: 'var(--input-bg, #1f2937)',
              color: 'inherit',
            }}
          />
          <button
            onClick={handleSearch}
            disabled={loadingSearch}
            style={{
              padding: '10px 16px',
              borderRadius: '6px',
              border: 'none',
              background: '#10b981',
              color: 'white',
              cursor: 'pointer',
              opacity: loadingSearch ? 0.6 : 1,
            }}
          >
            {loadingSearch ? 'Searching…' : 'Search'}
          </button>
        </div>

        {searchError && (
          <div style={{ color: '#ef4444', marginBottom: '20px' }}>
            {searchError}
          </div>
        )}

        {searchResults.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              marginBottom: '40px',
            }}
          >
            <div style={{ fontSize: '0.9rem', color: '#9ca3af' }}>
              Found {searchResults.length} results
            </div>
            {searchResults.map((result, i) => (
              <div
                key={i}
                style={{
                  border: '1px solid var(--border-color, #374151)',
                  borderRadius: '8px',
                  padding: '12px',
                  background: 'var(--panel-bg, #1f2937)',
                  position: 'relative',
                }}
              >
                <button
                  onClick={() => handleCopy(result.message, result.id || i)}
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    background: '#374151',
                    border: 'none',
                    color: '#e5e7eb',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                  }}
                >
                  {copiedId === (result.id || i) ? 'Copied!' : 'Copy'}
                </button>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '8px',
                    paddingRight: '60px',
                  }}
                >
                  <img
                    src={result.avatar_url || 'https://via.placeholder.com/40'}
                    alt={`${result.username}'s PFP`}
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <strong style={{ color: '#60a5fa' }}>
                      {result.username ?? 'Unknown'}
                    </strong>
                    <span
                      style={{
                        marginLeft: '8px',
                        fontSize: '0.85em',
                        color: '#9ca3af',
                      }}
                    >
                      #{result.messageNumber} •{' '}
                      {new Date(result.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    padding: '8px',
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: '6px',
                    color: '#f3f4f6',
                  }}
                  dangerouslySetInnerHTML={{ __html: result.message }}
                />
              </div>
            ))}
          </div>
        )}

        {searchResults.length === 0 &&
          !loadingSearch &&
          searchTerm &&
          !searchError && (
            <div style={{ marginBottom: '40px', color: '#9ca3af' }}>
              No results found for &quot;{searchTerm}&quot;.
            </div>
          )}

        <hr
          style={{
            border: '1px solid var(--border-color, #374151)',
            margin: '20px 0',
          }}
        />

        {/* LIFETIME LEADERBOARD */}
        <h2 style={{ fontSize: '1.4rem', marginBottom: '12px' }}>
          Lifetime Leaderboard
        </h2>
        {loadingUsers ? (
          <div style={{ color: '#9ca3af' }}>
            <p>Gathering all lifetime messages... Please wait.</p>
            <p style={{ fontSize: '0.85em', opacity: 0.7 }}>
              Messages scanned: {leaderboardProgress.toLocaleString()}
            </p>
          </div>
        ) : (
          <div
            style={{
              border: '1px solid var(--border-color, #374151)',
              borderRadius: '8px',
              overflowY: 'auto',
              maxHeight: '500px',
              background: 'var(--panel-bg, #1f2937)',
            }}
          >
            {userCounts.map((user, i) => {
              let rankColor = 'text-slate-500';
              let rankBg = 'bg-slate-800/50 border-transparent';

              if (i === 0) {
                rankColor = 'text-yellow-400';
                rankBg = 'bg-yellow-500/10 border-yellow-500/30';
              } else if (i === 1) {
                rankColor = 'text-slate-300';
                rankBg = 'bg-slate-400/10 border-slate-400/30';
              } else if (i === 2) {
                rankColor = 'text-amber-600';
                rankBg = 'bg-amber-700/10 border-amber-700/30';
              }

              return (
                <div
                  key={user.user_id || i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px',
                    borderBottom: '1px solid var(--border-color, #374151)',
                    background: i % 2 === 0 ? 'rgba(0,0,0,0.1)' : 'transparent',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                    }}
                  >
                    <div
                      className={`${rankColor} ${rankBg}`}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '900',
                        border: '1px solid',
                      }}
                    >
                      #{i + 1}
                    </div>

                    <img
                      src={user.avatar_url || 'https://via.placeholder.com/40'}
                      alt={user.username}
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '1px solid #374151',
                      }}
                    />

                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <strong style={{ color: '#e5e7eb', fontSize: '1rem' }}>
                        {user.username}
                      </strong>
                      {user.email && (
                        <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                          {user.email}
                        </span>
                      )}
                    </div>
                  </div>

                  <strong style={{ color: '#60a5fa', fontSize: '1.2rem' }}>
                    {user.count.toLocaleString()}
                  </strong>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageIndexViewer;
