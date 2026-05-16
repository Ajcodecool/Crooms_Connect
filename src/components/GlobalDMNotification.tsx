import { useEffect, useState, useRef, type FC } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate, useLocation } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import type { Notification } from '../utils/databaseDefinitions';

const GlobalDMNotification: FC<{ session: Session | null }> = ({ session }) => {
  const [notification, setNotification] = useState<Notification | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const timeoutRef = useRef<number>(null); // 🚨 Added to prevent rapid-fire message glitching

  useEffect(() => {
    // Don't run if no user is logged in
    if (!session?.user?.id) return;

    // Listen to real-time inserts on your DMs table
    const channel = supabase
      .channel('global-dm-listener')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `receiver_id=eq.${session.user.id}`,
        },
        async (payload) => {
          // If the user is ALREADY on the messages page, don't show the global toast
          if (location.pathname.includes('/messages')) return;

          // Fetch the sender's details for the UI
          const { data: sender } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', payload.new.sender_id)
            .single();

          // Fallback avatar generator matching your app's logic
          const getDefaultAvatar = (name: string): string => {
            if (!name) return '/DP1.jpg';
            let hash = 0;
            for (let i = 0; i < name.length; i++)
              hash = name.charCodeAt(i) + ((hash << 5) - hash);
            return `/DP${(Math.abs(hash) % 4) + 1}.jpg`;
          };

          // Try getting custom avatar from storage, or fallback to default
          let avatarToUse = sender?.avatar_url;
          if (!avatarToUse) {
            const { data } = supabase.storage
              .from('profile-pictures')
              .getPublicUrl(`${payload.new.sender_id}.png`);
            avatarToUse = data?.publicUrl
              ? `${data.publicUrl}?t=${new Date().getTime()}`
              : getDefaultAvatar(sender?.username);
          }

          setNotification({
            id: payload.new.id,
            senderName: sender?.username || 'Someone',
            avatar: avatarToUse,
            message: payload.new.message,
          });

          // 🚨 Clear existing timeout if a new message comes in fast so it doesn't flicker
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = window.setTimeout(
            () => setNotification(null),
            5000,
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [session, location.pathname]);

  if (!notification) return null;

  return (
    // 🚨 REMOVED useTheme hooks from here so it stops breaking your main layout.
    // 🚨 ADDED pointer-events-none to the wrapper so it doesn't block background clicks.
    <div className='fixed top-6 right-6 z-[99999] animate-in slide-in-from-right fade-in duration-300 pointer-events-none'>
      <div
        onClick={() => {
          setNotification(null);
          navigate('/messages');
        }}
        // 🚨 ADDED pointer-events-auto to the toast itself so it is still clickable.
        // Deepened the glassmorphism slightly so it always stands out regardless of theme.
        className='pointer-events-auto bg-black/60 backdrop-blur-xl border border-white/10 p-3 rounded-2xl shadow-2xl flex items-center gap-3 cursor-pointer hover:bg-black/80 transition-all w-72 group'
      >
        <img
          src={notification.avatar}
          alt='Sender Avatar'
          className='w-10 h-10 rounded-full object-cover border border-white/20 shadow-sm shrink-0'
          onError={(e) => {
            e.currentTarget.src = '/DP1.jpg';
          }}
        />
        <div className='flex-1 min-w-0'>
          <p className='text-sm font-bold text-white truncate'>
            {notification.senderName}
          </p>
          <p className='text-xs text-white/60 truncate mt-0.5 font-medium'>
            {notification.message.replace(/<[^>]*>?/gm, '') ||
              'Sent an attachment'}
          </p>
        </div>
        <div className='w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)] shrink-0 mr-1 opacity-80 animate-pulse'></div>
      </div>
    </div>
  );
};

export default GlobalDMNotification;
