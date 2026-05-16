import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface VoiceRoom {
  id: string;
  slug: string;
  name: string;
  description?: string;
  theme_color?: string;
  is_active: boolean;
  created_at: string;
  userCount?: number; // Added to track live users
}

export const useVoiceRooms = (): {
  rooms: VoiceRoom[];
  activeRoom: VoiceRoom | null;
  setActiveRoom: (newRoom: VoiceRoom | null) => void;
} => {
  const [rooms, setRooms] = useState<VoiceRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<VoiceRoom | null>(null);

  // We keep counts in a separate state object (e.g., { "room_id_1": 5, "room_id_2": 2 })
  // to avoid mutating the entire rooms array every time a single person joins/leaves.
  const [roomCounts, setRoomCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    let activeChannels: RealtimeChannel[] = [];

    const fetchRoomsAndSubscribe = async (): Promise<void> => {
      const { data, error } = await supabase
        .from('voice_rooms')
        .select('*')
        .eq('is_active', true);

      if (!error && data) {
        setRooms(data as VoiceRoom[]);
        if (data.length > 0) setActiveRoom(data[0] as VoiceRoom);

        // Map through each room and create a "listener" channel for presence
        activeChannels = data.map((room) => {
          // IMPORTANT: Make sure this channel name matches exactly what your
          // useWebRTC hook uses when a user actually joins a room!
          const channelName = `room:${room.id}`;
          const channel = supabase.channel(channelName);

          channel
            .on('presence', { event: 'sync' }, () => {
              const presenceState = channel.presenceState();

              // The number of top-level keys in presenceState represents unique connections
              const count = Object.keys(presenceState).length;

              setRoomCounts((prev) => ({
                ...prev,
                [room.id]: count,
              }));
            })
            .subscribe();

          return channel;
        });
      }
    };

    fetchRoomsAndSubscribe();

    // Cleanup: Unsubscribe from all presence listeners when the component unmounts
    return () => {
      activeChannels.forEach((channel) => {
        supabase.removeChannel(channel);
      });
    };
  }, []);

  // Merge the live counts into the rooms array right before returning it
  const roomsWithCounts = rooms.map((room) => ({
    ...room,
    userCount: roomCounts[room.id] || 0,
  }));

  return {
    rooms: roomsWithCounts,
    activeRoom,
    setActiveRoom,
  };
};
