import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { THEME_OPTIONS } from '../utils/themeUtils';
import WeatherEffects from '../components/WeatherEffects';
import './Chat.css';

const Themes = () => {
  const navigate = useNavigate();

  // Initialize state
  const [previewTheme, setPreviewTheme] = useState(
    localStorage.getItem('chatTheme') || 'dark',
  );
  const [transparency, setTransparency] = useState(
    localStorage.getItem('chatTransparency') || 0.9,
  );
  const [cursorPreset, setCursorPreset] = useState(
    localStorage.getItem('cursorPreset') || 'default',
  );
  const [customCursorUrl, setCustomCursorUrl] = useState(
    localStorage.getItem('customCursorUrl') || '',
  );
  const [primaryColor, setPrimaryColor] = useState(
    localStorage.getItem('primaryColor') || '#007bff',
  );
  const [secondaryColor, setSecondaryColor] = useState(
    localStorage.getItem('secondaryColor') || '#6c757d',
  );
  const [backgroundImageUrl, setBackgroundImageUrl] = useState(
    localStorage.getItem('backgroundImageUrl') || '',
  );
  const [chatBackgroundColor, setChatBackgroundColor] = useState(
    localStorage.getItem('chatBackgroundColor') || '#2b2d42',
  );
  const [chatBubbleColor, setChatBubbleColor] = useState(
    localStorage.getItem('chatBubbleColor') || '#3b82f6',
  ); // Default bubble color
  const [backgroundEffect, setBackgroundEffect] = useState(
    localStorage.getItem('backgroundEffect') || '',
  );
  const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false);

  // === FOXY & SECRET STATES ===
  const [foxyMode, setFoxyMode] = useState(
    localStorage.getItem('foxyMode') === 'true',
  );
  const [secretUnlocked, setSecretUnlocked] = useState(false);

  // === GLOBAL SYNC ON MOUNT ===
  useEffect(() => {
    const savedTrans = localStorage.getItem('chatTransparency') || 0.9;
    document.documentElement.style.setProperty(
      '--content-bg-alpha',
      savedTrans,
    );

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTransparency(savedTrans);
  }, []);

  const handleThemeSelect = (themeId) => {
    setPreviewTheme(themeId);
  };

  const handleSaveAndExit = () => {
    localStorage.setItem('chatTheme', previewTheme);
    localStorage.setItem('cursorPreset', cursorPreset);
    try {
      localStorage.setItem('customCursorUrl', customCursorUrl);
    } catch (err) {
      console.warn('Failed to save custom cursor (quota exceeded?):', err);
    }
    localStorage.setItem('primaryColor', primaryColor);
    localStorage.setItem('secondaryColor', secondaryColor);
    localStorage.setItem('backgroundImageUrl', backgroundImageUrl);
    localStorage.setItem('chatBackgroundColor', chatBackgroundColor);
    localStorage.setItem('chatBubbleColor', chatBubbleColor);
    localStorage.setItem('backgroundEffect', backgroundEffect);

    // Save Foxy Mode
    localStorage.setItem('foxyMode', foxyMode);

    navigate('/'); // Go back to Chat
    window.location.reload(); // Force reload to ensure heavy themes (like OS) load clean
  };

  // === RESET THEME HANDLER ===
  const handleResetTheme = () => {
    // Reset state to defaults
    setPreviewTheme('dark');
    setTransparency(0.9);
    setCursorPreset('default');
    setCustomCursorUrl('');
    setPrimaryColor('#007bff');
    setSecondaryColor('#6c757d');
    setBackgroundImageUrl('');
    setChatBackgroundColor('#2b2d42');
    setChatBubbleColor('#3b82f6');
    setBackgroundEffect('');
    setFoxyMode(false);

    // Reset localStorage to defaults
    localStorage.setItem('chatTheme', 'dark');
    localStorage.setItem('chatTransparency', '0.9');
    localStorage.setItem('cursorPreset', 'default');
    localStorage.setItem('customCursorUrl', '');
    localStorage.setItem('primaryColor', '#007bff');
    localStorage.setItem('secondaryColor', '#6c757d');
    localStorage.setItem('backgroundImageUrl', '');
    localStorage.setItem('chatBackgroundColor', '#2b2d42');
    localStorage.setItem('chatBubbleColor', '#3b82f6');
    localStorage.setItem('backgroundEffect', '');
    localStorage.setItem('foxyMode', 'false');

    // Reset CSS variable immediately
    document.documentElement.style.setProperty('--content-bg-alpha', 0.9);
  };

  // === GLOBAL UPDATE HANDLER ===
  const handleTransparencyChange = (e) => {
    const val = parseFloat(e.target.value);
    setTransparency(val);

    // 1. Save to Storage
    localStorage.setItem('chatTransparency', val);

    // 2. Update Global CSS Variable INSTANTLY
    document.documentElement.style.setProperty('--content-bg-alpha', val);
  };

  // Calculate wrapper class for preview
  const themeClass = previewTheme === 'dark' ? '' : `theme-${previewTheme}`;

  // Dummy Background Images for Preview
  const getPreviewStyle = () => {
    const baseStyle = {
      cursor: customCursorUrl
        ? `url(${customCursorUrl}), ${cursorPreset}`
        : cursorPreset,
    };

    let themeBackground = '';
    let backgroundSize = 'cover';
    let backgroundPosition = 'center';

    // Determine theme background
    if (previewTheme === 'wood') themeBackground = "url('/wood.png')";
    else if (previewTheme === 'japan')
      themeBackground = "url('https://files.catbox.moe/y6qlyc.JPG')";
    else if (previewTheme === 'bully')
      themeBackground = "url('https://files.catbox.moe/slwelf.png')";
    else if (previewTheme === 'liquid')
      themeBackground = "url('../assets/mactahoe.jpg')";
    else if (previewTheme === 'xp')
      themeBackground = "url('https://wallpaperaccess.com/full/385739.jpg')";
    else if (previewTheme === 'win7')
      themeBackground = "url('https://i.imgur.com/UQENXgI.png')";
    else if (previewTheme === 'aero-os')
      themeBackground =
        "url('https://blog.greggant.com/images/posts/2021-09-25-preview/aurora-preview.jpg')";

    // If custom background is uploaded, layer it over the theme background
    if (backgroundImageUrl) {
      const customBg = `url(${backgroundImageUrl})`;
      if (themeBackground) {
        return {
          ...baseStyle,
          backgroundImage: `${customBg}, ${themeBackground}`,
          backgroundSize: `${backgroundSize}, ${backgroundSize}`,
          backgroundPosition: `${backgroundPosition}, ${backgroundPosition}`,
        };
      } else {
        return {
          ...baseStyle,
          backgroundImage: customBg,
          backgroundSize,
          backgroundPosition,
        };
      }
    }

    // No custom background, use theme background
    if (themeBackground) {
      return {
        ...baseStyle,
        backgroundImage: themeBackground,
        backgroundSize,
        backgroundPosition,
      };
    }

    return baseStyle;
  };

  return (
    <div className='bg-slate-950 text-white flex flex-col md:flex-row h-screen w-full overflow-hidden'>
      {/* RIGHT (Desktop) / TOP (Mobile): LIVE PREVIEW AREA */}
      <div className='w-full h-[40vh] md:h-auto md:flex-1 bg-black relative flex items-center justify-center overflow-hidden order-1 md:order-2 shrink-0 border-b md:border-b-0 border-slate-800 z-10'>
        {/* Simulated Chat Interface Container */}
        <div
          className={`chat-wrapper w-full h-full absolute inset-0 flex flex-col ${themeClass}`}
          style={getPreviewStyle()}
        >
          {previewTheme === 'crimnet' ? (
            <div
              style={{
                backgroundColor: '#000',
                color: '#00ff00',
                fontFamily: 'monospace',
                height: '100%',
                padding: '20px',
                overflow: 'auto',
              }}
            >
              <h1
                style={{
                  textAlign: 'center',
                  fontSize: '2em',
                  marginBottom: '20px',
                }}
              >
                CRIM.NET
              </h1>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  flexDirection: 'column',
                  gap: '20px',
                }}
                className='md:flex-row'
              >
                <div
                  style={{
                    width: '100%',
                    border: '1px solid #00ff00',
                    padding: '10px',
                  }}
                  className='md:w-[30%]'
                >
                  <h2>Contracts</h2>
                  <ul>
                    <li>Bank Heist - $100,000</li>
                    <li>Jewelry Store - $75,000</li>
                    <li>Art Gallery - $50,000</li>
                  </ul>
                </div>
                <div
                  style={{
                    width: '100%',
                    border: '1px solid #00ff00',
                    padding: '10px',
                  }}
                  className='md:w-[65%] hidden md:block'
                >
                  <h2>Map</h2>
                  <div
                    style={{
                      backgroundColor: '#111',
                      height: '200px', // Adjusted for mobile height
                      position: 'relative',
                      border: '1px solid #00ff00',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        color: '#00ff00',
                        textAlign: 'center',
                      }}
                    >
                      [Map Placeholder]
                    </div>
                    <div
                      style={{
                        position: 'absolute',
                        top: '30%',
                        left: '40%',
                        width: '10px',
                        height: '10px',
                        backgroundColor: '#ff0000',
                        borderRadius: '50%',
                      }}
                    ></div>
                    <div
                      style={{
                        position: 'absolute',
                        top: '60%',
                        left: '70%',
                        width: '10px',
                        height: '10px',
                        backgroundColor: '#ff0000',
                        borderRadius: '50%',
                      }}
                    ></div>
                  </div>
                </div>
              </div>
              <div
                style={{
                  marginTop: '20px',
                  border: '1px solid #00ff00',
                  padding: '10px',
                }}
              >
                <h2>News Feed</h2>
                <p>Breaking: New heist opportunities available!</p>
              </div>
            </div>
          ) : (
            <>
              <WeatherEffects effect={backgroundEffect || null} />
              {/* Fake Header */}
              <div className='chat-header-ui p-3 flex justify-between items-center relative z-40 transition-colors duration-300 shrink-0'>
                <div className='flex items-center gap-3'>
                  <button className='header-back-btn'>
                    <i className='fa-solid fa-arrow-left'></i>
                  </button>
                  <h1 className='font-bold text-lg tracking-wide truncate'>
                    Connect Tavern
                  </h1>
                </div>
                <div className='flex gap-2'>
                  <button className='w-8 h-8 flex items-center justify-center rounded border header-btn opacity-80'>
                    <i className='fa-solid fa-gear'></i>
                  </button>
                </div>
              </div>

              {/* Fake Main Layout */}
              <div className='main-layout p-4 gap-4 flex-1 flex overflow-hidden'>
                {/* Fake Sidebar */}
                <div className='sidebar hidden md:flex flex-col w-64 h-full shrink-0 rounded-lg'>
                  <div className='sidebar-header flex justify-between items-center p-4 shrink-0'>
                    <span>Online</span>
                    <span className='text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full'>
                      2
                    </span>
                  </div>
                  <div className='user-list p-2 flex-1 overflow-y-auto'>
                    <div className='flex items-center gap-2 p-2 rounded bg-slate-800/50 mb-1 sidebar-btn'>
                      <div className='w-8 h-8 rounded-full bg-slate-600'></div>
                      <span className='text-sm font-medium'>Other User</span>
                    </div>
                    <div className='flex items-center gap-2 p-2 rounded bg-slate-800/50 sidebar-btn'>
                      <div className='w-8 h-8 rounded-full bg-slate-600'></div>
                      <span className='text-sm font-medium'>You</span>
                    </div>
                  </div>
                </div>

                {/* Fake Chat Area */}
                <div className='chat-area flex-1 flex flex-col h-full relative overflow-hidden rounded-lg'>
                  <div className='messages-box flex-1 p-4 flex flex-col gap-4 overflow-hidden relative'>
                    <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center opacity-30 pointer-events-none'>
                      <h2 className='text-3xl md:text-4xl font-bold uppercase tracking-widest'>
                        Preview
                      </h2>
                    </div>

                    {/* Fake Messages - Added 'message-bubble' classes and mapped CSS vars! */}
                    <div className='flex justify-start mt-auto z-10 relative'>
                      <div className='flex flex-col gap-1 max-w-[80%]'>
                        <span
                          className='text-xs opacity-70 ml-1'
                          style={{ color: 'var(--text-color, white)' }}
                        >
                          Other User
                        </span>
                        <div
                          className='message-bubble rounded-2xl rounded-tl-sm px-4 py-2 text-sm'
                          style={{
                            backgroundColor:
                              'var(--message-bg-received, rgba(30, 41, 59, 0.8))',
                            color: 'var(--message-text-received, white)',
                          }}
                        >
                          Hey, how does the new theme look?
                        </div>
                      </div>
                    </div>

                    <div className='flex justify-end z-10 relative'>
                      <div className='flex flex-col gap-1 items-end max-w-[80%]'>
                        <span
                          className='text-xs opacity-70 mr-1'
                          style={{ color: 'var(--text-color, white)' }}
                        >
                          You
                        </span>
                        <div
                          className='message-bubble rounded-2xl rounded-tr-sm px-4 py-2 text-sm'
                          style={{
                            backgroundColor:
                              previewTheme !== 'dark' &&
                              previewTheme !== 'light'
                                ? 'var(--message-bg-sent)'
                                : chatBubbleColor,
                            color: 'var(--message-text-sent, white)',
                          }}
                        >
                          It looks great! The custom styles are mapping
                          perfectly now.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Fake Input Area */}
                  <div className='input-area p-3 md:p-4 border-t border-white/10 shrink-0'>
                    <div className='chat-editor p-3 rounded-lg min-h-[40px] flex items-center text-sm'>
                      Type a message...
                    </div>
                    <div className='flex justify-between items-center mt-2'>
                      <div className='flex gap-2'>
                        <button
                          className='toolbar-btn p-1'
                          style={{ color: 'var(--text-color, white)' }}
                        >
                          <i className='fa-solid fa-bold'></i>
                        </button>
                        <button
                          className='toolbar-btn p-1'
                          style={{ color: 'var(--text-color, white)' }}
                        >
                          <i className='fa-solid fa-italic'></i>
                        </button>
                      </div>
                      <button className='send-btn px-4 py-1 rounded text-sm font-bold'>
                        Send
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* LEFT (Desktop) / BOTTOM (Mobile): SIDEBAR (Theme List) */}
      <div className='w-full md:w-1/3 lg:w-1/4 bg-slate-950 border-r-0 md:border-r border-slate-800 flex flex-col z-20 shadow-xl order-2 md:order-1 flex-1 overflow-hidden'>
        <div className='p-4 md:p-6 border-b border-slate-800 bg-slate-950 shrink-0'>
          <button
            onClick={() => navigate('/settings')}
            className='text-slate-400 hover:text-white mb-2 md:mb-4 flex items-center gap-2 transition-colors'
          >
            <i className='fa-solid fa-arrow-left'></i> Back to Settings
          </button>
          <h1 className='text-xl md:text-2xl font-bold flex items-center gap-2'>
            Appearance
          </h1>
          <p className='text-xs md:text-sm text-slate-500 mt-1'>
            Select a theme to apply.
          </p>
        </div>

        {/* Theme List */}
        <div className='flex-1 overflow-y-auto p-4 space-y-2 relative scroll-smooth'>
          {THEME_OPTIONS.map((theme) => (
            <button
              key={theme.id}
              onClick={() => handleThemeSelect(theme.id)}
              className={`w-full text-left p-4 rounded-lg border transition-colors ${
                previewTheme === theme.id
                  ? 'bg-slate-900 border-blue-500 text-white'
                  : 'bg-transparent border-transparent hover:bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className='flex items-center gap-4'>
                <div
                  className={`w-8 h-8 rounded flex items-center justify-center text-lg shrink-0 ${previewTheme === theme.id ? 'text-blue-400' : 'text-slate-600'}`}
                >
                  <i className={`fa-solid ${theme.icon}`}></i>
                </div>
                <div className='min-w-0'>
                  <h3 className='font-bold text-sm truncate'>{theme.label}</h3>
                  <p className='text-xs opacity-60 truncate'>{theme.desc}</p>
                </div>
              </div>
            </button>
          ))}

          {/* === HIDDEN BUTTON === */}
          <div
            className='w-full h-8 opacity-0 hover:cursor-default shrink-0'
            onClick={() => setSecretUnlocked(true)}
            title=''
          ></div>
        </div>

        {/* Customize / Reset / Save Buttons */}
        <div className='p-4 md:p-6 border-t border-slate-800 bg-slate-950 shrink-0'>
          <button
            onClick={() => setIsCustomizeModalOpen(true)}
            className='w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl border border-slate-600 transition-colors mb-3 md:mb-4'
          >
            <i className='fa-solid fa-palette mr-2'></i> Customize Theme
          </button>

          <button
            onClick={handleResetTheme}
            className='w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl border border-slate-600 transition-colors mb-3'
          >
            Reset Theme
          </button>

          <button
            onClick={handleSaveAndExit}
            className='w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl border border-blue-500 transition-colors'
          >
            Save Changes
          </button>
        </div>
      </div>

      {/* Customization Modal */}
      {isCustomizeModalOpen && (
        <div className='fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4'>
          <div className='bg-slate-900 text-white rounded-xl p-4 md:p-6 w-full max-w-md max-h-[85vh] overflow-y-auto shadow-2xl border border-slate-700'>
            <div className='flex justify-between items-center mb-6 sticky top-0 bg-slate-900 pt-2 pb-4 border-b border-slate-800 z-10'>
              <h2 className='text-xl font-bold'>Customize Theme</h2>
              <button
                onClick={() => setIsCustomizeModalOpen(false)}
                className='text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 w-8 h-8 rounded-full flex items-center justify-center transition-colors'
              >
                <i className='fa-solid fa-times'></i>
              </button>
            </div>

            <div className='space-y-6'>
              {/* Cursor Preset Section */}
              <div>
                <label className='text-sm font-medium text-slate-300 mb-2 block'>
                  Cursor Preset
                </label>
                <select
                  value={cursorPreset}
                  onChange={(e) => setCursorPreset(e.target.value)}
                  className='w-full p-3 bg-slate-800 text-white rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none'
                >
                  <option value='default'>Default</option>
                  <option value='pointer'>Pointer</option>
                  <option value='crosshair'>Crosshair</option>
                  <option value='wait'>Wait</option>
                  <option value='help'>Help</option>
                  <option value='move'>Move</option>
                  <option value='text'>Text</option>
                </select>
              </div>

              {/* Custom Cursor Upload Section */}
              <div>
                <label className='text-sm font-medium text-slate-300 mb-2 block'>
                  Custom Cursor
                </label>
                <input
                  type='file'
                  accept='image/*'
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const img = new Image();
                      img.onload = () => {
                        const canvas = document.createElement('canvas');
                        const size = 32;
                        canvas.width = size;
                        canvas.height = size;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, size, size);
                        setCustomCursorUrl(canvas.toDataURL('image/png'));
                      };
                      img.src = URL.createObjectURL(file);
                    }
                  }}
                  className='w-full p-2 bg-slate-800 text-white rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer'
                />
                <p className='text-xs text-slate-500 mt-2'>
                  Upload a custom cursor image (PNG recommended).
                </p>
                {customCursorUrl && (
                  <button
                    onClick={() => setCustomCursorUrl('')}
                    className='mt-2 text-xs text-red-400 hover:text-red-300 underline transition-colors'
                  >
                    Clear Custom Cursor Image
                  </button>
                )}
              </div>

              {/* Color Customization Section */}
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='text-sm font-medium text-slate-300 mb-2 block'>
                    Primary Color
                  </label>
                  <input
                    type='color'
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className='w-full h-12 bg-slate-800 rounded-lg border border-slate-600 cursor-pointer p-1'
                  />
                </div>
                <div>
                  <label className='text-sm font-medium text-slate-300 mb-2 block'>
                    Secondary Color
                  </label>
                  <input
                    type='color'
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className='w-full h-12 bg-slate-800 rounded-lg border border-slate-600 cursor-pointer p-1'
                  />
                </div>
              </div>

              {/* Background & Bubble Colors Section */}
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='text-sm font-medium text-slate-300 mb-2 block'>
                    Background Color
                  </label>
                  <input
                    type='color'
                    value={chatBackgroundColor}
                    onChange={(e) => setChatBackgroundColor(e.target.value)}
                    className='w-full h-12 bg-slate-800 rounded-lg border border-slate-600 cursor-pointer p-1'
                  />
                </div>
                <div>
                  <label className='text-sm font-medium text-slate-300 mb-2 block'>
                    Chat Bubble Color
                  </label>
                  <input
                    type='color'
                    value={chatBubbleColor}
                    onChange={(e) => setChatBubbleColor(e.target.value)}
                    className='w-full h-12 bg-slate-800 rounded-lg border border-slate-600 cursor-pointer p-1'
                  />
                </div>
              </div>
              <p className='text-xs text-slate-500 mt-0'>
                Adjust the colors for the chat background and your outgoing
                message bubbles.
              </p>

              {/* Background Image Upload Section */}
              <div>
                <label className='text-sm font-medium text-slate-300 mb-2 block'>
                  Background Image
                </label>
                <input
                  type='file'
                  accept='image/*'
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (e) =>
                        setBackgroundImageUrl(e.target.result);
                      reader.readAsDataURL(file);
                    }
                  }}
                  className='w-full p-2 bg-slate-800 text-white rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer'
                />
                <p className='text-xs text-slate-500 mt-2'>
                  Upload a custom background image.
                </p>
              </div>

              {/* Background Effect Section */}
              <div>
                <label className='text-sm font-medium text-slate-300 mb-2 block'>
                  Background Effect
                </label>
                <select
                  value={backgroundEffect}
                  onChange={(e) => setBackgroundEffect(e.target.value)}
                  className='w-full p-3 bg-slate-800 text-white rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none'
                >
                  <option value=''>None</option>
                  <option value='rain'>Rain</option>
                  <option value='snow'>Snow</option>
                </select>
                <p className='text-xs text-slate-500 mt-2'>
                  Add a weather particle effect over the chat background.
                </p>
              </div>

              {/* Transparency Slider Section */}
              <div className='pb-4'>
                <div className='flex justify-between items-center mb-3'>
                  <label className='text-sm font-medium text-slate-300'>
                    Window Transparency
                  </label>
                  <span className='text-xs text-blue-400 font-mono bg-blue-900/30 px-2 py-1 rounded'>
                    {Math.round(transparency * 100)}%
                  </span>
                </div>
                <input
                  type='range'
                  min='0.1'
                  max='1'
                  step='0.05'
                  value={transparency}
                  onChange={handleTransparencyChange}
                  className='w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400'
                />
                <p className='text-xs text-slate-500 mt-3'>
                  Adjusts the see-through effect for supported themes.
                </p>
              </div>

              {/* === SECRET FOXY SETTING === */}
              {secretUnlocked && (
                <div className='pt-4 border-t border-slate-700 animate-fade-in'>
                  <label className='flex items-center space-x-3 cursor-pointer p-3 bg-red-950/20 rounded-lg border border-red-900/30'>
                    <input
                      type='checkbox'
                      checked={foxyMode}
                      onChange={(e) => setFoxyMode(e.target.checked)}
                      className='form-checkbox h-5 w-5 text-red-600 bg-slate-800 border-slate-600 rounded focus:ring-red-500'
                    />
                    <div>
                      <span className='text-sm font-bold text-red-500 tracking-wider uppercase block'>
                        Foxy
                      </span>
                      <span className='text-xs text-red-900/70'>
                        Don&apos;t keep the lights off.
                      </span>
                    </div>
                  </label>
                </div>
              )}
            </div>

            <button
              onClick={() => setIsCustomizeModalOpen(false)}
              className='w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 md:py-4 rounded-xl border border-blue-500 transition-colors mt-6 sticky bottom-0'
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
export default Themes;
