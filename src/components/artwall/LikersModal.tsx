import React from 'react';
import { supabase } from '../../supabaseClient';
import type { ArtFavorite } from './types';

// Import local assets
import paperImg from '../../assets/artwall/paper.jpg';
import tackImg from '../../assets/artwall/tack.png';

interface LikersModalProps {
  favorites: ArtFavorite[];
  onClose: () => void;
}

const cutesyFont =
  "'Nunito', 'Varela Round', 'Arial Rounded MT Bold', 'Comic Sans MS', sans-serif";

// Avatar helper logic exactly matching your Dashboard
const getDefaultAvatar = (name?: string): string => {
  if (!name) return '/DP1.jpg';
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return `/DP${(Math.abs(hash) % 4) + 1}.jpg`;
};

const getStorageAvatar = (userId?: string): string | null => {
  if (!userId) return null;
  const { data } = supabase.storage
    .from('profile-pictures')
    .getPublicUrl(`${userId}.png`);
  return data?.publicUrl || null;
};

const LikersModal: React.FC<LikersModalProps> = ({ favorites, onClose }) => {
  return (
    <div
      className='fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm'
      onClick={onClose}
    >
      <div
        className='relative w-full max-w-xs shadow-xl transform rotate-1 border-2 border-[#4a3b32] flex flex-col'
        style={{ backgroundImage: `url(${paperImg})`, backgroundSize: 'cover' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className='absolute inset-0 bg-[#faf5f0]/85 backdrop-blur-[1px] z-0'></div>

        <div className='absolute -top-4 left-1/2 transform -translate-x-1/2 w-8 h-8 z-20 drop-shadow-md'>
          <img
            src={tackImg}
            alt='pin'
            className='w-full h-full object-contain'
          />
        </div>

        <button
          onClick={onClose}
          className='absolute top-2 right-3 text-xl font-bold text-[#4a3b32] z-20 hover:scale-110 transition-transform'
          style={{ fontFamily: cutesyFont }}
        >
          ✕
        </button>

        <div className='relative z-10 p-5 flex flex-col max-h-[60vh]'>
          <h3
            className='font-bold text-[18px] text-[#4a3b32] mb-4 text-center border-b-2 border-dashed border-[#4a3b32] pb-2'
            style={{ fontFamily: cutesyFont }}
          >
            Liked By
          </h3>

          <div className='flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2'>
            {favorites.length === 0 ? (
              <p
                className='text-center text-[#4a3b32] opacity-70 font-bold text-[13px]'
                style={{ fontFamily: cutesyFont }}
              >
                No likes yet!
              </p>
            ) : (
              favorites.map((fav, index) => {
                const username = fav.profiles?.username || 'Unknown';
                const avatarUrl =
                  getStorageAvatar(fav.user_id) || getDefaultAvatar(username);

                return (
                  <div
                    key={index}
                    className='flex items-center gap-3 bg-white/50 border border-[#4a3b32] p-2 shadow-sm'
                  >
                    <img
                      src={avatarUrl}
                      alt={username}
                      className='w-8 h-8 rounded-full border border-[#4a3b32] object-cover bg-slate-200'
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = getDefaultAvatar(username);
                      }}
                    />
                    <span
                      className='font-bold text-[#4a3b32] text-[14px] truncate'
                      style={{ fontFamily: cutesyFont }}
                    >
                      {username}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LikersModal;
