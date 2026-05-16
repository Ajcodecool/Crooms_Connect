import { useState, type FC } from 'react';
import { supabase } from '../supabaseClient'; // Make sure this path is correct for your project structure

const Apps: FC = () => {
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

  // Configuration
  const PROJECT_URL = 'https://tencnsastgpixdovllgm.supabase.co';
  const BUCKET_NAME = 'app-content';
  const VIDEO_FILENAME = 'DestroyAllOpps.mp4';

  const videoUrl = `${PROJECT_URL}/storage/v1/object/public/${BUCKET_NAME}/${VIDEO_FILENAME}`;

  // === BADGE UNLOCK LOGIC ===
  const handleVideoEnded = async (): Promise<void> => {
    try {
      // 1. Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // 2. Fetch current profile to get existing badges
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('selected_badge')
        .eq('id', user.id)
        .single();

      if (fetchError || !profile) return;

      // 3. Parse existing badges (Safety check from your Badges.js logic)
      let currentBadges = [];
      const raw = profile.selected_badge;

      if (Array.isArray(raw)) {
        currentBadges = raw;
      } else if (typeof raw === 'string') {
        // Handle stringified arrays if necessary
        const cleaned = raw.trim();
        if (cleaned.startsWith('[')) {
          try {
            currentBadges = JSON.parse(cleaned);
          } catch {
            currentBadges = [];
          }
        } else if (cleaned.length > 0) {
          currentBadges = [cleaned];
        }
      }

      // 4. Add 'dao' badge if not present
      if (!currentBadges.includes('dao')) {
        const newBadges = [...currentBadges, 'dao'];

        const { error: updateError } = await supabase
          .from('profiles')
          .update({ selected_badge: newBadges })
          .eq('id', user.id);

        if (!updateError) {
          alert("🏆 SECRET UNLOCKED: You earned the 'DAO' Badge!");
        }
      }
    } catch (err) {
      console.error('Error unlocking badge:', err);
    }
  };

  return (
    <div className='min-h-screen bg-slate-950 text-slate-200 font-sans'>
      {/* HEADER */}
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <div className='flex items-center gap-3 mb-6'>
          <h1 className='text-2xl font-bold text-white tracking-wide'>
            App Library
          </h1>
        </div>
        <div className='h-px bg-slate-800 w-full mb-8'></div>

        {/* APP GRID */}
        <div className='grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-6'>
          {/* DAO APP */}
          <button
            onClick={() => setActiveVideo(videoUrl)}
            className='group flex flex-col items-center gap-3 p-4 rounded-xl hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-colors'
          >
            <div className='w-20 h-20 rounded-2xl bg-slate-800 p-2 shadow-lg border border-slate-700 group-hover:border-slate-500 transition-colors relative overflow-hidden'>
              <img
                src='https://images.gamebanana.com/img/ico/sprays/67cc33c96218c.png'
                alt='DAO Icon'
                className='w-full h-full object-cover rounded-xl'
              />
            </div>
            <span className='text-sm font-medium text-slate-400 group-hover:text-white transition-colors'>
              DAO
            </span>
          </button>
        </div>
      </div>

      {/* VIDEO OVERLAY */}
      {activeVideo && (
        <div className='fixed inset-0 z-50 bg-slate-950/95 flex flex-col items-center justify-center p-4 backdrop-blur-sm'>
          {/* Close Button */}
          <button
            onClick={() => setActiveVideo(null)}
            className='absolute top-6 right-6 text-slate-500 hover:text-white transition-colors p-2'
          >
            <i className='fa-solid fa-xmark text-4xl'></i>
          </button>

          {/* Video Player */}
          <div className='w-full max-w-5xl bg-black rounded-xl overflow-hidden shadow-2xl border border-slate-800'>
            <video
              src={activeVideo}
              controls
              autoPlay
              onEnded={handleVideoEnded} // <--- TRIGGERS THE BADGE UNLOCK
              className='w-full h-auto max-h-[80vh]'
            >
              Your browser does not support the video tag.
            </video>
          </div>

          <h2 className='mt-4 text-xl font-bold text-white tracking-wider'>
            DestroyAllOpps.mp4
          </h2>
        </div>
      )}
    </div>
  );
};

export default Apps;
