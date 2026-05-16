import { useEffect, useMemo, useState, type FC } from 'react';
import CreditsModal from './CreditsModal';
import HelpModal from './HelpModal'; // NEW (create thiis)

const CLOCK_INTERVAL_MS = 1000;

const ChatFooter: FC = () => {
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());

  const [isCreditsOpen, setIsCreditsOpen] = useState<boolean>(false);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false); // NEW

  useEffect((): (() => void) => {
    const timerId: number = window.setInterval(() => {
      setCurrentTime(new Date());
    }, CLOCK_INTERVAL_MS);

    return (): void => {
      window.clearInterval(timerId);
    };
  }, []);

  const formattedDate: string = useMemo(() => {
    return currentTime.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, [currentTime]);

  const formattedTime: string = useMemo(() => {
    return currentTime.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
    });
  }, [currentTime]);

  return (
    <>
      <footer
        className='chat-header-ui p-3 flex justify-between items-center relative z-40 transition-colors duration-300 border-t border-white/5 mt-auto shrink-0'
        role='contentinfo'
        aria-label='Chat footer'
      >
        {/* LEFT: Info + Help */}
        <div className='flex items-center gap-2'>
          {/* Info Button */}
          <button
            type='button'
            onClick={() => setIsCreditsOpen(true)}
            aria-label='About Connect Tavern'
            aria-haspopup='dialog'
            className='w-8 h-8 flex items-center justify-center rounded border transition-colors header-btn hover:text-blue-400 hover:border-blue-400 cursor-pointer'
          >
            <i className='fa-solid fa-circle-info' aria-hidden='true' />
          </button>

          {/* HELP Button (was Settings) */}
          <button
            type='button'
            onClick={() => setIsHelpOpen(true)}
            aria-label='Open help'
            aria-haspopup='dialog'
            className='w-8 h-8 flex items-center justify-center rounded border transition-colors header-btn hover:text-yellow-300 hover:border-yellow-400 cursor-pointer'
          >
            <span className='text-lg font-bold'>?</span>
          </button>
        </div>

        {/* RIGHT: Date & Time */}
        <div className='flex items-center gap-3'>
          <span className='hidden sm:block text-xs font-bold opacity-70 uppercase tracking-wide'>
            {formattedDate}
          </span>

          <time
            className='text-sm sm:text-base font-mono font-bold text-blue-400 bg-white/5 px-2 py-0.5 rounded border border-white/5 shadow-inner'
            dateTime={currentTime.toISOString()}
          >
            {formattedTime}
          </time>
        </div>
      </footer>

      {/* Modals */}
      <CreditsModal
        isOpen={isCreditsOpen}
        onClose={() => setIsCreditsOpen(false)}
      />

      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </>
  );
};

export default ChatFooter;
