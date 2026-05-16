import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import type { RealtimeChannel, User } from '@supabase/supabase-js';
import type { VoiceRoom } from './useVoiceRooms';

export interface WebRTCSignalPayload {
  targetId: string;
  fromId: string;
  type: 'offer' | 'answer' | 'ice-candidate' | 'ice-candidates-batch';
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  candidates?: RTCIceCandidateInit[]; // Added for batching
}

interface SupabasePresence {
  key?: string;
  id?: string;
  [key: string]: unknown;
}

const iceServers = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export const useWebRTC = (
  user: User | undefined,
  activeRoom: VoiceRoom | null,
  trackSpeaking: (stream: MediaStream, peerId: string) => void,
  stopTracking: (peerId: string) => void,
): {
  isConnected: boolean;
  isMuted: boolean;
  isVideoEnabled: boolean;
  peersInRoom: string[];
  remoteStreams: Record<string, MediaStream>;
  remoteVideoStreams: Record<string, MediaStream>;
  localVideoStream: MediaStream | null;
  errorMsg: string;
  joinRoom: () => void;
  cleanupWebRTC: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
} => {
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [peersInRoom, setPeersInRoom] = useState<string[]>([]);
  const [remoteStreams, setRemoteStreams] = useState<
    Record<string, MediaStream>
  >({});
  const [remoteVideoStreams, setRemoteVideoStreams] = useState<
    Record<string, MediaStream>
  >({});
  const [localVideoStream, setLocalVideoStream] = useState<MediaStream | null>(
    null,
  );
  const [errorMsg, setErrorMsg] = useState('');

  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Record<string, RTCPeerConnection>>({});
  const pendingCandidatesRef = useRef<Record<string, RTCIceCandidate[]>>({});
  const channelRef = useRef<RealtimeChannel | null>(null);

  const cleanupPeer = useCallback(
    (peerId: string) => {
      console.log(`[WebRTC] 🧹 Cleaning up peer: ${peerId}`);
      const pc = peerConnectionsRef.current[peerId];
      if (pc) {
        pc.onicecandidate = null;
        pc.ontrack = null;
        pc.onconnectionstatechange = null;
        pc.oniceconnectionstatechange = null;
        pc.close();
        delete peerConnectionsRef.current[peerId];
        delete pendingCandidatesRef.current[peerId];
      }

      stopTracking(peerId);

      setRemoteStreams((prev) => {
        const copy = { ...prev };
        delete copy[peerId];
        return copy;
      });

      setRemoteVideoStreams((prev) => {
        const copy = { ...prev };
        delete copy[peerId];
        return copy;
      });
    },
    [stopTracking],
  );

  const cleanupWebRTC = useCallback(() => {
    console.log('[WebRTC] 🛑 Full WebRTC Cleanup Triggered');
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }

    if (localVideoStreamRef.current) {
      localVideoStreamRef.current.getTracks().forEach((t) => t.stop());
      localVideoStreamRef.current = null;
    }

    Object.keys(peerConnectionsRef.current).forEach(cleanupPeer);

    if (user?.id) stopTracking(user.id);

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    setIsConnected(false);
    setPeersInRoom([]);
    setRemoteStreams({});
    setRemoteVideoStreams({});
    setLocalVideoStream(null);
    setErrorMsg('');
    setIsVideoEnabled(false);
  }, [user, cleanupPeer, stopTracking]);

  const cleanupRef = useRef(cleanupWebRTC);
  useEffect(() => {
    cleanupRef.current = cleanupWebRTC;
  }, [cleanupWebRTC]);

  useEffect(() => {
    return () => {
      cleanupRef.current();
    };
  }, []);

  const toggleMute = (): void => {
    if (!localStreamRef.current) return;
    const track = localStreamRef.current.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setIsMuted(!track.enabled);
      console.log(`[Microphone] Muted state: ${!track.enabled}`);
    }
  };

  const toggleVideo = async (): Promise<void> => {
    if (isVideoEnabled) {
      if (localVideoStreamRef.current) {
        localVideoStreamRef.current.getVideoTracks().forEach((t) => {
          t.enabled = false;
          t.stop();
        });
        localVideoStreamRef.current = null;
      }
      setLocalVideoStream(null);
      setIsVideoEnabled(false);
      return;
    }

    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
      });
      console.log('[Camera] ✅ Access granted');

      localVideoStreamRef.current = videoStream;
      setLocalVideoStream(videoStream);

      Object.values(peerConnectionsRef.current).forEach((pc) => {
        videoStream.getVideoTracks().forEach((track) => {
          console.log(
            '[WebRTC] 🎥 Adding local video track to peer connection',
          );
          pc.addTrack(track, videoStream);
        });
      });

      setIsVideoEnabled(true);
    } catch (err) {
      console.error('[Camera] ❌ Access failed:', err);
      setErrorMsg('Camera access failed. Please allow permissions.');
    }
  };

  const createPeerConnection = useCallback(
    (targetUserId: string, channel: RealtimeChannel) => {
      console.log(
        `[WebRTC] 🛠️ Creating new PeerConnection for ${targetUserId}`,
      );

      if (peerConnectionsRef.current[targetUserId]) {
        return peerConnectionsRef.current[targetUserId];
      }

      const pc = new RTCPeerConnection(iceServers);
      peerConnectionsRef.current[targetUserId] = pc;
      pendingCandidatesRef.current[targetUserId] = [];

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      if (localVideoStreamRef.current) {
        localVideoStreamRef.current.getVideoTracks().forEach((track) => {
          pc.addTrack(track, localVideoStreamRef.current!);
        });
      }

      pc.onconnectionstatechange = () => {
        console.log(
          `[WebRTC] 🔄 Connection state with ${targetUserId}:`,
          pc.connectionState,
        );
        if (
          pc.connectionState === 'disconnected' ||
          pc.connectionState === 'failed' ||
          pc.connectionState === 'closed'
        ) {
          cleanupPeer(targetUserId);
        }
      };

      pc.ontrack = (event) => {
        // Fallback to manual stream creation if event.streams is empty (known browser quirk)
        const stream = event.streams[0] || new MediaStream([event.track]);

        console.log(
          `[WebRTC] 🎧/🎥 Received remote track from ${targetUserId}! Tracks:`,
          stream.getTracks(),
        );

        setRemoteStreams((prev) => ({
          ...prev,
          [targetUserId]: stream,
        }));

        // Track speaking always uses the stream regardless of video/audio mix
        trackSpeaking(stream, targetUserId);

        const hasVideo = stream.getVideoTracks().length > 0;
        if (hasVideo) {
          setRemoteVideoStreams((prev) => ({
            ...prev,
            [targetUserId]: stream,
          }));
        }
      };

      // --- ICE BATCHING FIX ---
      const iceCandidatePool: RTCIceCandidateInit[] = [];
      let iceTimeout: ReturnType<typeof setTimeout> | null = null;

      pc.onicecandidate = (event) => {
        if (event.candidate && user?.id) {
          iceCandidatePool.push(event.candidate);

          if (!iceTimeout) {
            iceTimeout = setTimeout(() => {
              console.log(
                `[WebRTC] 📦 Sending batch of ${iceCandidatePool.length} ICE candidates to ${targetUserId}`,
              );
              channel.send({
                type: 'broadcast',
                event: 'webrtc-signal',
                payload: {
                  targetId: targetUserId,
                  fromId: user.id,
                  type: 'ice-candidates-batch',
                  candidates: [...iceCandidatePool],
                },
              });
              iceCandidatePool.length = 0; // Clear the pool after sending
              iceTimeout = null;
            }, 300); // Batch every 300ms
          }
        }
      };

      return pc;
    },
    [user, trackSpeaking, cleanupPeer],
  );

  const connectToPeer = useCallback(
    async (peerId: string, channel: RealtimeChannel) => {
      if (peerId === user?.id || peerConnectionsRef.current[peerId]) return;

      if (user!.id > peerId) {
        console.log(
          `[WebRTC] 🤝 Initiating Offer to ${peerId} (My ID is larger)`,
        );
        const pc = createPeerConnection(peerId, channel);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        channel.send({
          type: 'broadcast',
          event: 'webrtc-signal',
          payload: {
            targetId: peerId,
            fromId: user!.id,
            type: 'offer',
            offer,
          },
        });
      } else {
        console.log(
          `[WebRTC] ⏳ Waiting for Offer from ${peerId} (Their ID is larger)`,
        );
      }
    },
    [user, createPeerConnection],
  );

  const flushIceCandidates = async (
    pc: RTCPeerConnection,
    peerId: string,
  ): Promise<void> => {
    const buffered = pendingCandidatesRef.current[peerId] || [];
    if (buffered.length > 0) {
      console.log(
        `[WebRTC] 🚰 Flushing ${buffered.length} buffered ICE candidates for ${peerId}`,
      );
    }
    for (const c of buffered) {
      try {
        await pc.addIceCandidate(c);
      } catch (err) {
        console.error(
          `[WebRTC] ❌ Error adding buffered ICE candidate for ${peerId}`,
          err,
        );
      }
    }
    pendingCandidatesRef.current[peerId] = [];
  };

  const joinRoom = async (): Promise<void> => {
    if (!user) return setErrorMsg('You must be logged in.');
    if (!activeRoom) return setErrorMsg('Select a room.');

    console.log(`[Room] 🚪 Attempting to join room: ${activeRoom.name}`);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('[Microphone] ✅ Access granted');
      localStreamRef.current = stream;
      stream.getAudioTracks().forEach((track) => (track.enabled = true));
      trackSpeaking(stream, user.id);

      const channel = supabase.channel(`voice_room:${activeRoom.slug}`, {
        config: { presence: { key: user.id }, broadcast: { self: false } },
      });
      channelRef.current = channel;

      channel.on(
        'broadcast',
        { event: 'webrtc-signal' },
        async ({ payload }) => {
          const data = payload as WebRTCSignalPayload;
          if (data.targetId !== user.id) return;

          let pc = peerConnectionsRef.current[data.fromId];
          if (!pc) pc = createPeerConnection(data.fromId, channel);

          try {
            if (data.type === 'offer' && data.offer) {
              await pc.setRemoteDescription(
                new RTCSessionDescription(data.offer),
              );
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);

              console.log(`[WebRTC] 📤 Sending Answer back to ${data.fromId}`);
              channel.send({
                type: 'broadcast',
                event: 'webrtc-signal',
                payload: {
                  targetId: data.fromId,
                  fromId: user.id,
                  type: 'answer',
                  answer,
                },
              });
              await flushIceCandidates(pc, data.fromId);
            } else if (data.type === 'answer' && data.answer) {
              await pc.setRemoteDescription(
                new RTCSessionDescription(data.answer),
              );
              console.log(
                `[WebRTC] ✅ Remote description (Answer) set for ${data.fromId}`,
              );
              await flushIceCandidates(pc, data.fromId);
            } else if (data.type === 'ice-candidate' && data.candidate) {
              // Keeping for backwards compatibility
              const candidate = new RTCIceCandidate(data.candidate);
              if (pc.remoteDescription && pc.remoteDescription.type) {
                await pc.addIceCandidate(candidate);
              } else {
                pendingCandidatesRef.current[data.fromId].push(candidate);
              }
            } else if (
              data.type === 'ice-candidates-batch' &&
              data.candidates
            ) {
              // --- HANDLE BATCHED ICE CANDIDATES ---
              for (const cand of data.candidates) {
                const candidate = new RTCIceCandidate(cand);
                if (pc.remoteDescription && pc.remoteDescription.type) {
                  await pc.addIceCandidate(candidate);
                } else {
                  pendingCandidatesRef.current[data.fromId].push(candidate);
                }
              }
            }
          } catch (err) {
            console.error('[WebRTC] ❌ Signaling error:', err);
          }
        },
      );

      channel.on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const peers = Object.keys(state);
        console.log(`[Presence] 🔄 Sync: Peers currently in room:`, peers);
        setPeersInRoom(peers);
        peers.forEach((peerId) => connectToPeer(peerId, channel));
      });

      channel.on('presence', { event: 'join' }, ({ newPresences }) => {
        newPresences.forEach((p: SupabasePresence) => {
          const newUserId = p.key || p.id;
          if (newUserId) connectToPeer(newUserId, channel);
        });
      });

      channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
        leftPresences.forEach((p: SupabasePresence) => {
          const id = p.key || p.id;
          if (id) cleanupPeer(id);
        });
      });

      channel.subscribe(async (status) => {
        console.log(`[Supabase] Channel status: ${status}`);
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() });
          setIsConnected(true);
        }
      });
    } catch (err) {
      console.error('[Microphone] ❌ Access failed:', err);
      setErrorMsg('Microphone access failed. Please allow permissions.');
    }
  };

  return {
    isConnected,
    isMuted,
    isVideoEnabled,
    peersInRoom,
    remoteStreams,
    remoteVideoStreams,
    localVideoStream,
    errorMsg,
    joinRoom,
    cleanupWebRTC,
    toggleMute,
    toggleVideo,
  };
};
