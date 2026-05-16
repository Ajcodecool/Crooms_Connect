import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import type { Session } from '@supabase/supabase-js';
import type { ArtPost, Profile, ArtComment, ArtFavorite } from './types';
import LikersModal from './LikersModal';

// Import local assets
import paperImg from '../../assets/artwall/paper.jpg';
import tackImg from '../../assets/artwall/tack.png';

interface ArtDetailModalProps {
  art: ArtPost;
  onClose: () => void;
  session: Session | null;
  currentUserProfile: Profile | null;
  onModeration: (
    id: string,
    action: 'approved' | 'rejected' | 'deleted',
  ) => Promise<void>;
  isFollowing: boolean;
  onFollow: (targetUserId: string) => Promise<void>;
  onUnfollow: (targetUserId: string) => Promise<void>;
  onUpdate: () => Promise<void>;
}

const cutesyFont =
  "'Nunito', 'Varela Round', 'Arial Rounded MT Bold', 'Comic Sans MS', sans-serif";

const ArtDetailModal: React.FC<ArtDetailModalProps> = ({
  art,
  onClose,
  session,
  currentUserProfile,
  onModeration,
  isFollowing,
  onFollow,
  onUnfollow,
  onUpdate,
}) => {
  const [comments, setComments] = useState<ArtComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  // Maintain local favorites array for the modal
  const initialFavorites = art.art_favorites || [];
  const initialIsFavorited =
    initialFavorites.some((f) => f.user_id === session?.user?.id) || false;

  const [localFavorites, setLocalFavorites] =
    useState<ArtFavorite[]>(initialFavorites);
  const [localIsFavorited, setLocalIsFavorited] =
    useState<boolean>(initialIsFavorited);
  const [isLiking, setIsLiking] = useState(false);
  const [showLikers, setShowLikers] = useState(false);

  useEffect(() => {
    let isMounted = true;

    supabase
      .from('art_comments')
      .select(
        '*, profiles!art_comments_user_id_fkey(id, username, is_verified)',
      )
      .eq('post_id', art.id)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.error('Error fetching comments:', error.message);
          if (isMounted) setCommentError('Could not load notes.');
          return;
        }
        if (data && isMounted) {
          setComments(data as unknown as ArtComment[]);
        }
      });

    return (): void => {
      isMounted = false;
    };
  }, [art.id]);

  const reloadComments = async (): Promise<void> => {
    const { data, error } = await supabase
      .from('art_comments')
      .select(
        '*, profiles!art_comments_user_id_fkey(id, username, is_verified)',
      )
      .eq('post_id', art.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error(error);
      return;
    }
    if (data) {
      setComments(data as unknown as ArtComment[]);
    }
  };

  const handlePostComment = async (): Promise<void> => {
    if (!newComment.trim() || !session) return;
    setIsSubmittingComment(true);

    const { error } = await supabase.from('art_comments').insert({
      post_id: art.id,
      user_id: session.user.id,
      content: newComment.trim(),
    });

    if (!error) {
      setNewComment('');
      await reloadComments();
    } else {
      console.error('Failed to post comment:', error);
      alert("Couldn't pin your note. Try again!");
    }
    setIsSubmittingComment(false);
  };

  const handleDeleteComment = async (commentId: string): Promise<void> => {
    if (window.confirm('Delete this comment?')) {
      await supabase.from('art_comments').delete().eq('id', commentId);
      await reloadComments();
    }
  };

  const handleToggleFavorite = async (): Promise<void> => {
    if (!session || isLiking) return;
    setIsLiking(true);

    try {
      if (localIsFavorited) {
        setLocalIsFavorited(false);
        setLocalFavorites((prev) =>
          prev.filter((f) => f.user_id !== session.user.id),
        );

        await supabase
          .from('art_favorites')
          .delete()
          .match({ post_id: art.id, user_id: session.user.id });
      } else {
        setLocalIsFavorited(true);
        setLocalFavorites((prev) => [
          ...prev,
          {
            user_id: session.user.id,
            profiles: currentUserProfile || {
              id: session.user.id,
              username: 'You',
            },
          },
        ]);

        await supabase
          .from('art_favorites')
          .insert({ post_id: art.id, user_id: session.user.id });
      }

      await onUpdate();
    } catch (error) {
      console.error('Error toggling favorite', error);
    } finally {
      setIsLiking(false);
    }
  };

  return (
    <>
      <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 sm:p-8 backdrop-blur-sm'>
        <div
          className='relative w-full max-w-5xl max-h-[90vh] shadow-[0_20px_50px_rgba(0,0,0,0.4)] border-2 border-[#4a3b32] overflow-hidden flex flex-col md:flex-row'
          style={{
            backgroundImage: `url(${paperImg})`,
            backgroundSize: 'cover',
          }}
        >
          <div className='flex flex-col md:flex-row w-full h-full bg-[#faf5f0]/90 backdrop-blur-[2px]'>
            <button
              onClick={onClose}
              className='absolute top-4 right-6 text-3xl font-bold text-[#4a3b32] z-[60]'
              style={{ fontFamily: cutesyFont }}
            >
              ✕
            </button>

            <div className='absolute -top-5 left-1/2 md:left-[33%] transform -translate-x-1/2 w-12 h-12 z-10 drop-shadow-md'>
              <img
                src={tackImg}
                alt='pin'
                className='w-full h-full object-contain'
              />
            </div>

            {/* Image Section */}
            <div className='w-full md:w-2/3 flex items-center justify-center p-6 md:p-10 border-b-2 md:border-b-0 md:border-r-2 border-dashed border-[#4a3b32] bg-white/40'>
              <img
                src={art.image_url}
                alt={art.title}
                className='max-w-full max-h-[35vh] md:max-h-[75vh] object-contain shadow-md border-4 border-white outline outline-2 outline-[#4a3b32]'
              />
            </div>

            {/* Details & Comments Section */}
            <div className='w-full md:w-1/3 p-8 flex flex-col overflow-y-auto custom-scrollbar'>
              <div className='flex-1'>
                <h2
                  className='mb-2 break-words font-bold text-[#4a3b32] text-[26px] leading-tight'
                  style={{ fontFamily: cutesyFont }}
                >
                  {art.title}
                </h2>
                <p
                  className='opacity-70 mb-8 font-bold text-[#4a3b32] text-[13px]'
                  style={{ fontFamily: cutesyFont }}
                >
                  Pinned on {new Date(art.created_at).toLocaleDateString()}
                </p>

                <div className='flex items-center justify-between mb-6 border-y-2 py-4 border-dashed border-[#4a3b32]'>
                  <div>
                    <p
                      className='font-bold text-[#4a3b32] text-[18px]'
                      style={{ fontFamily: cutesyFont }}
                    >
                      {art.profiles?.username || 'Unknown Artist'}
                      {art.profiles?.is_verified && (
                        <span className='text-sm ml-2'>★</span>
                      )}
                    </p>
                    <p
                      className='opacity-70 mt-1 font-bold text-[#4a3b32] text-[12.5px]'
                      style={{ fontFamily: cutesyFont }}
                    >
                      Artist
                    </p>
                  </div>

                  <div className='flex items-center gap-2'>
                    <div
                      className='flex items-stretch border-2 border-[#4a3b32] bg-white text-[#4a3b32] shadow-[0_4px_10px_rgba(0,0,0,0.1)] font-bold text-[14px]'
                      style={{ fontFamily: cutesyFont }}
                    >
                      <button
                        onClick={handleToggleFavorite}
                        disabled={isLiking || !session}
                        className='px-3 py-2 hover:bg-[#faf5f0] transition-colors flex items-center disabled:opacity-50'
                        title={!session ? 'Log in to like' : ''}
                      >
                        {localIsFavorited ? '❤️' : '🤍'}
                      </button>
                      <div className='w-[2px] bg-[#4a3b32]'></div>
                      <button
                        onClick={() => setShowLikers(true)}
                        className='px-3 py-2 hover:bg-[#faf5f0] transition-colors flex items-center hover:underline'
                        title='View likers'
                      >
                        {localFavorites.length}
                      </button>
                    </div>

                    {session?.user?.id &&
                      session.user.id !== art.user_id &&
                      (isFollowing ? (
                        <button
                          onClick={(): Promise<void> => onUnfollow(art.user_id)}
                          className='px-5 py-2 border-2 border-[#4a3b32] bg-white text-[#4a3b32] shadow-[0_4px_10px_rgba(0,0,0,0.1)] font-bold text-[14px]'
                          style={{ fontFamily: cutesyFont }}
                        >
                          Unfollow
                        </button>
                      ) : (
                        <button
                          onClick={(): Promise<void> => onFollow(art.user_id)}
                          className='px-5 py-2 border-2 border-[#4a3b32] bg-[#4a3b32] text-[#fdf8f5] shadow-[0_4px_10px_rgba(0,0,0,0.1)] font-bold text-[14px]'
                          style={{ fontFamily: cutesyFont }}
                        >
                          Follow
                        </button>
                      ))}
                  </div>
                </div>

                <div className='mb-8'>
                  <h3
                    className='uppercase border-b-2 inline-block pb-1 mb-3 font-bold text-[#4a3b32] text-[13px] border-[#4a3b32]'
                    style={{ fontFamily: cutesyFont }}
                  >
                    About this piece
                  </h3>
                  <p
                    className='whitespace-pre-wrap leading-relaxed opacity-90 font-bold text-[#4a3b32] text-[14px]'
                    style={{ fontFamily: cutesyFont }}
                  >
                    {art.description || (
                      <span className='italic opacity-60'>
                        No description provided.
                      </span>
                    )}
                  </p>
                </div>

                <div className='mt-4'>
                  <h3
                    className='uppercase border-b-2 inline-block pb-1 mb-4 font-bold text-[#4a3b32] text-[13px] border-[#4a3b32]'
                    style={{ fontFamily: cutesyFont }}
                  >
                    Notes ({comments.length})
                  </h3>

                  <div className='flex flex-col gap-3 mb-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2'>
                    {commentError ? (
                      <p
                        className='text-[13px] text-red-600 font-bold'
                        style={{ fontFamily: cutesyFont }}
                      >
                        {commentError}
                      </p>
                    ) : comments.length === 0 ? (
                      <p
                        className='text-[13px] text-[#4a3b32] opacity-70 font-bold'
                        style={{ fontFamily: cutesyFont }}
                      >
                        No notes left yet. Leave one!
                      </p>
                    ) : (
                      comments.map((comment) => (
                        <div
                          key={comment.id}
                          className='bg-white/50 border-2 border-[#4a3b32] p-3 shadow-sm relative group'
                        >
                          <p
                            className='font-bold text-[#4a3b32] text-[12px] opacity-70 mb-1'
                            style={{ fontFamily: cutesyFont }}
                          >
                            {comment.profiles?.username || 'Unknown'}
                          </p>
                          <p
                            className='font-bold text-[#4a3b32] text-[14px] leading-snug'
                            style={{ fontFamily: cutesyFont }}
                          >
                            {comment.content}
                          </p>
                          {(currentUserProfile?.is_verified ||
                            session?.user?.id === comment.user_id) && (
                            <button
                              onClick={(): Promise<void> =>
                                handleDeleteComment(comment.id)
                              }
                              className='absolute top-2 right-2 text-red-500 font-bold text-[12px] opacity-0 group-hover:opacity-100 transition-opacity'
                              style={{ fontFamily: cutesyFont }}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {session ? (
                    <div className='flex gap-2'>
                      <input
                        type='text'
                        value={newComment}
                        onChange={(
                          e: React.ChangeEvent<HTMLInputElement>,
                        ): void => setNewComment(e.target.value)}
                        placeholder='Write a note...'
                        className='flex-1 bg-white/50 border-2 border-[#4a3b32] p-2 outline-none font-bold text-[#4a3b32] text-[13px]'
                        style={{ fontFamily: cutesyFont }}
                        onKeyDown={(
                          e: React.KeyboardEvent<HTMLInputElement>,
                        ): void => {
                          if (e.key === 'Enter') void handlePostComment();
                        }}
                      />
                      <button
                        onClick={(): Promise<void> => handlePostComment()}
                        disabled={!newComment.trim() || isSubmittingComment}
                        className='px-4 border-2 border-[#4a3b32] bg-[#4a3b32] text-[#fdf8f5] font-bold text-[13px] disabled:opacity-50'
                        style={{ fontFamily: cutesyFont }}
                      >
                        Post
                      </button>
                    </div>
                  ) : (
                    <p
                      className='text-[12px] text-[#4a3b32] opacity-70 font-bold'
                      style={{ fontFamily: cutesyFont }}
                    >
                      Log in to leave a note.
                    </p>
                  )}
                </div>
              </div>

              {currentUserProfile?.is_verified && (
                <div className='mt-8 pt-6 border-t-2 border-solid border-[#4a3b32] flex flex-col gap-3'>
                  <p
                    className='uppercase text-center opacity-70 font-bold text-[#4a3b32] text-[12px]'
                    style={{ fontFamily: cutesyFont }}
                  >
                    Mod Tools
                  </p>
                
                  {art.status === 'pending' && (
                    <div className='flex gap-3'>
                      <button
                        onClick={(): Promise<void> =>
                          onModeration(art.id, 'approved')
                        }
                        className='flex-1 border-2 border-[#3b533d] bg-[#476649] text-white py-2 font-bold shadow-sm'
                        style={{ fontFamily: cutesyFont }}
                      >
                        Approve
                      </button>
                      <button
                        onClick={(): Promise<void> =>
                          onModeration(art.id, 'rejected')
                        }
                        className='flex-1 border-2 border-[#4a3b32] bg-white text-[#4a3b32] py-2 font-bold shadow-sm'
                        style={{ fontFamily: cutesyFont }}
                      >
                        Reject
                      </button>
                    </div>
                  )}
                  <button
                    onClick={(): Promise<void> | void => {
                      if (window.confirm('Permanently tear this down?'))
                        return onModeration(art.id, 'deleted');
                    }}
                    className='w-full border-2 border-[#7a2e2e] bg-[#993939] text-white py-3 font-bold shadow-sm'
                    style={{ fontFamily: cutesyFont }}
                  >
                    Tear Down
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showLikers && (
        <LikersModal
          favorites={localFavorites}
          onClose={() => setShowLikers(false)}
        />
      )}
    </>
  );
};

export default ArtDetailModal;
