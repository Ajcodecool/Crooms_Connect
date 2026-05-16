import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useTheme } from '../hooks/useTheme';
import type { Session } from '@supabase/supabase-js';
import './Chat.css';

// === TypeScript Interfaces ===
interface FriendsProps {
  session: Session | null;
}

export interface Profile {
  id: string;
  username: string;
  is_verified?: boolean;
  created_at?: string;
  description?: string;
  pronouns?: string;
  birthday_month?: number | null;
  birthday_day?: number | null;
  birthday_visibility?: 'public' | 'private' | 'friends';
  grad_year?: string;
  grad_year_visibility?: 'public' | 'private' | 'friends';
}

interface FriendRecord {
  id: string;
  user1_id: string;
  user2_id: string;
  status: string;
}

interface FollowRecord {
  id?: string;
  follower_id: string;
  following_id: string;
}

interface UserStats {
  friends: number;
  followers: number;
  following: number;
}

type ConnectionType = 'friends' | 'followers' | 'following' | null;

// === Modular Subcomponents ===

// 1. User List Item
interface UserListItemProps {
  user: Profile;
  onClick: () => void;
  actionButtons?: React.ReactNode;
}

const UserListItem: React.FC<UserListItemProps> = ({
  user,
  onClick,
  actionButtons,
}) => {
  const getDefaultAvatar = (name: string): string => {
    if (!name) return '/DP1.jpg';
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return `/DP${(Math.abs(hash) % 4) + 1}.jpg`;
  };

  const getAvatarUrl = (userId: string): string => {
    if (!userId) return '';
    const { data } = supabase.storage
      .from('profile-pictures')
      .getPublicUrl(`${userId}.png`);
    return data?.publicUrl || '';
  };

  const avatarSrc = getAvatarUrl(user.id);
  const fallbackSrc = getDefaultAvatar(user.username);

  return (
    <div
      onClick={onClick}
      className='flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-blue-500/50 rounded-lg cursor-pointer group transition-all duration-200'
    >
      <div className='flex items-center gap-3 min-w-0 flex-1'>
        <img
          src={avatarSrc || fallbackSrc}
          alt={user.username}
          className='w-10 h-10 rounded-full object-cover shadow-sm bg-slate-800 flex-shrink-0'
          onError={(e) => {
            if (e.currentTarget.src !== window.location.origin + fallbackSrc) {
              e.currentTarget.src = fallbackSrc;
            }
          }}
        />
        <div className='flex flex-col truncate'>
          <div className='flex items-center gap-1 truncate'>
            <span className='text-white font-medium group-hover:text-blue-400 truncate'>
              {user.username}
            </span>
            {user.is_verified && (
              <i
                className='fa-solid fa-circle-check text-blue-500 text-sm ml-1 flex-shrink-0'
                title='Verified User'
              ></i>
            )}
          </div>
          {user.pronouns && (
            <span className='text-gray-400 text-xs'>{user.pronouns}</span>
          )}
        </div>
      </div>
      {actionButtons && (
        <div
          className='flex-shrink-0 ml-2'
          onClick={(e) => e.stopPropagation()}
        >
          {actionButtons}
        </div>
      )}
    </div>
  );
};

// 2. Navigation Tabs
interface NavigationTabsProps {
  activeTab: string;
  setActiveTab: (t: string) => void;
  incomingRequestsCount: number;
}
const NavigationTabs: React.FC<NavigationTabsProps> = ({
  activeTab,
  setActiveTab,
  incomingRequestsCount,
}) => {
  const tabs = [
    { id: 'search', label: 'Find' },
    { id: 'friends', label: 'Friends' },
    { id: 'following', label: 'Following' },
    { id: 'followers', label: 'Followers' },
    { id: 'requests', label: 'Requests', badge: incomingRequestsCount },
  ];

  return (
    <div className='dashboard-card bg-black/40 border border-white/20 rounded-xl p-2 flex overflow-x-auto md:flex-wrap gap-2 custom-scrollbar shrink-0'>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`flex-1 min-w-[80px] md:min-w-0 whitespace-nowrap py-2 px-3 rounded-lg text-sm font-medium relative transition-all duration-200 ${
            activeTab === tab.id
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white/5 text-gray-300 hover:bg-white/10'
          }`}
        >
          {tab.label}
          {tab.badge ? (
            <span className='absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center shadow-sm'>
              {tab.badge}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
};

// 3. Dynamic Connections Modal
interface ConnectionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedUser: Profile | null;
  onUserSelect: (user: Profile) => void;
  type: ConnectionType;
}

const ConnectionsModal: React.FC<ConnectionsModalProps> = ({
  isOpen,
  onClose,
  selectedUser,
  onUserSelect,
  type,
}) => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && selectedUser && type) {
      const fetchConnections = async (): Promise<void> => {
        setLoading(true);
        try {
          let userIds: string[] = [];

          if (type === 'followers') {
            const { data } = await supabase
              .from('followers')
              .select('follower_id')
              .eq('following_id', selectedUser.id);
            if (data) userIds = data.map((d) => d.follower_id);
          } else if (type === 'following') {
            const { data } = await supabase
              .from('followers')
              .select('following_id')
              .eq('follower_id', selectedUser.id);
            if (data) userIds = data.map((d) => d.following_id);
          } else if (type === 'friends') {
            const { data } = await supabase
              .from('friends')
              .select('user1_id, user2_id')
              .eq('status', 'accepted')
              .or(
                `user1_id.eq.${selectedUser.id},user2_id.eq.${selectedUser.id}`,
              );
            if (data) {
              userIds = data.map((d) =>
                d.user1_id === selectedUser.id ? d.user2_id : d.user1_id,
              );
            }
          }

          if (userIds.length > 0) {
            const { data: profiles } = await supabase
              .from('profiles')
              .select(
                'id, username, is_verified, created_at, description, pronouns, birthday_month, birthday_day, birthday_visibility, grad_year, grad_year_visibility',
              )
              .in('id', userIds);
            setUsers((profiles as Profile[]) || []);
          } else {
            setUsers([]);
          }
        } catch (error) {
          console.error(`Error fetching ${type}:`, error);
        } finally {
          setLoading(false);
        }
      };
      fetchConnections();
    }
  }, [isOpen, selectedUser, type]);

  if (!isOpen || !type) return null;

  const titles = {
    friends: 'Friends',
    followers: 'Followers',
    following: 'Following',
  };

  const descriptions = {
    friends: `Friends of ${selectedUser?.username}`,
    followers: `People following ${selectedUser?.username}`,
    following: `People ${selectedUser?.username} follows`,
  };

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4'>
      <div className='bg-slate-900 border border-white/20 rounded-xl p-4 md:p-6 w-full max-w-md shadow-2xl relative flex flex-col max-h-[85vh]'>
        <button
          onClick={onClose}
          className='absolute top-3 right-4 md:top-4 md:right-4 text-gray-400 hover:text-white text-2xl md:text-xl font-bold p-2'
        >
          ✕
        </button>

        <h3 className='text-xl md:text-2xl font-bold text-white mb-1 md:mb-2 pr-8'>
          {titles[type]}
        </h3>
        <p className='text-gray-400 text-xs md:text-sm mb-4 border-b border-white/10 pb-4 pr-4'>
          {descriptions[type]}
        </p>

        {loading ? (
          <div className='flex justify-center p-8'>
            <i className='fa-solid fa-circle-notch text-4xl text-blue-500 animate-spin'></i>
          </div>
        ) : users.length === 0 ? (
          <div className='flex flex-col items-center justify-center p-8 opacity-50'>
            <p className='text-gray-400 text-center text-base md:text-lg'>
              No {type} yet.
            </p>
          </div>
        ) : (
          <div className='flex flex-col gap-2 overflow-y-auto custom-scrollbar pr-1 flex-1'>
            {users.map((u) => (
              <UserListItem
                key={u.id}
                user={u}
                onClick={() => {
                  onUserSelect(u);
                  onClose();
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// 4. Profile Card Component (Right Panel)
interface ProfileCardProps {
  selectedUser: Profile | null;
  stats: UserStats;
  isStatsLoading: boolean;
  isFriend: boolean;
  isIncomingRequest: boolean;
  isOutgoingRequest: boolean;
  isFollowing: boolean;
  onBack: () => void;
  onStatClick: (type: NonNullable<ConnectionType>) => void;
  onMessage: () => void;
  onVoiceInvite: () => void;
  onAddFriend: () => void;
  onUnfriend: () => void;
  onCancelRequest: () => void;
  onAcceptRequest: () => void;
  onDeclineRequest: () => void;
  onFollow: () => void;
  onUnfollow: () => void;
  onViewProfile: () => void;
}

const ProfileCard: React.FC<ProfileCardProps> = ({
  selectedUser,
  stats,
  isStatsLoading,
  isFriend,
  isIncomingRequest,
  isOutgoingRequest,
  isFollowing,
  onBack,
  onStatClick,
  onMessage,
  onVoiceInvite,
  onAddFriend,
  onUnfriend,
  onCancelRequest,
  onAcceptRequest,
  onDeclineRequest,
  onFollow,
  onUnfollow,
  onViewProfile,
}) => {
  if (!selectedUser) return null;

  const getDefaultAvatar = (name: string): string => {
    if (!name) return '/DP1.jpg';
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return `/DP${(Math.abs(hash) % 4) + 1}.jpg`;
  };

  const getAvatarUrl = (userId: string): string => {
    if (!userId) return '';
    const { data } = supabase.storage
      .from('profile-pictures')
      .getPublicUrl(`${userId}.png`);
    return data?.publicUrl || '';
  };

  const avatarSrc = getAvatarUrl(selectedUser.id);
  const fallbackSrc = getDefaultAvatar(selectedUser.username);

  const joinDate = selectedUser.created_at
    ? new Date(selectedUser.created_at).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Unknown';

  // Birthday logic
  const canViewBirthday =
    selectedUser.birthday_visibility === 'public' ||
    (selectedUser.birthday_visibility === 'friends' && isFriend);

  const monthNames = [
    '',
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  const birthdayStr =
    canViewBirthday && selectedUser.birthday_month && selectedUser.birthday_day
      ? `${monthNames[selectedUser.birthday_month]} ${selectedUser.birthday_day}`
      : null;

  // Grad year logic
  const canViewGradYear =
    selectedUser.grad_year_visibility === 'public' ||
    (selectedUser.grad_year_visibility === 'friends' && isFriend);

  const gradYearStr =
    canViewGradYear && selectedUser.grad_year
      ? `Class of ${selectedUser.grad_year}`
      : null;

  return (
    <div className='flex flex-col items-center w-full max-w-md mx-auto pt-8 md:pt-0'>
      {/* Mobile Back Button */}
      <button
        onClick={onBack}
        className='md:hidden absolute top-4 left-4 p-2 w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors'
      >
        <i className='fa-solid fa-arrow-left'></i>
      </button>

      <div className='relative mb-4 md:mb-6 mt-4 md:mt-0'>
        <img
          src={avatarSrc || fallbackSrc}
          alt={selectedUser.username}
          className='w-24 h-24 md:w-32 md:h-32 rounded-full object-cover border-4 border-blue-500 shadow-xl bg-slate-800'
          onError={(e) => {
            if (e.currentTarget.src !== window.location.origin + fallbackSrc) {
              e.currentTarget.src = fallbackSrc;
            }
          }}
        />
      </div>

      <div className='text-center px-4 w-full'>
        <h2 className='text-2xl md:text-4xl font-bold text-white mb-1 flex items-center justify-center gap-2 md:gap-3 break-words w-full'>
          <span className='truncate'>{selectedUser.username}</span>
          {selectedUser.is_verified && (
            <i
              className='fa-solid fa-circle-check text-blue-500 text-xl md:text-3xl flex-shrink-0'
              title='Verified User'
            ></i>
          )}
        </h2>
        {selectedUser.pronouns && (
          <p className='text-blue-400 font-medium text-sm md:text-base'>
            {selectedUser.pronouns}
          </p>
        )}

        {birthdayStr && (
          <p className='text-pink-400 font-medium text-xs md:text-sm mt-1'>
            <i className='fa-solid fa-cake-candles mr-1'></i> {birthdayStr}
          </p>
        )}

        {gradYearStr && (
          <p className='text-emerald-400 font-medium text-xs md:text-sm mt-1'>
            <i className='fa-solid fa-graduation-cap mr-1'></i> {gradYearStr}
          </p>
        )}

        <p className='text-gray-400 text-xs md:text-sm mt-1'>
          Joined {joinDate}
        </p>

        {selectedUser.description && (
          <p className='text-gray-300 text-sm md:text-base mt-4 italic bg-white/5 p-3 rounded-lg border border-white/10'>
            &quot;{selectedUser.description}&quot;
          </p>
        )}
      </div>

      <div className='flex gap-2 md:gap-6 my-4 md:my-6 bg-black/30 p-3 md:p-4 rounded-xl border border-white/10 w-full justify-around shadow-inner'>
        <div
          className='text-center cursor-pointer group px-2'
          onClick={() => onStatClick('friends')}
        >
          <p className='text-xl md:text-2xl font-bold text-white group-hover:text-blue-300 transition-colors'>
            {isStatsLoading ? '...' : stats.friends}
          </p>
          <p className='text-[10px] md:text-sm text-gray-400 uppercase tracking-widest group-hover:text-gray-300'>
            Friends
          </p>
        </div>
        <div className='w-px bg-white/10'></div>
        <div
          className='text-center cursor-pointer group px-2'
          onClick={() => onStatClick('followers')}
        >
          <p className='text-xl md:text-2xl font-bold text-white group-hover:text-blue-300 transition-colors'>
            {isStatsLoading ? '...' : stats.followers}
          </p>
          <p className='text-[10px] md:text-sm text-gray-400 uppercase tracking-widest group-hover:text-gray-300'>
            Followers
          </p>
        </div>
        <div className='w-px bg-white/10'></div>
        <div
          className='text-center cursor-pointer group px-2'
          onClick={() => onStatClick('following')}
        >
          <p className='text-xl md:text-2xl font-bold text-white group-hover:text-blue-300 transition-colors'>
            {isStatsLoading ? '...' : stats.following}
          </p>
          <p className='text-[10px] md:text-sm text-gray-400 uppercase tracking-widest group-hover:text-gray-300'>
            Following
          </p>
        </div>
      </div>

      <div className='flex flex-col sm:flex-row justify-center gap-3 w-full mt-2 md:mt-4'>
        <button
          onClick={onMessage}
          className='w-full sm:flex-1 bg-blue-600 hover:bg-blue-500 py-3 rounded-xl text-white font-bold shadow-lg transition-colors'
        >
          Message
        </button>
        {isFriend && (
          <button
            onClick={onVoiceInvite}
            className='w-full sm:flex-1 bg-purple-600 hover:bg-purple-500 py-3 rounded-xl text-white font-bold shadow-lg transition-colors'
          >
            Voice Invite
          </button>
        )}
      </div>

      <div className='flex flex-col sm:flex-row justify-center gap-3 w-full mt-3 md:mt-4'>
        {isFriend ? (
          <button
            onClick={onUnfriend}
            className='w-full sm:flex-1 bg-red-600/80 hover:bg-red-500 py-2.5 rounded-xl text-white font-semibold border border-red-500/50 transition-colors'
          >
            Unfriend
          </button>
        ) : isIncomingRequest ? (
          <div className='flex w-full sm:flex-1 gap-2'>
            <button
              onClick={onAcceptRequest}
              className='flex-1 bg-green-600 hover:bg-green-500 py-2.5 rounded-xl text-white font-semibold shadow-lg transition-colors'
            >
              Accept
            </button>
            <button
              onClick={onDeclineRequest}
              className='flex-1 bg-red-600 hover:bg-red-500 py-2.5 rounded-xl text-white font-semibold shadow-lg transition-colors'
            >
              Decline
            </button>
          </div>
        ) : isOutgoingRequest ? (
          <button
            onClick={onCancelRequest}
            className='w-full sm:flex-1 bg-gray-600 hover:bg-gray-500 py-2.5 rounded-xl text-white font-semibold transition-colors'
          >
            Cancel Request
          </button>
        ) : (
          <button
            onClick={onAddFriend}
            className='w-full sm:flex-1 bg-emerald-600 hover:bg-emerald-500 py-2.5 rounded-xl text-white font-semibold shadow-lg transition-colors'
          >
            Add Friend
          </button>
        )}

        {isFollowing ? (
          <button
            onClick={onUnfollow}
            className='w-full sm:flex-1 bg-gray-600 hover:bg-gray-500 py-2.5 rounded-xl text-white font-semibold transition-colors'
          >
            Unfollow
          </button>
        ) : (
          <button
            onClick={onFollow}
            className='w-full sm:flex-1 bg-white hover:bg-gray-200 py-2.5 rounded-xl text-black font-semibold shadow-lg transition-colors'
          >
            Follow
          </button>
        )}
      </div>

      <button
        onClick={onViewProfile}
        className='w-full bg-slate-800 hover:bg-slate-700 border border-white/10 py-3 mt-3 md:mt-4 rounded-xl text-white font-bold shadow-lg transition-colors'
      >
        View Full Profile
      </button>
    </div>
  );
};

// === Main View Component ===
const Friends: React.FC<FriendsProps> = ({ session }) => {
  const navigate = useNavigate();
  const { themeClass, themeStyle } = useTheme();
  const user = session?.user;

  // UI State
  const [activeTab, setActiveTab] = useState<string>('search');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    type: ConnectionType;
  }>({ isOpen: false, type: null });

  // Search Pagination States
  const [isSearchLoading, setIsSearchLoading] = useState<boolean>(false);
  const [searchPage, setSearchPage] = useState<number>(0);
  const [hasMoreSearch, setHasMoreSearch] = useState<boolean>(true);
  const SEARCH_LIMIT = 50;

  // Data State
  const [cachedProfiles, setCachedProfiles] = useState<Record<string, Profile>>(
    {},
  );
  const [searchResults, setSearchResults] = useState<Profile[]>([]);

  const [friendsList, setFriendsList] = useState<FriendRecord[]>([]);
  const [followersList, setFollowersList] = useState<FollowRecord[]>([]);
  const [followingList, setFollowingList] = useState<FollowRecord[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRecord[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRecord[]>([]);

  // Profile View State
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [selectedUserStats, setSelectedUserStats] = useState<UserStats>({
    friends: 0,
    followers: 0,
    following: 0,
  });
  const [isStatsLoading, setIsStatsLoading] = useState<boolean>(false);

  const fetchSocialData = useCallback(
    async (showLoader = false): Promise<void> => {
      if (!user) return;
      if (showLoader) setIsLoading(true);

      try {
        const { data: friendsData } = await supabase
          .from('friends')
          .select('*')
          .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

        const { data: followsData } = await supabase
          .from('followers')
          .select('*')
          .or(`follower_id.eq.${user.id},following_id.eq.${user.id}`);

        const reqs: FriendRecord[] = [];
        const outgoing: FriendRecord[] = [];
        const frnds: FriendRecord[] = [];
        const foling: FollowRecord[] = [];
        const folers: FollowRecord[] = [];
        const uniqueIds = new Set<string>();

        if (friendsData) {
          friendsData.forEach((f: FriendRecord) => {
            uniqueIds.add(f.user1_id);
            uniqueIds.add(f.user2_id);
            if (f.status === 'pending') {
              if (f.user2_id === user.id) reqs.push(f);
              else if (f.user1_id === user.id) outgoing.push(f);
            } else if (f.status === 'accepted') {
              frnds.push(f);
            }
          });
        }

        if (followsData) {
          followsData.forEach((f: FollowRecord) => {
            uniqueIds.add(f.follower_id);
            uniqueIds.add(f.following_id);
            if (f.follower_id === user.id) foling.push(f);
            if (f.following_id === user.id) folers.push(f);
          });
        }

        uniqueIds.delete(user.id);

        if (uniqueIds.size > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select(
              'id, username, is_verified, created_at, description, pronouns, birthday_month, birthday_day, birthday_visibility, grad_year, grad_year_visibility',
            )
            .in('id', Array.from(uniqueIds));

          if (profiles) {
            const profileMap: Record<string, Profile> = {};
            profiles.forEach((p) => {
              profileMap[p.id] = p;
            });
            setCachedProfiles((prev) => ({ ...prev, ...profileMap }));
          }
        }

        setIncomingRequests(reqs);
        setOutgoingRequests(outgoing);
        setFriendsList(frnds);
        setFollowingList(foling);
        setFollowersList(folers);
      } catch (err) {
        console.error('Error fetching social data:', err);
      } finally {
        if (showLoader) setIsLoading(false);
      }
    },
    [user],
  );

  useEffect(() => {
    fetchSocialData(true);
  }, [fetchSocialData]);

  useEffect(() => {
    setSearchPage(0);
    setHasMoreSearch(true);
  }, [searchQuery]);

  useEffect(() => {
    if (!user || activeTab !== 'search') return;

    const delayDebounce = setTimeout(async () => {
      if (searchPage === 0) setIsSearchLoading(true);
      try {
        let query = supabase
          .from('profiles')
          .select(
            'id, username, is_verified, created_at, description, pronouns, birthday_month, birthday_day, birthday_visibility, grad_year, grad_year_visibility',
          )
          .neq('id', user.id)
          .neq('is_banned', true)
          .range(
            searchPage * SEARCH_LIMIT,
            (searchPage + 1) * SEARCH_LIMIT - 1,
          );

        if (searchQuery.trim() !== '') {
          query = query.ilike('username', `%${searchQuery}%`);
        }

        const { data } = await query;
        if (data) {
          setHasMoreSearch(data.length === SEARCH_LIMIT);

          if (searchPage === 0) {
            setSearchResults(data as Profile[]);
          } else {
            setSearchResults((prev) => [...prev, ...(data as Profile[])]);
          }

          const profileMap: Record<string, Profile> = {};
          data.forEach((p) => {
            profileMap[p.id] = p;
          });
          setCachedProfiles((prev) => ({ ...prev, ...profileMap }));
        }
      } catch (err) {
        console.error('Search error', err);
      } finally {
        setIsSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, searchPage, activeTab, user]);

  const handleSelectUser = async (
    targetUser: Profile,
    showLoader = true,
  ): Promise<void> => {
    setSelectedUser(targetUser);
    if (showLoader) setIsStatsLoading(true);

    try {
      const [
        { data: friendsData },
        { data: followersData },
        { data: followingData },
      ] = await Promise.all([
        supabase
          .from('friends')
          .select('id')
          .eq('status', 'accepted')
          .or(`user1_id.eq.${targetUser.id},user2_id.eq.${targetUser.id}`),
        supabase
          .from('followers')
          .select('id')
          .eq('following_id', targetUser.id),
        supabase
          .from('followers')
          .select('id')
          .eq('follower_id', targetUser.id),
      ]);

      setSelectedUserStats({
        friends: friendsData ? friendsData.length : 0,
        followers: followersData ? followersData.length : 0,
        following: followingData ? followingData.length : 0,
      });
    } catch (err) {
      console.error('Error fetching user stats:', err);
    } finally {
      if (showLoader) setIsStatsLoading(false);
    }
  };

  const executeActionAndRefresh = async (
    actionFn: () => Promise<void>,
    targetId: string,
  ): Promise<void> => {
    await actionFn();
    await fetchSocialData(false);
    if (selectedUser?.id === targetId) {
      handleSelectUser(selectedUser, false);
    }
  };

  const sendFriendRequest = (targetId: string): Promise<void> =>
    executeActionAndRefresh(async () => {
      await supabase
        .from('friends')
        .insert({ user1_id: user?.id, user2_id: targetId, status: 'pending' });
    }, targetId);
  const cancelFriendRequest = (targetId: string): Promise<void> =>
    executeActionAndRefresh(async () => {
      await supabase
        .from('friends')
        .delete()
        .eq('user1_id', user?.id)
        .eq('user2_id', targetId)
        .eq('status', 'pending');
    }, targetId);
  const acceptRequest = (recordId: string, targetId: string): Promise<void> =>
    executeActionAndRefresh(async () => {
      await supabase
        .from('friends')
        .update({ status: 'accepted' })
        .eq('id', recordId);
    }, targetId);
  const declineRequest = (recordId: string, targetId: string): Promise<void> =>
    executeActionAndRefresh(async () => {
      await supabase.from('friends').delete().eq('id', recordId);
    }, targetId);
  const unfriendUser = (targetId: string): Promise<void> =>
    executeActionAndRefresh(async () => {
      await supabase
        .from('friends')
        .delete()
        .or(
          `and(user1_id.eq.${user?.id},user2_id.eq.${targetId}),and(user1_id.eq.${targetId},user2_id.eq.${user?.id})`,
        );
    }, targetId);
  const followUser = (targetId: string): Promise<void> =>
    executeActionAndRefresh(async () => {
      await supabase
        .from('followers')
        .insert({ follower_id: user?.id, following_id: targetId });
    }, targetId);
  const unfollowUser = (targetId: string): Promise<void> =>
    executeActionAndRefresh(async () => {
      await supabase
        .from('followers')
        .delete()
        .eq('follower_id', user?.id)
        .eq('following_id', targetId);
    }, targetId);

  const handleCardAccept = (): void => {
    if (!selectedUser) return;
    const req = incomingRequests.find((r) => r.user1_id === selectedUser.id);
    if (req) acceptRequest(req.id, selectedUser.id);
  };

  const handleCardDecline = (): void => {
    if (!selectedUser) return;
    const req = incomingRequests.find((r) => r.user1_id === selectedUser.id);
    if (req) declineRequest(req.id, selectedUser.id);
  };

  const openDM = (targetUser: Profile): void => {
    navigate('/connect-direct', { state: { openChatWith: targetUser } });
  };

  const inviteToVoice = async (targetUser: Profile): Promise<void> => {
    await supabase.from('direct_messages').insert({
      sender_id: user?.id,
      receiver_id: targetUser.id,
      message: "Hey! Let's chat in ConnectVoice. Join me in a room!",
      is_read: false,
    });
    navigate('/connect-voice');
  };

  const handleViewProfile = (): void => {
    if (selectedUser) {
      navigate(`/profile/${selectedUser.username}`);
    }
  };

  const getProfile = (id: string): Profile =>
    cachedProfiles[id] || { id, username: 'Unknown User' };
  const isFriend = (id: string): boolean =>
    friendsList.some((f) => f.user1_id === id || f.user2_id === id);
  const isIncomingRequest = (id: string): boolean =>
    incomingRequests.some((r) => r.user1_id === id);
  const isOutgoingRequest = (id: string): boolean =>
    outgoingRequests.some((r) => r.user2_id === id);
  const isFollowing = (id: string): boolean =>
    followingList.some((f) => f.following_id === id);

  return (
    <div
      className={`min-h-[100dvh] w-full flex flex-col chat-wrapper ${themeClass}`}
      style={themeStyle}
    >
      <header className='p-3 md:p-4 bg-black/40 backdrop-blur-md border-b border-white/10 flex items-center gap-4 z-10 shrink-0'>
        <button
          onClick={() => navigate('/')}
          className='px-3 md:px-4 py-1.5 md:py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm md:text-base font-semibold transition-colors'
        >
          &larr; Dashboard
        </button>
        <h1 className='text-xl md:text-2xl font-bold text-white flex items-center gap-2 md:gap-3'>
          Social Hub
        </h1>
      </header>

      <main className='flex-1 p-3 md:p-6 flex flex-col md:flex-row gap-4 md:gap-6 w-full max-w-7xl mx-auto overflow-hidden'>
        {/* Left Panel - List View */}
        <div
          className={`w-full md:w-1/3 flex-col gap-3 md:gap-4 h-full ${selectedUser ? 'hidden md:flex' : 'flex'}`}
        >
          <NavigationTabs
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            incomingRequestsCount={incomingRequests.length}
          />
          <div className='dashboard-card bg-black/40 border border-white/20 rounded-xl p-3 md:p-4 flex-1 flex flex-col overflow-hidden shadow-lg min-h-0'>
            {activeTab === 'search' && (
              <input
                type='text'
                placeholder='Search for users...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className='w-full bg-black/50 border border-white/10 text-white p-2.5 md:p-3 rounded-lg mb-3 md:mb-4 outline-none focus:border-blue-500 shadow-inner shrink-0'
              />
            )}
            <div className='flex-1 overflow-y-auto pr-1 md:pr-2 custom-scrollbar flex flex-col gap-2'>
              {isLoading ? (
                <div className='text-center text-gray-400 mt-10'>
                  <i className='fa-solid fa-circle-notch animate-spin text-2xl md:text-3xl text-blue-500 mb-2'></i>
                  <p>Loading...</p>
                </div>
              ) : (
                <>
                  {activeTab === 'search' &&
                    isSearchLoading &&
                    searchPage === 0 && (
                      <div className='text-center text-gray-400 py-4'>
                        Searching...
                      </div>
                    )}

                  {activeTab === 'search' &&
                    (!isSearchLoading || searchPage > 0) && (
                      <>
                        {searchResults.map((u) => (
                          <UserListItem
                            key={u.id}
                            user={u}
                            onClick={() => handleSelectUser(u)}
                          />
                        ))}

                        {hasMoreSearch && searchResults.length > 0 && (
                          <button
                            onClick={() => setSearchPage((p) => p + 1)}
                            className='w-full py-3 mt-2 text-sm text-blue-400 hover:bg-white/5 border border-white/10 rounded-lg font-semibold transition-colors'
                          >
                            {isSearchLoading ? 'Loading...' : 'Load More Users'}
                          </button>
                        )}

                        {!hasMoreSearch && searchResults.length > 0 && (
                          <div className='text-center text-gray-500 text-xs md:text-sm mt-4 pb-4'>
                            End of results
                          </div>
                        )}

                        {searchResults.length === 0 &&
                          !isSearchLoading &&
                          searchQuery && (
                            <div className='text-center text-gray-500 mt-8'>
                              No users found
                            </div>
                          )}
                      </>
                    )}

                  {activeTab === 'friends' &&
                    (friendsList.length === 0 ? (
                      <div className='text-center text-gray-400 mt-8'>
                        No friends yet.
                      </div>
                    ) : (
                      friendsList.map((f) => {
                        const targetId =
                          f.user1_id === user?.id ? f.user2_id : f.user1_id;
                        return (
                          <UserListItem
                            key={targetId}
                            user={getProfile(targetId)}
                            onClick={() =>
                              handleSelectUser(getProfile(targetId))
                            }
                          />
                        );
                      })
                    ))}

                  {activeTab === 'following' &&
                    (followingList.length === 0 ? (
                      <div className='text-center text-gray-400 mt-8'>
                        Not following anyone.
                      </div>
                    ) : (
                      followingList.map((f) => (
                        <UserListItem
                          key={f.following_id}
                          user={getProfile(f.following_id)}
                          onClick={() =>
                            handleSelectUser(getProfile(f.following_id))
                          }
                        />
                      ))
                    ))}

                  {activeTab === 'followers' &&
                    (followersList.length === 0 ? (
                      <div className='text-center text-gray-400 mt-8'>
                        No followers yet.
                      </div>
                    ) : (
                      followersList.map((f) => (
                        <UserListItem
                          key={f.follower_id}
                          user={getProfile(f.follower_id)}
                          onClick={() =>
                            handleSelectUser(getProfile(f.follower_id))
                          }
                        />
                      ))
                    ))}

                  {activeTab === 'requests' &&
                    incomingRequests.length === 0 && (
                      <div className='text-center text-gray-400 mt-8'>
                        No pending requests
                      </div>
                    )}

                  {activeTab === 'requests' &&
                    incomingRequests.map((req) => (
                      <UserListItem
                        key={req.id}
                        user={getProfile(req.user1_id)}
                        onClick={() =>
                          handleSelectUser(getProfile(req.user1_id))
                        }
                        actionButtons={
                          <div className='flex gap-1 md:gap-2'>
                            <button
                              onClick={() =>
                                acceptRequest(req.id, req.user1_id)
                              }
                              className='bg-green-600 hover:bg-green-500 w-7 h-7 md:w-8 md:h-8 rounded-full text-white font-bold flex items-center justify-center transition-colors text-sm md:text-base'
                            >
                              ✓
                            </button>
                            <button
                              onClick={() =>
                                declineRequest(req.id, req.user1_id)
                              }
                              className='bg-red-600 hover:bg-red-500 w-7 h-7 md:w-8 md:h-8 rounded-full text-white font-bold flex items-center justify-center transition-colors text-sm md:text-base'
                            >
                              ✕
                            </button>
                          </div>
                        }
                      />
                    ))}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - Profile View */}
        <div
          className={`w-full md:w-2/3 h-full dashboard-card bg-black/40 border border-white/20 rounded-xl p-4 md:p-8 flex-col justify-center items-center relative shadow-lg overflow-y-auto ${selectedUser ? 'flex' : 'hidden md:flex'}`}
        >
          {selectedUser ? (
            <ProfileCard
              selectedUser={selectedUser}
              stats={selectedUserStats}
              isStatsLoading={isStatsLoading}
              isFriend={isFriend(selectedUser.id)}
              isIncomingRequest={isIncomingRequest(selectedUser.id)}
              isOutgoingRequest={isOutgoingRequest(selectedUser.id)}
              isFollowing={isFollowing(selectedUser.id)}
              onBack={() => setSelectedUser(null)}
              onStatClick={(type) => setModalConfig({ isOpen: true, type })}
              onMessage={() => openDM(selectedUser)}
              onVoiceInvite={() => inviteToVoice(selectedUser)}
              onAddFriend={() => sendFriendRequest(selectedUser.id)}
              onUnfriend={() => unfriendUser(selectedUser.id)}
              onCancelRequest={() => cancelFriendRequest(selectedUser.id)}
              onAcceptRequest={handleCardAccept}
              onDeclineRequest={handleCardDecline}
              onFollow={() => followUser(selectedUser.id)}
              onUnfollow={() => unfollowUser(selectedUser.id)}
              onViewProfile={handleViewProfile}
            />
          ) : (
            <div className='text-gray-400 text-lg flex flex-col items-center justify-center h-full'>
              <i className='fa-solid fa-user-circle text-5xl md:text-6xl mb-4 opacity-50'></i>
              <p className='text-center'>Select a user to view their profile</p>
            </div>
          )}
        </div>
      </main>

      <ConnectionsModal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
        selectedUser={selectedUser}
        onUserSelect={handleSelectUser}
        type={modalConfig.type}
      />
    </div>
  );
};

export default Friends;
