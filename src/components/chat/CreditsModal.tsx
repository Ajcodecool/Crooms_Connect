import { useState, type FC } from 'react';

interface CreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'team' | 'mods' | 'veterans';

const CreditsModal: FC<CreditsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('team');

  if (!isOpen) return null;

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity'
      onClick={onClose}
    >
      <div
        className='w-full max-w-md max-h-[90vh] overflow-y-auto p-6 bg-black/90 border border-gray-600 rounded-lg shadow-2xl text-left relative flex flex-col custom-scrollbar'
        onClick={(e) => e.stopPropagation()} // Prevent clicking inside the modal from closing it
        role='dialog'
        aria-modal='true'
        aria-labelledby='credits-title'
      >
        {/* Header */}
        <div className='flex justify-between items-start mb-4 shrink-0'>
          <h1
            id='credits-title'
            className='text-red-500 font-bold text-xl leading-tight'
          >
            Connect Tavern Credits
          </h1>
          <button
            onClick={onClose}
            className='text-gray-400 hover:text-white transition-colors w-6 h-6 flex items-center justify-center rounded'
            aria-label='Close credits'
          >
            <i className='fa-solid fa-xmark' aria-hidden='true' />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className='flex border-b border-gray-700 mb-5 shrink-0'>
          <button
            onClick={() => setActiveTab('team')}
            className={`flex-1 py-2 text-xs sm:text-sm font-bold transition-colors text-center ${
              activeTab === 'team'
                ? 'text-red-500 border-b-2 border-red-500'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Team
          </button>
          <button
            onClick={() => setActiveTab('mods')}
            className={`flex-1 py-2 text-xs sm:text-sm font-bold transition-colors text-center ${
              activeTab === 'mods'
                ? 'text-red-500 border-b-2 border-red-500'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Moderators
          </button>
          <button
            onClick={() => setActiveTab('veterans')}
            className={`flex-1 py-2 text-xs sm:text-sm font-bold transition-colors text-center ${
              activeTab === 'veterans'
                ? 'text-red-500 border-b-2 border-red-500'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Veterans
          </button>
        </div>

        {/* Tab Content: Team */}
        {activeTab === 'team' && (
          <div className='space-y-3 text-sm text-gray-200 mb-6 leading-relaxed'>
            <p>
              <span className='font-bold text-blue-400 drop-shadow-sm'>
                AJTech
              </span>
              <br />
              <span className='text-xs text-gray-400'>
                Owner, Server Administrator, & Active Developer
              </span>
            </p>

            <p>
              <span className='font-bold text-green-400 drop-shadow-sm'>
                BLJ
              </span>
              <br />
              <span className='text-xs text-gray-400'>
                Founder & Active Developer
              </span>
            </p>

            <p>
              <span className='font-bold text-purple-400 drop-shadow-sm'>
                USS-Stargazer
              </span>
              <br />
              <span className='text-xs text-gray-400'>
                Active Developer (Frontend TS/Vite Refactoring)
              </span>
            </p>

            <p>
              <span className='font-bold text-red-400 drop-shadow-sm'>Ash</span>
              <br />
              <span className='text-xs text-gray-400'>
                Developer & Cybersecurity
              </span>
            </p>

            <p>
              <span className='font-bold text-yellow-400 drop-shadow-sm'>
                Acapoco
              </span>
              ,{' '}
              <span className='font-bold text-orange-400 drop-shadow-sm'>
                The_Corvid
              </span>
              , &{' '}
              <span className='font-bold text-pink-400 drop-shadow-sm'>
                enaned
              </span>
              <br />
              <span className='text-xs text-gray-400'>Developers</span>
            </p>

            <p>
              <span className='font-bold text-teal-400 drop-shadow-sm'>
                TheFirstFallen
              </span>
              <br />
              <span className='text-xs text-gray-400'>
                Event Organizer & Planner
              </span>
            </p>
          </div>
        )}

        {/* Tab Content: Moderators */}
        {activeTab === 'mods' && (
          <div className='space-y-5 text-sm text-gray-200 mb-6 leading-relaxed'>
            <div>
              <h3 className='text-xs text-gray-400 uppercase font-bold tracking-wide mb-1'>
                Active Moderators
              </h3>
              <p className='text-gray-200'>
                The_Corvid, Someone, BLJ,  ssssugubu, Enaned, TheFirstFallen, Acapoco,
                randorando, BoboBlues
                {/* The sneaky text */}
                <span
                  className='text-[8px] opacity-30 ml-1 select-none pointer-events-none'
                  title='snuck in'
                >
                  haker123
                </span>
              </p>
            </div>

            <div>
              <h3 className='text-xs text-gray-400 uppercase font-bold tracking-wide mb-1'>
                Previous Moderators
              </h3>
              <p className='text-gray-400 italic'>Vans, Ash</p>
            </div>
          </div>
        )}

        {/* Tab Content: Veterans */}
        {activeTab === 'veterans' && (
          <div className='mb-6'>
            <h3 className='text-xs text-gray-400 uppercase font-bold tracking-wide mb-2'>
              Veteran Users
            </h3>
            <p className='text-blue-300 text-sm italic mb-3 font-medium'>
              Thank you all for sticking with Connect since the very beginning!
            </p>
            <p className='text-gray-300 text-xs leading-relaxed'>
              12Tom_jerryspace_F14, AdrianMelinskiey, Afthernoon, AJTech,
              andrew.da.computer.guy, anxioussoul, Ash, avqhid, BLJ,
              BloxyAddict, dazass01, Dconfair47, DecentPerson, DJ_MATT,
              ErlkingHeathcliff, escoi, Fedex, Giraffe2, Goober,
              hunterthebearpaw, icebear, Jacobinator3000, jawrsh, JAYE, jet,
              jmilket, jsmith69, kaj, KiwiKing, lemon, local.insect, London_Pub,
              Masey824, N0R3MAC_360, pupavp, SirSinister, Someone,
              ssssugubu_!!!, Starz-In-The-Night, terrestrialfish.jane.,
              thatguy2, The Banan&apos; With A Plan, The_Corvid, Trinipork,
              ure_so_cool_dude, User28394, Vans, waddle35, wizard#572,
              wonderphul6, ZZZAEE!!
            </p>

            {/* Special Thanks */}
            <div className='border-t border-gray-700 pt-3 mt-4 space-y-2'>
              <h3 className='text-xs text-gray-400 uppercase font-bold tracking-wide mb-2'>
                Special Thanks
              </h3>
              <p className='text-cyan-400 text-sm font-medium'>
                Thank you to <span className='font-bold'>@fuzzysnail27</span>{' '}
                for creating the default profile pictures!
              </p>
              <p className='text-cyan-400 text-sm font-medium'>
                Thank you to <span className='font-bold'>@someone</span> for the
                current Crooms Connect logo!
              </p>
            </div>
          </div>
        )}

        {/* Footer Area: Image & Notice */}
        <div className='border-t border-gray-700 pt-5 mt-auto shrink-0'>
          <blockquote className='mb-4'>
            <img
              src='https://api.croomsconnect.com/storage/v1/object/public/chat-uploads/0f4f49db-4665-4408-83f1-703d163506cf/1775599956137-y07mz5zuohc.png'
              alt='Quote'
              className='max-h-32 w-auto mx-auto rounded border border-gray-700 object-contain shadow-sm'
              loading='lazy'
            />
          </blockquote>

          <div className='flex flex-col gap-2'>
            <div>
              <h2 className='text-red-500 font-bold text-xs mb-1 uppercase tracking-wide'>
                Notice
              </h2>
              <p className='text-gray-400 text-xs italic'>
                Created by the special freshmen.
              </p>
            </div>

            {/* CBSH Shoutout */}
            <p className='text-gray-300 text-sm font-medium mt-1 flex items-center'>
              We
              <i
                className='fa-solid fa-heart text-red-500 mx-1.5'
                aria-hidden='true'
                title='love'
              />
              <a
                href='https://croomsbellschedule.com'
                target='_blank'
                rel='noopener noreferrer'
                className='text-blue-400 hover:text-blue-300 underline decoration-blue-400/50 transition-colors'
              >
                CBSH
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreditsModal;
