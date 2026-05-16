import type { FC } from 'react';

interface ControlsProps {
  isMuted: boolean;
  isVideoEnabled: boolean;
  toggleMute: () => void;
  toggleVideo: () => void;
  onDisconnect: () => void;
}

export const Controls: FC<ControlsProps> = ({
  isMuted,
  isVideoEnabled,
  toggleMute,
  toggleVideo,
  onDisconnect,
}) => {
  return (
    <div className='sticky bottom-4 z-20'>
      <div className='mx-auto w-full max-w-md rounded-2xl border border-white/10 bg-slate-900/90 backdrop-blur-xl shadow-2xl px-4 py-3'>
        <div className='flex items-center justify-center gap-3'>
          <button
            onClick={toggleMute}
            className={`px-4 py-3 rounded-xl font-semibold transition-all ${
              isMuted
                ? 'bg-red-500 text-white hover:bg-red-400'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            {isMuted ? 'Unmute' : 'Mute'}
          </button>

          <button
            onClick={toggleVideo}
            className={`px-4 py-3 rounded-xl font-semibold transition-all ${
              isVideoEnabled
                ? 'bg-white/10 text-white hover:bg-white/20'
                : 'bg-yellow-500 text-slate-950 hover:bg-yellow-400'
            }`}
          >
            {isVideoEnabled ? 'Camera Off' : 'Camera On'}
          </button>

          <button
            onClick={onDisconnect}
            className='px-4 py-3 rounded-xl font-semibold bg-red-600 text-white hover:bg-red-500 transition-all'
          >
            Disconnect
          </button>
        </div>
      </div>
    </div>
  );
};
