import { useState, useEffect, type FC } from 'react';
import { supabase } from '../../supabaseClient';
import type { Warning } from '../../utils/databaseDefinitions';

export const BannedOverlay: FC<{ reason: string }> = ({ reason }) => {
  return (
    <div className='fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-500'>
      <div className='bg-red-950 border-2 border-red-600 rounded-xl shadow-2xl p-8 max-w-md w-full text-center relative'>
        <div className='mb-6 text-red-500'>
          <i className='fa-solid fa-gavel text-6xl'></i>
        </div>
        <h2 className='text-3xl font-bold text-white mb-2'>Access Denied</h2>
        <p className='text-red-200 text-lg mb-6'>
          You have been banned from the chat.
        </p>
        {reason && (
          <div className='bg-black/40 p-4 rounded-lg border border-red-900/50 mb-6'>
            <p className='text-xs text-red-400 uppercase font-bold mb-1'>
              Admin Message
            </p>
            <p className='text-white italic'>&quot;{reason}&quot;</p>
          </div>
        )}
        <button
          onClick={() => (window.location.href = '/')}
          className='bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-lg font-bold w-full'
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );
};

export const TimeoutOverlay: FC<{
  timeoutUntil: number;
  reason: string;
  onExpire: () => void;
}> = ({ timeoutUntil, reason, onExpire }) => {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const calculateTime = (): number => {
      const now = new Date();
      const end = new Date(timeoutUntil);
      const diff = Math.floor((end.valueOf() - now.valueOf()) / 1000);
      return diff > 0 ? diff : 0;
    };
    const initialTime = calculateTime();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTimeLeft(initialTime);

    if (initialTime <= 0) {
      onExpire();
      return;
    }

    const timer = setInterval(() => {
      const remaining = calculateTime();
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
        onExpire();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [timeoutUntil, onExpire]);

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (timeLeft <= 0) return null;

  return (
    <div className='fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300'>
      <div className='bg-white rounded-xl shadow-2xl p-8 max-w-sm w-full text-center relative border-4 border-slate-200'>
        <div className='mb-5 text-slate-700'>
          <i className='fa-solid fa-lock text-6xl animate-bounce'></i>
        </div>
        <div className='text-lg font-medium text-slate-800 mb-2 leading-snug'>
          You are in a timeout.
        </div>
        {reason && (
          <p className='text-slate-500 text-sm italic mb-4 border-b pb-4'>
            &quot;{reason}&quot;
          </p>
        )}
        <div className='text-xs font-bold text-slate-400 uppercase tracking-widest mb-1'>
          Chat Unlocks In:
        </div>
        <div className='text-5xl font-extrabold text-slate-900 font-mono tracking-tighter'>
          {formatTime(timeLeft)}
        </div>
      </div>
    </div>
  );
};

export const WarningModal: FC<{
  warnings: Warning[];
  onClose: (warningId: number) => void;
}> = ({ warnings, onClose }) => {
  const [agreed, setAgreed] = useState(false);
  if (!warnings || warnings.length === 0) return null;
  const currentWarning = warnings[0];

  return (
    <div className='fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-6 animate-in zoom-in duration-200'>
      <div className='bg-red-950 border-2 border-red-600 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl relative overflow-hidden'>
        <div className='absolute top-0 left-0 w-full h-1 bg-red-500 animate-pulse'></div>
        <i className='fa-solid fa-triangle-exclamation text-5xl text-red-500 mb-4'></i>
        <h2 className='text-2xl font-bold text-white mb-2'>Account Warning</h2>
        <div className='bg-red-900/30 border border-red-800 rounded-lg p-4 my-4'>
          <p className='text-xs text-red-400 uppercase font-bold mb-1'>
            Reason for warning:
          </p>
          <p className='text-white text-lg font-serif italic'>
            &quot;{currentWarning.message}&quot;
          </p>
        </div>
        <div className='bg-black/20 p-4 rounded-lg text-left mb-6 border border-red-900/30 hover:bg-black/30 transition-colors'>
          <label className='flex items-start gap-3 cursor-pointer group'>
            <div className='relative flex items-center mt-0.5'>
              <input
                type='checkbox'
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className='peer h-5 w-5 cursor-pointer appearance-none rounded border border-red-500 bg-red-900/20 checked:bg-red-600 transition-all'
              />
              <i className='fa-solid fa-check absolute left-1 top-0.5 text-xs text-white opacity-0 peer-checked:opacity-100 pointer-events-none'></i>
            </div>
            <span className='text-red-200 text-sm font-medium group-hover:text-white transition-colors leading-snug'>
              I agree that if I violate these rules again, my account may be
              terminated.
            </span>
          </label>
        </div>
        <button
          onClick={() => onClose(currentWarning.id)}
          disabled={!agreed}
          className={`w-full font-bold py-3 rounded-lg transition-all uppercase tracking-wider text-sm flex items-center justify-center gap-2 ${agreed ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/50' : 'bg-red-900/50 text-red-500/50 cursor-not-allowed'}`}
        >
          {agreed ? (
            <span>
              Acknowledge Warning{' '}
              <i className='fa-solid fa-arrow-right ml-1'></i>
            </span>
          ) : (
            'Read & Agree Above'
          )}
        </button>
      </div>
    </div>
  );
};

// === NEW: Lock-In Setup Modal ===
export const LockInSetupModal: FC<{
  onClose: React.MouseEventHandler<HTMLButtonElement>;
  onConfirm: (ms: number) => void;
}> = ({ onClose, onConfirm }) => {
  const [durationStr, setDurationStr] = useState('1');
  const [unit, setUnit] = useState('hours');

  const handleLock = (): void => {
    const val = parseInt(durationStr);
    if (!val || val <= 0) return alert('Please enter a valid number.');

    let multiplier = 60 * 60 * 1000; // hours
    if (unit === 'minutes') multiplier = 60 * 1000;
    if (unit === 'days') multiplier = 24 * 60 * 60 * 1000;

    const ms = val * multiplier;
    const confirmMsg = `Are you sure you want to LOCK yourself out of chat for ${val} ${unit}? You will not be able to read or send messages.`;

    if (window.confirm(confirmMsg)) {
      onConfirm(ms);
    }
  };

  return (
    <div className='fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 animate-in fade-in'>
      <div className='bg-slate-900 border border-slate-600 rounded-xl p-6 w-full max-w-sm shadow-2xl'>
        <h2 className='text-xl font-bold text-white mb-2'>
          <i className='fa-solid fa-dungeon mr-2'></i>Lock-In Mode
        </h2>
        <p className='text-slate-400 text-sm mb-4'>
          Focus on your tasks. Lock chat access for a set duration.
          <br />
          <span className='text-xs text-slate-500 mt-1 block'>
            <i className='fa-solid fa-triangle-exclamation mr-1 text-yellow-500'></i>
            Short locks (&lt; 24h) cannot be bypassed.
            <br />
            Long locks (&gt; 24h) require a 24h wait before unlocking.
          </span>
        </p>

        <div className='flex gap-2 mb-6'>
          <input
            type='number'
            min='1'
            value={durationStr}
            onChange={(e) => setDurationStr(e.target.value)}
            className='bg-slate-800 text-white border border-slate-600 rounded p-2 flex-1 outline-none focus:border-blue-500'
          />
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className='bg-slate-800 text-white border border-slate-600 rounded p-2 outline-none'
          >
            <option value='minutes'>Minutes</option>
            <option value='hours'>Hours</option>
            <option value='days'>Days</option>
          </select>
        </div>

        <div className='flex gap-3'>
          <button
            onClick={onClose}
            className='flex-1 py-2 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors'
          >
            Cancel
          </button>
          <button
            onClick={handleLock}
            className='flex-1 py-2 bg-red-700 hover:bg-red-600 text-white rounded font-bold shadow-lg transition-colors'
          >
            <i className='fa-solid fa-lock mr-2'></i>Lock In
          </button>
        </div>
      </div>
    </div>
  );
};

// === NEW: Locked Screen Overlay ===
export const LockInScreen: FC<{
  unlockTime: Date;
  startTime: Date;
  onUnlock: (lock: boolean) => void;
}> = ({ unlockTime, startTime, onUnlock }) => {
  const [timeLeft, setTimeLeft] = useState(0);
  const [password, setPassword] = useState('');
  const [showUnlock, setShowUnlock] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // New Logic State
  const [canShowPassword, setCanShowPassword] = useState(false);
  const [timeToPassword, setTimeToPassword] = useState(0);

  useEffect(() => {
    const tick = (): void => {
      const now = new Date();
      const end = new Date(unlockTime);
      // Fallback for legacy locks or missing start time: assumes short lock behavior
      const start = startTime
        ? new Date(startTime)
        : new Date(now.getTime() - 1000);

      const totalDuration = end.valueOf() - start.valueOf();
      const elapsed = now.valueOf() - start.valueOf();
      const diff = Math.floor((end.valueOf() - now.valueOf()) / 1000);

      setTimeLeft(diff > 0 ? diff : 0);
      if (diff <= 0) {
        onUnlock(true);
        return;
      } // Auto unlock

      // === STRICT RULES ===
      const oneDayMs = 24 * 60 * 60 * 1000;

      if (totalDuration < oneDayMs) {
        // Short Lock: No Password, ever.
        setCanShowPassword(false);
        setTimeToPassword(0);
      } else {
        // Long Lock
        if (elapsed >= oneDayMs) {
          // 24h passed -> Allow password
          setCanShowPassword(true);
          setTimeToPassword(0);
        } else {
          // Less than 24h passed -> Wait
          setCanShowPassword(false);
          setTimeToPassword(Math.floor((oneDayMs - elapsed) / 1000));
        }
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [unlockTime, startTime, onUnlock]);

  // Format HH:MM:SS
  const formatTime = (seconds: number): string => {
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePasswordUnlock = async (): Promise<void> => {
    setLoading(true);
    setError('');
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !user.email) throw new Error('User not found');

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: password,
      });

      if (authError) {
        setError('Incorrect password.');
      } else {
        onUnlock(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occured');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='fixed inset-0 z-[50] flex flex-col items-center justify-center bg-slate-950 p-6 text-center select-none'>
      <div className='max-w-md w-full animate-in zoom-in duration-500'>
        <i className='fa-solid fa-dungeon text-6xl text-slate-700 mb-6 animate-pulse'></i>
        <h1 className='text-4xl font-extrabold text-white mb-2 tracking-tight'>
          LOCKED IN
        </h1>
        <p className='text-slate-400 mb-8'>You are in Focus Mode.</p>

        <div className='bg-slate-900 rounded-xl border border-slate-800 p-8 shadow-2xl mb-8'>
          <div className='text-xs text-slate-500 uppercase tracking-widest font-bold mb-2'>
            Time Remaining
          </div>
          <div className='text-5xl font-mono text-blue-400 font-bold tracking-tighter shadow-blue-500/20 drop-shadow-lg'>
            {formatTime(timeLeft)}
          </div>
        </div>

        {/* Password Unlock Section */}
        {!showUnlock ? (
          canShowPassword ? (
            <button
              onClick={() => setShowUnlock(true)}
              className='text-slate-600 hover:text-slate-400 text-sm underline transition-colors'
            >
              Emergency Unlock
            </button>
          ) : (
            <div className='text-xs text-slate-600 italic'>
              {timeToPassword > 0 ? (
                <span>
                  Early unlock available in {formatTime(timeToPassword)}
                </span>
              ) : (
                <span>Strict Lock: No early exit allowed.</span>
              )}
            </div>
          )
        ) : (
          <div className='animate-in slide-in-from-bottom-2 fade-in'>
            <div className='bg-slate-900/50 border border-slate-700 rounded-lg p-4'>
              <p className='text-sm text-slate-300 mb-3'>
                To unlock early, please verify your identity.
              </p>
              <input
                type='password'
                placeholder='Enter your password'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className='w-full bg-black/30 border border-slate-600 rounded p-2 text-white mb-2 outline-none focus:border-blue-500'
              />
              {error && (
                <div className='text-red-400 text-xs mb-2'>{error}</div>
              )}
              <div className='flex gap-2'>
                <button
                  onClick={() => setShowUnlock(false)}
                  className='flex-1 py-2 bg-slate-800 text-slate-400 hover:bg-slate-700 rounded text-sm'
                >
                  Cancel
                </button>
                <button
                  onClick={handlePasswordUnlock}
                  disabled={loading || !password}
                  className='flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded text-sm disabled:opacity-50'
                >
                  {loading ? (
                    <i className='fa-solid fa-spinner fa-spin'></i>
                  ) : (
                    'Unlock'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
