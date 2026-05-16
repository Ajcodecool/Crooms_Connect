import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import React from 'react';

const STOP_WORDS = new Set([
  'the',
  'be',
  'to',
  'of',
  'and',
  'a',
  'in',
  'that',
  'have',
  'i',
  'it',
  'for',
  'not',
  'on',
  'with',
  'he',
  'as',
  'you',
  'do',
  'at',
  'this',
  'but',
  'his',
  'by',
  'from',
  'they',
  'we',
  'say',
  'her',
  'she',
  'or',
  'an',
  'will',
  'my',
  'one',
  'all',
  'would',
  'there',
  'their',
  'what',
  'so',
  'up',
  'out',
  'if',
  'about',
  'who',
  'get',
  'which',
  'go',
  'me',
  'is',
  'are',
  'was',
  'were',
  'im',
  'its',
  'just',
  'dont',
  'like',
  'lol',
  'u',
  'ur',
  'can',
  'how',
  'when',
  'your',
  'know',
  'now',
  'then',
  'no',
  'yes',
]);

const POSITIVE_WORDS = new Set([
  'good',
  'great',
  'awesome',
  'love',
  'nice',
  'best',
  'happy',
  'cool',
  'amazing',
  'thanks',
  'thx',
  'perfect',
  'haha',
  'lmao',
]);
const NEGATIVE_WORDS = new Set([
  'bad',
  'terrible',
  'hate',
  'worst',
  'sad',
  'angry',
  'stupid',
  'dumb',
  'sucks',
  'shit',
  'fuck',
  'annoying',
  'awful',
  'trash',
]);

const Stats = ({ session }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [loadingText, setLoadingText] = useState('fetching raw data...');
  const [authorized, setAuthorized] = useState(false);

  // States for our new features
  const [statsData, setStatsData] = useState([]);
  const [totalMessages, setTotalMessages] = useState(0);
  const [topUsers, setTopUsers] = useState([]);
  const [peakHour, setPeakHour] = useState('');
  const [topicCloud, setTopicCloud] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [expandedDate, setExpandedDate] = useState(null);

  // === 1. AUTH & DATA FETCHING ===
  useEffect(() => {
    // Fun loading text cycler
    const loadInterval = setInterval(() => {
      const texts = [
        'crunching numbers...',
        'analyzing sentiment...',
        'finding top users...',
        'building topic cloud...',
        'detecting spikes...',
      ];
      setLoadingText(texts[Math.floor(Math.random() * texts.length)]);
    }, 1500);

    const fetchData = async () => {
      try {
        if (!session?.user) {
          navigate('/');
          return;
        }

        // A. Security Check
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('is_verified')
          .eq('id', session.user.id)
          .single();

        if (profileError || !profile?.is_verified) {
          alert('Access Denied: Admin privileges required.');
          navigate('/');
          return;
        }
        setAuthorized(true);

        // B. Fetch Messages (Last 30 Days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: messages, error: msgError } = await supabase
          .from('messages')
          .select('message, timestamp, user_id, username')
          .gte('timestamp', thirtyDaysAgo.toISOString())
          .order('timestamp', { ascending: true });

        if (msgError) throw msgError;

        processStats(messages || []);
      } catch (err) {
        console.error('Error loading stats:', err);
      } finally {
        clearInterval(loadInterval);
        setLoading(false);
      }
    };

    fetchData();
  }, [session, navigate]);

  // === 2. DATA PROCESSING LOGIC ===
  const processStats = (messages) => {
    setTotalMessages(messages.length);

    const daysMap = {};
    const usersMap = {};
    const hourMap = {};
    const globalWordCounts = {};
    const userSpamTracker = {};
    const activeAlerts = new Set();

    messages.forEach((msg) => {
      const dateObj = new Date(msg.timestamp);
      const dateKey = dateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      const hourKey = dateObj.getHours();
      const username = msg.username || 'Anon';
      const userId = msg.user_id || username;

      // --- A. Daily Grouping ---
      if (!daysMap[dateKey]) {
        daysMap[dateKey] = {
          date: dateKey,
          count: 0,
          users: new Set(),
          wordCounts: {},
          pos: 0,
          neg: 0,
          fullDate: dateObj,
        };
      }
      const day = daysMap[dateKey];
      day.count++;
      day.users.add(username);

      // --- B. Hour Grouping (Peak Hours) ---
      hourMap[hourKey] = (hourMap[hourKey] || 0) + 1;

      // --- C. User Grouping (Leaderboard) ---
      if (!usersMap[userId]) {
        usersMap[userId] = {
          username,
          count: 0,
          wordCounts: {},
          activeDays: new Set(),
        };
      }
      usersMap[userId].count++;
      usersMap[userId].activeDays.add(dateKey);

      // --- D. Spam Detection ---
      if (!userSpamTracker[userId]) userSpamTracker[userId] = [];
      const userTimes = userSpamTracker[userId];
      userTimes.push(dateObj.getTime());

      // Check last 5 messages for rapid fire (under 15 seconds)
      if (userTimes.length >= 5) {
        const timeDiff =
          userTimes[userTimes.length - 1] - userTimes[userTimes.length - 5];
        if (timeDiff < 15000)
          activeAlerts.add(`Spam detected by ${username} (rapid fire)`);
      }
      // Check raw volume
      if (usersMap[userId].count > 300)
        activeAlerts.add(`High volume from ${username} (>300 msgs)`);

      // --- E. Word Frequency & Sentiment ---
      if (msg.message) {
        const cleanText = msg.message
          .replace(/<[^>]*>?/gm, '')
          .toLowerCase()
          .replace(/[^\w\s]/g, '');
        const words = cleanText.split(/\s+/);

        words.forEach((w) => {
          if (w.length > 2 && !STOP_WORDS.has(w)) {
            // Daily counts
            day.wordCounts[w] = (day.wordCounts[w] || 0) + 1;
            // User counts
            usersMap[userId].wordCounts[w] =
              (usersMap[userId].wordCounts[w] || 0) + 1;
            // Global counts
            globalWordCounts[w] = (globalWordCounts[w] || 0) + 1;
          }
          // Sentiment check
          if (POSITIVE_WORDS.has(w)) day.pos++;
          if (NEGATIVE_WORDS.has(w)) day.neg++;
        });
      }
    });

    // --- Format Daily Stats ---
    const avgDailyMessages =
      messages.length / (Object.keys(daysMap).length || 1);

    let statsArray = Object.values(daysMap).map((day) => {
      let topWord = '-';
      let maxWordCount = 0;
      Object.entries(day.wordCounts).forEach(([word, count]) => {
        if (count > maxWordCount) {
          maxWordCount = count;
          topWord = word;
        }
      });

      // Sentiment calc
      const totalSentiment = day.pos + day.neg;
      const sentimentScore =
        totalSentiment > 0
          ? Math.round((day.pos / totalSentiment) * 100)
          : null;

      return {
        ...day,
        uniqueUsersList: Array.from(day.users),
        isSpike: day.count > avgDailyMessages * 1.5, // Spike Detection
        topWord: topWord === '-' ? 'N/A' : `"${topWord}"`,
        topWordCount: maxWordCount,
        sentimentScore,
      };
    });

    // --- Format Top Users ---
    const topUsersArray = Object.values(usersMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((u) => {
        let topWord = '-';
        let max = 0;
        Object.entries(u.wordCounts).forEach(([word, count]) => {
          if (count > max) {
            max = count;
            topWord = word;
          }
        });
        return { ...u, topWord };
      });

    // --- Format Peak Hour ---
    let bestHour = 0;
    let maxHourCount = 0;
    Object.entries(hourMap).forEach(([hour, count]) => {
      if (count > maxHourCount) {
        maxHourCount = count;
        bestHour = parseInt(hour);
      }
    });
    const ampm = bestHour >= 12 ? 'PM' : 'AM';
    const displayHour = bestHour % 12 || 12;

    // --- Format Topic Cloud ---
    const topWordsArray = Object.entries(globalWordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30);

    // Update States
    setStatsData(statsArray.reverse());
    setTopUsers(topUsersArray);
    setPeakHour(`${displayHour}:00 ${ampm}`);
    setTopicCloud(topWordsArray);
    setAlerts(Array.from(activeAlerts));
  };

  const maxDailyMessages = useMemo(
    () => Math.max(...statsData.map((d) => d.count), 1),
    [statsData],
  );

  if (loading)
    return (
      <div className='min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-500'>
        <i className='fa-solid fa-circle-notch fa-spin text-4xl text-blue-500 mb-4'></i>
        <p className='animate-pulse'>{loadingText}</p>
      </div>
    );

  if (!authorized) return null;

  return (
    <div className='min-h-screen bg-slate-950 text-white p-4 md:p-6 font-sans pb-24 overflow-x-hidden'>
      <div className='max-w-6xl mx-auto space-y-6'>
        {/* HEADER */}
        <div className='flex flex-wrap items-center justify-between gap-4 mb-8 border-b border-slate-800 pb-6'>
          <div className='flex items-center gap-4'>
            <button
              onClick={() => navigate('/settings')}
              className='text-slate-400 hover:text-white transition bg-slate-900 p-2 rounded-lg'
            >
              <i className='fa-solid fa-arrow-left'></i>
            </button>
            <div>
              <h1 className='text-3xl font-bold flex items-center gap-3'>
                <i className='fa-solid fa-chart-pie text-blue-500'></i>{' '}
                Analytics
              </h1>
              <p className='text-slate-400 text-sm mt-1'>
                Intelligence for the last 30 days
              </p>
            </div>
          </div>

          <div className='flex gap-3'>
            <div className='bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-right'>
              <p className='text-xs text-slate-500 uppercase font-bold'>
                Total Volume
              </p>
              <p className='text-2xl font-bold text-white'>
                {totalMessages.toLocaleString()}
              </p>
            </div>
            <div className='bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-right'>
              <p className='text-xs text-slate-500 uppercase font-bold'>
                Peak Hour
              </p>
              <p className='text-2xl font-bold text-amber-400'>{peakHour}</p>
            </div>
          </div>
        </div>

        {/* ALERTS */}
        {alerts.length > 0 && (
          <div className='bg-red-900/20 border border-red-500/50 rounded-xl p-4 flex gap-4 items-start'>
            <i className='fa-solid fa-triangle-exclamation text-red-500 text-xl mt-1'></i>
            <div>
              <h3 className='font-bold text-red-400 mb-1'>
                Security / Spam Alerts
              </h3>
              <ul className='text-sm text-red-200 list-disc list-inside'>
                {alerts.map((alert, i) => (
                  <li key={i}>{alert}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
          {/* LEFT COL: Leaderboard & Cloud */}
          <div className='md:col-span-1 space-y-6'>
            {/* LEADERBOARD */}
            <div className='bg-slate-900 border border-slate-800 rounded-xl p-5'>
              <h2 className='text-lg font-bold flex items-center gap-2 mb-4 text-amber-400'>
                <i className='fa-solid fa-fire'></i> User Heat Ranking
              </h2>
              <div className='space-y-3'>
                {topUsers.map((u, i) => (
                  <div
                    key={i}
                    className='flex items-center justify-between text-sm'
                  >
                    <div className='flex items-center gap-2 overflow-hidden'>
                      <span className='text-slate-500 w-4'>{i + 1}.</span>
                      <span className='font-bold text-slate-200 truncate max-w-[100px]'>
                        {u.username}
                      </span>
                    </div>
                    <div className='flex gap-3 text-right'>
                      <span
                        className='text-slate-500 text-xs mt-0.5'
                        title='Most used word'
                      >
                        &quot;{u.topWord}&quot;
                      </span>
                      <span className='bg-slate-800 px-2 py-0.5 rounded text-blue-400 font-mono'>
                        {u.count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* TOPIC CLOUD */}
            <div className='bg-slate-900 border border-slate-800 rounded-xl p-5'>
              <h2 className='text-lg font-bold flex items-center gap-2 mb-4 text-emerald-400'>
                <i className='fa-solid fa-cloud'></i> Topic Cloud
              </h2>
              <div className='flex flex-wrap gap-2'>
                {topicCloud.map(([word, count], i) => {
                  // Scale font size based on rank
                  const size =
                    i < 3
                      ? 'text-2xl font-bold text-white'
                      : i < 10
                        ? 'text-lg font-semibold text-slate-300'
                        : 'text-sm text-slate-500';
                  return (
                    <span
                      key={i}
                      className={`${size} hover:text-emerald-400 transition cursor-default`}
                      title={`Used ${count} times`}
                    >
                      {word}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT COL: Daily Stats Table */}
          <div className='md:col-span-2'>
            <div className='bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden'>
              <div className='p-4 border-b border-slate-800 flex justify-between items-center'>
                <h2 className='text-lg font-bold flex items-center gap-2'>
                  <i className='fa-solid fa-calendar-days text-blue-500'></i>{' '}
                  Daily Activity
                </h2>
              </div>

              <div className='p-4 space-y-3'>
                <div className='grid grid-cols-12 text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 pb-1'>
                  <div className='col-span-3 md:col-span-2'>Date</div>
                  <div className='col-span-5 md:col-span-6'>Volume</div>
                  <div className='col-span-2 text-center'>Users</div>
                  <div className='col-span-2 text-right'>Vibe</div>
                </div>

                {statsData.map((day, idx) => (
                  <React.Fragment key={idx}>
                    <div className='bg-slate-900 border border-slate-800 rounded-lg p-3 grid grid-cols-12 items-center hover:border-slate-600 transition group'>
                      {/* Date & Spikes */}
                      <div className='col-span-3 md:col-span-2 flex flex-col'>
                        <div className='flex items-center gap-1'>
                          <span className='font-bold text-white text-sm'>
                            {day.date}
                          </span>
                          {day.isSpike && (
                            <i
                              className='fa-solid fa-arrow-trend-up text-amber-500 text-xs'
                              title='Activity Spike!'
                            ></i>
                          )}
                        </div>
                        <span className='text-[10px] text-slate-500 hidden md:block'>
                          {day.fullDate.toLocaleDateString('en-US', {
                            weekday: 'short',
                          })}
                        </span>
                      </div>

                      {/* Bar Graph */}
                      <div className='col-span-5 md:col-span-6 pr-4'>
                        <div className='flex items-center gap-2 mb-1'>
                          <span className='text-xs font-bold text-blue-400'>
                            {day.count}{' '}
                            <span className='text-slate-600 font-normal text-[10px]'>
                              msgs
                            </span>
                          </span>
                        </div>
                        <div className='w-full h-2 bg-slate-800 rounded-full overflow-hidden'>
                          <div
                            className={`h-full rounded-full transition-all duration-1000 ${day.isSpike ? 'bg-amber-500' : 'bg-blue-600'}`}
                            style={{
                              width: `${(day.count / maxDailyMessages) * 100}%`,
                            }}
                          ></div>
                        </div>
                      </div>

                      {/* Clickable Users */}
                      <div className='col-span-2 flex justify-center border-l border-slate-800'>
                        <button
                          onClick={() =>
                            setExpandedDate(
                              expandedDate === day.date ? null : day.date,
                            )
                          }
                          className='flex flex-col items-center justify-center hover:bg-slate-800 w-full rounded py-1 transition'
                        >
                          <span className='text-sm font-bold text-white'>
                            {day.uniqueUsersList.length}
                          </span>
                          <span className='text-[9px] text-slate-500 uppercase flex items-center gap-1'>
                            <i
                              className={`fa-solid fa-chevron-${expandedDate === day.date ? 'up' : 'down'}`}
                            ></i>
                          </span>
                        </button>
                      </div>

                      {/* Sentiment / Vibe */}
                      <div className='col-span-2 text-right pl-2 border-l border-slate-800 flex flex-col items-end justify-center'>
                        {day.sentimentScore !== null ? (
                          <>
                            <span className='text-sm'>
                              {day.sentimentScore >= 60
                                ? '😊'
                                : day.sentimentScore <= 40
                                  ? '😡'
                                  : '😐'}
                            </span>
                            <span
                              className={`text-[10px] ${day.sentimentScore >= 60 ? 'text-green-400' : day.sentimentScore <= 40 ? 'text-red-400' : 'text-slate-400'}`}
                            >
                              {day.sentimentScore}% pos
                            </span>
                          </>
                        ) : (
                          <span className='text-xs text-slate-600'>-</span>
                        )}
                      </div>
                    </div>

                    {/* Expanded Users List */}
                    {expandedDate === day.date && (
                      <div className='col-span-12 bg-slate-950 border border-slate-800 rounded-lg p-3 mx-2 -mt-2 mb-2 shadow-inner'>
                        <h4 className='text-[10px] text-slate-500 uppercase font-bold mb-2'>
                          Unique Users Active on {day.date}
                        </h4>
                        <div className='flex flex-wrap gap-2'>
                          {day.uniqueUsersList.map((usr, uIdx) => (
                            <span
                              key={uIdx}
                              className='bg-slate-800 text-slate-300 text-xs px-2 py-1 rounded-md border border-slate-700'
                            >
                              {usr}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                ))}

                {statsData.length === 0 && (
                  <div className='text-center py-20 text-slate-500'>
                    <i className='fa-solid fa-ghost text-4xl mb-4 opacity-30'></i>
                    <p>No chat history found.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Stats;
