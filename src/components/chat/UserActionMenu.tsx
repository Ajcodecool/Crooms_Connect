import {
  useState,
  useEffect,
  useRef,
  type FC,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { supabase } from '../../supabaseClient';
import { useTheme } from '../../hooks/useTheme';

type StrippedUser = {
  username: string;
  user_id: string;
  avatar_url: string;
  badge_type: string[];
  status: string;
  in_connect_direct?: boolean;
};

interface UserActionMenuProps {
  targetUser: StrippedUser;
  currentUserId?: string; // Made optional in case profile isn't fully loaded
  onClose: () => void;
  onMuteToggle?: (userId: string, isMuted: boolean) => void;
}

const UserActionMenu: FC<UserActionMenuProps> = ({
  targetUser,
  currentUserId,
  onClose,
  onMuteToggle,
}) => {
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const menuRef = useRef<HTMLDivElement>(null);
  const { themeClass, themeStyle } = useTheme();

  // Check mute status on server mount
  useEffect((): void => {
    // FIX 1: Added : Promise<void> return type
    const checkServerMute = async (): Promise<void> => {
      if (!currentUserId || !targetUser.user_id) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_mutes')
          .select('id')
          .eq('muter_id', currentUserId)
          .eq('muted_id', targetUser.user_id)
          .maybeSingle();

        if (error) throw error;
        setIsMuted(!!data);
      } catch (err) {
        console.error('Error fetching mute status:', err);
      } finally {
        setIsLoading(false);
      }
    };

    checkServerMute();
  }, [currentUserId, targetUser.user_id]);

  // Close menu on outside click
  useEffect((): (() => void) => {
    const handleClickOutside = (e: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    // Explicitly return a void function for cleanup
    return (): void =>
      document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // FIX 2: Added : Promise<void> return type
  const handleToggleMute = async (e: ReactMouseEvent): Promise<void> => {
    e.stopPropagation();
    if (isLoading || !currentUserId) return;

    setIsLoading(true);
    try {
      if (isMuted) {
        // Unmute: Delete from DB
        const { error } = await supabase
          .from('user_mutes')
          .delete()
          .eq('muter_id', currentUserId)
          .eq('muted_id', targetUser.user_id);

        if (error) throw error;
        setIsMuted(false);
      } else {
        // Mute: Insert into DB
        const { error } = await supabase
          .from('user_mutes')
          .insert([{ muter_id: currentUserId, muted_id: targetUser.user_id }]);

        if (error) throw error;
        setIsMuted(true);
      }

      // Notify other components (like the main chat feed) to update their local blocklists
      window.dispatchEvent(new CustomEvent('muteStatusChanged'));

      if (onMuteToggle) {
        onMuteToggle(targetUser.user_id, !isMuted);
      }
    } catch (err) {
      console.error('Error toggling mute status', err);
      alert('Failed to update mute status.');
    } finally {
      setIsLoading(false);
      onClose();
    }
  };

  return (
    <div
      ref={menuRef}
      className={`absolute left-full top-0 ml-2 z-[100] w-40 border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-fade-in-down backdrop-blur-md ${themeClass}`}
      style={{ animationDuration: '0.15s', ...themeStyle }}
      // Explicitly typed the inline onClick handler
      onClick={(e: ReactMouseEvent): void => e.stopPropagation()}
    >
      <div className='px-3 py-2 border-b border-white/10 bg-black/20'>
        <span className='text-xs font-bold text-slate-300 uppercase tracking-wider'>
          User Actions
        </span>
      </div>

      <div className='p-1.5 space-y-0.5 bg-black/40'>
        <button
          onClick={handleToggleMute}
          disabled={isLoading}
          className='w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
          title={isMuted ? 'Unmute User' : 'Mute User'}
        >
          {isLoading ? (
            <i className='fa-solid fa-spinner fa-spin w-4 text-center'></i>
          ) : isMuted ? (
            <i className='fa-solid fa-volume-high w-4 text-center'></i>
          ) : (
            <i className='fa-solid fa-volume-xmark w-4 text-center'></i>
          )}
          {isLoading ? 'Updating...' : isMuted ? 'Unmute' : 'Mute'}
        </button>
      </div>
    </div>
  );
};

export default UserActionMenu;
