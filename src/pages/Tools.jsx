import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Chat.css';
import { TOOL_CATEGORIES } from '../data/toolsData';
import { useTheme } from '../hooks/useTheme';

const Tools = () => {
  const navigate = useNavigate();

  // === USE CENTRAL THEME SCRIPT ===
  const { theme, themeClass, themeStyle } = useTheme();

  // === MODAL STATE ===
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [durationInput, setDurationInput] = useState(25);
  const [timeUnit, setTimeUnit] = useState('minutes');
  const [selectedSound, setSelectedSound] = useState('mac');

  const handleToolClick = (e, tool) => {
    if (tool.id === 'interactive-timer') {
      e.preventDefault();
      setShowTimerModal(true);
    }
  };

  const handleStartTimer = () => {
    let duration = parseInt(durationInput);
    if (isNaN(duration) || duration < 1) duration = 1;

    let finalMinutes = timeUnit === 'hours' ? duration * 60 : duration;
    if (finalMinutes > 1440) finalMinutes = 1440;

    const event = new CustomEvent('crooms-timer-start', {
      detail: { duration: finalMinutes, sound: selectedSound },
    });
    window.dispatchEvent(event);

    setShowTimerModal(false);
  };

  return (
    <div
      className={`min-h-screen font-sans text-white p-6 pb-24 relative ${themeClass}`}
      style={themeStyle}
    >
      <div
        className={`fixed inset-0 pointer-events-none ${theme !== 'dark' ? 'bg-black/40' : ''}`}
      />

      {/* === TIMER MODAL === */}
      {showTimerModal && (
        <div className='fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200'>
          <div className='dashboard-card rounded-2xl shadow-2xl p-6 w-full max-w-sm relative overflow-hidden'>
            <div className='flex justify-between items-center mb-6'>
              <h3 className='text-xl font-bold flex items-center gap-2'>
                <i className='fa-solid fa-stopwatch text-blue-500'></i>{' '}
                Configure Timer
              </h3>
              <button
                onClick={() => setShowTimerModal(false)}
                className='opacity-60 hover:opacity-100 transition-colors'
              >
                <i className='fa-solid fa-xmark text-xl'></i>
              </button>
            </div>

            <div className='space-y-4'>
              <div>
                <label className='block text-xs font-bold opacity-60 uppercase mb-2'>
                  Duration
                </label>
                <div className='flex gap-2'>
                  <input
                    type='number'
                    value={durationInput}
                    onChange={(e) => setDurationInput(e.target.value)}
                    className='dashboard-input rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-colors w-full font-mono text-lg'
                    placeholder='25'
                    min='1'
                  />
                  <select
                    value={timeUnit}
                    onChange={(e) => setTimeUnit(e.target.value)}
                    className='dashboard-input rounded-xl px-3 py-3 outline-none focus:border-blue-500 transition-colors cursor-pointer font-bold'
                  >
                    <option value='minutes'>Mins</option>
                    <option value='hours'>Hrs</option>
                  </select>
                </div>
              </div>

              <div>
                <label className='block text-xs font-bold opacity-60 uppercase mb-2'>
                  Alert Sound
                </label>
                <select
                  value={selectedSound}
                  onChange={(e) => setSelectedSound(e.target.value)}
                  className='w-full dashboard-input rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-colors cursor-pointer'
                >
                  <option value='mac'>Mac Startup (Classic)</option>
                  <option value='default'>Standard Beep</option>
                  <option value='none'>Silent (Notification Only)</option>
                </select>
              </div>

              <button
                onClick={handleStartTimer}
                className='w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl mt-4 shadow-lg shadow-blue-900/20 transition-all active:scale-95 flex items-center justify-center gap-2'
              >
                <i className='fa-solid fa-play'></i> Start Session
              </button>
            </div>
          </div>
        </div>
      )}

      <div className='max-w-6xl mx-auto relative z-10'>
        {/* HEADER */}
        <div className='flex items-center gap-4 mb-8'>
          <button
            onClick={() => navigate('/')}
            className='w-10 h-10 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/30 text-white transition-colors border border-white/10'
          >
            <i className='fa-solid fa-arrow-left'></i>
          </button>
          <div>
            <h1 className='text-3xl font-bold'>Tools & Apps</h1>
            <p className='opacity-70 text-sm'>
              Everything you need in one place
            </p>
          </div>
        </div>

        {/* CATEGORY LOOPS */}
        <div className='space-y-10'>
          {TOOL_CATEGORIES.map((category) => (
            <div key={category.id}>
              <div className='mb-4 pl-2 border-l-4 border-blue-600'>
                <h2 className='text-xl font-bold'>{category.title}</h2>
                <p className='opacity-60 text-xs'>{category.description}</p>
              </div>

              <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
                {category.items.map((tool, index) => (
                  <a
                    key={index}
                    href={tool.url || '#'}
                    onClick={(e) => handleToolClick(e, tool)}
                    target={
                      tool.id === 'interactive-timer' ? undefined : '_blank'
                    }
                    rel={
                      tool.id === 'interactive-timer'
                        ? undefined
                        : 'noopener noreferrer'
                    }
                    className='dashboard-card rounded-xl p-4 flex items-center gap-4 hover:border-blue-500 hover:brightness-110 transition-all group cursor-pointer'
                  >
                    <div className='w-12 h-12 rounded-lg bg-black/20 p-2 border border-white/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform'>
                      <img
                        src={tool.icon}
                        alt={tool.name}
                        className='w-full h-full object-contain'
                      />
                    </div>
                    <div className='min-w-0'>
                      <h3 className='font-bold truncate group-hover:text-blue-400 transition-colors'>
                        {tool.name}
                      </h3>
                      <span className='text-xs opacity-50 block uppercase tracking-wider font-bold mt-1'>
                        {tool.id === 'interactive-timer'
                          ? 'Open Timer'
                          : 'Open App'}
                        <i
                          className={`fa-solid ${tool.id === 'interactive-timer' ? 'fa-clock' : 'fa-arrow-up-right-from-square'} text-[10px] ml-1 opacity-50 group-hover:opacity-100`}
                        ></i>
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Tools;
