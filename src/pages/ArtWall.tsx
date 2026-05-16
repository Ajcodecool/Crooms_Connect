import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import type { Session } from '@supabase/supabase-js';

import type {
  ArtPost,
  Profile,
  ArtFavorite,
} from '../components/artwall/types';
import ArtCard from '../components/artwall/ArtCard';
import UploadArtModal from '../components/artwall/UploadArtModal';
import ArtDetailModal from '../components/artwall/ArtDetailModal';
import LikersModal from '../components/artwall/LikersModal';

// Import local asssets
import bgImg from '../assets/artwall/background.jpg';
import paperImg from '../assets/artwall/paper.jpg';
import tackImg from '../assets/artwall/tack.png';

interface ArtWallProps {
  session: Session | null;
}

const cutesyFont =
  "'Nunito', 'Varela Round', 'Arial Rounded MT Bold', 'Comic Sans MS', sans-serif";

const ArtWall: React.FC<ArtWallProps> = ({ session }) => {
  const [artworks, setArtworks] = useState<ArtPost[]>([]);
  const [pendingArtworks, setPendingArtworks] = useState<ArtPost[]>([]);
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(
    null,
  );

  const [followingList, setFollowingList] = useState<string[]>([]);

  const [selectedArt, setSelectedArt] = useState<ArtPost | null>(null);
  const [likersList, setLikersList] = useState<ArtFavorite[] | null>(null); // For the Likers Modal

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [viewingPending, setViewingPending] = useState(false);

  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchFollowingList = useCallback(
    async (isMounted: boolean = true) => {
      if (!session?.user?.id) return;
      try {
        const { data } = await supabase
          .from('followers')
          .select('following_id')
          .eq('follower_id', session.user.id);

        if (data && isMounted) {
          setFollowingList(data.map((d) => d.following_id));
        }
      } catch (err) {
        console.error('Error fetching following list:', err);
      }
    },
    [session],
  );

  useEffect(() => {
    let isMounted = true;

    const initializeGallery = async (): Promise<void> => {
      setLoading(true);
      setFetchError(null);

      try {
        // Fetch public approved art FIRST so it loads even for guests
        // UPDATED: Now queries for the profiles attached to the favorites array!
        const { data: approvedData, error: approvedError } = await supabase
          .from('art_posts')
          .select(
            '*, profiles!art_posts_user_id_fkey(id, username, is_verified), art_favorites(user_id, profiles(id, username))',
          )
          .eq('status', 'approved')
          .order('created_at', { ascending: false });

        if (approvedError) {
          console.error(
            'Supabase Error (Favorites Join Failed):',
            approvedError,
          );

          // FALLBACK
          console.warn(
            'Attempting fallback fetch without art_favorites profiles...',
          );
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('art_posts')
            .select(
              '*, profiles!art_posts_user_id_fkey(id, username, is_verified)',
            )
            .eq('status', 'approved')
            .order('created_at', { ascending: false });

          if (fallbackError) throw fallbackError;
          if (isMounted) setArtworks(fallbackData as unknown as ArtPost[]);
        } else if (approvedData && isMounted) {
          setArtworks(approvedData as unknown as ArtPost[]);
        }

        // ONLY fetch user-specific data if a session exists
        if (session?.user?.id) {
          await fetchFollowingList(isMounted);

          const { data: profileData } = await supabase
            .from('profiles')
            .select('id, username, is_verified')
            .eq('id', session.user.id)
            .single();

          if (profileData && isMounted) {
            setCurrentUserProfile(profileData as Profile);

            // Fetch pending art if the user is verified (admin/mod)
            if (profileData.is_verified) {
              const { data: pendingData, error: pendingError } = await supabase
                .from('art_posts')
                .select(
                  '*, profiles!art_posts_user_id_fkey(id, username, is_verified), art_favorites(user_id, profiles(id, username))',
                )
                .eq('status', 'pending')
                .order('created_at', { ascending: true });

              if (pendingError) {
                const { data: fallbackPending } = await supabase
                  .from('art_posts')
                  .select(
                    '*, profiles!art_posts_user_id_fkey(id, username, is_verified)',
                  )
                  .eq('status', 'pending')
                  .order('created_at', { ascending: true });

                if (fallbackPending && isMounted)
                  setPendingArtworks(fallbackPending as unknown as ArtPost[]);
              } else if (pendingData && isMounted) {
                setPendingArtworks(pendingData as unknown as ArtPost[]);
              }
            }
          }
        }
      } catch (err: unknown) {
        console.error('Critical Gallery Error:', err);
        let errorMessage = 'Could not load the art board.';

        if (typeof err === 'string') {
          errorMessage = err;
        } else if (err instanceof Error) {
          errorMessage = err.message;
        } else if (err && typeof err === 'object') {
          const supaErr = err as { message?: string; hint?: string };
          errorMessage = supaErr.message || supaErr.hint || errorMessage;
        }

        if (isMounted) setFetchError(errorMessage);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initializeGallery();
    return () => {
      isMounted = false;
    };
  }, [session, fetchFollowingList]);

  const reloadGallery = async (): Promise<void> => {
    const { data: approvedData, error } = await supabase
      .from('art_posts')
      .select(
        '*, profiles!art_posts_user_id_fkey(id, username, is_verified), art_favorites(user_id, profiles(id, username))',
      )
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (error) {
      const { data: fallbackData } = await supabase
        .from('art_posts')
        .select('*, profiles!art_posts_user_id_fkey(id, username, is_verified)')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });
      if (fallbackData) setArtworks(fallbackData as unknown as ArtPost[]);
    } else if (approvedData) {
      setArtworks(approvedData as unknown as ArtPost[]);
    }

    if (currentUserProfile?.is_verified) {
      const { data: pendingData } = await supabase
        .from('art_posts')
        .select(
          '*, profiles!art_posts_user_id_fkey(id, username, is_verified), art_favorites(user_id, profiles(id, username))',
        )
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (pendingData) {
        setPendingArtworks(pendingData as unknown as ArtPost[]);
      }
    }
  };

  const handleModeration = async (
    id: string,
    action: 'approved' | 'rejected' | 'deleted',
  ): Promise<void> => {
    // When a mod approves art, we may need to award the "approved artist" badge.
    if (action === 'deleted') {
      await supabase.from('art_posts').delete().eq('id', id);
      setSelectedArt(null);
      await reloadGallery();
      return;
    }

    // Capture the author id before/after update so we can count their approved artworks.
    let authorId: string | null = null;
    try {
      const { data: existing } = await supabase
        .from('art_posts')
        .select('user_id')
        .eq('id', id)
        .single();
      authorId = existing?.user_id ?? null;
    } catch {
      authorId = null;
    }

    await supabase.from('art_posts').update({ status: action }).eq('id', id);

    if (action === 'approved' && authorId) {
      const { count: approvedCount } = await supabase
        .from('art_posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', authorId)
        .eq('status', 'approved');

      const badgeId = 'approved_artist';

      // Award once user hits 6 approved artworks.
      if ((approvedCount || 0) >= 6) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('selected_badge')
          .eq('id', authorId)
          .single();

        const current = profile?.selected_badge as unknown as unknown;
        // selected_badge is stored as an array-like value.
        let selectedBadges: string[] = [];
        if (Array.isArray(current)) selectedBadges = current.map(String);
        else if (typeof current === 'string') {
          const cleaned = current.trim();
          if (cleaned.startsWith('[')) {
            try {
              selectedBadges = JSON.parse(cleaned).map(String);
            } catch {
              selectedBadges = [];
            }
          } else if (cleaned.length) selectedBadges = [cleaned];
        }

        if (
          !selectedBadges.includes(badgeId) &&
          !selectedBadges.includes(`disabled_${badgeId}`)
        ) {
          const next = [...selectedBadges, badgeId];
          await supabase
            .from('profiles')
            .update({ selected_badge: next })
            .eq('id', authorId);
        }
      }
    }

    setSelectedArt(null);
    await reloadGallery();
  };

  const handleFollow = async (targetUserId: string): Promise<void> => {
    if (!session) return;
    const { error } = await supabase.from('followers').insert({
      follower_id: session.user.id,
      following_id: targetUserId,
    });

    if (!error) {
      setFollowingList((prev) => [...prev, targetUserId]);
    } else {
      console.error('Follow error:', error);
    }
  };

  const handleUnfollow = async (targetUserId: string): Promise<void> => {
    if (!session) return;
    const { error } = await supabase
      .from('followers')
      .delete()
      .eq('follower_id', session.user.id)
      .eq('following_id', targetUserId);

    if (!error) {
      setFollowingList((prev) => prev.filter((id) => id !== targetUserId));
    } else {
      console.error('Unfollow error:', error);
    }
  };

  const isFollowing = (userId: string | undefined): boolean => {
    if (!userId) return false;
    return followingList.includes(userId);
  };

  const activeGallery = viewingPending ? pendingArtworks : artworks;

  return (
    <div
      className='fixed inset-0 pt-[40px] w-full flex flex-col overflow-hidden p-4 md:p-8 shadow-[inset_0_0_100px_rgba(0,0,0,0.6)] z-0'
      style={{
        backgroundImage: `url(${bgImg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <header
        className='relative w-full max-w-4xl mx-auto shadow-[0_4px_12px_rgba(0,0,0,0.2)] mb-10 transform -rotate-1 border-2 border-[#4a3b32] shrink-0 z-10'
        style={{ backgroundImage: `url(${paperImg})`, backgroundSize: 'cover' }}
      >
        <div className='w-full h-full bg-[#faf5f0]/85 backdrop-blur-[2px] p-5 md:px-10 flex flex-col md:flex-row justify-between items-center gap-4'>
          <div className='absolute -top-4 left-4 w-8 h-8 z-10 drop-shadow-md'>
            <img
              src={tackImg}
              alt='pin'
              className='w-full h-full object-contain'
            />
          </div>
          <div className='absolute -top-4 right-4 w-8 h-8 z-10 drop-shadow-md hidden md:block'>
            <img
              src={tackImg}
              alt='pin'
              className='w-full h-full object-contain'
            />
          </div>

          {/* Left Side: Back Button + Title */}
          <div className='flex items-center gap-4'>
            <a
              href='/'
              className='px-3 py-1.5 border-2 border-[#4a3b32] text-[#4a3b32] hover:bg-[#4a3b32] hover:text-[#fdf8f5] transition-colors shadow-[0_2px_5px_rgba(0,0,0,0.1)] font-bold text-[14px]'
              style={{ fontFamily: cutesyFont }}
            >
              &larr; Dashboard
            </a>
            <h1
              className='text-[28px] font-bold text-[#4a3b32] uppercase tracking-wider hidden sm:block'
              style={{ fontFamily: cutesyFont }}
            >
              Art Board
            </h1>
          </div>

          {/* Right Side: Action Buttons */}
          <div className='flex gap-4 items-center'>
            {currentUserProfile?.is_verified && (
              <button
                onClick={() => setViewingPending(!viewingPending)}
                className='px-2 py-1 border-b-2 font-bold text-[#4a3b32] text-[14px]'
                style={{
                  fontFamily: cutesyFont,
                  borderColor: viewingPending ? '#4a3b32' : 'transparent',
                }}
              >
                Review ({pendingArtworks.length})
              </button>
            )}

            <button
              onClick={() => {
                if (!session) return alert('Please log in to pin art!');
                setIsUploadModalOpen(true);
              }}
              className='px-6 py-3 border-2 border-[#4a3b32] bg-[#4a3b32] text-[#fdf8f5] shadow-[0_4px_10px_rgba(0,0,0,0.1)] font-bold text-[14px]'
              style={{ fontFamily: cutesyFont }}
            >
              + Pin Art
            </button>
          </div>
        </div>
      </header>

      <main className='flex-1 overflow-y-auto pr-2 pb-12 custom-scrollbar z-10'>
        <div className='max-w-4xl mx-auto mb-6'>
          <details className='bg-white/40 border-2 border-[#4a3b32] rounded-lg shadow-sm'>
            <summary
              className='cursor-pointer px-4 py-3 font-bold text-[#4a3b32]'
              style={{ fontFamily: cutesyFont }}
            >
              Art Rules (please read)
            </summary>
            <div
              className='px-4 pb-4 pt-0 text-[#4a3b32]'
              style={{ fontFamily: cutesyFont }}
            >
              <ul className='list-disc ml-5 mt-2 space-y-1 text-[13px] font-bold'>
                <li>Post credit: don’t claim other people’s work as yours.</li>
                <li>Keep it school-appropriate and non-hateful.</li>
                <li>No harassment, doxxing, or graphic content.</li>
                <li>Uploads are reviewed—your pin will show after approval.</li>
                <li>
                  Don’t post anything you wouldn’t want your parents
                  seeing—cmon, guys, don’t be dumb.
                </li>
              </ul>
              <p className='text-[12px] opacity-70 mt-3'>
                Moderators can reject or remove posts that break the rules.
              </p>
            </div>
          </details>
        </div>

        {loading ? (
          <div className='flex h-full items-center justify-center'>
            <div
              className='relative px-8 py-5 shadow-lg transform rotate-2 border-2 border-[#4a3b32]'
              style={{
                backgroundImage: `url(${paperImg})`,
                backgroundSize: 'cover',
              }}
            >
              <div className='absolute inset-0 bg-[#faf5f0]/85 backdrop-blur-[1px]'></div>
              <div className='absolute -top-4 left-1/2 transform -translate-x-1/2 w-8 h-8 z-10 drop-shadow-sm'>
                <img
                  src={tackImg}
                  alt='pin'
                  className='w-full h-full object-contain'
                />
              </div>
              <p
                className='relative z-10 font-bold text-[16px] text-[#4a3b32]'
                style={{ fontFamily: cutesyFont }}
              >
                Dusting off the board...
              </p>
            </div>
          </div>
        ) : fetchError ? (
          <div className='flex flex-col h-full items-center justify-center'>
            <div
              className='relative px-12 py-8 shadow-xl transform rotate-1 text-center border-2 border-red-900'
              style={{
                backgroundImage: `url(${paperImg})`,
                backgroundSize: 'cover',
              }}
            >
              <div className='absolute inset-0 bg-red-50/90 backdrop-blur-[1px]'></div>
              <div className='absolute -top-4 left-1/2 transform -translate-x-1/2 w-8 h-8 z-10 drop-shadow-md'>
                <img
                  src={tackImg}
                  alt='pin'
                  className='w-full h-full object-contain'
                />
              </div>
              <p
                className='relative z-10 font-bold text-[18px] text-red-900 leading-relaxed'
                style={{ fontFamily: cutesyFont }}
              >
                Snap! A tack broke. <br />
                <span className='text-sm opacity-80'>{fetchError}</span>
              </p>
            </div>
          </div>
        ) : activeGallery.length === 0 ? (
          <div className='flex flex-col h-full items-center justify-center'>
            <div
              className='relative px-12 py-8 shadow-xl transform -rotate-1 text-center border-2 border-[#4a3b32]'
              style={{
                backgroundImage: `url(${paperImg})`,
                backgroundSize: 'cover',
              }}
            >
              <div className='absolute inset-0 bg-[#faf5f0]/85 backdrop-blur-[1px]'></div>
              <div className='absolute -top-4 left-1/2 transform -translate-x-1/2 w-8 h-8 z-10 drop-shadow-md'>
                <img
                  src={tackImg}
                  alt='pin'
                  className='w-full h-full object-contain'
                />
              </div>
              <p
                className='relative z-10 font-bold text-[18px] text-[#4a3b32] leading-relaxed'
                style={{ fontFamily: cutesyFont }}
              >
                {viewingPending
                  ? 'No pending art right now.'
                  : 'The board is empty.\nBe the first to pin something!'}
              </p>
            </div>
          </div>
        ) : (
          <div className='columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-8 space-y-8 pt-4'>
            {activeGallery.map((art) => (
              <ArtCard
                key={art.id}
                art={art}
                onClick={setSelectedArt}
                onLikesClick={setLikersList}
                showPendingBadge={viewingPending}
              />
            ))}
          </div>
        )}
      </main>

      <UploadArtModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        session={session}
        onUploadSuccess={reloadGallery}
      />

      {selectedArt && (
        <ArtDetailModal
          art={selectedArt}
          onClose={() => setSelectedArt(null)}
          session={session}
          currentUserProfile={currentUserProfile}
          onModeration={handleModeration}
          isFollowing={isFollowing(
            selectedArt.user_id || selectedArt.profiles?.id,
          )}
          onFollow={handleFollow}
          onUnfollow={handleUnfollow}
          onUpdate={reloadGallery}
        />
      )}

      {likersList && (
        <LikersModal
          favorites={likersList}
          onClose={() => setLikersList(null)}
        />
      )}
    </div>
  );
};

export default ArtWall;
