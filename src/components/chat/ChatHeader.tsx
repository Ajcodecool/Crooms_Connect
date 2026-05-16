import { useState, useEffect, useCallback, type FC } from 'react';
import { useServerSchedule } from '../../hooks/useServerSchedule';
import PushNotificationButton from './PushNotificationButton'; // <-- Imported Button
import type { Session } from '@supabase/supabase-js';
import type { NavigateFunction } from 'react-router-dom';
import type { Profile } from '../../utils/databaseDefinitions';

const ChatHeader: FC<{
  session: Session;
  navigate: NavigateFunction;
  chatLocked: boolean;
  profile: Profile;
  handleTriggerFireworks: () => void;
  fireworkCooldown: boolean;
  unreadMentions?: string[];
  onJumpToMention: () => void;
  onOpenLockIn: () => void;
  onOpenSearch: () => void;
  onOpenLeaderboard: () => void;
}> = ({
  session,
  navigate,
  chatLocked,
  profile,
  handleTriggerFireworks,
  fireworkCooldown,
  unreadMentions = [],
  onJumpToMention,
  onOpenLockIn,
  onOpenSearch,
  onOpenLeaderboard,
}) => {
  // --- Timer State & Logic ---
  const { periodName, rawPeriodName, timeLeft, scheduleData, lunchType } =
    useServerSchedule(session);
  const [progress, setProgress] = useState(0);

  const calculateProgress = useCallback((): number => {
    if (!scheduleData || !rawPeriodName) return 0;

    const activeBlock = scheduleData.find((block) =>
      rawPeriodName.includes('Lunch')
        ? block.period_name.includes('Lunch')
        : block.period_name === rawPeriodName,
    );
    if (!activeBlock) return 0;

    const now = new Date();
    const getMinutes = (t: string): number =>
      parseInt(t.split(':')[0]) * 60 + parseInt(t.split(':')[1]);
    const currentMinutes =
      now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
    const start = getMinutes(activeBlock.start_time);
    const end = getMinutes(activeBlock.end_time);

    if (end <= start) return 0;
    return Math.min(
      Math.max(((currentMinutes - start) / (end - start)) * 100, 0),
      100,
    );
  }, [scheduleData, rawPeriodName]);

  useEffect(() => {
    const timer = setInterval(() => setProgress(calculateProgress()), 1000);
    return () => clearInterval(timer);
  }, [calculateProgress]);

  const currentPeriodDisplay =
    periodName === 'Lunch' && lunchType === 'B' ? 'B Lunch' : periodName;

  return (
    <>
      <div className='chat-header-ui p-2 flex justify-between items-center relative z-40 transition-colors duration-300'>
        {/* LEFT SECTION */}
        <div className='flex items-center gap-3'>
          <button
            onClick={() => navigate('/')}
            className='header-back-btn hover:opacity-80 transition-opacity'
          >
            <i className='fa-solid fa-arrow-left'></i>
          </button>
          <h1 className='font-bold text-lg tracking-wide hidden sm:flex items-center gap-2'>
            <img
              src='/favicon.ico'
              alt='Tavern'
              className='w-5 h-5 object-contain'
            />
            Tavern
          </h1>
          {chatLocked && !profile?.is_verified && (
            <div className='bg-red-900/50 border border-red-500 text-red-200 text-xs px-2 py-1 rounded animate-pulse'>
              <i className='fa-solid fa-lock'></i> LOCKED
            </div>
          )}
          {chatLocked && profile?.is_verified && (
            <div className='bg-blue-900/50 border border-blue-500 text-blue-200 text-xs px-2 py-1 rounded'>
              ADMIN BYPASS
            </div>
          )}
        </div>

        {/* CENTER SECTION - TIMER WIDGET */}
        {periodName && (
          <div className='flex-1 flex flex-col items-center justify-center mx-2 min-w-0'>
            <div className='flex flex-col sm:flex-row items-center sm:gap-2'>
              <span className='text-[10px] sm:text-xs font-bold opacity-70 uppercase tracking-wide truncate'>
                {currentPeriodDisplay}
              </span>
              <span className='text-sm sm:text-base font-mono font-bold text-blue-400'>
                {timeLeft}
              </span>
            </div>
            <div className='w-24 sm:w-32 bg-white/10 rounded-full h-1 mt-0.5 overflow-hidden border border-white/5'>
              <div
                className='bg-blue-500 h-full rounded-full transition-all duration-1000 ease-linear'
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* === UNREAD MENTIONS NOTIFICATION === */}
        {unreadMentions.length > 0 && (
          <button
            onClick={onJumpToMention}
            className='absolute left-1/2 -translate-x-1/2 top-[120%] bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg border border-blue-400 animate-bounce flex items-center gap-2 z-50 cursor-pointer transition-colors'
            title='Click to jump to your mentions'
          >
            <i className='fa-solid fa-at'></i>
            <span>
              {unreadMentions.length} New Mention
              {unreadMentions.length !== 1 ? 's' : ''}
            </span>
            <i className='fa-solid fa-arrow-down'></i>
          </button>
        )}

        {/* RIGHT SECTION - TOOL BUTTONS */}
        <div className='flex gap-2 items-center relative'>
          {/* SEARCH TRIGGER */}
          <button
            onClick={onOpenSearch}
            className='flex items-center gap-2 rounded border border-gray-600 bg-black/20 hover:bg-black/40 hover:border-blue-400 transition-colors px-2 py-1 text-gray-400 hover:text-white group'
            title='Search Messages'
          >
            <i className='fa-solid fa-magnifying-glass text-sm'></i>
            <span className='hidden lg:inline text-xs font-semibold mr-1'>
              Search
            </span>
            <span className='hidden lg:inline bg-white/10 text-[10px] px-1.5 py-0.5 rounded shadow-inner group-hover:bg-blue-500 group-hover:text-white transition-colors border border-white/5'>
              Ctrl K
            </span>
          </button>

          {/* TOP 10 LEADERBOARD */}
          <div className='hidden md:block'>
            <button
              onClick={onOpenLeaderboard}
              className='w-8 h-8 flex items-center justify-center rounded border transition-colors header-btn hover:text-yellow-400 hover:border-yellow-400'
              title='Top 10 Chatters of the Week'
            >
              <i className='fa-solid fa-trophy'></i>
            </button>
          </div>

          {/* FIREWORKS BUTTON (Admins Only) */}
          <div className='hidden md:block'>
            {profile?.is_verified && (
              <button
                onClick={handleTriggerFireworks}
                disabled={fireworkCooldown}
                className={`w-8 h-8 flex items-center justify-center rounded border transition-colors header-btn ${fireworkCooldown ? 'opacity-50 cursor-not-allowed' : ''}`}
                title='Trigger Global Fireworks'
              >
                {fireworkCooldown ? (
                  <i className='fa-solid fa-hourglass-start animate-spin'></i>
                ) : (
                  <i className='fa-solid fa-wand-magic-sparkles'></i>
                )}
              </button>
            )}
          </div>

          {/* LOCK-IN MODE */}
          <div className='hidden md:block'>
            <button
              onClick={onOpenLockIn}
              className='w-8 h-8 flex items-center justify-center rounded border transition-colors header-btn hover:text-red-400 hover:border-red-400'
              title='Lock-In Mode'
            >
              <i className='fa-solid fa-dungeon'></i>
            </button>
          </div>

          {/* STEALTH MODE */}
          <div className='hidden md:block'>
            <button
              onClick={() => navigate('/canvas')}
              className='w-8 h-8 flex items-center justify-center rounded border transition-colors header-btn hover:border-red-500 bg-white/5 overflow-hidden'
              title='Stealth Mode (Canvas)'
            >
              <img
                src='https://upload.wikimedia.org/wikipedia/commons/4/44/Canvas_logo_single_mark.png'
                alt='Canvas'
                className='w-5 h-5 object-contain opacity-80 hover:opacity-100 transition-opacity'
              />
            </button>
          </div>

          {/* LITE CHAT MODE */}
          <div className='hidden md:block'>
            <button
              onClick={() => navigate('/chat/lite')}
              className='w-8 h-8 items-center justify-center rounded border transition-colors header-btn hover:text-green-400 hover:border-green-400 flex'
              title='Lite Chat Mode (Low Data)'
            >
              <i className='fa-solid fa-feather'></i>
            </button>
          </div>

          {/* PUSH NOTIFICATIONS BELL */}
          <div className='hidden md:block'>
            <PushNotificationButton profile={profile} />
          </div>

          {/* SETTINGS GEAR */}
          <button
            onClick={() => navigate('/settings')}
            className='w-8 h-8 flex items-center justify-center rounded border transition-colors header-btn'
            title='Settings'
          >
            <i className='fa-solid fa-gear'></i>
          </button>
        </div>
      </div>
    </>
  );
};

export default ChatHeader;
