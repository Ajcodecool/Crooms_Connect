import { useState, useEffect, useRef, type FC } from 'react';
import { supabase } from '../../supabaseClient';
import {
  SPECIAL_FRESHMAN_EMAILS,
  SENIOR_DEV_EMAILS,
} from '../../utils/adminConstants';
import type { Profile } from '../../utils/databaseDefinitions';
import type { Session } from '@supabase/supabase-js';

type StrippedUser = {
  username: string;
  user_id: string;
  avatar_url: string;
  badge_type: string[];
  status: string;
  in_connect_direct?: boolean;
};

const getUserRank = (email?: string | null, isVerified?: boolean): number => {
  if (!email) return 6;
  if (SPECIAL_FRESHMAN_EMAILS.includes(email)) return 1;
  if (SENIOR_DEV_EMAILS.includes(email)) return 3;
  if (isVerified === true) return 5;
  return 6;
};

const isAdmin = (profile: Profile | null): boolean => {
  if (!profile) return false;

  // If your DB uses 'is_verified' for regular email verification instead of mod status,
  // remove the line below to prevent regular users from seeing this menu.
  if (profile.is_verified === true) return true;

  const email = profile.email;
  if (!email) return false;
  return (
    SPECIAL_FRESHMAN_EMAILS.includes(email) || SENIOR_DEV_EMAILS.includes(email)
  );
};

interface UserModMenuProps {
  targetUser: StrippedUser;
  currentProfile: Profile | null;
  session: Session | null;
  onClose: () => void;
}

const UserModMenu: FC<UserModMenuProps> = ({
  targetUser,
  currentProfile,
  session,
  onClose,
}) => {
  const [targetProfile, setTargetProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fetch target user's full profile
  useEffect(() => {
    const fetchProfile = async (): Promise<void> => {
      if (!targetUser.user_id) return;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', targetUser.user_id)
          .single();
        if (error) throw error;
        setTargetProfile(data as Profile);
      } catch (err) {
        console.error('Error fetching target profile:', err);
      }
    };
    fetchProfile();
  }, [targetUser.user_id]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // STRICT GUARD: If current user is not a mod/admin, render nothing immediately.
  if (!isAdmin(currentProfile)) return null;

  const currentRank = getUserRank(
    currentProfile?.email,
    currentProfile?.is_verified,
  );
  const targetRank = getUserRank(
    targetProfile?.email,
    targetProfile?.is_verified,
  );

  const canModify =
    currentRank === 1 ||
    currentRank === 2 ||
    targetRank > currentRank ||
    (currentRank === 3 && targetRank === 1);

  const logAction = async (
    action: string,
    details: string,
    targetUserId: string,
  ): Promise<void> => {
    if (!session?.user?.id) return;
    try {
      await supabase.from('mod_logs').insert([
        {
          admin_id: session.user.id,
          action,
          target_user_id: targetUserId,
          details,
        },
      ]);
    } catch (err) {
      console.error('Failed to log action:', err);
    }
  };

  const handleWarn = async (): Promise<void> => {
    if (!canModify) {
      alert('Action denied: Cannot modify users of equal or higher tier.');
      return;
    }
    const message = window.prompt(
      `Enter warning message for ${targetUser.username}:`,
    );
    if (!message || !message.trim() || !targetUser.user_id) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('user_warnings').insert([
        {
          user_id: targetUser.user_id,
          message: message.trim(),
          created_by: session?.user?.id,
        },
      ]);
      if (error) throw error;

      await logAction(
        'warn',
        `Warned ${targetUser.username}: ${message.trim()}`,
        targetUser.user_id,
      );
      alert(`Warning sent to ${targetUser.username}.`);
    } catch (err) {
      alert(
        'Failed to warn user: ' +
          (err instanceof Error ? err.message : 'unknown'),
      );
    } finally {
      setLoading(false);
      onClose();
    }
  };

  const handleTimeout = async (): Promise<void> => {
    if (!canModify) {
      alert('Action denied: Cannot modify users of equal or higher tier.');
      return;
    }
    const durationStr = window.prompt(
      `Enter timeout duration in minutes for ${targetUser.username}:\n(Quick options: 15, 60, 1440)`,
    );
    if (!durationStr || !targetUser.user_id) return;

    const minutes = parseInt(durationStr);
    if (isNaN(minutes) || minutes <= 0) {
      alert('Invalid duration.');
      return;
    }

    const reason = window.prompt('Enter timeout reason (optional):') || '';

    setLoading(true);
    try {
      const timeoutDate = new Date(Date.now() + minutes * 60000).toISOString();
      const { error } = await supabase
        .from('profiles')
        .update({
          chat_timeout_until: timeoutDate,
          ban_reason: reason || 'Violation of community guidelines',
        })
        .eq('id', targetUser.user_id);
      if (error) throw error;

      await logAction(
        'timeout',
        `Timed out ${targetUser.username} for ${minutes} minute${minutes !== 1 ? 's' : ''}${reason ? ': ' + reason : ''}`,
        targetUser.user_id,
      );
      alert(
        `${targetUser.username} has been timed out for ${minutes} minute${minutes !== 1 ? 's' : ''}.`,
      );
    } catch (err) {
      alert(
        'Failed to timeout user: ' +
          (err instanceof Error ? err.message : 'unknown'),
      );
    } finally {
      setLoading(false);
      onClose();
    }
  };

  const handleRemoveTimeout = async (): Promise<void> => {
    if (!canModify) {
      alert('Action denied: Cannot modify users of equal or higher tier.');
      return;
    }
    if (!window.confirm(`Remove timeout from ${targetUser.username}?`)) return;
    if (!targetUser.user_id) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ chat_timeout_until: null, ban_reason: null })
        .eq('id', targetUser.user_id);
      if (error) throw error;

      await logAction(
        'remove_timeout',
        `Removed timeout for ${targetUser.username}`,
        targetUser.user_id,
      );
      alert(`Timeout removed from ${targetUser.username}.`);
    } catch (err) {
      alert(
        'Failed to remove timeout: ' +
          (err instanceof Error ? err.message : 'unknown'),
      );
    } finally {
      setLoading(false);
      onClose();
    }
  };

  const handleBan = async (): Promise<void> => {
    if (!canModify) {
      alert('Action denied: Cannot modify users of equal or higher tier.');
      return;
    }
    const reason = window.prompt(
      `Enter ban reason for ${targetUser.username}:`,
    );
    if (!reason || !reason.trim() || !targetUser.user_id) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_banned: true, ban_reason: reason.trim() })
        .eq('id', targetUser.user_id);
      if (error) throw error;

      await logAction(
        'ban',
        `Banned ${targetUser.username}: ${reason.trim()}`,
        targetUser.user_id,
      );
      alert(`${targetUser.username} has been banned.`);
    } catch (err) {
      alert(
        'Failed to ban user: ' +
          (err instanceof Error ? err.message : 'unknown'),
      );
    } finally {
      setLoading(false);
      onClose();
    }
  };

  const handleUnban = async (): Promise<void> => {
    if (!canModify) {
      alert('Action denied: Cannot modify users of equal or higher tier.');
      return;
    }
    if (!window.confirm(`Unban ${targetUser.username}?`)) return;
    if (!targetUser.user_id) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_banned: false, ban_reason: null })
        .eq('id', targetUser.user_id);
      if (error) throw error;

      await logAction(
        'unban',
        `Unbanned ${targetUser.username}`,
        targetUser.user_id,
      );
      alert(`${targetUser.username} has been unbanned.`);
    } catch (err) {
      alert(
        'Failed to unban user: ' +
          (err instanceof Error ? err.message : 'unknown'),
      );
    } finally {
      setLoading(false);
      onClose();
    }
  };

  const isBanned = targetProfile?.is_banned;
  const isTimedOut =
    targetProfile?.chat_timeout_until &&
    new Date(targetProfile.chat_timeout_until) > new Date();

  return (
    <div
      ref={menuRef}
      className='absolute left-full top-0 ml-2 z-[9999] w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-fade-in-down'
      style={{ animationDuration: '0.15s' }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className='px-3 py-2 border-b border-slate-700 bg-slate-950'>
        <span className='text-xs font-bold text-slate-300 uppercase tracking-wider'>
          Mod Actions
        </span>
      </div>

      <div className='p-1.5 space-y-0.5 bg-slate-900'>
        <button
          onClick={handleWarn}
          disabled={loading || !canModify}
          className='w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
          title='Warn User'
        >
          <i className='fa-solid fa-triangle-exclamation w-4 text-center'></i>
          Warn
        </button>

        {!isTimedOut ? (
          <button
            onClick={handleTimeout}
            disabled={loading || !canModify}
            className='w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
            title='Timeout User'
          >
            <i className='fa-solid fa-clock w-4 text-center'></i>
            Timeout
          </button>
        ) : (
          <button
            onClick={handleRemoveTimeout}
            disabled={loading || !canModify}
            className='w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
            title='Remove Timeout'
          >
            <i className='fa-solid fa-clock-rotate-left w-4 text-center'></i>
            Remove Timeout
          </button>
        )}

        {!isBanned ? (
          <button
            onClick={handleBan}
            disabled={loading || !canModify}
            className='w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
            title='Ban User'
          >
            <i className='fa-solid fa-gavel w-4 text-center'></i>
            Ban
          </button>
        ) : (
          <button
            onClick={handleUnban}
            disabled={loading || !canModify}
            className='w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
            title='Unban User'
          >
            <i className='fa-solid fa-unlock w-4 text-center'></i>
            Unban
          </button>
        )}
      </div>

      {!canModify && (
        <div className='px-3 py-2 border-t border-slate-700 bg-slate-950'>
          <span className='text-[10px] text-slate-400 italic'>
            Cannot modify equal or higher tier user.
          </span>
        </div>
      )}
    </div>
  );
};

export default UserModMenu;
