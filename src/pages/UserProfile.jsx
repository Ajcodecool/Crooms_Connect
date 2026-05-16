import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { getDefaultAvatar } from '../utils/chatUtils';
import { badgeDefinitions } from '../data/badges';
import { DraggableWidget } from '../components/editor/DraggableWidget';

const fontLookup = {
  sans: 'ui-sans-serif, system-ui, sans-serif',
  serif: 'ui-serif, Georgia, serif',
  mono: 'ui-monospace, SFMono-Regular, monospace',
  humanist: '"Trebuchet MS", "Lucida Grande", Tahoma, sans-serif',
};

const UserProfile = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setCurrentUser(session?.user || null);

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .ilike('username', username)
          .single();

        if (profileError || !profileData) throw new Error('User not found.');

        // Legacy Support / Perfect Grid Factory Layout
        if (!profileData.widgets || profileData.widgets.length === 0) {
          const defaultStyle = {
            backgroundColor: '#1e293b',
            textColor: '#ffffff',
            opacity: 0.9,
            borderRadius: '16px',
            fontFamily: profileData.font_family || 'sans',
          };
          profileData.widgets = [
            {
              id: 'default-image',
              type: 'image',
              x: 20,
              y: 140,
              width: 320,
              height: 320,
              zIndex: 20,
              content:
                'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop',
              style: { ...defaultStyle },
            },
            {
              id: 'profile-card',
              type: 'system-card',
              x: 360,
              y: 140,
              width: 680,
              height: 320,
              zIndex: 21,
              style: { ...defaultStyle },
            },
            {
              id: 'default-spotify',
              type: 'spotify',
              x: 20,
              y: 480,
              width: 320,
              height: 152,
              zIndex: 22,
              content: 'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT',
              style: { ...defaultStyle },
            },
            {
              id: 'feed',
              type: 'system-feed',
              x: 360,
              y: 480,
              width: 680,
              height: 400,
              zIndex: 23,
              style: { ...defaultStyle },
            },
            {
              id: 'default-text',
              type: 'text',
              x: 20,
              y: 652,
              width: 320,
              height: 228,
              zIndex: 24,
              content:
                'Welcome to my profile!\n\nFeel free to leave a message in the feed.',
              style: { ...defaultStyle },
            },
          ];
        }

        setProfile(profileData);

        const { data: msgData } = await supabase
          .from('messages')
          .select('*')
          .eq('user_id', profileData.id)
          .eq('is_deleted', false)
          .order('timestamp', { ascending: false })
          .limit(50);
        setMessages(msgData || []);
      } catch {
        setError('User not found.');
      } finally {
        setLoading(false);
      }
    };
    if (username) fetchData();
  }, [username]);

  const renderBadges = (badgeData) => {
    if (!badgeData) return null;
    let badges = [];
    try {
      if (Array.isArray(badgeData)) badges = badgeData;
      else if (typeof badgeData === 'string' && badgeData.startsWith('['))
        badges = JSON.parse(badgeData);
      else badges = [badgeData];
    } catch {
      return null;
    }

    return (
      <div className='flex gap-2 mt-3 flex-wrap justify-center md:justify-start'>
        {badges.map((bId, i) => {
          const def = badgeDefinitions.find((d) => d.id === bId);
          if (!def) return null;
          return (
            <img
              key={i}
              src={def.fileName}
              alt={def.name}
              title={def.name}
              className='w-8 h-8 drop-shadow-md hover:scale-110 transition-transform'
            />
          );
        })}
      </div>
    );
  };

  const getPageHeight = () => {
    if (!profile?.widgets || profile.widgets.length === 0) return '1000px';
    const maxY = profile.widgets.reduce((max, w) => {
      const bottom = (Number(w.y) || 0) + (Number(w.height) || 0);
      return Math.max(max, bottom);
    }, 0);
    return `${Math.max(1000, maxY + 200)}px`;
  };

  if (loading)
    return (
      <div className='h-screen bg-slate-950 flex items-center justify-center text-slate-500'>
        Loading Profile...
      </div>
    );
  if (error)
    return (
      <div className='h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-4'>
        <p>{error}</p>
        <button onClick={() => navigate('/chat')} className='text-blue-400'>
          Return to Chat
        </button>
      </div>
    );

  return (
    <div
      className='h-screen w-screen overflow-hidden bg-black relative'
      style={{ fontFamily: fontLookup[profile.font_family] || 'sans-serif' }}
    >
      {/* FIXED NAVIGATIOON */}
      <div className='fixed top-0 left-0 right-0 z-[100] p-6 flex items-center justify-between pointer-events-none'>
        <button
          onClick={() => navigate('/chat')}
          className='pointer-events-auto w-12 h-12 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md border border-white/10 shadow-lg transition-all hover:scale-105'
          title='Back to Chat'
        >
          <i className='fa-solid fa-arrow-left text-lg'></i>
        </button>

        {currentUser?.id === profile.id && (
          <button
            onClick={() => navigate('/editor')}
            className='pointer-events-auto px-5 py-2.5 rounded-full font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white shadow-xl hover:shadow-blue-500/20 hover:scale-105 transition-all flex items-center gap-2 border border-white/10'
          >
            <i className='fa-solid fa-pen-ruler'></i> Edit Profile
          </button>
        )}
      </div>

      {/* FULL-SCREEN FIXED BACKGROUND */}
      <div
        className='absolute inset-0 z-0 bg-cover bg-center pointer-events-none'
        style={{
          backgroundColor: profile.background_url
            ? 'transparent'
            : profile.background_color,
          backgroundImage: profile.background_url
            ? `url(${profile.background_url})`
            : 'none',
        }}
      >
        {profile.background_url && (
          <div className='absolute inset-0 bg-black/40'></div>
        )}
      </div>

      {/* SCROLLING VIEWPORT */}
      <div className='absolute inset-0 z-10 overflow-auto custom-scrollbar'>
        {/* SCALING WRAPPER (Prevents left-clipping on zoom out) */}
        <div className='min-h-full w-full min-w-fit flex justify-center relative'>
          {/* BANNER (Stretches full width of the wrapper) */}
          <div
            className='absolute top-0 left-0 w-full h-64 bg-cover bg-center z-0 pointer-events-none'
            style={{
              backgroundImage: profile.banner_url
                ? `url(${profile.banner_url})`
                : 'linear-gradient(to right, #1e293b, #0f172a)',
            }}
          >
            <div className='absolute inset-0 bg-black/30'></div>
          </div>

          {/* 1060px STRICT CANVAS */}
          <div
            className='relative w-[1060px] shrink-0 mt-20 z-10'
            style={{ height: getPageHeight() }}
          >
            {profile.widgets.map((widget) => (
              <DraggableWidget
                key={widget.id}
                id={widget.id}
                data={widget}
                isSelected={false}
                isEditMode={false}
              >
                {widget.type === 'system-card' && (
                  <div className='flex flex-col md:flex-row h-full p-6 md:p-10 gap-8'>
                    <div className='shrink-0 flex flex-col items-center md:items-start'>
                      <img
                        src={
                          profile.avatar_url ||
                          getDefaultAvatar(profile.username)
                        }
                        alt='Avatar'
                        className='w-32 h-32 md:w-48 md:h-48 rounded-full border-4 shadow-2xl object-cover'
                        style={{ borderColor: profile.theme_color }}
                      />
                      {renderBadges(profile.badges)}
                    </div>
                    <div className='flex-1 flex flex-col justify-center text-center md:text-left'>
                      <h1 className='text-3xl md:text-5xl font-black mb-2 tracking-tight'>
                        {profile.username}
                      </h1>
                      {profile.pronouns && (
                        <span
                          className='inline-block px-3 py-1 rounded-full text-xs font-bold mb-4 w-fit mx-auto md:mx-0'
                          style={{
                            backgroundColor: `${profile.theme_color}30`,
                            color: profile.theme_color,
                          }}
                        >
                          {profile.pronouns}
                        </span>
                      )}
                      <p className='text-sm md:text-base leading-relaxed opacity-90 max-w-2xl whitespace-pre-wrap break-words'>
                        {profile.bio || "This user hasn't written a bio yet."}
                      </p>
                    </div>
                  </div>
                )}

                {widget.type === 'system-feed' && (
                  <div className='h-full flex flex-col p-6'>
                    <div className='border-b border-white/10 pb-4 mb-4 flex items-center gap-3'>
                      <i className='fa-solid fa-message text-xl'></i>
                      <span className='font-bold uppercase tracking-widest text-sm'>
                        Activity Feed
                      </span>
                    </div>
                    <div className='flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4'>
                      {messages.length > 0 ? (
                        messages.map((msg) => (
                          <div
                            key={msg.id}
                            className='p-4 rounded-xl bg-white/5 border border-white/10 shadow-sm'
                          >
                            <div className='text-xs opacity-50 mb-2 font-mono'>
                              {new Date(msg.timestamp).toLocaleDateString()}
                            </div>
                            <div className='text-sm break-words flex-1'>
                              <div
                                dangerouslySetInnerHTML={{
                                  __html: msg.message,
                                }}
                              />
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className='h-full flex flex-col items-center justify-center opacity-50'>
                          <i className='fa-solid fa-ghost text-2xl mb-2'></i>
                          <p className='text-xs'>No messages yet.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {widget.type === 'text' && (
                  <div
                    className='w-full h-full p-6 whitespace-pre-wrap overflow-hidden'
                    style={{ fontSize: '1rem' }}
                  >
                    {widget.content}
                  </div>
                )}

                {widget.type === 'image' && (
                  <img
                    src={widget.content}
                    alt='User widget'
                    className='w-full h-full object-cover pointer-events-none'
                  />
                )}

                {widget.type === 'spotify' && null}

                {widget.type === 'shape' && (
                  <div className='w-full h-full'></div>
                )}
              </DraggableWidget>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
