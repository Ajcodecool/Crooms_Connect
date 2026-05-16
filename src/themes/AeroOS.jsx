import { useState, useEffect, useRef, useContext, createContext } from 'react';
import { useNavigate } from 'react-router-dom';
import './AeroOS.css';

// --- Assets ---
const SOUND_URL =
  'https://froods.ca/~dschaub/AppleSounds/Startup/StartupMacQuadraAV.wav';
const CC_LOGO = '/CC.png';

// --- Contexts ---
const OSContext = createContext();

// --- 1. CLEARED FILE SYSTEM ---
const INITIAL_FS = {
  '/Desktop': [],
  '/Documents': [],
  '/Trash': [],
};

// --- Helper Hooks ---
const useDraggable = (_, initialPos) => {
  const [pos, setPos] = useState(initialPos || { x: 100, y: 100 });
  const [dragging, setDragging] = useState(false);
  const rel = useRef({ x: 0, y: 0 });

  const onMouseDown = (e) => {
    if (
      e.target.closest('.window-controls') ||
      e.target.closest('.url-bar') ||
      e.target.closest('input') ||
      e.target.closest('textarea')
    )
      return;
    e.stopPropagation();
    setDragging(true);
    rel.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
  };

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!dragging) return;
      setPos({ x: e.clientX - rel.current.x, y: e.clientY - rel.current.y });
    };
    const onMouseUp = () => setDragging(false);

    if (dragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [dragging]);

  return { pos, onMouseDown };
};

// --- Sub-Components ---

const BootScreen = ({ onComplete }) => {
  const [started, setStarted] = useState(false);
  const [showProgress, setShowProgress] = useState(false);

  const startSystem = () => {
    setStarted(true);
    const audio = new Audio(SOUND_URL);
    audio.volume = 0.4;
    audio.play().catch((e) => console.error('Audio failed:', e));
    setTimeout(() => setShowProgress(true), 1500);
    setTimeout(() => onComplete(), 4500);
  };

  if (!started) {
    return (
      <div className='boot-screen pre-boot theme-aero-os' onClick={startSystem}>
        <div className='power-btn'>
          <div className='power-icon'>⏻</div>
          <p>Click to Boot System</p>
        </div>
      </div>
    );
  }

  return (
    <div className='boot-screen running theme-aero-os'>
      <div className='boot-content'>
        <div className='apple-logo-boot'></div>
        {showProgress && (
          <div className='mac-progress-bar'>
            <div className='mac-progress-fill'></div>
          </div>
        )}
      </div>
    </div>
  );
};

const AboutWindow = ({ onClose }) => {
  const { pos, onMouseDown } = useDraggable('about-win', {
    x: window.innerWidth / 2 - 150,
    y: window.innerHeight / 2 - 100,
  });
  const navigate = useNavigate();

  return (
    <div
      className='window active'
      style={{
        left: pos.x,
        top: pos.y,
        width: 300,
        height: 'auto',
        zIndex: 10000,
      }}
    >
      <div className='title-bar' onMouseDown={onMouseDown}>
        <div className='traffic-lights window-controls'>
          <span className='btn close' onClick={onClose}></span>
        </div>
        <div className='title'>About This Mac</div>
      </div>
      <div
        className='window-content'
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '20px',
          background: '#e8e8e8',
        }}
      >
        <img
          src={CC_LOGO}
          alt='Crooms Connect'
          style={{ width: 80, height: 80, marginBottom: 15 }}
        />
        <h2
          style={{ fontSize: 18, fontWeight: 'bold', color: '#333', margin: 0 }}
        >
          Crooms Connect
        </h2>
        <p style={{ fontSize: 12, color: '#666', marginTop: 5 }}>
          Version 10.5.8 (Leopard)
        </p>

        <div
          style={{
            width: '100%',
            height: 1,
            background: '#ccc',
            margin: '15px 0',
          }}
        ></div>

        <div style={{ width: '100%', fontSize: 11, color: '#333' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 4,
            }}
          >
            <span style={{ fontWeight: 'bold' }}>Processor</span>
            <span>2.4 GHz Intel Core 2 Duo</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 4,
            }}
          >
            <span style={{ fontWeight: 'bold' }}>Memory</span>
            <span>4 GB 667 MHz DDR2 SDRAM</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 'bold' }}>Startup Disk</span>
            <span>Macintosh HD</span>
          </div>
        </div>

        <div style={{ marginTop: 20 }}>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              background: '#fff',
              border: '1px solid #aaa',
              borderRadius: 4,
              padding: '4px 12px',
              fontSize: 11,
              cursor: 'pointer',
              boxShadow: '0 1px 1px rgba(0,0,0,0.1)',
            }}
          >
            Go Home
          </button>
        </div>
        <div style={{ fontSize: 10, color: '#888', marginTop: 15 }}>
          ™ and © 1983-2026 Apple Inc. <br /> All Rights Reserved.
        </div>
      </div>
    </div>
  );
};

const Window = ({ win, onClose, onFocus, onMinimize, onUpdate }) => {
  const { id, title, isActive, minimized, isMaximized } = win;
  const [pos, setPos] = useState(win.pos || { x: 100, y: 50 });
  const [size, setSize] = useState(win.size || { width: 600, height: 400 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  const dragStart = useRef({ x: 0, y: 0 });
  const resizeStart = useRef({ w: 0, h: 0, x: 0, y: 0 });
  const restoreState = useRef(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!isDragging && !isResizing && win.pos) setPos(win.pos);
    if (!isDragging && !isResizing && win.size) setSize(win.size);
  }, [win.pos, win.size, isDragging, isResizing]);

  const handleMouseDown = (e) => {
    if (
      isMaximized ||
      e.target.closest('.window-controls') ||
      e.target.closest('.resize-handle') ||
      e.target.closest('input') ||
      e.target.closest('textarea')
    )
      return;
    e.preventDefault();
    onFocus(id);
    setIsDragging(true);
    dragStart.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
  };

  const handleResizeDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onFocus(id);
    setIsResizing(true);
    resizeStart.current = {
      w: size.width,
      h: size.height,
      x: e.clientX,
      y: e.clientY,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) {
        setPos({
          x: e.clientX - dragStart.current.x,
          y: e.clientY - dragStart.current.y,
        });
      }
      if (isResizing) {
        const deltaX = e.clientX - resizeStart.current.x;
        const deltaY = e.clientY - resizeStart.current.y;
        setSize({
          width: Math.max(300, resizeStart.current.w + deltaX),
          height: Math.max(200, resizeStart.current.h + deltaY),
        });
      }
    };
    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        onUpdate(id, { pos });
      }
      if (isResizing) {
        setIsResizing(false);
        onUpdate(id, { size });
      }
    };
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, id, onUpdate, pos, size]);

  const toggleMaximize = () => {
    if (isMaximized) {
      const prev = restoreState.current || {
        pos: { x: 100, y: 50 },
        size: { width: 800, height: 600 },
      };
      onUpdate(id, { isMaximized: false, pos: prev.pos, size: prev.size });
    } else {
      restoreState.current = { pos, size };
      onUpdate(id, {
        isMaximized: true,
        pos: { x: 0, y: 22 },
        size: { width: window.innerWidth, height: window.innerHeight - 80 },
      });
    }
  };

  return (
    <div
      className={`window ${isActive ? 'active' : 'inactive'} ${minimized ? 'minimized' : ''} ${isMaximized ? 'maximized' : ''}`}
      style={{
        left: pos.x,
        top: pos.y,
        width: size.width,
        height: size.height,
        zIndex: isActive ? 999 : 100,
      }}
      onMouseDown={() => onFocus(id)}
    >
      <div
        className='title-bar'
        onMouseDown={handleMouseDown}
        onDoubleClick={toggleMaximize}
      >
        <div className='traffic-lights window-controls'>
          <span
            className='btn close'
            onClick={(e) => {
              e.stopPropagation();
              onClose(id);
            }}
          ></span>
          <span
            className='btn minimize'
            onClick={(e) => {
              e.stopPropagation();
              onMinimize(id);
            }}
          ></span>
          <span
            className='btn zoom'
            onClick={(e) => {
              e.stopPropagation();
              toggleMaximize();
            }}
          ></span>
        </div>
        <div className='title'>{title}</div>
      </div>
      <div
        className={`window-content ${title === 'Messenger' ? 'messenger-content' : ''}`}
      >
        {win.children}
      </div>
      {!isMaximized && (
        <div className='resize-handle' onMouseDown={handleResizeDown}>
          <svg viewBox='0 0 10 10' width='10' height='10' fill='#999'>
            <path d='M 10 0 L 0 10 L 10 10 Z' />
          </svg>
        </div>
      )}
    </div>
  );
};

const Finder = ({ fs, openFile }) => {
  const [currentPath, setCurrentPath] = useState('/Desktop');

  const handleDoubleClick = (file) => {
    if (file.type === 'text') {
      openFile(file);
    } else if (file.type === 'folder') {
      alert('Folder logic not fully implemented yet.');
    }
  };

  return (
    <div className='finder-app'>
      <div className='sidebar'>
        <div className='sidebar-group'>
          <span>PLACES</span>
          <ul>
            <li
              onClick={() => setCurrentPath('/Desktop')}
              className={currentPath === '/Desktop' ? 'selected' : ''}
            >
              <span className='sidebar-icon'>🖥</span> Desktop
            </li>
            <li
              onClick={() => setCurrentPath('/Documents')}
              className={currentPath === '/Documents' ? 'selected' : ''}
            >
              <span className='sidebar-icon'>📄</span> Documents
            </li>
            <li onClick={() => setCurrentPath('/Trash')}>
              <span className='sidebar-icon'>🗑</span> Trash
            </li>
          </ul>
        </div>
      </div>
      <div className='file-view'>
        {fs[currentPath]?.map((file) => (
          <div
            key={file.id}
            className='file-icon'
            onDoubleClick={() => handleDoubleClick(file)}
          >
            <div
              className={`icon ${file.type === 'folder' ? 'folder-real' : 'file-real'}`}
            ></div>
            <span>{file.name}</span>
          </div>
        ))}
        {fs[currentPath]?.length === 0 && (
          <div className='empty-state'>0 items</div>
        )}
      </div>
    </div>
  );
};

const TextPad = ({ file }) => {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <textarea
        style={{
          flex: 1,
          border: 'none',
          padding: '10px',
          fontSize: '14px',
          fontFamily: 'monospace',
          resize: 'none',
          outline: 'none',
        }}
        defaultValue={file?.content || ''}
      />
    </div>
  );
};

const Safari = () => {
  const [inputUrl, setInputUrl] = useState(
    'https://en.wikipedia.org/wiki/MacOS_Leopard',
  );
  const [currentUrl, setCurrentUrl] = useState(
    'https://en.wikipedia.org/wiki/MacOS_Leopard',
  );
  const handleNavigate = (e) => {
    e.preventDefault();
    let url = inputUrl;
    if (!url.startsWith('http')) url = 'https://' + url;
    setCurrentUrl(url);
  };
  return (
    <div className='safari-app'>
      <div className='url-bar'>
        <div className='nav-buttons'>
          <span>&lt;</span>
          <span>&gt;</span>
        </div>
        <form onSubmit={handleNavigate} style={{ flex: 1, display: 'flex' }}>
          <input
            type='text'
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
          />
        </form>
      </div>
      <div className='browser-content-container'>
        <iframe
          src={currentUrl}
          title='Safari'
          className='browser-frame'
          sandbox='allow-scripts allow-same-origin allow-forms allow-popups'
        />
      </div>
    </div>
  );
};

const Desktop = ({ chatSidebar, chatMain }) => {
  const {
    windows,
    openWindow,
    closeWindow,
    focusWindow,
    minimizeWindow,
    updateWindow,
    fs,
    activeApp,
  } = useContext(OSContext);
  const [showAbout, setShowAbout] = useState(false);

  const openFile = (file) => {
    openWindow('TextPad', {
      title: file.name,
      width: 400,
      height: 300,
      fileData: file,
    });
  };

  return (
    <div className='desktop theme-aero-os'>
      {/* Menu Bar */}
      <div className='menu-bar'>
        <div className='left'>
          <span
            className='apple-icon'
            onClick={() => setShowAbout(!showAbout)}
            style={{ cursor: 'pointer', padding: '0 5px' }}
          >
            
          </span>
          <span className='app-name'>
            <b>{activeApp || 'Finder'}</b>
          </span>
          <span>File</span>
          <span>Edit</span>
          <span>View</span>
          <span>Window</span>
          <span>Help</span>
        </div>
        <div className='right'>
          <span>🇺🇸</span>
          <span>
            {new Date().toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          <span>🔍</span>
        </div>
      </div>

      {showAbout && <AboutWindow onClose={() => setShowAbout(false)} />}

      <div className='desktop-icons'>
        {fs['/Desktop'].map((file) => (
          <div
            key={file.id}
            className='desktop-icon'
            onDoubleClick={() => openFile(file)}
          >
            <div
              className={`icon-img ${file.type === 'folder' ? 'folder-real' : 'file-real'}`}
            ></div>
            <span className='icon-label'>{file.name}</span>
          </div>
        ))}
      </div>

      {windows.map(
        (win) =>
          !win.minimized && (
            <Window
              key={win.id}
              win={{
                ...win,
                children: (
                  <>
                    {win.type === 'Finder' && (
                      <Finder fs={fs} openFile={openFile} />
                    )}
                    {win.type === 'Safari' && <Safari />}
                    {win.type === 'TextPad' && <TextPad file={win.fileData} />}

                    {/* FIX: Removed hardcoded white/gray backgrounds */}
                    {win.type === 'Messenger' && (
                      <div
                        style={{
                          display: 'flex',
                          width: '100%',
                          height: '100%',
                        }}
                      >
                        {chatSidebar && (
                          <div
                            style={{
                              width: '240px',
                              height: '100%',
                              borderRight: '1px solid #ccc',
                              overflow: 'hidden',
                            }}
                          >
                            {chatSidebar}
                          </div>
                        )}
                        <div
                          style={{
                            flex: 1,
                            height: '100%',
                            position: 'relative',
                          }}
                        >
                          {chatMain}
                        </div>
                      </div>
                    )}

                    {win.type === 'System Preferences' && (
                      <div className='sys-pref' style={{ padding: 20 }}>
                        <h2>System Preferences</h2>
                      </div>
                    )}
                  </>
                ),
              }}
              onClose={closeWindow}
              onFocus={focusWindow}
              onMinimize={minimizeWindow}
              onUpdate={updateWindow}
            />
          ),
      )}

      <div className='dock-container'>
        <div className='dock'>
          {['Finder', 'Safari', 'Messenger', 'System Preferences'].map(
            (app) => (
              <div
                key={app}
                className='dock-item'
                onClick={() => openWindow(app)}
              >
                <div className='tooltip'>{app}</div>
                {app === 'Messenger' ? (
                  <img
                    src={CC_LOGO}
                    alt='Messenger'
                    className='dock-icon-img'
                  />
                ) : (
                  <div
                    className={`dock-icon icon-${app.replace(' ', '').toLowerCase()}`}
                  ></div>
                )}
                {windows.some((w) => w.type === app) && (
                  <div className='active-dot'></div>
                )}
              </div>
            ),
          )}
          <div className='dock-separator'></div>
          <div className='dock-item'>
            <div className='dock-icon icon-trash'></div>
          </div>
        </div>
      </div>
    </div>
  );
};

const AeroOS = ({ chatSidebar, chatMain }) => {
  const [booted, setBooted] = useState(false);
  const [windows, setWindows] = useState([]);
  const [fs, setFs] = useState(INITIAL_FS);
  const [activeApp, setActiveApp] = useState('Messenger');

  useEffect(() => {
    if (booted && windows.length === 0) {
      const id = Date.now();
      const messengerWin = {
        id,
        type: 'Messenger',
        title: 'Messenger',
        isActive: true,
        minimized: false,
        isMaximized: false,
        pos: { x: 50, y: 50 },
        size: { width: 900, height: 600 },
      };
      setWindows([messengerWin]);
    }
  }, [booted, windows.length]);

  const openWindow = (type, props = {}) => {
    if (type !== 'TextPad') {
      const existing = windows.find((w) => w.type === type);
      if (existing) {
        if (existing.minimized) {
          setWindows((prev) =>
            prev.map((w) =>
              w.id === existing.id
                ? { ...w, minimized: false, isActive: true }
                : { ...w, isActive: false },
            ),
          );
        } else {
          focusWindow(existing.id);
        }
        setActiveApp(type);
        return;
      }
    }

    // eslint-disable-next-line react-hooks/purity
    const id = Date.now();
    const newWindow = {
      id,
      type,
      title: props.title || type,
      isActive: true,
      minimized: false,
      isMaximized: false,
      // eslint-disable-next-line react-hooks/purity
      pos: { x: 100 + Math.random() * 50, y: 100 + Math.random() * 50 },
      size: { width: props.width || 800, height: props.height || 500 },
      ...props,
    };
    setWindows((prev) =>
      prev.map((w) => ({ ...w, isActive: false })).concat(newWindow),
    );
    setActiveApp(type);
  };

  const closeWindow = (id) => {
    setWindows((prev) => prev.filter((w) => w.id !== id));
    setActiveApp('Finder');
  };

  const focusWindow = (id) => {
    setWindows((prev) => {
      const target = prev.find((w) => w.id === id);
      const others = prev
        .filter((w) => w.id !== id)
        .map((w) => ({ ...w, isActive: false }));
      if (target) {
        setActiveApp(target.type);
        return [...others, { ...target, isActive: true }];
      }
      return prev;
    });
  };

  const minimizeWindow = (id) => {
    setWindows((prev) =>
      prev.map((w) =>
        w.id === id ? { ...w, minimized: true, isActive: false } : w,
      ),
    );
  };

  const updateWindow = (id, updates) => {
    setWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, ...updates } : w)),
    );
  };

  if (!booted) return <BootScreen onComplete={() => setBooted(true)} />;

  return (
    <OSContext.Provider
      value={{
        windows,
        openWindow,
        closeWindow,
        focusWindow,
        minimizeWindow,
        updateWindow,
        fs,
        setFs,
        activeApp,
      }}
    >
      <Desktop chatSidebar={chatSidebar} chatMain={chatMain} />
    </OSContext.Provider>
  );
};

export default AeroOS;
