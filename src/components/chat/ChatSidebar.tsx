import { useMemo, memo, type FC } from 'react';
import { getStorageAvatar, getDefaultAvatar } from '../../utils/chatUtils';
import BadgeList from './BadgeList';
import type { NavigateFunction } from 'react-router-dom';
import type { Profile } from '../../utils/databaseDefinitions';

// WARNING: TODO: replace with Omit<User, ...> from Supabase typess
type StrippedUser = {
  username: string;
  user_id: string;
  avatar_url?: string;
  badge_type?: string[];
  status?: string;
  in_connect_direct?: boolean | string;
};

const ChatSidebar: FC<{
  onlineUsers?:
    | StrippedUser[]
    | { [key: string]: StrippedUser }
    | { [key: string]: StrippedUser[] }; // Accommodates raw Supabase Presence state
  navigate: NavigateFunction;
  profile: Profile;
  isOpen: boolean;
  toggleSidebar: () => void;
}> = ({ onlineUsers = {}, navigate, profile, isOpen, toggleSidebar }) => {
  const userList = useMemo(() => {
    if (!onlineUsers) return [];

    let list: StrippedUser[] = [];

    if (Array.isArray(onlineUsers)) {
      list = [...onlineUsers];
    } else if (typeof onlineUsers === 'object') {
      const values = Object.values(onlineUsers);

      if (values.length > 0 && Array.isArray(values[0])) {
        list = (values as StrippedUser[][])
          .map((presenceArray) => presenceArray[0])
          .filter(Boolean);
      } else {
        list = values as StrippedUser[];
      }
    } else {
      console.warn(
        'ChatSidebar: onlineUsers is not an array or object',
        onlineUsers,
      );
      return [];
    }

    return list.sort((a, b) => {
      const nameA = (a.username || '').toLowerCase();
      const nameB = (b.username || '').toLowerCase();

      if (nameA === nameB) {
        return (a.user_id || '').localeCompare(b.user_id || '');
      }
      return nameA.localeCompare(nameB);
    });
  }, [onlineUsers]);

  return (
    <div
      className={`sidebar hidden md:flex flex-col transition-all duration-300 ease-in-out h-full bg-slate-900/95 backdrop-blur-sm ${
        isOpen
          ? 'w-72 min-w-[18rem] border-r border-white/10'
          : 'w-0 min-w-0 border-none p-0 overflow-hidden opacity-0'
      }`}
    >
      <div className='w-full md:w-72 flex flex-col h-full min-h-0'>
        {/* Header Section */}
        <div className='sidebar-header flex justify-between items-center p-4 shrink-0 border-b border-white/5'>
          <div className='flex items-center gap-3 overflow-hidden whitespace-nowrap'>
            <h2 className='font-semibold text-slate-100 tracking-wide'>
              Online
            </h2>
            <span className='text-xs font-bold bg-indigo-500/20 text-indigo-400 px-2.5 py-1 rounded-full shrink-0 border border-indigo-500/30'>
              {userList.length}
            </span>
          </div>

          <button
            onClick={toggleSidebar}
            className='w-8 h-8 flex items-center justify-center rounded-full bg-transparent text-slate-400 hover:text-white hover:bg-white/10 transition-all shrink-0'
            title='Hide Sidebar'
          >
            <i className='fa-solid fa-arrow-left-long text-sm'></i>
          </button>
        </div>

        {/* User List Section */}
        <div className='user-list flex-1 overflow-y-auto overflow-x-hidden w-full min-h-0 p-2 space-y-1'>
          {userList.length === 0 ? (
            <div className='p-6 text-center text-slate-500 text-sm flex flex-col items-center gap-2'>
              <span>Loading users...</span>
            </div>
          ) : (
            userList.map((u, i) => {
              if (!u) return null;

              const userKey = u.user_id || u.username || i;

              // Logic: Check if status is meaningful (not empty and not just "online")
              const hasValidStatus =
                u.status &&
                u.status.trim() !== '' &&
                u.status.toLowerCase() !== 'online';

              return (
                <div
                  key={userKey}
                  className='user-item group cursor-pointer hover:bg-slate-800/80 p-3 rounded-xl flex items-center gap-3 transition-all duration-200 shrink-0 border border-transparent hover:border-white/10'
                  onClick={() => navigate(`/${u.username}`)}
                >
                  {/* Avatar Wrapper */}
                  <div className='relative shrink-0'>
                    <img
                      src={u.avatar_url || getStorageAvatar(u.user_id)}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = getDefaultAvatar(u.username);
                      }}
                      alt={`${u.username}'s avatar`}
                      className='w-10 h-10 rounded-full object-cover bg-slate-800 ring-2 ring-transparent group-hover:ring-indigo-500/50 transition-all duration-300'
                    />
                    <span className='absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full'></span>
                  </div>

                  {/* User Details */}
                  <div className={`flex flex-col w-full min-w-0 ${hasValidStatus ? 'justify-start' : 'justify-center'}`}>
                    
                    {/* Badges row — separate from the name row */}
                    {!profile?.hide_badges && u.badge_type && u.badge_type.length > 0 && (
                      <div className='flex flex-wrap gap-1 w-full min-w-0 mb-0.5'>
                        <BadgeList badgeData={u.badge_type} />
                      </div>
                    )}

                    {/* Name + ConnectDirect tag */}
                    <div className='flex items-center w-full min-w-0'>
                      <span
                        className='text-sm font-semibold text-slate-200 truncate group-hover:text-indigo-300 transition-colors'
                        title={u.username || 'Unknown'}
                      >
                        {u.username || 'Unknown'}
                      </span>

                      {(u.in_connect_direct === true ||
                        u.in_connect_direct === 'true') && (
                        <span className='text-[11px] text-indigo-400/80 font-normal ml-1.5 tracking-wide whitespace-nowrap shrink-0'>
                          (ConnectDirect)
                        </span>
                      )}
                    </div>

                    {hasValidStatus && (
                      <span
                        className='text-xs text-slate-400 break-words whitespace-normal leading-snug mt-0.5 cursor-help relative group/status'
                        title={u.status}
                      >
                        {u.status}
                        <div className='hidden group-hover/status:block absolute bottom-full left-0 mb-2 px-3 py-2 bg-slate-950 text-slate-100 text-xs rounded-lg whitespace-normal max-w-xs z-50 border border-slate-700 shadow-lg'>
                          {u.status}
                          <div className='absolute top-full left-2 w-2 h-2 bg-slate-950 border-b border-r border-slate-700 transform rotate-45'></div>
                        </div>
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default memo(ChatSidebar, (prevProps, nextProps) => {
  return (
    prevProps.onlineUsers === nextProps.onlineUsers &&
    prevProps.profile === nextProps.profile &&
    prevProps.isOpen === nextProps.isOpen
  );
});
