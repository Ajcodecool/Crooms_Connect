import React from 'react';
import type { ArtPost, ArtFavorite } from './types';

// Import local assets
import paperImg from '../../assets/artwall/paper.jpg';
import tackImg from '../../assets/artwall/tack.png';

interface ArtCardProps {
  art: ArtPost;
  onClick: (art: ArtPost) => void;
  onLikesClick?: (favorites: ArtFavorite[]) => void;
  showPendingBadge?: boolean;
}

const cutesyFont =
  "'Nunito', 'Varela Round', 'Arial Rounded MT Bold', 'Comic Sans MS', sans-serif";

const ArtCard: React.FC<ArtCardProps> = ({
  art,
  onClick,
  onLikesClick,
  showPendingBadge,
}) => {
  const charCode = art.id.charCodeAt(art.id.length - 1) || 0;
  const rotations = [
    '-rotate-3',
    'rotate-2',
    '-rotate-2',
    'rotate-3',
    '-rotate-1',
    'rotate-1',
  ];
  const tilt = rotations[charCode % rotations.length];

  const favorites = art.art_favorites || [];
  const favCount = favorites.length;

  return (
    <div
      onClick={() => onClick(art)}
      className={`break-inside-avoid cursor-pointer relative shadow-[0_4px_12px_rgba(0,0,0,0.15)] mb-8 ${tilt} overflow-hidden border-2 border-[#4a3b32]`}
      style={{ backgroundImage: `url(${paperImg})`, backgroundSize: 'cover' }}
    >
      <div className='absolute inset-0 bg-[#faf5f0]/85 backdrop-blur-[1px]'></div>

      <div className='absolute -top-3 left-1/2 transform -translate-x-1/2 z-20 w-10 h-10 drop-shadow-md'>
        <img src={tackImg} alt='pin' className='w-full h-full object-contain' />
      </div>

      <div className='relative z-10 p-3 pb-8'>
        <div className='relative overflow-hidden border-2 border-[#4a3b32] bg-white p-2 shadow-sm'>
          <img
            src={art.image_url}
            alt={art.title}
            className='w-full h-auto object-cover'
            loading='lazy'
          />

          {favCount > 0 && (
            <div
              className='absolute bottom-3 right-3 bg-white border-2 border-[#4a3b32] shadow-sm flex items-center z-20 transform rotate-2 overflow-hidden'
              onClick={(e) => {
                e.stopPropagation(); // Prevents opening the whole detail modal
                if (onLikesClick) onLikesClick(favorites);
              }}
            >
              <span className='px-1.5 py-1 text-[14px]'>❤️</span>
              <div className='w-[2px] self-stretch bg-[#4a3b32]'></div>
              <span
                className='px-2 py-1 font-bold text-[#4a3b32] text-[13px] hover:bg-[#faf5f0] transition-colors cursor-pointer'
                style={{ fontFamily: cutesyFont }}
                title='View likers'
              >
                {favCount}
              </span>
            </div>
          )}
        </div>

        <div className='mt-4 flex flex-col items-center justify-center text-center px-2'>
          <h3
            className='truncate w-full font-bold text-[16px] text-[#4a3b32] leading-tight'
            style={{ fontFamily: cutesyFont }}
          >
            {art.title}
          </h3>
          <p
            className='mt-1 font-bold text-[13px] text-[#4a3b32] opacity-80'
            style={{ fontFamily: cutesyFont }}
          >
            by {art.profiles?.username || 'Unknown'}
          </p>
        </div>
      </div>
      

      {showPendingBadge && art.status === 'pending' && (
        <div className='absolute -right-3 -bottom-3 z-20 bg-[#fdf8e3] border-2 border-dashed border-[#4a3b32] px-3 py-1 transform -rotate-12 shadow-sm'>
          <span
            className='font-bold text-[12.5px] text-[#4a3b32]'
            style={{ fontFamily: cutesyFont }}
          >
            PENDING
          </span>
        </div>
      )}
    </div>
  );
};

export default ArtCard;
