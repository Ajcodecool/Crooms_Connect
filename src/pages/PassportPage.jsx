import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export default function PassportPage() {
  const navigate = useNavigate();
  const [currentCountryIndex, setCurrentCountryIndex] = useState(0);
  const [photoIndex, setPhotoIndex] = useState(0);

  // Audio References
  const audioRef = useRef(new Audio());
  const fadeIntervalRef = useRef(null);

  const passportData = [
    {
      country: 'United States',
      date: '2011 - RESIDENT',
      location: 'Florida',
      code: 'USA',
      mapUrl:
        'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3505.123456789!2d-81.379236!3d28.538335!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x88e773d2fec7d0ad%3A0x3c4562084851a1e!2sFlorida!5e0!3m2!1sen!2sus!4v123456789',
      images: [
        'https://api.croomsconnect.com/storage/v1/object/public/chat-uploads/1772981599034_usemus74z.png',
        'https://api.croomsconnect.com/storage/v1/object/public/chat-uploads/1772981561281_d3qav7kdd.png',
      ],
    },
    {
      country: 'Trinidad and Tobago',
      date: '2015',
      location: 'Port of Spain',
      code: 'TTO',
      mapUrl:
        'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d125435.03155823528!2d-61.59013088716298!3d10.666680718742598!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8c3608103369f69b%3A0x6b971a1c97a55f9a!2sPort%20of%20Spain%2C%20Trinidad%20and%20Tobago!5e0!3m2!1sen!2sus!4v123456789',
      images: [
        'https://cdn.britannica.com/37/199537-050-278CE212/Port-of-Spain-Trinidad-Tobago.jpg',
        'https://media.worldnomads.com/social-share-images/central-america/trinidad-and-tobago-crime-social.jpg',
      ],
    },
    {
      country: 'France',
      date: '2018',
      location: 'Paris / Europe',
      code: 'FRA',
      mapUrl:
        'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2624.9916256937604!2d2.29229261567119!3d48.85837007928746!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47e66e2964e34e2d%3A0x8ddca97e440e207e!2sEiffel%20Tower!5e0!3m2!1sen!2sus!4v123456789',
      images: [
        'https://api.croomsconnect.com/storage/v1/object/public/chat-uploads/1772981767114_9lso9u5cj.png',
        'https://api.croomsconnect.com/storage/v1/object/public/chat-uploads/1772981751960_vi8jxoici.png',
        'https://api.croomsconnect.com/storage/v1/object/public/chat-uploads/1772981738954_sowg4x0id.png',
      ],
    },
    {
      country: 'South Korea',
      date: '2023',
      location: 'Seoul',
      code: 'KOR',
      mapUrl:
        'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d101234.123456789!2d126.978!3d37.566!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x357ca2012d522907%3A0xcd97b4d3202573c9!2sSeoul%2C%20South%20Korea!5e0!3m2!1sen!2sus!4v123456789',
      images: [
        'https://api.croomsconnect.com/storage/v1/object/public/chat-uploads/1772982157603_zga8lbv47.png',
      ],
    },
    {
      country: 'United Kingdom',
      date: '2024',
      location: 'London',
      code: 'GBR',
      mapUrl:
        'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d101234.123456789!2d-0.127!3d51.507!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47d8a00baf21de75%3A0x52963a5addd52a99!2sLondon%2C%20UK!5e0!3m2!1sen!2sus!4v123456789',
      images: [
        'https://api.croomsconnect.com/storage/v1/object/public/chat-uploads/1772982241819_2nj6hj06n.png',
        'https://api.croomsconnect.com/storage/v1/object/public/chat-uploads/1772982279301_wsfb75upg.png',
        'https://api.croomsconnect.com/storage/v1/object/public/chat-uploads/1772982446012_aqlhof65s.png',
        'https://api.croomsconnect.com/storage/v1/object/public/chat-uploads/1772982547444_4vi8or7tm.png',
        'https://api.croomsconnect.com/storage/v1/object/public/chat-uploads/1772982580797_19vkwzu5d.png',
      ],
    },
    {
      country: 'Japan',
      date: '2025',
      location: 'Tokyo',
      code: 'JPN',
      mapUrl:
        'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d101234.123456789!2d139.691!3d35.689!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x60188b85762e1347%3A0x54e8927807097f4c!2sTokyo%2C%20Japan!5e0!3m2!1sen!2sus!4v123456789',
      images: [
        'https://api.croomsconnect.com/storage/v1/object/public/chat-uploads/1772982626985_qbajb0gh9.png',
        'https://api.croomsconnect.com/storage/v1/object/public/chat-uploads/1772982675717_dfhs3x499.png',
        'https://api.croomsconnect.com/storage/v1/object/public/chat-uploads/1772982715289_97wuhsy07.png',
        'https://api.croomsconnect.com/storage/v1/object/public/chat-uploads/1772982955727_ioip0j8q8.png',
        'https://api.croomsconnect.com/storage/v1/object/public/chat-uploads/1772983037086_2g0hw34vv.png',
      ],
    },
  ];

  const currentCountry = passportData[currentCountryIndex];

  // Logic to determine which track plays based on country code
  const getAudioForCountry = (code) => {
    switch (code) {
      case 'USA':
        return 'https://api.croomsconnect.com/storage/v1/object/public/chat-uploads/1772984943722_mszvxvec7.mp3';
      case 'TTO':
        return 'https://api.croomsconnect.com/storage/v1/object/public/chat-uploads/1772984957037_4u2c000rx.mp3';
      case 'FRA':
        // 10% chance for alternative track
        return Math.random() < 0.1
          ? 'https://api.croomsconnect.com/storage/v1/object/public/chat-uploads/1772984972944_az2c145kl.mp3'
          : 'https://api.croomsconnect.com/storage/v1/object/public/chat-uploads/1772984967942_qlihkhv9h.mp3';
      case 'GBR':
        return 'https://api.croomsconnect.com/storage/v1/object/public/chat-uploads/1772984983003_h7lskcuzd.mp3';
      case 'JPN': {
        // Randomly pick one of the 3 tracks
        const jpTracks = [
          'https://api.croomsconnect.com/storage/v1/object/public/chat-uploads/1772985326951_j7xn9idxy.mp3',
          'https://api.croomsconnect.com/storage/v1/object/public/chat-uploads/1772984992220_nmewdk8zv.mp3',
          'https://api.croomsconnect.com/storage/v1/object/public/chat-uploads/1772985013562_nxjq0o8qh.mp3',
        ];
        return jpTracks[Math.floor(Math.random() * jpTracks.length)];
      }
      default:
        return null; // For countries with no audio (like South Korea)
    }
  };

  // 1. Initial Mount Setup: Kill outside audio & setup looping
  useEffect(() => {
    const audio = audioRef.current; // to satisfy react-hooks/exhaustive-deps eslint

    // Attempt to stop audio from previous scripts playing in the DOM
    const globalAudios = document.getElementsByTagName('audio');
    for (let i = 0; i < globalAudios.length; i++) {
      globalAudios[i].pause();
    }

    audio.loop = true;

    // Cleanup when leaving the page entirely
    return () => {
      if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
      audio.pause();
      audio.src = '';
    };
  }, []);

  // 2. Trigger audio transitions when country changes
  useEffect(() => {
    const nextSrc = getAudioForCountry(currentCountry.code);
    transitionAudio(nextSrc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCountryIndex]);

  // Handle smooth fade out & fade in
  const transitionAudio = (newSrc) => {
    const audio = audioRef.current;
    if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);

    // If there's no new song (e.g., South Korea), just fade out and stop
    if (!newSrc) {
      fadeOut(audio, () => audio.pause());
      return;
    }

    // If something is already playing, fade it out first, then play new track
    if (audio.src && !audio.paused && audio.volume > 0) {
      fadeOut(audio, () => playNewTrack(audio, newSrc));
    } else {
      // Nothing playing, go straight to playing the new track
      playNewTrack(audio, newSrc);
    }
  };

  const fadeOut = (audio, callback) => {
    let vol = audio.volume;
    fadeIntervalRef.current = setInterval(() => {
      vol -= 0.1;
      if (vol <= 0) {
        clearInterval(fadeIntervalRef.current);
        audio.volume = 0;
        if (callback) callback();
      } else {
        audio.volume = vol;
      }
    }, 50); // Speed of the fade out
  };

  const playNewTrack = (audio, src) => {
    // Only swap src if it's different so we don't restart the song for no reason
    if (!audio.src.includes(src)) {
      audio.src = src;
    }

    audio.volume = 0;
    audio
      .play()
      .then(() => {
        let vol = 0;
        fadeIntervalRef.current = setInterval(() => {
          vol += 0.1;
          if (vol >= 1) {
            clearInterval(fadeIntervalRef.current);
            audio.volume = 1;
          } else {
            audio.volume = vol;
          }
        }, 50); // Speed of the fade in
      })
      .catch((err) => {
        console.warn(
          'Browser blocked autoplay. The user needs to interact first.',
          err,
        );
      });
  };

  const nextCountry = () => {
    setCurrentCountryIndex((prev) => (prev + 1) % passportData.length);
    setPhotoIndex(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const nextPhoto = (e) => {
    e.stopPropagation();
    setPhotoIndex((prev) => (prev + 1) % currentCountry.images.length);
  };

  return (
    <div className='min-h-screen bg-[#111] flex flex-col items-center p-4 pb-32 md:pb-6 md:justify-center font-sans'>
      {/* Container */}
      <div className='w-full max-w-5xl bg-[#f4f1ea] rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row border border-white/10'>
        {/* LEFT SIDE: PHOTOS & INFO */}
        <div className='flex-1 p-6 md:p-10 flex flex-col border-b md:border-b-0 md:border-r border-black/5'>
          <div className='flex justify-between items-start mb-4 md:mb-8'>
            <div className='max-w-[80%]'>
              <h1 className='text-2xl md:text-4xl font-black text-slate-900 tracking-tighter uppercase leading-tight'>
                {currentCountry.country}
              </h1>
              <p className='text-blue-600 font-bold text-[10px] md:text-xs tracking-widest uppercase'>
                {currentCountry.location} • {currentCountry.date}
              </p>
            </div>
            <div className='bg-slate-900 text-white px-2 py-1 rounded md:px-3 md:py-1 text-[9px] md:text-[10px] font-black tracking-widest uppercase'>
              {currentCountry.code}
            </div>
          </div>

          {/* Photo Gallery Area - Controlled Aspect Ratio */}
          <div
            onClick={nextPhoto}
            className='relative w-full aspect-[4/3] md:flex-1 bg-zinc-200 rounded-2xl overflow-hidden cursor-pointer shadow-inner border-2 border-white'
          >
            <img
              src={currentCountry.images[photoIndex]}
              alt={currentCountry.country}
              className='w-full h-full object-cover'
            />
            {currentCountry.images.length > 1 && (
              <div className='absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] text-white font-bold border border-white/20 whitespace-nowrap'>
                Tap to cycle ({photoIndex + 1}/{currentCountry.images.length})
              </div>
            )}
          </div>

          <div className='mt-6 opacity-30 text-[9px] font-mono break-all leading-none hidden md:block'>
            P&lt;{currentCountry.code}
            TECH&lt;&lt;AJ&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;
            <br />
            LOG_VER_MOB_2.0
          </div>
        </div>

        {/* RIGHT SIDE: MAP & STATS */}
        <div className='w-full md:w-80 bg-[#ebe7db] p-6 md:p-10 flex flex-col gap-6'>
          <div>
            <h2 className='text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-3'>
              Live Location
            </h2>
            <div className='w-full aspect-square md:flex-1 rounded-2xl overflow-hidden shadow-lg border-2 border-white bg-zinc-300'>
              <iframe
                title='Location Map'
                width='100%'
                height='100%'
                style={{ border: 0 }}
                loading='lazy'
                src={currentCountry.mapUrl}
              ></iframe>
            </div>
          </div>

          {/* Desktop Nav (Hidden on Mobile) */}
          <div className='hidden md:flex flex-col gap-3 mt-auto'>
            <button
              onClick={nextCountry}
              className='w-full py-4 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-blue-600 transition-colors shadow-lg active:scale-95'
            >
              Next Destination
            </button>
            <button
              onClick={() => navigate('/')}
              className='w-full py-3 bg-transparent text-slate-400 text-[10px] font-bold uppercase tracking-widest rounded-xl hover:text-slate-900 transition-colors'
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* MOBILE FIXED NAVIGATION (Only visible on small screens) */}
      <div className='fixed bottom-0 left-0 right-0 p-4 bg-black/80 backdrop-blur-xl border-t border-white/10 flex gap-3 md:hidden z-50'>
        <button
          onClick={() => navigate('/')}
          className='flex-1 py-4 bg-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl'
        >
          Exit
        </button>
        <button
          onClick={nextCountry}
          className='flex-[2] py-4 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-blue-600/20 active:scale-95 transition-transform'
        >
          Next Destination ({currentCountryIndex + 1}/{passportData.length})
        </button>
      </div>

      {/* Progress Dots */}
      <div className='mt-8 mb-4 flex justify-center gap-2'>
        {passportData.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${i === currentCountryIndex ? 'w-8 bg-blue-500' : 'w-2 bg-white/20'}`}
          />
        ))}
      </div>
    </div>
  );
}
