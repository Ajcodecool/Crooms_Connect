/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '../supabaseClient';

export type VoiceRole = 'caller' | 'callee';

interface VoiceSignal {
  id: string;
  room_id: string;
  from_user_id: string;
  to_user_id: string | null;
  type: 'offer' | 'answer' | 'ice';
  data: any;
  created_at: string;
}

let pc: RTCPeerConnection | null = null;
let localStream: MediaStream | null = null;
let roomId: string | null = null;
let currentUserId: string | null = null;
let subscription: ReturnType<typeof supabase.channel> | null = null;

const remoteAudioEl: HTMLAudioElement = (() => {
  const el = document.createElement('audio');
  el.autoplay = true;
  el.style.display = 'none';
  document.body.appendChild(el);
  return el;
})();

const rtcConfig: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }, // public STUN
  ],
};

async function sendSignal(
  payload: Omit<VoiceSignal, 'id' | 'created_at'>,
): Promise<void> {
  await supabase.from('voice_signals').insert({
    room_id: payload.room_id,
    from_user_id: payload.from_user_id,
    to_user_id: payload.to_user_id,
    type: payload.type,
    data: payload.data,
  });
}

async function setupPeerConnection(): Promise<RTCPeerConnection> {
  if (pc) return pc;

  pc = new RTCPeerConnection(rtcConfig);

  pc.onicecandidate = async (event) => {
    if (event.candidate && roomId && currentUserId) {
      await sendSignal({
        room_id: roomId,
        from_user_id: currentUserId,
        to_user_id: null, // broadcast to room
        type: 'ice',
        data: event.candidate.toJSON(),
      });
    }
  };

  pc.ontrack = (event) => {
    const [stream] = event.streams;
    remoteAudioEl.srcObject = stream;
  };

  return pc;
}

async function subscribeToSignals(): Promise<void> {
  if (!roomId || !currentUserId) return;
  if (subscription) return;

  subscription = supabase
    .channel(`voice_signals:${roomId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'voice_signals',
        filter: `room_id=eq.${roomId}`,
      },
      async (payload) => {
        const row = payload.new as VoiceSignal;

        // Optional: if you add RLS by user, you can also check to_user_id here
        if (row.from_user_id === currentUserId) return;

        if (!pc) await setupPeerConnection();

        if (!pc) return;

        if (row.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(row.data));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await sendSignal({
            room_id: roomId!,
            from_user_id: currentUserId!,
            to_user_id: row.from_user_id,
            type: 'answer',
            data: answer,
          });
        } else if (row.type === 'answer') {
          if (!pc.currentRemoteDescription) {
            await pc.setRemoteDescription(new RTCSessionDescription(row.data));
          }
        } else if (row.type === 'ice') {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(row.data));
          } catch (err) {
            console.error('Error adding ICE candidate', err);
          }
        }
      },
    )
    .subscribe();
}

export async function startVoiceChat(
  session: { user: { id: string } },
  room: string,
  role: VoiceRole = 'caller',
): Promise<void> {
  if (!session?.user?.id) throw new Error('No user session');
  currentUserId = session.user.id;
  roomId = room;

  await setupPeerConnection();
  await subscribeToSignals();

  // Get mic
  localStream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: false,
  });

  localStream.getTracks().forEach((t) => pc?.addTrack(t, localStream!));

  // If caller, create and send offer
  if (role === 'caller' && pc && roomId && currentUserId) {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await sendSignal({
      room_id: roomId,
      from_user_id: currentUserId,
      to_user_id: null,
      type: 'offer',
      data: offer,
    });
  }
}

export async function stopVoiceChat(): Promise<void> {
  if (subscription) {
    await supabase.removeChannel(subscription);
    subscription = null;
  }

  if (localStream) {
    localStream.getTracks().forEach((t) => t.stop());
    localStream = null;
  }

  if (pc) {
    pc.getSenders().forEach((s) => s.track?.stop());
    pc.close();
    pc = null;
  }

  remoteAudioEl.srcObject = null;
  roomId = null;
  currentUserId = null;
}
