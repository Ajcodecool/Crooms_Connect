import React from 'react';
import type { User } from '@supabase/supabase-js';
import type { PeerProfile } from '../hooks/usePeerProfiles';

interface UserGridProps {
  peersInRoom: string[];
  speakingPeers: Set<string>;
  currentUser: User | undefined;
  isMuted: boolean;
  profiles: Record<string, PeerProfile>;
  remoteStreams: Record<string, MediaStream>;
  // Added missing video props to fix TS2322
  isVideoEnabled: boolean;
  remoteVideoStreams: Record<string, MediaStream | null>;
  localVideoStream: MediaStream | null;
}

export const UserGrid = ({
  peersInRoom,
  speakingPeers,
  currentUser,
  isMuted,
  profiles,
  remoteStreams,
  isVideoEnabled,
  remoteVideoStreams,
  localVideoStream,
}: UserGridProps): React.JSX.Element => {
  return (
    <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-8'>
      {peersInRoom.map((peerId) => {
        const isSpeaking = speakingPeers.has(peerId);
        const isMe = peerId === currentUser?.id;
        const profile = profiles[peerId] || {};

        // Fallbacks if the profile hasn't loaded yet
        const displayName = isMe ? 'You' : profile.username || 'User';
        const avatarUrl = profile.avatar_url;

        // Audio & Video Streams
        const audioStream = remoteStreams[peerId];
        const videoStream = isMe
          ? localVideoStream
          : remoteVideoStreams[peerId];

        // Check if video should be rendered for this specific peer
        const hasVideo = isMe ? isVideoEnabled && !!videoStream : !!videoStream;

        return (
          <div
            key={peerId}
            className='flex flex-col items-center justify-center p-4 bg-black/20 border border-white/10 rounded-xl relative group transition hover:bg-black/30'
          >
            <div className='w-16 h-16 rounded-full bg-slate-800 border-2 border-slate-600 flex items-center justify-center text-2xl relative mb-3 overflow-visible'>
              {/* AUDIO PLAYBACK FOR REMOTE PEERS */}
              {audioStream && !isMe && (
                <audio
                  autoPlay
                  style={{ display: 'none' }}
                  ref={(node) => {
                    if (node && node.srcObject !== audioStream) {
                      node.srcObject = audioStream;
                    }
                  }}
                />
              )}

              {/* VIDEO, AVATAR IMAGE, OR FALLBACK ICON */}
              <div className='w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-slate-800 relative z-10'>
                {hasVideo ? (
                  <video
                    autoPlay
                    playsInline
                    muted={isMe} // Always mute local video to prevent echo
                    className='w-full h-full object-cover transform scale-x-[-1]' // Mirrors the video slightly for a more natural feel
                    ref={(node) => {
                      if (node && node.srcObject !== videoStream) {
                        node.srcObject = videoStream;
                      }
                    }}
                  />
                ) : avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className='w-full h-full object-cover'
                  />
                ) : (
                  <i className='fa-solid fa-user text-slate-400'></i>
                )}
              </div>

              {/* VISUALIZER RING */}
              {isSpeaking && (
                <div className='absolute inset-[-4px] rounded-full border-[3px] border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.6)] animate-pulse pointer-events-none transition-opacity duration-75 z-0'></div>
              )}
            </div>

            <span className='text-xs font-bold truncate w-full text-center px-1'>
              {displayName}
            </span>

            {isMe && isMuted && (
              <div className='absolute top-2 right-2 text-red-500 text-xs bg-red-500/20 w-6 h-6 flex items-center justify-center rounded-full'>
                <i className='fa-solid fa-microphone-slash'></i>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
