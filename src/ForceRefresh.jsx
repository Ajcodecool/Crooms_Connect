/* DO NOT TOUCH THIS FILE IF YOU ARE NOT ACAPOCO OR IT IS TRULY BROKEN THEN CONTACT ACAPOCO *COUGH COUGH* STARGAZER *COUGH COUGH* */
import { useEffect } from 'react';
import { supabase } from './supabaseClient';

const ForceRefresh = () => {
  useEffect(() => {
    const channel = supabase
      .channel('global-app-events')
      .on('broadcast', { event: 'force_refresh' }, (payload) => {
        console.log('Broadcast refresh signal received. Reloading...', payload);
        window.location.reload();
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'system_settings',
        },
        (payload) => {
          const record = payload.new;
          if (record && record.key === 'force_refresh_signal') {
            console.log('Database refresh signal received. Reloading...');
            window.location.reload();
          }
        },
      );

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('ForceRefresh is listening for signals...');
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return null;
};

export default ForceRefresh;
