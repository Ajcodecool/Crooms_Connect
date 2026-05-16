import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

import { supabase } from '../supabaseClient';
import { BANNED_EMAILS } from '../utils/adminConstants';
import { BannedOverlay } from './chat/ChatOverlays';
import { enforceBanForThisDevice } from '../utils/banEnforcement';

const GUARDED_ROUTES = [
  '/chat',
  '/artwall',
  '/messages',
  '/badges',
  '/radio',
  '/voice',
];

interface RouteBanGuardProps {
  children: ReactNode;
}

export default function RouteBanGuard({
  children,
}: RouteBanGuardProps): ReactNode {
  const location = useLocation();

  // 1. Initialize to true. It will only show the spinner when the app first loads this component.
  const [loadingBanState, setLoadingBanState] = useState(true);
  const [isBanned, setIsBanned] = useState(false);
  const [banReason, setBanReason] = useState('');

  const shouldGuardThisRoute = useMemo(() => {
    return GUARDED_ROUTES.some(
      (route) =>
        location.pathname === route ||
        location.pathname.startsWith(route + '/'),
    );
  }, [location.pathname]);

  useEffect(() => {
    let isMounted = true;

    const markAndEnforceBan = async (): Promise<void> => {
      try {
        await enforceBanForThisDevice();
      } catch {
        // ignore
      }
    };

    const loadBanState = async (): Promise<void> => {
      if (!shouldGuardThisRoute) {
        if (isMounted) {
          setLoadingBanState(false);
          setIsBanned(false);
          setBanReason('');
        }
        return;
      }

      // We intentionally DO NOT set loading back to true here.
      // This ensures tab-focus checks happen silently in the background.

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (!session?.user) {
          setIsBanned(false);
          setBanReason('');
          return;
        }

        if (session.user.email && BANNED_EMAILS.includes(session.user.email)) {
          setIsBanned(true);
          setBanReason('Your account has been permanently suspended.');
          await markAndEnforceBan();
          return;
        }

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('isbanned, banreason')
          .eq('id', session.user.id)
          .single();

        if (!isMounted) return;

        if (error) {
          console.error('Failed to load ban state:', error);
          setIsBanned(false);
          setBanReason('');
        } else {
          setIsBanned(!!profile?.isbanned);
          setBanReason(
            profile?.banreason || 'Your account has been suspended.',
          );
        }
      } catch (err) {
        console.error('Ban guard error:', err);
        if (isMounted) {
          setIsBanned(false);
          setBanReason('');
        }
      } finally {
        if (isMounted) {
          // 2. Only ever turn the loading state OFF.
          setLoadingBanState(false);
        }
      }
    };

    loadBanState();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      // This will now run completely silently without triggering a UI flash
      loadBanState();
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe?.();
    };
  }, [shouldGuardThisRoute]);

  if (!shouldGuardThisRoute) {
    return children;
  }

  if (loadingBanState) {
    return (
      <div className='min-h-screen flex items-center justify-center text-slate-400'>
        <i className='fa-solid fa-circle-notch fa-spin mr-2' />
        Checking account status...
      </div>
    );
  }

  if (isBanned) {
    return <BannedOverlay reason={banReason} />;
  }

  return children;
}
