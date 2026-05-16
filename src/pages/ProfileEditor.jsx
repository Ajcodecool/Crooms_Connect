import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Cropper from 'react-cropper';
import 'cropperjs/dist/cropper.css';
import useHistory from '../hooks/useHistory';
import { DraggableWidget } from '../components/editor/DraggableWidget';
import { getDefaultAvatar } from '../utils/chatUtils';
// Import the pre-initialized singleton client
import { supabase } from '../supabaseClient';

const cropperStyle = `
  .cropper-container-custom { width: 100%; height: 400px; background: #000; }
`;

const fontLookup = {
  sans: 'ui-sans-serif, system-ui, sans-serif',
  serif: 'ui-serif, Georgia, serif',
  mono: 'ui-monospace, SFMono-Regular, monospace',
  humanist: '"Trebuchet MS", "Lucida Grande", Tahoma, sans-serif',
};

const ProfileEditor = ({ session }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [isEditMode] = useState(true);
  const [isCroomie, setIsCroomie] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [userRole, setUserRole] = useState('User');

  // IMPROVED: Allow all authenticated users to edit, but restrict premium featuresSs
  const canAccessBasicEditor = true; // All authenticated users
  const canAccessPremiumEditor = isCroomie || isVerified;

  const getUserRole = (username, croomie, verified) => {
    const lowerUsername = username.toLowerCase();
    if (lowerUsername.includes('admin')) return 'Admin';
    if (lowerUsername.includes('mod')) return 'Moderator';
    if (croomie) return 'Croomie';
    if (verified) return 'Verified';
    return 'User';
  };

  const [canvasHeight, setCanvasHeight] = useState(2000);
  const [showGrid] = useState(true);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const GRID_SIZE = 20;
  const [guides, setGuides] = useState({ x: [], y: [] });

  const [showCropper, setShowCropper] = useState(false);
  const [cropperImg, setCropperImg] = useState(null);
  const [cropTarget, setCropTarget] = useState(null);
  const cropperRef = useRef(null);

  // STORAGE GARBAGE COLLECTION REFS
  const initialAssetsRef = useRef([]);
  const uploadedAssetsRef = useRef([]);

  const defaultStyle = useMemo(
    () => ({
      backgroundColor: '#1e293b',
      textColor: '#ffffff',
      opacity: 0.9,
      borderRadius: '16px',
      fontFamily: 'sans',
    }),
    [],
  );

  const defaultWidgets = useMemo(
    () => [
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
        content: 'Welcome to my profile!\n\nDouble click to edit this text.',
        style: { ...defaultStyle },
      },
    ],
    [defaultStyle],
  );

  const initialState = useMemo(
    () => ({
      username: '',
      pronouns: '',
      bio: '',
      avatar_url: null,
      banner_url: null,
      background_url: null,
      theme_color: '#3b82f6',
      background_color: '#0f172a',
      text_color: '#ffffff',
      font_family: 'sans',
      transparency: 0.9,
      widgets: defaultWidgets,
    }),
    [defaultWidgets],
  );

  const [stateRaw, setState, undo, redo, canUndo, canRedo] =
    useHistory(initialState);

  // 🔥 GUARANTEED SAFE STATE
  const state = stateRaw || initialState;

  // 🔥 ALWAYS SAFE WIDGETS
  const widgets = state.widgets || [];

  const updateField = (field, value) => {
    setState((prev) => {
      const newState = { ...prev, [field]: value };
      return newState;
    });
    if (field === 'username') {
      setUserRole(getUserRole(value || '', isCroomie, isVerified));
    }
  };

  const updateWidget = (id, changes) => {
    setState((prev) => {
      const safeWidgets = prev?.widgets || [];
      const updated = safeWidgets.map((w) =>
        w.id === id ? { ...w, ...changes } : w,
      );
      return { ...prev, widgets: updated };
    });

    if (changes.y !== undefined) {
      const widget = widgets.find((w) => w.id === id);
      const height = widget ? widget.height : 0;
      const bottomEdge = changes.y + height + 200;
      if (bottomEdge > canvasHeight) {
        setCanvasHeight(bottomEdge);
      }
    }
  };

  const updateWidgetStyle = (id, styleKey, value) => {
    const widget = widgets.find((w) => w.id === id);
    if (!widget) return;
    const newStyle = { ...widget.style, [styleKey]: value };
    updateWidget(id, { style: newStyle });
  };

  const getMaxZIndex = () => {
    if (!widgets.length) return 1;
    return Math.max(...widgets.map((w) => w.zIndex || 0)) + 1;
  };

  const getMinZIndex = () => {
    if (!widgets.length) return 0;
    return Math.min(...widgets.map((w) => w.zIndex || 999)) - 1;
  };

  const bringForward = (id) => {
    const widget = widgets.find((w) => w.id === id);
    if (!widget) return;
    updateWidget(id, { zIndex: (widget.zIndex || 0) + 1 });
  };

  const bringToFront = (id) => {
    updateWidget(id, { zIndex: getMaxZIndex() });
  };

  const bringBack = (id) => {
    const widget = widgets.find((w) => w.id === id);
    if (!widget) return;
    updateWidget(id, { zIndex: Math.max(0, (widget.zIndex || 0) - 1) });
  };

  const bringToBack = (id) => {
    updateWidget(id, { zIndex: getMinZIndex() });
  };

  const resetLayout = () => {
    if (
      window.confirm(
        'Are you sure? This will delete all custom widgets and reset positions to the factory default.',
      )
    ) {
      const currentFont = state.font_family;
      const resetWidgets = defaultWidgets.map((w) => ({
        ...w,
        style: { ...w.style, fontFamily: currentFont },
      }));
      setState((prev) => ({ ...prev, widgets: resetWidgets }));
      setSelectedId(null);
      setCanvasHeight(2000);
    }
  };

  const changeGlobalFont = (newFont) => {
    setState((prev) => {
      const newState = { ...prev, font_family: newFont };
      newState.widgets = newState.widgets.map((w) => {
        if (w.type === 'system-card' || w.type === 'system-feed') {
          return { ...w, style: { ...w.style, fontFamily: newFont } };
        }
        return w;
      });
      return newState;
    });
  };

  // IMPROVED: Allow basic widgets for all users, premium widgets for Croomie/Verified
  const addWidget = (type, subType = null) => {
    if (type === 'system-card') {
      const newWidget = {
        id: 'profile-card',
        type: 'system-card',
        x: 360,
        y: 140,
        width: 680,
        height: 320,
        zIndex: 30,
        style: { ...defaultStyle, fontFamily: state.font_family },
      };
      setState({ ...state, widgets: [...state.widgets, newWidget] });
      setSelectedId('profile-card');
      return;
    }
    if (type === 'system-feed') {
      const newWidget = {
        id: 'feed',
        type: 'system-feed',
        x: 360,
        y: 480,
        width: 680,
        height: 400,
        zIndex: 30,
        style: { ...defaultStyle, fontFamily: state.font_family },
      };
      setState({ ...state, widgets: [...state.widgets, newWidget] });
      setSelectedId('feed');
      return;
    }

    let w = 300,
      h = 150;
    if (type === 'shape' && subType === 'circle') {
      w = 100;
      h = 100;
    }
    if (type === 'spotify') {
      w = 300;
      h = 152;
    }

    const startY = 200;

    const newWidget = {
      id: `w-${Date.now()}`,
      type,
      x: 40,
      y: startY,
      width: w,
      height: h,
      content:
        type === 'text'
          ? 'Double click to edit text'
          : type === 'spotify'
            ? ''
            : type === 'gif'
              ? ''
              : '',
      zIndex: 30 + state.widgets.length,
      style: {
        ...defaultStyle,
        backgroundColor:
          type === 'text'
            ? '#1e293b'
            : type === 'shape'
              ? '#3b82f6'
              : 'transparent',
        opacity: 1,
        fontFamily: state.font_family,
        borderRadius:
          subType === 'circle' ? '50%' : type === 'spotify' ? '12px' : '16px',
      },
    };
    setState({ ...state, widgets: [...state.widgets, newWidget] });
    setSelectedId(newWidget.id);
  };

  const duplicateWidget = (id) => {
    const original = widgets.find((w) => w.id === id);
    if (!original) return;
    if (original.id === 'profile-card' || original.id === 'feed') return;

    const clone = {
      ...original,
      id: `w-${Date.now()}`,
      x: Number(original.x) + 20,
      y: Number(original.y) + 20,
      zIndex: state.widgets.length + 30,
    };
    setState({ ...state, widgets: [...state.widgets, clone] });
    setSelectedId(clone.id);
  };

  // IMPROVED: Allow basic users to delete widgets, but only non-system ones
  const deleteWidget = (id) => {
    const widget = widgets.find((w) => w.id === id);
    if (!widget) return;
    // Only allow deletion of non-system widgets
    if (widget.id === 'profile-card' || widget.id === 'feed') {
      if (!canAccessPremiumEditor) return;
    }
    setState({ ...state, widgets: state.widgets.filter((w) => w.id !== id) });
    setSelectedId(null);
  };

  const alignWidget = (id, alignment) => {
    if (!canAccessPremiumEditor) return;
    const w = widgets.find((wi) => wi.id === id);
    if (!w) return;

    const canvasWidth = 1060;
    let newX = Number(w.x);
    if (alignment === 'center') newX = (canvasWidth - w.width) / 2;
    if (alignment === 'left') newX = 20;
    if (alignment === 'right') newX = canvasWidth - w.width - 20;
    updateWidget(id, { x: newX });
  };

  const handleDrag = (activeId, x, y, w, h) => {
    if (!activeId || !snapEnabled) {
      setGuides({ x: [], y: [] });
      return;
    }
    const newGuides = { x: [], y: [] };
    const activeEdges = {
      l: x,
      c: x + w / 2,
      r: x + w,
      t: y,
      m: y + h / 2,
      b: y + h,
    };
    state.widgets.forEach((widget) => {
      if (widget.id === activeId) return;
      const t = {
        l: widget.x,
        c: widget.x + widget.width / 2,
        r: widget.x + widget.width,
        t: widget.y,
        m: widget.y + widget.height / 2,
        b: widget.y + widget.height,
      };
      if (Math.abs(activeEdges.l - t.l) < 5) newGuides.x.push(t.l);
      if (Math.abs(activeEdges.t - t.t) < 5) newGuides.y.push(t.t);
    });
    setGuides(newGuides);
  };

  // IMPROVED: Support GIF and various media formats
  const processFile = useCallback(
    async (file, type) => {
      if (!file) return;

      if (type === 'widget') {
        try {
          const fileExt = file.name ? file.name.split('.').pop() : 'png';
          const fileName = `${session.user.id}-${Date.now()}.${fileExt}`;
          const filePath = `uploads/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('profile-pictures')
            .upload(filePath, file);

          if (uploadError) throw uploadError;

          const { data } = supabase.storage
            .from('profile-pictures')
            .getPublicUrl(filePath);

          const publicUrl = data?.publicUrl;
          if (!publicUrl) throw new Error('Could not retrieve public URL');

          // Track uploaded asset for Garbage Collection
          uploadedAssetsRef.current.push(publicUrl);

          const img = new Image();

          img.onload = () => {
            let w = img.width;
            let h = img.height;

            if (!w || !h || isNaN(w) || isNaN(h)) {
              w = 300;
              h = 300;
            }

            if (w > 500) {
              const ratio = h / w;
              w = 500;
              h = 500 * ratio;
            }

            const current = state;
            const isGif = fileExt.toLowerCase() === 'gif';
            const newWidget = {
              id: `w-${Date.now()}`,
              type: isGif ? 'gif' : 'image',
              x: 40,
              y: 200,
              width: Math.round(w),
              height: Math.round(h),
              content: publicUrl,
              zIndex: 50 + current.widgets.length,
              style: {
                ...defaultStyle,
                borderRadius: '0px',
                backgroundColor: 'transparent',
              },
            };

            setState({ ...current, widgets: [...current.widgets, newWidget] });
          };

          img.onerror = () => {
            const current = state;
            const isGif = fileExt.toLowerCase() === 'gif';
            const newWidget = {
              id: `w-${Date.now()}`,
              type: isGif ? 'gif' : 'image',
              x: 40,
              y: 200,
              width: 300,
              height: 300,
              content: publicUrl,
              zIndex: 50 + current.widgets.length,
              style: {
                ...defaultStyle,
                borderRadius: '0px',
                backgroundColor: 'transparent',
              },
            };
            setState({ ...current, widgets: [...current.widgets, newWidget] });
          };

          img.src = publicUrl;
        } catch (err) {
          console.error('Upload error:', err);
          alert('Error uploading media. Please try again.');
        }
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        setCropperImg(reader.result);
        setCropTarget(type);
        setShowCropper(true);
      };
      reader.readAsDataURL(file);
    },
    // FIXED: Added `state` to the dependency array to resolve the ESLint warning
    [defaultStyle, session?.user?.id, setState, state],
  );

  const initiateUpload = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      processFile(file, type);
    }
    e.target.value = '';
  };

  useEffect(() => {
    const handlePaste = (e) => {
      if (!isEditMode) return;

      if (e.clipboardData && e.clipboardData.items) {
        for (let i = 0; i < e.clipboardData.items.length; i++) {
          const item = e.clipboardData.items[i];
          if (item.type.indexOf('image') !== -1) {
            const file = item.getAsFile();
            if (file) {
              processFile(file, 'widget');
              e.preventDefault();
              return;
            }
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isEditMode, processFile]);

  const performCrop = async () => {
    if (!cropperRef.current) return;
    const canvas = cropperRef.current.cropper.getCroppedCanvas();
    if (!canvas) return;

    canvas.toBlob(async (blob) => {
      const path = `uploads/${session.user.id}-${Date.now()}.png`;
      await supabase.storage.from('profile-pictures').upload(path, blob);
      const { data } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(path);
      const publicUrl = data?.publicUrl;

      // Track uploaded asset for Garbage Collection
      uploadedAssetsRef.current.push(publicUrl);

      if (cropTarget === 'banner') updateField('banner_url', publicUrl);
      else if (cropTarget === 'background')
        updateField('background_url', publicUrl);

      setShowCropper(false);
      setCropperImg(null);
    });
  };

  const performGarbageCollection = async () => {
    // Collect all URLs currently required by the layout
    const currentAssets = [];
    if (state.banner_url) currentAssets.push(state.banner_url);
    if (state.background_url) currentAssets.push(state.background_url);
    state.widgets.forEach((w) => {
      if ((w.type === 'image' || w.type === 'gif') && w.content)
        currentAssets.push(w.content);
    });

    // Merge initially loaded assets + assets uploaded this session
    const allKnownAssets = [
      ...initialAssetsRef.current,
      ...uploadedAssetsRef.current,
    ];

    // Find orphans (files that are no longer on the active profile layout)
    const orphansToDelete = allKnownAssets.filter(
      (url) => !currentAssets.includes(url),
    );

    // Extract the specific file paths from the public URLs for Supabase deletion
    const pathsToDelete = orphansToDelete
      .map((url) => {
        const match = url.match(/profile-pictures\/(.+)$/);
        return match ? match[1] : null;
      })
      .filter(Boolean); // Remove nulls

    if (pathsToDelete.length > 0) {
      console.log(
        'Garbage Collection: Deleting orphaned assets:',
        pathsToDelete,
      );
      await supabase.storage.from('profile-pictures').remove(pathsToDelete);
    }

    // Reset tracking lists to the new state
    initialAssetsRef.current = currentAssets;
    uploadedAssetsRef.current = [];
  };

  // IMPROVED: Allow all users to save their basic profile info
  const handleSave = async () => {
    try {
      // All users can update basic info
      const updates = {
        username: state.username,
        pronouns: state.pronouns,
        bio: state.bio,
        banner_url: state.banner_url,
      };

      // Only Croomie/Verified users can save premium features
      if (canAccessPremiumEditor) {
        updates.background_url = state.background_url;
        updates.theme_color = state.theme_color;
        updates.background_color = state.background_color;
        updates.text_color = state.text_color;
        updates.font_family = state.font_family;
        updates.ui_transparency = state.transparency;
        updates.widgets = state.widgets;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', session.user.id);
      if (error) throw error;

      // Clean up deleted images after a successful save
      await performGarbageCollection();

      alert('Profile Saved Successfully!');
    } catch (err) {
      alert('Save failed: ' + (err.message || 'Unknown error'));
    }
  };

  const handleCancel = async () => {
    // If the user aborts, instantly delete any assets they uploaded during this session
    const pathsToRevert = uploadedAssetsRef.current
      .map((url) => {
        const match = url.match(/profile-pictures\/(.+)$/);
        return match ? match[1] : null;
      })
      .filter(Boolean);

    if (pathsToRevert.length > 0) {
      await supabase.storage.from('profile-pictures').remove(pathsToRevert);
    }

    navigate(`/u/${state.username}`);
  };

  useEffect(() => {
    const load = async () => {
      console.log('ProfileEditor load: session.user.id=', session?.user?.id);
      if (!session?.user) {
        console.warn('No session.user, redirecting to /auth');
        return navigate('/auth');
      }

      try {
        let { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        console.log('Profile fetch result:', { data, error });

        if (error && error.code !== 'PGRST116') {
          // PGRST116 = no rows
          throw error;
        }

        if (!data) {
          // Auto-create profile for new user
          console.log('No profile found, creating default...');

          const defaultUsername = session.user.email
            ? session.user.email.split('@')[0].replace(/\./g, '_')
            : 'user_' + session.user.id.slice(0, 8);

          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: session.user.id,
              username: defaultUsername,
              email: session.user.email || null,
              bio: `Welcome to ${defaultUsername}'s profile!`,
              croomie: false,
              is_verified: false,
              created_at: new Date().toISOString(),
            });

          if (insertError) {
            console.error('Failed to create profile:', insertError);
            alert(`Failed to initialize profile: ${insertError.message}`);
            return;
          }

          // Refetch the newly created profile
          ({ data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single());

          if (error || !data) {
            console.error('Refetch failed after insert');
            alert('Failed to load profile after creation');
            return;
          }
          console.log('Created & fetched profile:', data);
        }

        // Populate state from data
        setIsCroomie(data.croomie || false);
        setIsVerified(data.is_verified || false);
        setUserRole(
          getUserRole(
            data.username || '',
            data.croomie || false,
            data.is_verified || false,
          ),
        );

        const widgets = (data.widgets || defaultWidgets).map((w) => ({
          ...w,
          x: Number(w.x) || 0,
          y: Number(w.y) || 0,
          width: Number(w.width) || 100,
          height: Number(w.height) || 100,
          style: w.style || { ...defaultStyle },
        }));

        // Track initial assets
        const initialAssets = [];
        if (data.banner_url) initialAssets.push(data.banner_url);
        if (data.background_url) initialAssets.push(data.background_url);
        widgets.forEach((w) => {
          if ((w.type === 'image' || w.type === 'gif') && w.content)
            initialAssets.push(w.content);
        });
        initialAssetsRef.current = initialAssets;

        const maxY = widgets.reduce(
          (max, w) =>
            Math.max(max, (Number(w.y) || 0) + (Number(w.height) || 0)),
          0,
        );
        const initialHeight = Math.max(1200, maxY + 500);
        setCanvasHeight(initialHeight);

        setState({
          ...initialState,
          ...data,
          username: data.username, // Ensure username is set
          transparency: data.ui_transparency ?? 0.9,
          widgets,
        });
      } catch (err) {
        console.error('Profile load error:', err);
        alert(
          'Failed to load profile data: ' + (err.message || 'Unknown error'),
        );
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [
    defaultStyle,
    defaultWidgets,
    initialState,
    navigate,
    // FIXED: Added `session.user` (required for email checks) and `setState`
    session?.user,
    setState,
  ]);

  if (loading)
    return (
      <div className='h-screen bg-slate-950 flex items-center justify-center text-slate-500'>
        Loading Studio...
      </div>
    );
  const selectedWidget = widgets.find((w) => w.id === selectedId) || null;

  const hasProfileCard = widgets.some((w) => w.id === 'profile-card');
  const hasFeed = widgets.some((w) => w.id === 'feed');

  return (
    <div
      className='h-screen flex flex-col md:flex-row overflow-hidden font-sans text-slate-300'
      style={{ fontFamily: fontLookup[state.font_family] }}
    >
      <style>{cropperStyle}</style>

      {/* === CROPPER MODAL === */}
      {showCropper && (
        <div className='fixed inset-0 z-200 bg-black/90 flex items-center justify-center p-4'>
          <div className='bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-xl overflow-hidden flex flex-col'>
            <div className='p-4 border-b border-slate-800 flex justify-between'>
              <h3 className='font-bold text-white'>Crop Asset</h3>
              <button onClick={() => setShowCropper(false)}>
                <i className='fa-solid fa-xmark'></i>
              </button>
            </div>
            <div className='bg-black relative h-100'>
              <Cropper
                src={cropperImg}
                style={{ height: '100%', width: '100%' }}
                aspectRatio={cropTarget === 'banner' ? 3 / 1 : NaN}
                guides={true}
                ref={cropperRef}
              />
            </div>
            <div className='p-4 border-t border-slate-800 flex justify-end gap-2'>
              <button
                onClick={() => setShowCropper(false)}
                className='px-4 py-2 bg-slate-800 rounded'
              >
                Cancel
              </button>
              <button
                onClick={performCrop}
                className='px-6 py-2 bg-blue-600 text-white font-bold rounded'
              >
                Apply Crop
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === SIDEBAR === */}
      <div
        className='w-80 bg-slate-950 border-r border-slate-800 flex flex-col z-100 shrink-0 shadow-xl'
        style={{ fontFamily: 'sans-serif' }}
      >
        <div className='p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950'>
          <div className='font-bold text-white text-sm tracking-wider uppercase'>
            <i className='fa-solid fa-layer-group text-blue-500 mr-2'></i>{' '}
            Studio
          </div>
          <div className='flex bg-slate-900 rounded border border-slate-800'>
            <button
              onClick={undo}
              disabled={!canUndo}
              className='w-8 h-8 flex items-center justify-center hover:text-white disabled:opacity-30'
            >
              <i className='fa-solid fa-rotate-left'></i>
            </button>
            <div className='w-px bg-slate-800'></div>
            <button
              onClick={redo}
              disabled={!canRedo}
              className='w-8 h-8 flex items-center justify-center hover:text-white disabled:opacity-30'
            >
              <i className='fa-solid fa-rotate-right'></i>
            </button>
          </div>
        </div>

        <div className='flex-1 overflow-y-auto custom-scrollbar'>
          {!selectedWidget && (
            <div className='p-4 space-y-6'>
              {/* IMPROVED: Show tier status instead of blocking non-Croomies */}
              {!canAccessPremiumEditor && (
                <div className='bg-blue-500/10 border border-blue-500/20 p-4 rounded text-xs text-blue-400'>
                  <h3 className='font-bold mb-1'>
                    <i className='fa-solid fa-star mr-1'></i> Basic Profile
                  </h3>
                  <p className='mb-2'>
                    You are using basic editing. Upgrade to Croomie to unlock
                    advanced customization!
                  </p>
                  <a
                    href='/settings'
                    className='block w-full text-center py-2 bg-blue-500/20 rounded hover:bg-blue-500/30 transition text-blue-300 font-bold'
                  >
                    View Premium Features
                  </a>
                </div>
              )}

              {/* BIO EDITOR - Available to ALL users */}
              <div className='space-y-2'>
                <h3 className='text-[10px] font-bold text-slate-500 uppercase mb-2 flex items-center gap-2'>
                  <i className='fa-solid fa-edit text-blue-400 text-xs'></i>
                  Edit Bio
                </h3>
                <textarea
                  value={state.bio || ''}
                  onChange={(e) => updateField('bio', e.target.value)}
                  placeholder='Tell the world about yourself...'
                  className='w-full h-20 p-3 bg-slate-900 border border-slate-700 rounded-md text-sm resize-none focus:border-blue-500 focus:outline-none text-white'
                  rows={3}
                />

                <div className='flex gap-2'>
                  <button
                    type='button'
                    onClick={async () => {
                      if (!window.confirm('Reset your bio to empty?')) return;
                      try {
                        // Update DB immediately
                        const updates = { bio: '' };
                        const { error } = await supabase
                          .from('profiles')
                          .update(updates)
                          .eq('id', session.user.id);
                        if (error) throw error;

                        // Update local state
                        updateField('bio', '');
                      } catch (err) {
                        console.error('Reset bio failed:', err);
                        alert('Failed to reset bio.');
                      }
                    }}
                    className='flex-1 py-2 bg-slate-900/60 hover:bg-slate-800 rounded text-xs font-bold text-slate-200 border border-slate-800'
                    title='Reset Bio'
                  >
                    <i className='fa-solid fa-broom mr-2 text-slate-400'></i>
                    Reset Bio
                  </button>
                </div>
              </div>

              <div>
                <h3 className='text-[10px] font-bold text-slate-500 uppercase mb-3'>
                  Profile Assets
                </h3>
                <div className='space-y-2'>
                  <div className='flex gap-2'>
                    <button
                      type='button'
                      onClick={async () => {
                        if (
                          !window.confirm(
                            'Reset your profile picture to default?',
                          )
                        )
                          return;
                        try {
                          const updates = { avatar_url: null };
                          const { error } = await supabase
                            .from('profiles')
                            .update(updates)
                            .eq('id', session.user.id);
                          if (error) throw error;

                          updateField('avatar_url', null);

                          // Attempt to clean up orphans from this editor state
                          try {
                            await performGarbageCollection();
                          } catch (e) {
                            console.warn(
                              'Garbage collection after reset avatar failed:',
                              e,
                            );
                          }
                        } catch (err) {
                          console.error('Reset PFP failed:', err);
                          alert('Failed to reset profile picture.');
                        }
                      }}
                      className='flex-1 py-2 bg-slate-900/60 hover:bg-slate-800 rounded text-xs font-bold text-slate-200 border border-slate-800'
                      title='Reset PFP'
                    >
                      <i className='fa-solid fa-user-slash mr-2 text-slate-400'></i>
                      Reset PFP
                    </button>
                  </div>

                  <div className='flex gap-2'>
                    <button
                      type='button'
                      onClick={async () => {
                        if (!window.confirm('Set your status to online?'))
                          return;
                        try {
                          const updates = { is_invisible: false };
                          const { error } = await supabase
                            .from('profiles')
                            .update(updates)
                            .eq('id', session.user.id);
                          if (error) throw error;

                          // Chat uses is_invisible to derive presence
                          // Keep editor state in sync if it has it.
                          // (ProfileEditor doesn't currently render presence UI.)
                        } catch (err) {
                          console.error('Reset status failed:', err);
                          alert('Failed to reset status.');
                        }
                      }}
                      className='flex-1 py-2 bg-slate-900/60 hover:bg-slate-800 rounded text-xs font-bold text-slate-200 border border-slate-800'
                      title='Reset Status'
                    >
                      <i className='fa-solid fa-eye mr-2 text-slate-400'></i>
                      Reset Status
                    </button>
                  </div>

                  <label className='flex items-center justify-between p-3 bg-slate-900 rounded border border-slate-800 hover:border-slate-600 cursor-pointer transition'>
                    <span className='text-xs font-bold text-slate-300'>
                      Banner Image
                    </span>
                    <input
                      type='file'
                      accept='image/*'
                      className='hidden'
                      onChange={(e) => initiateUpload(e, 'banner')}
                    />
                  </label>
                  {canAccessPremiumEditor && (
                    <label className='flex items-center justify-between p-3 bg-slate-900 rounded border border-slate-800 hover:border-slate-600 cursor-pointer transition'>
                      <span className='text-xs font-bold text-slate-300'>
                        Wallpaper
                      </span>
                      <input
                        type='file'
                        accept='image/*'
                        className='hidden'
                        onChange={(e) => initiateUpload(e, 'background')}
                      />
                    </label>
                  )}
                </div>
              </div>

              {canAccessPremiumEditor && (
                <>
                  <div>
                    <h3 className='text-[10px] font-bold text-slate-500 uppercase mb-3'>
                      Global Theme
                    </h3>
                    <div className='space-y-3'>
                      <div className='flex justify-between items-center p-2 bg-slate-900 rounded border border-slate-800'>
                        <span className='text-xs text-slate-300 font-bold'>
                          Background
                        </span>
                        <div className='flex items-center gap-2'>
                          <input
                            type='color'
                            value={state.background_color}
                            onChange={(e) =>
                              updateField('background_color', e.target.value)
                            }
                            className='w-6 h-6 rounded cursor-pointer border-none p-0 bg-transparent'
                          />
                        </div>
                      </div>
                      <div className='flex justify-between items-center p-2 bg-slate-900 rounded border border-slate-800'>
                        <span className='text-xs text-slate-300 font-bold'>
                          Accent
                        </span>
                        <div className='flex items-center gap-2'>
                          <input
                            type='color'
                            value={state.theme_color}
                            onChange={(e) =>
                              updateField('theme_color', e.target.value)
                            }
                            className='w-6 h-6 rounded cursor-pointer border-none p-0 bg-transparent'
                          />
                        </div>
                      </div>
                      <div className='flex justify-between items-center p-2 bg-slate-900 rounded border border-slate-800'>
                        <span className='text-xs text-slate-300 font-bold'>
                          Text
                        </span>
                        <div className='flex items-center gap-2'>
                          <input
                            type='color'
                            value={state.text_color}
                            onChange={(e) =>
                              updateField('text_color', e.target.value)
                            }
                            className='w-6 h-6 rounded cursor-pointer border-none p-0 bg-transparent'
                          />
                        </div>
                      </div>

                      <div className='pt-2'>
                        <div className='flex justify-between text-[10px] uppercase font-bold text-slate-500 mb-1'>
                          <span>UI Transparency</span>
                          <span>{Math.round(state.transparency * 100)}%</span>
                        </div>
                        <input
                          type='range'
                          min='0'
                          max='1'
                          step='0.05'
                          value={state.transparency}
                          onChange={(e) =>
                            updateField(
                              'transparency',
                              parseFloat(e.target.value),
                            )
                          }
                          className='w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-blue-500'
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className='text-[10px] font-bold text-slate-500 uppercase mb-3'>
                      Page Typography
                    </h3>
                    <div className='flex bg-slate-900 rounded border border-slate-800 p-1'>
                      {['sans', 'serif', 'mono', 'humanist'].map((f) => (
                        <button
                          key={f}
                          onClick={() => changeGlobalFont(f)}
                          className={`flex-1 py-1 text-[10px] capitalize rounded ${state.font_family === f ? 'bg-slate-700 text-white' : 'text-slate-500'}`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className='text-[10px] font-bold text-slate-500 uppercase mb-3'>
                      Add Widgets
                    </h3>
                    {(!hasProfileCard || !hasFeed) && (
                      <div className='mb-3 p-2 bg-blue-900/10 border border-blue-500/20 rounded'>
                        <p className='text-[10px] font-bold text-blue-400 mb-2 uppercase'>
                          Restore Missing Items
                        </p>
                        <div className='space-y-2'>
                          {!hasProfileCard && (
                            <button
                              onClick={() => addWidget('system-card')}
                              className='w-full py-2 bg-blue-600 hover:bg-blue-500 rounded text-xs text-white font-bold flex items-center justify-center gap-2'
                            >
                              <i className='fa-solid fa-id-card'></i> Add Bio
                              Card
                            </button>
                          )}
                          {!hasFeed && (
                            <button
                              onClick={() => addWidget('system-feed')}
                              className='w-full py-2 bg-blue-600 hover:bg-blue-500 rounded text-xs text-white font-bold flex items-center justify-center gap-2'
                            >
                              <i className='fa-solid fa-message'></i> Add
                              Messages
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    <div className='grid grid-cols-2 gap-2 mb-2'>
                      <button
                        onClick={() => addWidget('text')}
                        className='p-4 bg-slate-900 hover:bg-slate-800 rounded border border-slate-800 flex flex-col items-center gap-2 transition'
                      >
                        <i className='fa-solid fa-font text-xl text-slate-400'></i>
                        <span className='text-xs font-bold'>Text</span>
                      </button>

                      <label className='p-4 bg-slate-900 hover:bg-slate-800 rounded border border-slate-800 flex flex-col items-center gap-2 cursor-pointer transition'>
                        <i className='fa-solid fa-image text-xl text-slate-400'></i>
                        <span className='text-xs font-bold'>Image</span>
                        <input
                          type='file'
                          accept='image/*'
                          className='hidden'
                          onChange={(e) => initiateUpload(e, 'widget')}
                        />
                      </label>
                    </div>

                    <div className='grid grid-cols-2 gap-2 mb-2'>
                      <label className='p-4 bg-slate-900 hover:bg-slate-800 rounded border border-slate-800 flex flex-col items-center gap-2 cursor-pointer transition'>
                        <i className='fa-solid fa-film text-xl text-purple-400'></i>
                        <span className='text-xs font-bold'>GIF</span>
                        <input
                          type='file'
                          accept='.gif'
                          className='hidden'
                          onChange={(e) => initiateUpload(e, 'widget')}
                        />
                      </label>
                      <button
                        onClick={() => addWidget('shape', 'square')}
                        className='p-4 bg-slate-900 hover:bg-slate-800 rounded border border-slate-800 flex flex-col items-center gap-2 transition'
                      >
                        <i className='fa-solid fa-square text-xl text-slate-400'></i>
                        <span className='text-xs font-bold'>Box</span>
                      </button>
                    </div>

                    <div className='grid grid-cols-2 gap-2 mb-2'>
                      <button
                        onClick={() => addWidget('shape', 'circle')}
                        className='p-4 bg-slate-900 hover:bg-slate-800 rounded border border-slate-800 flex flex-col items-center gap-2 transition'
                      >
                        <i className='fa-solid fa-circle text-xl text-slate-400'></i>
                        <span className='text-xs font-bold'>Circle</span>
                      </button>
                      <button
                        onClick={() => addWidget('spotify')}
                        className='p-4 bg-slate-900 hover:bg-slate-800 rounded border border-slate-800 flex flex-col items-center gap-2 transition'
                      >
                        <i className='fa-brands fa-spotify text-xl text-green-500'></i>
                        <span className='text-xs font-bold'>Spotify</span>
                      </button>
                    </div>
                  </div>
                </>
              )}

              {canAccessPremiumEditor && (
                <div className='pt-4 border-t border-slate-800'>
                  <button
                    onClick={resetLayout}
                    className='w-full py-2 bg-red-900/20 text-red-500 hover:bg-red-900/40 rounded text-xs font-bold transition'
                  >
                    <i className='fa-solid fa-triangle-exclamation mr-2'></i>
                    Factory Reset Layout
                  </button>
                </div>
              )}
            </div>
          )}

          {selectedWidget && (
            <div className='p-4 space-y-6'>
              <div className='flex items-center gap-2'>
                <button
                  onClick={() => setSelectedId(null)}
                  className='w-8 h-8 flex items-center justify-center bg-slate-800 hover:bg-slate-700 rounded-full text-white transition'
                >
                  <i className='fa-solid fa-arrow-left'></i>
                </button>
                <h3 className='font-bold text-sm text-white'>Edit Widget</h3>
              </div>

              {selectedWidget.type === 'text' && (
                <div>
                  <label className='block text-[10px] font-bold text-slate-500 uppercase mb-2'>
                    Content
                  </label>
                  <textarea
                    value={selectedWidget.content}
                    onChange={(e) =>
                      updateWidget(selectedWidget.id, {
                        content: e.target.value,
                      })
                    }
                    className='w-full h-32 bg-slate-900 border border-slate-700 rounded p-3 text-sm text-white focus:border-blue-500 focus:outline-none resize-none'
                  />
                </div>
              )}

              {selectedWidget.type === 'spotify' && (
                <div>
                  <label className='block text-[10px] font-bold text-slate-500 uppercase mb-2'>
                    Spotify Track / Album Link
                  </label>
                  <input
                    type='text'
                    placeholder='https://open.spotify.com/track/...'
                    value={selectedWidget.content}
                    onChange={(e) =>
                      updateWidget(selectedWidget.id, {
                        content: e.target.value,
                      })
                    }
                    className='w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white focus:border-blue-500 focus:outline-none'
                  />
                  <p className='text-[10px] text-slate-500 mt-2'>
                    Paste a link to a song, album, or playlist.
                  </p>
                </div>
              )}

              {(selectedWidget.type === 'system-card' ||
                selectedWidget.type === 'system-feed' ||
                selectedWidget.type === 'text' ||
                selectedWidget.type === 'shape' ||
                selectedWidget.type === 'image' ||
                selectedWidget.type === 'gif') && (
                <div>
                  <h3 className='text-[10px] font-bold text-slate-500 uppercase mb-3'>
                    Appearance
                  </h3>
                  <div className='space-y-3'>
                    {(selectedWidget.type === 'system-card' ||
                      selectedWidget.type === 'system-feed' ||
                      selectedWidget.type === 'text' ||
                      selectedWidget.type === 'shape') && (
                      <div className='flex justify-between items-center p-2 bg-slate-900 rounded border border-slate-800'>
                        <span className='text-xs text-slate-300 font-bold'>
                          Color
                        </span>
                        <input
                          type='color'
                          value={
                            selectedWidget.style.backgroundColor || '#1e293b'
                          }
                          onChange={(e) =>
                            updateWidgetStyle(
                              selectedWidget.id,
                              'backgroundColor',
                              e.target.value,
                            )
                          }
                          className='w-6 h-6 rounded cursor-pointer border-none p-0 bg-transparent'
                        />
                      </div>
                    )}

                    <div className='pt-2'>
                      <div className='flex justify-between text-[10px] uppercase font-bold text-slate-500 mb-1'>
                        <span>Opacity</span>
                        <span>
                          {Math.round(
                            (selectedWidget.style.opacity ?? 1) * 100,
                          )}
                          %
                        </span>
                      </div>
                      <input
                        type='range'
                        min='0'
                        max='1'
                        step='0.05'
                        value={selectedWidget.style.opacity ?? 1}
                        onChange={(e) =>
                          updateWidgetStyle(
                            selectedWidget.id,
                            'opacity',
                            parseFloat(e.target.value),
                          )
                        }
                        className='w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-blue-500'
                      />
                    </div>

                    {(selectedWidget.type === 'image' ||
                      selectedWidget.type === 'gif' ||
                      selectedWidget.type === 'system-card' ||
                      selectedWidget.type === 'system-feed' ||
                      selectedWidget.type === 'text' ||
                      selectedWidget.type === 'shape') && (
                      <div className='pt-2'>
                        <div className='flex justify-between text-[10px] uppercase font-bold text-slate-500 mb-1'>
                          <span>Border Radius</span>
                          <span>
                            {selectedWidget.style.borderRadius || '0px'}
                          </span>
                        </div>
                        <input
                          type='range'
                          min='0'
                          max='100'
                          value={parseInt(
                            selectedWidget.style.borderRadius || '0',
                          )}
                          onChange={(e) =>
                            updateWidgetStyle(
                              selectedWidget.id,
                              'borderRadius',
                              `${e.target.value}px`,
                            )
                          }
                          className='w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-blue-500'
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {canAccessPremiumEditor &&
                selectedWidget.type !== 'system-card' &&
                selectedWidget.type !== 'system-feed' && (
                  <>
                    <div className='grid grid-cols-2 gap-2 pt-4 border-t border-slate-800'>
                      <button
                        onClick={() => alignWidget(selectedWidget.id, 'left')}
                        className='p-2 bg-slate-900 hover:bg-slate-800 rounded border border-slate-800 text-xs font-bold transition'
                      >
                        <i className='fa-solid fa-align-left mr-2 text-slate-500'></i>{' '}
                        Align L
                      </button>
                      <button
                        onClick={() => alignWidget(selectedWidget.id, 'center')}
                        className='p-2 bg-slate-900 hover:bg-slate-800 rounded border border-slate-800 text-xs font-bold transition'
                      >
                        <i className='fa-solid fa-align-center mr-2 text-slate-500'></i>{' '}
                        Center
                      </button>
                    </div>

                    <div className='grid grid-cols-2 gap-2 pt-2'>
                      <button
                        onClick={() => bringBack(selectedWidget.id)}
                        className='p-2 bg-slate-900 hover:bg-slate-800 rounded border border-slate-800 text-xs font-bold transition'
                        title='Bring Back (Layer -1)'
                      >
                        <i className='fa-solid fa-arrow-down mr-2 text-slate-500'></i>
                        Back
                      </button>
                      <button
                        onClick={() => bringForward(selectedWidget.id)}
                        className='p-2 bg-slate-900 hover:bg-slate-800 rounded border border-slate-800 text-xs font-bold transition'
                        title='Bring Forward (Layer +1)'
                      >
                        <i className='fa-solid fa-arrow-up mr-2 text-slate-500'></i>
                        Fwd
                      </button>
                    </div>
                    <div className='grid grid-cols-2 gap-2 pt-2 pb-4'>
                      <button
                        onClick={() => bringToBack(selectedWidget.id)}
                        className='p-2 bg-slate-900 hover:bg-slate-800 rounded border border-slate-800 text-xs font-bold transition'
                        title='Send to Back'
                      >
                        <i className='fa-solid fa-layer-group mr-2 text-slate-500'></i>
                        To Back
                      </button>
                      <button
                        onClick={() => bringToFront(selectedWidget.id)}
                        className='p-2 bg-slate-900 hover:bg-slate-700 rounded border border-blue-500 text-xs font-bold text-blue-400 transition'
                        title='Bring to Front'
                      >
                        <i className='fa-solid fa-layer-group mr-1 text-blue-400'></i>
                        <i className='fa-solid fa-arrow-up text-blue-400'></i>To
                        Front
                      </button>
                    </div>
                  </>
                )}

              <div className='flex gap-2 pt-4 border-t border-slate-800'>
                {canAccessPremiumEditor &&
                  selectedWidget.type !== 'system-card' &&
                  selectedWidget.type !== 'system-feed' && (
                    <button
                      onClick={() => duplicateWidget(selectedWidget.id)}
                      className='flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded text-xs font-bold text-white transition'
                    >
                      <i className='fa-solid fa-clone mr-2'></i> Duplicate
                    </button>
                  )}
                {canAccessPremiumEditor &&
                  selectedWidget.type !== 'system-card' &&
                  selectedWidget.type !== 'system-feed' && (
                    <button
                      onClick={() => deleteWidget(selectedWidget.id)}
                      className='w-10 flex items-center justify-center bg-red-900/30 hover:bg-red-600 rounded text-red-500 hover:text-white transition'
                      title='Delete'
                    >
                      <i className='fa-solid fa-trash'></i>
                    </button>
                  )}
              </div>
            </div>
          )}
        </div>

        <div className='p-4 bg-slate-950 border-t border-slate-800 flex gap-2'>
          <button
            onClick={handleCancel}
            className='flex-1 py-3 bg-slate-800 hover:bg-slate-700 rounded font-bold text-white transition'
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className='flex-1 py-3 bg-blue-600 hover:bg-blue-500 rounded font-bold text-white shadow-lg shadow-blue-500/20 transition'
          >
            Save Profile
          </button>
        </div>
      </div>

      {/* === MAIN EDITOR CANVAS === */}
      <div className='flex-1 flex flex-col bg-slate-900 relative h-full overflow-hidden'>
        {/* HEADER TOOLBAR */}
        <div className='h-12 border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm flex items-center justify-between px-4 z-50 shrink-0'>
          <div className='flex gap-4 text-xs font-bold text-slate-400'>
            <label className='flex items-center gap-2 cursor-pointer hover:text-white'>
              <input
                type='checkbox'
                checked={snapEnabled}
                onChange={(e) => setSnapEnabled(e.target.checked)}
                className='rounded bg-slate-800 border-slate-700 text-blue-500 focus:ring-blue-500'
              />
              Snap to Elements
            </label>
          </div>
          <div className='text-xs text-slate-500'>
            {isEditMode ? 'Drag to position • Resize borders' : 'Preview Mode'}
          </div>
        </div>

        {/* EDITOR AREA WRAPPER */}
        <div className='flex-1 relative'>
          {/* FIXED BACKGROUND LAYER */}
          <div
            className='absolute inset-0 pointer-events-none bg-cover bg-center'
            style={{
              backgroundColor: state.background_url
                ? 'transparent'
                : state.background_color,
              backgroundImage: state.background_url
                ? `url(${state.background_url})`
                : 'none',
            }}
          >
            {state.background_url && (
              <div className='absolute inset-0 bg-black/40'></div>
            )}
          </div>

          {/* SCROLL VIEWPORT */}
          <div
            className='absolute inset-0 overflow-auto custom-scrollbar'
            onClick={() => setSelectedId(null)}
          >
            {/* SCALING WRAPPER (Prevents left-clipping on zoom out) */}
            <div className='min-h-full w-full min-w-fit flex justify-center relative'>
              {/* BANNER LAYER */}
              <div
                className='absolute top-0 left-0 w-full h-64 bg-cover bg-center pointer-events-none z-0'
                style={{
                  backgroundImage: state.banner_url
                    ? `url(${state.banner_url})`
                    : 'linear-gradient(to right, #1e293b, #0f172a)',
                }}
              >
                <div className='absolute inset-0 bg-black/30'></div>
              </div>

              {/* 1060px STRICT CANVAS CONTAINER */}
              <div
                style={{ height: `${canvasHeight}px` }}
                className='relative w-265 shrink-0 mt-20 z-10'
              >
                {/* GRID BACKGROUND */}
                {showGrid && isEditMode && (
                  <div
                    className='absolute inset-0 pointer-events-none opacity-[0.03]'
                    style={{
                      backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
                      backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
                    }}
                  ></div>
                )}

                {/* GUIDES */}
                {isEditMode &&
                  snapEnabled &&
                  guides.x.map((pos, i) => (
                    <div
                      key={`gx-${i}`}
                      className='absolute top-0 bottom-0 w-px bg-blue-500/50 z-40 pointer-events-none'
                      style={{ left: pos }}
                    ></div>
                  ))}
                {isEditMode &&
                  snapEnabled &&
                  guides.y.map((pos, i) => (
                    <div
                      key={`gy-${i}`}
                      className='absolute left-0 right-0 h-px bg-blue-500/50 z-40 pointer-events-none'
                      style={{ top: pos }}
                    ></div>
                  ))}

                {/* WIDGETS */}
                {widgets.map((widget) => (
                  <DraggableWidget
                    key={widget.id}
                    id={widget.id}
                    data={widget}
                    isSelected={selectedId === widget.id}
                    isEditMode={isEditMode}
                    gridSize={GRID_SIZE}
                    onSelect={setSelectedId}
                    onUpdate={updateWidget}
                    onDelete={deleteWidget}
                    onDrag={handleDrag}
                    locked={
                      !canAccessBasicEditor &&
                      (widget.id === 'profile-card' || widget.id === 'feed')
                    }
                  >
                    {widget.type === 'system-card' && (
                      <div className='flex flex-col md:flex-row h-full p-6 md:p-10 gap-8'>
                        <div className='shrink-0 flex flex-col items-center md:items-start'>
                          <img
                            src={
                              state.avatar_url ||
                              getDefaultAvatar(state.username)
                            }
                            alt='Avatar'
                            className='w-32 h-32 md:w-48 md:h-48 rounded-full border-4 shadow-2xl object-cover'
                            style={{ borderColor: state.theme_color }}
                          />
                        </div>
                        <div className='flex-1 flex flex-col justify-center text-center md:text-left'>
                          <h1 className='text-3xl md:text-5xl font-black mb-2 tracking-tight'>
                            {state.username || 'Username'}
                          </h1>
                          {state.pronouns && (
                            <span
                              className='inline-block px-3 py-1 rounded-full text-xs font-bold mb-2 w-fit mx-auto md:mx-0'
                              style={{
                                backgroundColor: `${state.theme_color}30`,
                                color: state.theme_color,
                              }}
                            >
                              {state.pronouns}
                            </span>
                          )}
                          {userRole !== 'User' && (
                            <span
                              className='inline-block px-3 py-1 rounded-full text-xs font-bold mb-4 w-fit mx-auto md:mx-0'
                              style={{
                                backgroundColor:
                                  userRole === 'Admin'
                                    ? '#f59e0b40'
                                    : userRole === 'Moderator'
                                      ? '#8b5cf640'
                                      : userRole === 'Croomie'
                                        ? '#3b82f640'
                                        : '#10b98140',
                                color:
                                  userRole === 'Admin'
                                    ? '#f59e0b'
                                    : userRole === 'Moderator'
                                      ? '#8b5cf6'
                                      : userRole === 'Croomie'
                                        ? '#3b82f6'
                                        : '#10b981',
                              }}
                            >
                              {userRole}
                            </span>
                          )}
                          <p className='text-sm md:text-base leading-relaxed opacity-90 max-w-2xl whitespace-pre-wrap wrap-break-word'>
                            {state.bio || "This user hasn't written a bio yet."}
                          </p>
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

                    {(widget.type === 'image' || widget.type === 'gif') && (
                      <img
                        src={widget.content}
                        alt={widget.type === 'gif' ? 'GIF Widget' : 'Widget'}
                        className='w-full h-full object-cover pointer-events-none'
                      />
                    )}

                    {widget.type === 'system-feed' && (
                      <div className='h-full flex flex-col p-6'>
                        <div className='border-b border-white/10 pb-2 mb-2 flex items-center gap-2'>
                          <i className='fa-solid fa-message'></i>{' '}
                          <span className='text-xs font-bold uppercase'>
                            Feed
                          </span>
                        </div>
                        <div className='flex-1 flex items-center justify-center border-2 border-dashed border-white/10 rounded'>
                          <p className='text-xs opacity-50'>
                            Feed Messages Placeholder
                          </p>
                        </div>
                      </div>
                    )}
                    {widget.type === 'shape' && (
                      <div className='w-full h-full'></div>
                    )}
                  </DraggableWidget>
                ))}

                {/* EXTEND PAGE BUTTON */}
                {isEditMode && canAccessPremiumEditor && (
                  <div className='absolute bottom-0 left-0 w-full flex justify-center pb-10 pointer-events-none'>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCanvasHeight((h) => h + 500);
                      }}
                      className='pointer-events-auto px-6 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-full text-xs font-bold border border-slate-600 backdrop-blur-md shadow-xl'
                    >
                      <i className='fa-solid fa-arrow-down mr-2'></i> Extend
                      Page Height (+500px)
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileEditor;
