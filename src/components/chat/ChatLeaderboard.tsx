import { useState, useEffect, type FC } from 'react';
import { supabase } from '../../supabaseClient'; // Adjust path if needed
import type { User } from '../../utils/databaseDefinitions';

const ChatLeaderboard: FC<{
  onClose: () => void;
  blockedUsers: string[];
}> = ({ onClose, blockedUsers = [] }) => {
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [displayLimit, setDisplayLimit] = useState(10);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async (): Promise<void> => {
      setIsLoading(true);
      try {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const isoDate = oneWeekAgo.toISOString();

        // 1. Fetch messages from the last 7 days
        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select('username, avatar_url, user_id')
          .eq('is_deleted', false)
          .gte('timestamp', isoDate);

        if (messagesError) throw messagesError;

        // 2. Tally up message counts per UNIQUE USER ID (not username)
        const userCounts: {
          [user_id: string]: User & {
            count: number;
          };
        } = {};

        (messagesData || []).forEach((msg) => {
          if (!msg.user_id) return; // Safety check

          if (!userCounts[msg.user_id]) {
            userCounts[msg.user_id] = {
              user_id: msg.user_id,
              username: msg.username, // Temporary fallback
              avatar_url: msg.avatar_url, // Temporary fallback
              count: 0,
            };
          }
          userCounts[msg.user_id].count += 1;
        });

        // Convert object to array and sort by count descending
        let sortedUsers = Object.values(userCounts).sort(
          (a, b) => b.count - a.count,
        );

        // 3. Fetch the LIVE profile data (avatar, username, and email)
        const userIds = sortedUsers.map((u) => u.user_id).filter(Boolean);

        if (userIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            // Make sure 'email' or your croomsconnect column exists in 'profiles'
            .select('id, avatar_url, username, email')
            .in('id', userIds);

          if (!profilesError && profilesData) {
            // Create a map of live profile data
            const liveProfiles: {
              [pid: string]: {
                id: string;
                avatar_url: string;
                username: string;
                email: string;
              };
            } = {};
            profilesData.forEach((p) => {
              liveProfiles[p.id] = p;
            });

            // 4. Merge live data and filter out blocked users
            sortedUsers = sortedUsers
              .map((user) => {
                const profile = liveProfiles[user.user_id];
                return {
                  ...user,
                  username: profile?.username || user.username,
                  avatar_url: profile?.avatar_url || user.avatar_url,
                  email: profile?.email || '', // Pulling the @croomsconnect.local address
                };
              })
              // Filter blocked users based on their LIVE username or email
              .filter(
                (user) =>
                  !blockedUsers.includes(user.username) &&
                  !blockedUsers.includes(user.email),
              );
          }
        }

        setAllUsers(sortedUsers);
      } catch (err) {
        console.error('Leaderboard error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, [blockedUsers]);

  const displayedUsers = allUsers.slice(0, displayLimit);

  return (
    <div className='fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[10vh] sm:pt-[15vh] p-4 transition-opacity animate-in fade-in'>
      <div className='absolute inset-0' onClick={onClose}></div>

      <div className='relative w-full max-w-2xl bg-slate-900 border border-slate-700 shadow-2xl rounded-2xl overflow-hidden flex flex-col max-h-[70vh] animate-in slide-in-from-bottom-4'>
        <div className='flex items-center justify-between px-6 py-4 bg-slate-800/50 border-b border-slate-700'>
          <div className='flex items-center gap-3 text-white'>
            <div>
              <h2 className='text-lg font-bold'>Top Chatters</h2>
              <p className='text-xs text-slate-400'>
                Most active users in the last 7 days
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className='text-slate-400 hover:text-white transition-colors'
          >
            <i className='fa-solid fa-circle-xmark text-xl'></i>
          </button>
        </div>

        <div className='flex px-6 py-2 bg-slate-800/80 border-b border-slate-700/50 text-xs text-slate-400 uppercase font-bold items-center justify-between'>
          <span>Rank & User</span>
          <span>Messages</span>
        </div>

        <div className='flex-1 overflow-y-auto bg-slate-900 min-h-[100px] no-scrollbar'>
          {isLoading ? (
            <div className='flex flex-col items-center justify-center py-10 text-slate-400 gap-3'>
              <i className='fa-solid fa-circle-notch fa-spin text-2xl text-yellow-500'></i>
              <span>Calculating ranks...</span>
            </div>
          ) : displayedUsers.length > 0 ? (
            <div className='py-2'>
              {displayedUsers.map((user, index) => {
                let rankColor = 'text-slate-500';
                let rankBg = 'bg-slate-800/50';
                if (index === 0) {
                  rankColor = 'text-yellow-400';
                  rankBg = 'bg-yellow-500/10 border-yellow-500/30';
                } else if (index === 1) {
                  rankColor = 'text-slate-300';
                  rankBg = 'bg-slate-400/10 border-slate-400/30';
                } else if (index === 2) {
                  rankColor = 'text-amber-600';
                  rankBg = 'bg-amber-700/10 border-amber-700/30';
                }

                return (
                  <div
                    key={user.user_id} // Changed to use user_id as the key
                    className={`px-6 py-3 flex items-center justify-between gap-3 transition-colors border-l-2 border-transparent hover:bg-slate-800/50 ${index < 3 ? 'border-b border-slate-800/50' : ''}`}
                  >
                    <div className='flex items-center gap-4'>
                      <div
                        className={`w-8 h-8 rounded flex items-center justify-center font-black ${rankColor} ${rankBg} border`}
                      >
                        #{index + 1}
                      </div>

                      <img
                        src={
                          user.avatar_url || 'https://via.placeholder.com/40'
                        }
                        alt={user.username}
                        className='w-10 h-10 rounded-full object-cover shrink-0 border border-slate-700'
                      />
                      <div className='flex flex-col'>
                        <span className='font-bold text-slate-200'>
                          {user.username}
                        </span>
                        {/* Displaying the croomsconnect address under the name */}
                        {user.email && (
                          <span className='text-xs text-slate-500'>
                            {user.email}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className='text-right'>
                      <div className='text-lg font-bold text-blue-400'>
                        {user.count.toLocaleString()}
                      </div>
                    </div>
                  </div>
                );
              })}

              {allUsers.length > displayLimit && (
                <div className='px-6 py-6 flex justify-center border-t border-slate-800/50'>
                  <button
                    onClick={() => setDisplayLimit((prev) => prev + 10)}
                    className='px-6 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm font-bold rounded-lg transition-all active:scale-95 shadow-lg shadow-slate-900/50'
                  >
                    Load More
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className='flex flex-col items-center justify-center py-12 text-slate-500'>
              <p>No messages found for this week.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatLeaderboard;
