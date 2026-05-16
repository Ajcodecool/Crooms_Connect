import { useState, useEffect, type FC, type ReactNode, type ReactElement } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useParams,
} from 'react-router-dom';
import { supabase } from './supabaseClient';

// === PAGE IMPORTS ===
// @ts-expect-error - ZenModeWrapper is a JSX file missing declaration typesS
import ZenModeWrapper from './components/ZenModeWrapper'; 
import Chat from './pages/Chat';
import ConnectDirect from './pages/ConnectDirect';
import ModTavern from './pages/ModTavern';
import Settings from './pages/Settings';
import Themes from './pages/Themes';
import Admin from './pages/Admin';
import DMMod from './pages/DMMod';
import ScheduleEditor from './pages/ScheduleEditor';
import AuthPage from './pages/AuthPage';
import Verification from './pages/Verification';
import Badges from './pages/Badges';
import CanvasChat from './pages/CanvasChat';
import UserProfile from './pages/UserProfile';
import ProfileEditor from './pages/ProfileEditor';
import Apps from './pages/Apps';
import Tools from './pages/Tools';
import ChatVoid from './pages/ChatVoid';
import Stats from './pages/Stats';
import Mindful from './pages/Mindful';
import MessageIndexViewer from './pages/MessageIndexViewer';
import Friends from './pages/Friends';
import ArtWall from './pages/ArtWall'; 
import PatelProject from './pages/Project';

// === NEW AWARDS IMPORT ===
import ModAwards2026 from './pages/ModAwards2026';

// === NEW DEBUGGER IMPORT ===
import JumpscareDebugger from './pages/JumpscareDebugger';

// === NEW IGOR IMPORT ===
import ZeroGravityIgor from './pages/ZeroGravityIgor';

// === SUBDOMAIN IMPORTS ===
import PiDashboard from './pages/PiDashboard';
import SupportChat from './pages/SupportChat';
import AjTechPortfolio from './pages/AjTechPortfolio';
import PassportPage from './pages/PassportPage';
import BioEOC from './pages/BioEOC';
import News from './pages/News';

// === NEW CONNECT PLACE, RADIO & VOICE IMPORTS ===
import ConnectPlace from './pages/ConnectPlace';
import ConnectRadio from './pages/ConnectRadio';
import ConnectVoice from './pages/ConnectVoice';

// === PASSWORD RESET IMPORT ===
import PassReset from './pages/PassReset';

// === GLOBAL COMPONENTS ===
import WeatherBanner from './components/WeatherBanner';
import FoxyScare from './components/FoxyScare';
import GlobalDMNotification from './components/GlobalDMNotification';
import RouteBanGuard from './components/RouteBanGuard';
import type { Session } from '@supabase/supabase-js';

// === 404 COMPONENT ===
const NotFound: FC = (): ReactElement => {
  return (
    <div className='flex flex-col items-center justify-center min-h-[80vh] bg-slate-900 text-white text-center p-6'>
      <h1 className='text-8xl font-bold mb-2 text-blue-500'>404</h1>
      <h2 className='text-3xl font-semibold mb-8'>Are you at a loss?</h2>
      <img
        src='https://cdn-useast1.kapwing.com/static/templates/loss-meme-template-regular-7bd3f11a.webp'
        alt='Loss Meme'
        className='max-w-full h-auto md:max-w-2xl border-4 border-slate-700 rounded-lg shadow-xl'
      />
    </div>
  );
};

// === LEGACY PROFILE REDIRECT ===
const LegacyProfileRedirect: FC = (): ReactElement => {
  const { username } = useParams();
  const [status, setStatus] = useState('loading');

  useEffect((): void => {
    const checkUserExists = async (): Promise<void> => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('username')
          .eq('username', username)
          .single();

        if (data) setStatus('found');
        else setStatus('not_found');
      } catch {
        setStatus('not_found');
      }
    };

    checkUserExists();
  }, [username]);

  if (status === 'loading') {
    return (
      <div className='h-screen w-screen flex items-center justify-center bg-slate-900'>
        <div className='w-10 h-10 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin'></div>
      </div>
    );
  }

  if (status === 'not_found') return <NotFound />;

  return <Navigate to={`/profile/${username}`} replace />;
};

// === VERIFIED ROUTE WRAPPER ===
// Ensures the user has "is_verified" set to true in their profile
const VerifiedRoute: FC<{ session: Session; children: ReactNode }> = ({ session, children }): ReactElement | null => {
  const [isVerified, setIsVerified] = useState<boolean | null>(null);

  useEffect((): void => {
    const checkVerification = async (): Promise<void> => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('is_verified')
          .eq('id', session.user.id)
          .single();
        setIsVerified(!!data?.is_verified);
      } catch (err) {
        console.error("Failed to check verification status", err);
        setIsVerified(false);
      }
    };
    checkVerification();
  }, [session.user.id]);

  if (isVerified === null) {
    return (
      <div className='h-screen w-screen flex items-center justify-center bg-slate-900'>
        <div className='w-10 h-10 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin'></div>
      </div>
    );
  }

  return isVerified ? <>{children}</> : <Navigate to="/" replace />;
};


const App: FC = (): ReactElement => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const hostname = window.location.hostname;
  const isPiSubdomain = hostname.startsWith('pi.');
  const isSupportSubdomain = hostname.startsWith('support.');
  const isAjTechSubdomain = hostname.startsWith('ajtech.');
  const isBioEocSubdomain = hostname.startsWith('bioeoc.'); 

  useEffect((): (() => void) => {
    supabase.auth.getSession().then(({ data: { session } }): void => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session): void => {
      setSession(session);
      setLoading(false);
    });

    return (): void => subscription.unsubscribe();
  }, []);

  const handleManualLogin = (newSession: Session | null): void =>
    setSession(newSession);

  const handleLogout = async (): Promise<void> => {
    if (session?.user?.id !== 'guest_user') {
      await supabase.auth.signOut();
    }
    setSession(null);
  };

  // <--- CHANGED: Skip the Supabase loading screen entirely for the BioEOC subdomain so it loads instantly for everyone --->
  if (loading && !isBioEocSubdomain) {
    return (
      <div className='h-screen w-screen flex items-center justify-center bg-slate-900'>
        <div className='w-10 h-10 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin'></div>
      </div>
    );
  }

  // === SUBDOMAIN ROUTING ===
  
  // Public Bio EOC Route (No Auth Required)
  if (isBioEocSubdomain) {
    return (
      <Router>
        <Routes>
          <Route path='/' element={<BioEOC />} />
          <Route path='*' element={<NotFound />} />
        </Routes>
      </Router>
    );
  }

  if (isPiSubdomain) {
    return (
      <Router>
        <Routes>
          <Route path='/' element={<PiDashboard />} />
          <Route path='*' element={<NotFound />} />
        </Routes>
      </Router>
    );
  }

  if (isSupportSubdomain) {
    return (
      <Router>
        <Routes>
          <Route
            path='/auth'
            element={
              !session ? (
                <AuthPage onLoginSuccess={handleManualLogin} />
              ) : (
                <Navigate to='/' replace />
              )
            }
          />
          <Route path='/' element={<SupportChat session={session!} />} />
          <Route path='*' element={<NotFound />} />
        </Routes>
      </Router>
    );
  }

  if (isAjTechSubdomain) {
    return (
      <Router>
        <Routes>
          <Route path='/passport' element={<PassportPage />} />
          <Route path='/' element={<AjTechPortfolio />} />
          <Route path='*' element={<NotFound />} />
        </Routes>
      </Router>
    );
  }

  // === MAIN APP ===
  return (
    <Router>
     <RouteBanGuard>
      <WeatherBanner />
      <FoxyScare />
      <GlobalDMNotification session={session} />

      <div style={{ paddingTop: '40px' }}>
        <Routes>
          <Route
            path='/'
            element={
              <ZenModeWrapper session={session} onLogout={handleLogout} />
            }
          />

          <Route
            path='/auth'
            element={
              !session ? (
                <AuthPage onLoginSuccess={handleManualLogin} />
              ) : (
                <Navigate to='/' replace />
              )
            }
          />

          <Route
            path='/users'
            element={
              session ? (
                <Friends session={session!} />
              ) : (
                <Navigate to='/auth' replace />
              )
            }
          />

          <Route
            path='/artwall'
            element={
              session ? (
                <ArtWall session={session!} />
              ) : (
                <Navigate to='/auth' replace />
              )
            }
          />

          <Route
            path='/news'
            element={
              session ? (
                <News session={session!} />
              ) : (
                <Navigate to='/auth' replace />
              )
            }
          />


          <Route
            path='/chat'
            element={session ? <Chat /> : <Navigate to='/auth' replace />}
          />

          <Route
            path='/messages'
            element={
              session ? <ConnectDirect /> : <Navigate to='/auth' replace />
            }
          />

          <Route
            path='/message-index'
            element={
              session ? <MessageIndexViewer /> : <Navigate to='/auth' replace />
            }
          />

          <Route
            path='/chat/void'
            element={
              session ? (
                <ChatVoid session={session!} />
              ) : (
                <Navigate to='/auth' replace />
              )
            }
          />

          <Route
            path='/mindful'
            element={session ? <Mindful /> : <Navigate to='/auth' replace />}
          />

          <Route
            path='/canvas'
            element={session ? <CanvasChat /> : <Navigate to='/auth' replace />}
          />

          <Route
            path='/stats'
            element={
              session ? (
                <Stats session={session!} />
              ) : (
                <Navigate to='/auth' replace />
              )
            }
          />

          <Route
            path='/place'
            element={
              session ? (
                <ConnectPlace session={session!} />
              ) : (
                <Navigate to='/auth' replace />
              )
            }
          />

          <Route
            path='/radio'
            element={
              session ? <ConnectRadio /> : <Navigate to='/auth' replace />
            }
          />

          <Route
            path='/voice'
            element={
              session ? (
                <ConnectVoice session={session!} />
              ) : (
                <Navigate to='/auth' replace />
              )
            }
          />

          <Route
            path='/support'
            element={
              session ? (
                <SupportChat session={session!} />
              ) : (
                <Navigate to='/auth' replace />
              )
            }
          />

          <Route
            path='/support/:ticketId'
            element={
              session ? (
                <SupportChat session={session!} />
              ) : (
                <Navigate to='/auth' replace />
              )
            }
          />

          <Route
            path='/settings'
            element={
              session ? (
                <Settings session={session!} />
              ) : (
                <Navigate to='/auth' replace />
              )
            }
          />

          <Route
            path='/themes'
            element={session ? <Themes /> : <Navigate to='/auth' replace />}
          />

          <Route
            path='/editor'
            element={
              session ? (
                <ProfileEditor session={session!} />
              ) : (
                <Navigate to='/auth' replace />
              )
            }
          />

          <Route
            path='/admin'
            element={
              session ? (
                <Admin session={session!} />
              ) : (
                <Navigate to='/auth' replace />
              )
            }
          />

          <Route
            path='/mod-tavern'
            element={session ? <ModTavern /> : <Navigate to='/auth' replace />}
          />

          {/* === CONNECT MOD AWARDS ROUTEw === */}
          <Route
            path='/mod-awards'
            element={
              session ? (
                <ModAwards2026 />
              ) : (
                <Navigate to='/auth' replace />
              )
            }
          />

          <Route
            path='/dmmod'
            element={
              session ? (
                <DMMod session={session!} />
              ) : (
                <Navigate to='/auth' replace />
              )
            }
          />

          {/* === PASSWORD RESET ROUTE (VERIFIED ONLY) === */}
          <Route
            path='/passreset'
            element={
              session ? (
                <VerifiedRoute session={session!}>
                  <PassReset />
                </VerifiedRoute>
              ) : (
                <Navigate to='/auth' replace />
              )
            }
          />

          <Route
            path='/admin/schedule'
            element={
              session ? (
                <ScheduleEditor session={session!} />
              ) : (
                <Navigate to='/auth' replace />
              )
            }
          />

          <Route
            path='/pi'
            element={
              session ? <PiDashboard /> : <Navigate to='/auth' replace />
            }
          />

          <Route
            path='/verify'
            element={
              session ? (
                <Verification session={session!} />
              ) : (
                <Navigate to='/auth' replace />
              )
            }
          />

          <Route
            path='/badges'
            element={
              session ? (
                <Badges session={session!} />
              ) : (
                <Navigate to='/auth' replace />
              )
            }
          />

          <Route
            path='/apps'
            element={session ? <Apps /> : <Navigate to='/auth' replace />}
          />

          <Route
            path='/tools'
            element={session ? <Tools /> : <Navigate to='/auth' replace />}
          />

          <Route
            path='/tyler'
            element={<ZeroGravityIgor />}
          />

          {/* === DEBUGGER ROUTE === */}
          <Route 
            path='/debug-scare' 
            element={
              session ? (
                <JumpscareDebugger />
              ) : (
                <Navigate to='/auth' replace />
              )
            } 
          />

          <Route
            path='/profile/:username'
            element={
              session ? <UserProfile /> : <Navigate to='/auth' replace />
            }
          />

<Route
  caseSensitive
  path='/PatelProject'
  element={<PatelProject />}
/>

          
          <Route path='/:username' element={<LegacyProfileRedirect />} />

          <Route path='*' element={<NotFound />} />
        </Routes>
      </div>
     </RouteBanGuard>
    </Router>
  );
};

export default App;
