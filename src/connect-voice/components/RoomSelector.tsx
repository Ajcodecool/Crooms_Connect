// ✅ Added the 'type' keyword here!TUGG
import type { FC } from 'react';
import type { VoiceRoom } from '../hooks/useVoiceRooms';

interface RoomSelectorProps {
  rooms: VoiceRoom[];
  activeRoom: VoiceRoom | null;
  setActiveRoom: (room: VoiceRoom | null) => void;
  onJoin: () => void;
  errorMsg?: string;
}

export const RoomSelector: FC<RoomSelectorProps> = ({
  rooms,
  activeRoom,
  setActiveRoom,
  onJoin,
  errorMsg,
}) => {
  return (
    <>
      {errorMsg && (
        <div className='mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-center text-sm font-bold'>
          <i className='fa-solid fa-triangle-exclamation mr-2'></i> {errorMsg}
        </div>
      )}

      <div className='flex flex-col items-center gap-4 animate-in fade-in zoom-in-95'>
        <div className='w-full max-w-sm'>
          <label className='block text-sm font-bold opacity-70 mb-2'>
            Select Channel
          </label>
          <select
            value={activeRoom?.slug || ''}
            onChange={(e) =>
              setActiveRoom(
                rooms.find((r) => r.slug === e.target.value) || null,
              )
            }
            className='w-full px-4 py-3 rounded-lg dashboard-input border border-white/20 bg-black/20 text-white focus:outline-none focus:border-blue-500 transition-colors'
          >
            {rooms.map((room) => (
              <option key={room.slug} value={room.slug}>
                {room.name}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={onJoin}
          className='mt-4 px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-lg border border-blue-400 transition-all hover:scale-105 flex items-center gap-2'
        >
          <i className='fa-solid fa-headphones'></i> Connect to Voice
        </button>
      </div>
    </>
  );
};
