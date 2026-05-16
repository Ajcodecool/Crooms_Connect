import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

export interface PeerProfile {
  username?: string;
  avatar_url?: string;
}

export const usePeerProfiles = (
  peersInRoom: string[],
): Record<string, PeerProfile> => {
  const [profiles, setProfiles] = useState<Record<string, PeerProfile>>({});

  useEffect(() => {
    const fetchProfiles = async (): Promise<void> => {
      // Find which peers we don't have profiles for yet
      const peersToFetch = peersInRoom.filter((id) => !profiles[id]);

      if (peersToFetch.length === 0) return;

      // ⚠️ Change 'profiles' to your actual users table name if it's different!
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', peersToFetch);

      if (error) {
        console.error('Error fetching profiles:', error);
        return;
      }

      if (data) {
        setProfiles((prev) => {
          const updated = { ...prev };
          data.forEach((p) => {
            updated[p.id] = {
              username: p.username,
              avatar_url: p.avatar_url,
            };
          });
          return updated;
        });
      }
    };

    fetchProfiles();
  }, [peersInRoom, profiles]);

  return profiles;
};
