import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
  type KeyboardEventHandler,
  type FC,
} from 'react';
import { Link } from 'react-router-dom';

/**
 * Project history data highlighting the iterative development,
 * user feedback integration, and technical growth of the platform.
 */
const projectHistory: {
  id: string;
  date: string;
  title: string;
  text: ReactNode;
  pics: string[];
}[] = [
  {
    id: 'ideation',
    date: 'September 2025',
    title: 'Project Ideation & Conception',
    text: (
      <>
        The concept was established in September 2025 by AJTech and BLJ. We
        recognized that the existing{' '}
        <a
          href='https://croomssched.tech'
          target='_blank'
          rel='noreferrer'
          className='text-blue-400 font-bold hover:underline focus:outline-none focus:ring-2 focus:ring-blue-400 rounded'
        >
          Crooms Bell Schedule
        </a>{' '}
        platform could benefit from a modernized interface and robust social
        features. We began gathering initial interest and mapping out user
        requirements.
      </>
    ),
    pics: [
      'https://api.croomsconnect.com/storage/v1/object/public/chat-uploads/1773006871035_rupxx1mi4.png',
      'https://api.croomsconnect.com/storage/v1/object/public/chat-uploads/1773006854598_hvwvmm4qy.png',
    ],
  },
  {
    id: 'proto1',
    date: 'Early October 2025',
    title: 'Initial Prototype Development',
    text: 'We rapidly developed an initial HTML/CSS prototype to test our core concepts. The dashboard layout drew inspiration from interactive, community-driven web wikis to create a more engaging user experience.',
    pics: [
      'https://api.croomsconnect.com/storage/v1/object/public/chat-uploads/1773006417970_pa3umphq8.png',
      'https://api.croomsconnect.com/storage/v1/object/public/chat-uploads/1773006431671_hq0563tro.png',
    ],
  },
  {
    id: 'proto2',
    date: 'October 6, 2025',
    title: 'UI/UX Refinement',
    text: 'Following internal testing, we iterated on the design to improve visual hierarchy, navigation, and overall aesthetic appeal, establishing the foundation for our first release.',
    pics: [
      'https://api.croomsconnect.com/storage/v1/object/public/chat-uploads/1773006758620_h6ohn8r0h.png',
      'https://api.croomsconnect.com/storage/v1/object/public/chat-uploads/1773006610161_qzr5vjxwu.png',
      'https://api.croomsconnect.com/storage/v1/object/public/chat-uploads/1773006610161_qzr5vjxwu.png',
    ],
  },
  {
    id: 'beta',
    date: 'October 7, 2025',
    title: 'Public Beta & Community Feedback',
    text: 'We launched our first public beta. While ambitious, the initial release highlighted critical areas for UX improvement based on direct user feedback. This phase was vital for learning, and the project even attracted attention and forks on our public GitHub repository.',
    pics: [
      'https://api.croomsconnect.com/storage/v1/object/public/chat-uploads/1773006492226_e4t46jxrd.png',
      'https://api.croomsconnect.com/storage/v1/object/public/chat-uploads/1773006497251_6xksbn5qi.png',
      'https://api.croomsconnect.com/storage/v1/object/public/chat-uploads/1773006502884_yi13wroxy.png',
      'https://api.croomsconnect.com/storage/v1/object/public/chat-uploads/1773006507881_h9bqt6b6u.png',
      'https://api.croomsconnect.com/storage/v1/object/public/chat-uploads/1773006715023_a6pr4gv9u.png',
      'https://api.croomsconnect.com/storage/v1/object/public/chat-uploads/1773006769484_vwyqdssci.png',
      'https://api.croomsconnect.com/storage/v1/object/public/chat-uploads/1773006512200_dgoj83ivz.png',
    ],
  },
  {
    id: 'pivot',
    date: 'October 9, 2025',
    title: 'Strategic Pivot & Team Expansion',
    text: 'Recognizing the need for a more scalable architecture, we temporarily paused the service to reassess our technical approach. During this period, we successfully onboarded talented developers (Ash and The_corvid) to help drive the project forward.',
    pics: [],
  },
  {
    id: 'rebuild',
    date: 'Oct 2025 - Jan 2026',
    title: 'The React Architecture Rebuild',
    text: 'Our expanded team architected and rebuilt the entire platform from the ground up using React.js and modern CSS practices. This rigorous development cycle culminated in a highly successful, stable grand release in January, demonstrating our commitment to quality and continuous learning.',
    pics: [
      'https://api.croomsconnect.com/storage/v1/object/public/chat-uploads/1773007232176_5udqnt7jn.png',
      'https://api.croomsconnect.com/storage/v1/object/public/chat-uploads/1773007223253_1k1yj5y1r.png',
      'https://api.croomsconnect.com/storage/v1/object/public/chat-uploads/1773007213905_nhzbt3avi.png',
    ],
  },
  {
    id: 'infrastructure',
    date: 'Present',
    title: 'Infrastructure Modernization',
    text: (
      <>
        To accommodate a growing user base, we migrated to a dedicated,
        high-performance hosting solution. Sponsored by{' '}
        <Link
          to='/acapoco'
          className='text-emerald-400 font-bold hover:underline focus:outline-none focus:ring-2 focus:ring-emerald-400 rounded'
        >
          @acapoco
        </Link>
        , our current infrastructure utilizes a Raspberry Pi 5 equipped with a
        500 GB SSD, ensuring long-term reliability and significantly reduced
        downtime.
      </>
    ),
    pics: [
      'https://api.croomsconnect.com/storage/v1/object/public/chat-uploads/1773007335704_53l2wnlok.jpeg',
    ],
  },
];

const socialLinks = [
  {
    name: 'GitHub',
    icon: 'fa-github',
    link: 'https://github.com/Ajcodecool',
    color: 'hover:text-white',
  },
  {
    name: 'YouTube',
    icon: 'fa-youtube',
    link: 'https://www.youtube.com/@AJTechGames',
    color: 'hover:text-red-500',
  },
  {
    name: 'Instagram',
    icon: 'fa-instagram',
    link: 'https://www.instagram.com/ajtechsz/',
    color: 'hover:text-pink-500',
  },
  {
    name: 'TikTok',
    icon: 'fa-tiktok',
    link: 'https://www.tiktok.com/@ajtech_',
    color: 'hover:text-cyan-400',
  },
];

const AjTechPortfolio: FC = () => {
  const [isLightOn, setIsLightOn] = useState(false);
  const [mousePos, setMousePos] = useState({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  });
  const [switchPos, setSwitchPos] = useState({ top: '50%', left: '50%' });
  const [isPulling, setIsPulling] = useState(false);
  const [flashSize, setFlashSize] = useState(250);

  // Portfolio View State
  const [viewMode, setViewMode] = useState<'professional' | 'casual'>(
    'professional',
  );
  const [isTransitioning, setIsTransitioning] = useState(false);

  const audioRef = useRef(
    new Audio(
      'https://api.croomsconnect.com/storage/v1/object/public/chat-uploads/1772980716798_efyya451f.mp3',
    ),
  );

  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      audio.pause();
      audio.src = '';
    };
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSwitchPos({
      top: `${Math.floor(Math.random() * 50) + 25}%`,
      left: `${Math.floor(Math.random() * 50) + 25}%`,
    });
    setFlashSize(window.innerWidth < 768 ? 180 : 250);

    const handleMove = (
      e: Partial<{
        preventDefault: () => void;
        touches: { clientX: number; clientY: number }[];
        clientX: number;
        clientY: number;
      }>,
    ): void => {
      let x, y;
      if (e.touches && e.touches.length > 0) {
        if (!isLightOn && e.preventDefault) e.preventDefault();
        x = e.touches[0].clientX;
        y = e.touches[0].clientY;
      } else {
        x = e.clientX;
        y = e.clientY;
      }
      if (typeof x === 'number' && typeof y === 'number') {
        setMousePos({ x, y });
      }
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('touchstart', handleMove, { passive: false });
    window.addEventListener('touchmove', handleMove, { passive: false });

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('touchstart', handleMove);
      window.removeEventListener('touchmove', handleMove);
    };
  }, [isLightOn]);

  const turnOnLights = useCallback(() => {
    setIsPulling(true);
    audioRef.current.currentTime = 0;
    audioRef.current.volume = 1;
    audioRef.current.play().catch(() => {});
    setTimeout(() => setIsLightOn(true), 400);
  }, []);

  const handlePullSwitch = (e: { stopPropagation: () => void }): void => {
    e.stopPropagation();
    turnOnLights();
  };

  const handleKeyDown: KeyboardEventHandler<HTMLButtonElement> = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      turnOnLights();
    }
  };

  // Switch between Professional and Casual (The Card) view
  const switchView = useCallback(
    (mode: 'professional' | 'casual') => {
      if (mode === viewMode) return;
      setIsTransitioning(true);
      setTimeout(() => {
        setViewMode(mode);
        setIsTransitioning(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 400);
    },
    [viewMode],
  );

  const handlePassportClick = (): void => {
    switchView('casual');
  };

  return (
    <div
      className={`relative bg-black transition-all duration-700 ${
        !isLightOn
          ? 'h-screen overflow-hidden select-none touch-none'
          : 'min-h-screen overflow-auto font-sans'
      }`}
    >
      {/* Background Graphic */}
      <div
        className='fixed inset-0 z-0 pointer-events-none transition-opacity duration-700'
        style={{
          opacity: isLightOn ? 1 : 0,
          backgroundImage: `url('https://api.croomsconnect.com/storage/v1/object/public/slideshow-photos/1772946793447_IMG_E4120.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        aria-hidden='true'
      >
        <div className='absolute inset-0 bg-black/85 backdrop-blur-xl'></div>
      </div>

      {/* Interactive Flashlight Effect */}
      {!isLightOn && (
        <>
          <div
            className='fixed inset-0 z-40 pointer-events-none'
            style={{
              background: `radial-gradient(circle ${flashSize}px at ${mousePos.x}px ${mousePos.y}px, rgba(255, 255, 240, 0.15) 0%, rgba(0, 0, 0, 0.98) 70%, rgba(0, 0, 0, 1) 100%)`,
            }}
            aria-hidden='true'
          />
          <div
            className='fixed z-50 pointer-events-none'
            style={{
              left: mousePos.x,
              top: mousePos.y,
              width: '4px',
              height: '4px',
              borderRadius: '50%',
              boxShadow: `0 0 40px 20px rgba(255,255,255,0.2), 0 0 100px 50px rgba(255,255,220,0.1)`,
              transform: 'translate(-50%, -50%)',
            }}
            aria-hidden='true'
          />
        </>
      )}

      {/* Interactive Light Switch UI */}
      {!isLightOn && (
        <>
          <div className='absolute top-10 left-1/2 -translate-x-1/2 z-50 text-white/40 text-xs tracking-[0.3em] uppercase animate-pulse pointer-events-none text-center'>
            Find the cord to begin
          </div>
          <button
            className={`fixed z-30 flex flex-col items-center transition-transform focus:outline-none ${
              isPulling
                ? 'translate-y-4 duration-200'
                : 'duration-300 cursor-pointer hover:scale-105'
            }`}
            style={{
              top: switchPos.top,
              left: switchPos.left,
              padding: '40px',
              transform: 'translate(-50%, -50%)',
            }}
            onClick={handlePullSwitch}
            onTouchStart={handlePullSwitch}
            onKeyDown={handleKeyDown}
            aria-label='Pull cord to turn on lights'
          >
            <div className='w-[2px] h-32 bg-gradient-to-b from-transparent via-white/20 to-white/40'></div>
            <div className='w-6 h-10 bg-zinc-300 rounded-full shadow-[0_0_30px_rgba(255,255,255,0.3)] border-b-4 border-zinc-500 ring-offset-black focus:ring-4 focus:ring-white/50'></div>
          </button>

          <button
            onClick={turnOnLights}
            className='absolute bottom-10 left-1/2 -translate-x-1/2 z-50 text-white/30 text-xs hover:text-white/80 transition-colors uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-white/50 rounded px-2 py-1'
          >
            Skip Intro
          </button>
        </>
      )}

      {/* View Toggle Bar (Only visible when lights are on) */}
      {isLightOn && (
        <div className='fixed top-6 left-1/2 -translate-x-1/2 z-[60] bg-black/50 backdrop-blur-md border border-white/10 rounded-full p-1.5 flex gap-1 shadow-2xl animate-fade-in'>
          <button
            onClick={() => switchView('professional')}
            className={`px-5 md:px-8 py-2.5 rounded-full text-[10px] md:text-xs font-black uppercase tracking-[0.2em] transition-all duration-300 ${
              viewMode === 'professional'
                ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)]'
                : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            Professional
          </button>
          <button
            onClick={() => switchView('casual')}
            className={`px-5 md:px-8 py-2.5 rounded-full text-[10px] md:text-xs font-black uppercase tracking-[0.2em] transition-all duration-300 ${
              viewMode === 'casual'
                ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]'
                : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            The Card
          </button>
        </div>
      )}

      {/* Main Content Container */}
      <main
        className={`relative z-20 flex flex-col items-center min-h-screen transition-opacity duration-500 ${
          !isLightOn
            ? 'opacity-0 pointer-events-none h-0 overflow-hidden'
            : isTransitioning
              ? 'opacity-0'
              : 'opacity-100'
        }`}
      >
        {viewMode === 'professional' ? (
          <>
            {/* Professional Hero Section */}
            <header className='flex flex-col items-center justify-center min-h-screen p-4 w-full pt-20'>
              <div className='bg-black/50 border border-white/10 p-10 md:p-16 rounded-[3rem] shadow-2xl max-w-xl w-full text-center mt-10 backdrop-blur-sm'>
                <h1 className='text-6xl md:text-8xl font-black text-white mb-2 tracking-tighter italic'>
                  AJTECH
                </h1>
                <h2 className='text-xs md:text-base text-blue-400 font-black tracking-[0.3em] mb-12 uppercase'>
                  Frontend Developer & UX Designer
                </h2>

                <div className='space-y-4 mb-12'>
                  <div className='flex items-center justify-center gap-4 bg-white/5 py-4 px-6 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors'>
                    <i
                      className='fa-solid fa-code text-blue-400'
                      aria-hidden='true'
                    ></i>
                    <p className='text-slate-200 text-sm md:text-base'>
                      Lead Developer at{' '}
                      <span className='font-bold text-white'>
                        CroomsConnect.com
                      </span>
                    </p>
                  </div>
                  <div className='flex flex-col items-center gap-1 bg-white/5 py-4 px-6 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors'>
                    <div className='flex items-center gap-3'>
                      <i
                        className='fa-solid fa-plane-up text-emerald-400'
                        aria-hidden='true'
                      ></i>
                      <p className='font-bold text-white text-sm md:text-base'>
                        Professional FPV Pilot
                      </p>
                    </div>
                    <p className='text-[10px] text-slate-400 font-mono tracking-[0.4em] uppercase'>
                      Avata 2 • Mini 2 • BetaFPV
                    </p>
                  </div>
                </div>

                {/* Passport Navigation */}
                <nav
                  className={`flex justify-center mb-10 transition-opacity duration-500 ${
                    isTransitioning ? 'opacity-0' : 'opacity-100'
                  }`}
                >
                  <button
                    onClick={handlePassportClick}
                    aria-label='View Casual Passport Card'
                    className={`group touch-manipulation focus:outline-none rounded-xl focus:ring-4 focus:ring-yellow-500/50 ${
                      isTransitioning ? 'pointer-events-none' : ''
                    }`}
                  >
                    <div className='w-32 h-44 bg-[#002447] rounded-xl border border-white/20 shadow-xl flex flex-col items-center justify-between p-5 transition-transform duration-200 hover:scale-105 active:scale-95'>
                      <div className='w-full border-t border-b border-yellow-600/40 py-1 text-[8px] text-yellow-500/80 uppercase tracking-[0.2em] font-bold'>
                        Passport
                      </div>
                      <i
                        className='fa-solid fa-earth-americas text-yellow-500/50 text-5xl'
                        aria-hidden='true'
                      ></i>
                      <div className='text-[11px] text-yellow-600 font-black uppercase tracking-widest'>
                        Portfolio
                      </div>
                    </div>
                  </button>
                </nav>

                {/* Social Links */}
                <div
                  className={`flex justify-center gap-10 transition-opacity duration-500 ${
                    isTransitioning ? 'opacity-0' : 'opacity-100'
                  }`}
                >
                  {socialLinks.map((social) => (
                    <a
                      key={social.name}
                      href={social.link}
                      target='_blank'
                      rel='noopener noreferrer'
                      aria-label={`Visit my ${social.name}`}
                      className={`text-2xl text-slate-500 transition-transform duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-white rounded ${social.color}`}
                    >
                      <i
                        className={`fa-brands ${social.icon}`}
                        aria-hidden='true'
                      ></i>
                    </a>
                  ))}
                </div>

                {/* Scroll Indicator */}
                <div
                  className='mt-10 animate-bounce opacity-40'
                  aria-hidden='true'
                >
                  <i className='fa-solid fa-arrow-down text-white text-xl'></i>
                  <p className='text-[10px] text-white tracking-widest mt-2 uppercase'>
                    Discover More
                  </p>
                </div>
              </div>
            </header>

            {/* About Section */}
            <section className='max-w-4xl mx-auto px-6 py-20 text-center w-full'>
              <h2 className='text-3xl md:text-4xl font-black text-white mb-6 tracking-tight'>
                Bridging Design & Engineering
              </h2>
              <p className='text-slate-300 text-base md:text-lg leading-relaxed max-w-2xl mx-auto'>
                I am a passionate Frontend Developer with a focus on building
                dynamic, user-centric web applications using React and Next.js.
                I thrive at the intersection of complex logic and elegant UI
                design, ensuring every project is highly functional and visually
                engaging. Beyond the screen, my experience as an FPV drone pilot
                has honed my attention to detail, quick decision-making, and
                spatial awareness—skills that directly translate into
                architecting seamless digital experiences.
              </p>
            </section>

            {/* Projects & Timeline Section */}
            <section className='w-full max-w-4xl mx-auto px-4 pb-20'>
              <div className='bg-[#0f172a]/90 border border-slate-700/60 rounded-3xl p-6 md:p-10 shadow-2xl'>
                <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-700 pb-6 mb-8 gap-4'>
                  <div>
                    <h3 className='text-3xl md:text-4xl font-black text-white tracking-tight'>
                      Crooms Connect
                    </h3>
                    <p className='text-slate-400 mt-2 text-sm md:text-base'>
                      A comprehensive, student-led social platform designed for
                      the Crooms Academy community.
                    </p>
                  </div>
                  <a
                    href='https://croomsconnect.com'
                    target='_blank'
                    rel='noreferrer'
                    className='bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-bold transition-colors text-sm shadow-lg shadow-blue-500/20 focus:outline-none focus:ring-2 focus:ring-blue-400 whitespace-nowrap'
                  >
                    Visit Live Site
                  </a>
                </div>

                {/* Iterative Timeline */}
                <div className='space-y-8 border-l-2 border-slate-700 ml-3 md:ml-4'>
                  {projectHistory.map((block) => (
                    <article key={block.id} className='relative pl-8 md:pl-10'>
                      {/* Timeline Node */}
                      <div
                        className='absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-blue-500 border-4 border-[#0f172a]'
                        aria-hidden='true'
                      ></div>

                      <div className='bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 hover:bg-slate-800/80 transition-colors'>
                        <span className='text-blue-400 text-xs font-bold tracking-widest uppercase'>
                          {block.date}
                        </span>
                        <h4 className='text-xl font-bold text-white mt-1 mb-3'>
                          {block.title}
                        </h4>
                        <p className='text-slate-300 text-sm md:text-base leading-relaxed mb-4'>
                          {block.text}
                        </p>

                        {/* Media Gallery */}
                        {block.pics.length > 0 && (
                          <div className='flex overflow-x-auto gap-4 pb-4 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent'>
                            {block.pics.map((pic, idx) => (
                              <button
                                key={idx}
                                onClick={() => window.open(pic, '_blank')}
                                className='focus:outline-none focus:ring-2 focus:ring-blue-400 rounded-lg flex-shrink-0'
                                aria-label={`View full size image ${idx + 1} for ${block.title}`}
                              >
                                <img
                                  src={pic}
                                  alt={`${block.title} visual documentation ${idx + 1}`}
                                  className='h-32 md:h-48 w-auto rounded-lg border border-slate-600 object-cover cursor-pointer hover:opacity-80 transition-opacity'
                                  loading='lazy'
                                />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </section>

            {/* Contact Section */}
            <section className='w-full max-w-4xl mx-auto px-4 py-16 text-center border-t border-slate-800/50 mb-10'>
              <h2 className='text-3xl font-black text-white mb-4'>
                Let&apos;s Build Together
              </h2>
              <p className='text-slate-400 mb-8 max-w-lg mx-auto'>
                Always open to discussing new technical challenges, creative
                collaborations, or opportunities to contribute to innovative
                teams.
              </p>
              <a
                href='mailto:hello@example.com'
                className='inline-block bg-white text-black px-8 py-4 rounded-full font-bold hover:bg-slate-200 transition-colors shadow-xl focus:outline-none focus:ring-4 focus:ring-white/50'
              >
                Get In Touch
              </a>
            </section>
          </>
        ) : (
          /* Casual / Non-Professional View (The Card) */
          <section className='flex-1 flex items-center justify-center w-full min-h-screen p-4 mt-10 md:mt-0'>
            <div className='relative w-full max-w-md bg-gradient-to-br from-[#001a33] to-[#000a14] rounded-3xl border border-white/10 shadow-[0_0_60px_rgba(0,36,71,0.6)] flex flex-col items-center p-10 transition-transform duration-500 hover:scale-[1.02] overflow-hidden group'>
              {/* Shine Hover Effect */}
              <div className='absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none'></div>

              <div className='w-full border-t border-b border-yellow-600/40 py-2 text-center text-[10px] text-yellow-500/80 uppercase tracking-[0.4em] font-black mb-8'>
                Creator Passport
              </div>

              <div className='relative w-40 h-40 rounded-full border-4 border-yellow-600/30 flex items-center justify-center bg-black/40 mb-8 shadow-inner'>
                <i
                  className='fa-solid fa-earth-americas text-yellow-500/60 text-7xl drop-shadow-[0_0_20px_rgba(234,179,8,0.4)]'
                  aria-hidden='true'
                ></i>
              </div>

              <h3 className='text-4xl font-black text-white tracking-tighter italic mb-2'>
                AJTECH
              </h3>
              <p className='text-blue-400 text-sm font-black tracking-[0.3em] uppercase mb-8 text-center'>
                Digital Creator
              </p>

              <div className='flex flex-col gap-4 w-full text-slate-300'>
                <div className='flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/5 hover:bg-white/10 transition-colors'>
                  <span className='font-bold flex items-center gap-3 text-base'>
                    <i className='fa-solid fa-plane-up text-emerald-400 text-xl'></i>{' '}
                    FPV Pilot
                  </span>
                  <span className='text-xs opacity-50 uppercase tracking-widest font-mono'>
                    Avata 2
                  </span>
                </div>
                <div className='flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/5 hover:bg-white/10 transition-colors'>
                  <span className='font-bold flex items-center gap-3 text-base'>
                    <i className='fa-solid fa-gamepad text-purple-400 text-xl'></i>{' '}
                    Gaming
                  </span>
                  <span className='text-xs opacity-50 uppercase tracking-widest font-mono'>
                    YouTube
                  </span>
                </div>
              </div>

              <div className='mt-10 flex justify-center gap-8 w-full pt-8 border-t border-white/10'>
                {socialLinks.map((social) => (
                  <a
                    key={social.name}
                    href={social.link}
                    target='_blank'
                    rel='noopener noreferrer'
                    aria-label={`Visit my ${social.name}`}
                    className={`text-2xl text-slate-500 transition-transform duration-200 hover:scale-125 focus:outline-none focus:ring-2 focus:ring-white rounded ${social.color}`}
                  >
                    <i
                      className={`fa-brands ${social.icon}`}
                      aria-hidden='true'
                    ></i>
                  </a>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Footer Actions */}
        <footer className='w-full text-center pb-10 mt-10'>
          <button
            onClick={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
              setTimeout(() => {
                setIsLightOn(false);
                setIsPulling(false);
                setViewMode('professional'); // Reset the view to professional on exit
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
              }, 400);
            }}
            className='text-xs text-slate-500 hover:text-white uppercase tracking-widest font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 rounded px-3 py-2'
          >
            Kill Lights
          </button>
        </footer>
      </main>
    </div>
  );
};

export default AjTechPortfolio;
