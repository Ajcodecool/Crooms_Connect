import { useState, type FC } from 'react';

import { useServerMonitor } from '../hooks/useServerMonitor';
import './LatencySidebarNotice.css';

const LATENCY_MESSAGE =
  'we are currently experiencing latency you may experience lag';

const LatencySidebarNotice: FC = () => {
  const { serverStatus } = useServerMonitor();
  const [dismissedForSession, setDismissedForSession] = useState(false);

  // Intentionally no useEffect setState here to avoid lint warnings.
  // If the server is no longer slow, the computed shouldShow will become false.
  // Dismiss state will only matter for the current slow period.

  const shouldShow = serverStatus === 'slow' && !dismissedForSession;
  if (!shouldShow) return null;

  return (
    <div className='latency-sidebar-notice-wrapper'>
      <div className='latency-sidebar-notice' role='status' aria-live='polite'>
        <div className='latency-sidebar-notice-icon' />
        <div>
          <div className='latency-sidebar-notice-text'>{LATENCY_MESSAGE}</div>
          <div className='latency-sidebar-notice-subtext'>
            Some actions may take longer than usual.
          </div>
        </div>
        <button
          className='latency-sidebar-notice-close'
          onClick={() => setDismissedForSession(true)}
          aria-label='Dismiss latency notice'
          title='Dismiss'
          type='button'
        >
          <i className='fa-solid fa-xmark'></i>
        </button>
      </div>
    </div>
  );
};

export default LatencySidebarNotice;
