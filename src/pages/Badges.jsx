import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { badgeDefinitions } from '../data/badges';
import { BANNED_BADGE_MAKERS } from '../utils/adminConstants';

import { countryList } from '../data/countries';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import './Badges.css';

const Badges = ({ session }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  // === USER STATE ===
  const [allBadges, setAllBadges] = useState([]);
  const [isVerified, setIsVerified] = useState(false);
  const [myUsername, setMyUsername] = useState('User');
  const [myAvatar, setMyAvatar] = useState(null);

  // === MOD MODE STATE ===
  const [isModMode, setIsModMode] = useState(false);
  const [targetUser, setTargetUser] = useState(null);
  const [modSearch, setModSearch] = useState('');
  const [modResults, setModResults] = useState([]);

  // === CUSTOM BADGE CREATION STATE ===
  const [customBadgeName, setCustomBadgeName] = useState('');
  const [customBadgeUrl, setCustomBadgeUrl] = useState('');

  // === SECRET DEFINITION STATE (AJTech Only) ===
  const [secretKeyword, setSecretKeyword] = useState('');
  const [secretName, setSecretName] = useState('');
  const [secretUrl, setSecretUrl] = useState('');
  const [globalSecrets, setGlobalSecrets] = useState([]);

  // Search State
  const [countrySearch, setCountrySearch] = useState('');

  // === COMMUNITY BADGES & UPLOAD STATE ===
  const [communityBadges, setCommunityBadges] = useState([]);
  const [commBadgeSearch, setCommBadgeSearch] = useState('');
  const [newCommBadgeName, setNewCommBadgeName] = useState('');
  const [newCommBadgeDesc, setNewCommBadgeDesc] = useState('');
  const [commBadgesCreatedThisMonth, setCommBadgesCreatedThisMonth] =
    useState(0);

  // Settings & Display Limits
  const [communityUploadsLocked, setCommunityUploadsLocked] = useState(false);
  const [visibleCommBadges, setVisibleCommBadges] = useState(8);

  // Cropper State
  const [isUploadMode, setIsUploadMode] = useState(true);
  const [newCommBadgeUrl, setNewCommBadgeUrl] = useState('');
  const [imgSrc, setImgSrc] = useState('');
  const [rawFile, setRawFile] = useState(null);
  const imgRef = useRef(null);
  const [crop, setCrop] = useState({ unit: '%', width: 50, aspect: 1 });
  const [completedCrop, setCompletedCrop] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // === BULLETPROOF PARSER ===
  const parseBadges = (raw) => {
    if (!raw) return [];
    if (Array.isArray(raw))
      return raw.filter(Boolean).map((b) => String(b).trim());
    if (typeof raw === 'string') {
      const cleaned = raw.trim();
      if (cleaned.startsWith('[')) {
        try {
          return JSON.parse(cleaned)
            .filter(Boolean)
            .map((b) => String(b).trim());
        } catch {
          return [];
        }
      } else if (cleaned.startsWith('{')) {
        return cleaned
          .replace(/^\{|\}$/g, '')
          .split(',')
          .map((s) => s.replace(/^"|"$/g, '').trim())
          .filter(Boolean);
      } else if (cleaned.length > 0) {
        return [cleaned];
      }
    }
    return [];
  };

  // ✅ MOVED UP: fetchCommunityBadges and checkMonthlyQuota
  // Now they are initialized BEFORE the useEffect runs
  const fetchCommunityBadges = async () => {
    const { data } = await supabase
      .from('community_badges')
      .select('*, profiles(username)')
      .order('created_at', { ascending: false });

    if (data) {
      const sortedData = [...data].sort((a, b) => {
        // Robust check for truthy database values
        const aStarred =
          a.is_starred === true || String(a.is_starred) === 'true' ? 1 : 0;
        const bStarred =
          b.is_starred === true || String(b.is_starred) === 'true' ? 1 : 0;
        if (aStarred !== bStarred) {
          return bStarred - aStarred;
        }
        return new Date(b.created_at) - new Date(a.created_at);
      });
      setCommunityBadges(sortedData);
    }
  };

  const checkMonthlyQuota = useCallback(async () => {
    const date = new Date();
    const firstDayOfMonth = new Date(
      date.getFullYear(),
      date.getMonth(),
      1,
    ).toISOString();
    const { count } = await supabase
      .from('community_badges')
      .select('*', { count: 'exact', head: true })
      .eq('creator_id', session.user.id)
      .gte('created_at', firstDayOfMonth);
    setCommBadgesCreatedThisMonth(count || 0);
  }, [session.user.id]);

  // === DATA FETCHING ===
  useEffect(() => {
    const initializeData = async () => {
      try {
        // 1. Fetch Profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('selected_badge, is_verified, username, avatar_url')
          .eq('id', session.user.id)
          .single();

        if (profileData) {
          setAllBadges(parseBadges(profileData.selected_badge));
          setIsVerified(profileData.is_verified);
          setMyUsername(profileData.username || 'User');
          setMyAvatar(profileData.avatar_url);
        }

        // 2. Fetch Global Settings (Community Lock)
        const { data: settingsData } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'community_badges_locked')
          .single();

        if (settingsData && settingsData.value === 'true') {
          setCommunityUploadsLocked(true);
        }

        // 3. Fetch Global Secrets
        const { data: secretData } = await supabase
          .from('profiles')
          .select('selected_badge')
          .eq('username', 'AJTech')
          .single();

        if (secretData?.selected_badge) {
          const secrets = parseBadges(secretData.selected_badge)
            .map((b) => b.replace('disabled_', ''))
            .filter((b) => b.startsWith('secretdef_'))
            .map((b) => {
              const parts = b.split('_');
              if (parts.length >= 4) {
                try {
                  return {
                    id: b,
                    keyword: decodeURIComponent(parts[1]).toLowerCase(),
                    name: decodeURIComponent(parts[2]),
                    url: decodeURIComponent(parts[3]),
                  };
                } catch {
                  return null;
                }
              }
              return null;
            })
            .filter(Boolean);
          setGlobalSecrets(secrets);
        }

        // 4. Fetch Badges & Quotas
        await fetchCommunityBadges();
        await checkMonthlyQuota();
      } catch (err) {
        console.error('Error initializing', err);
      } finally {
        setLoading(false);
      }
    };
    initializeData();
  }, [session.user.id, checkMonthlyQuota]);

  // Reset pagination when searching
  useEffect(() => {
    setVisibleCommBadges(8);
  }, [commBadgeSearch]);

  // Toggle Admin Lock
  const toggleCommunityUploadsLock = async () => {
    if (!isVerified) return;
    const newValue = !communityUploadsLocked;
    setCommunityUploadsLocked(newValue);
    await supabase
      .from('system_settings')
      .upsert(
        { key: 'community_badges_locked', value: String(newValue) },
        { onConflict: 'key' },
      );
  };

  // === CROPPER LOGIC & GIF HANDLING ===
  const onSelectFile = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setRawFile(file);
      setCrop({ unit: '%', width: 50, aspect: 1 });
      const reader = new FileReader();
      reader.addEventListener('load', () =>
        setImgSrc(reader.result?.toString() || ''),
      );
      reader.readAsDataURL(file);
    }
  };

  const getCroppedImgBlob = async (image, crop) => {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    canvas.width = crop.width;
    canvas.height = crop.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width,
      crop.height,
    );
    return new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.9));
  };

  const isBannedBadgeMaker =
    !!session?.user?.email && BANNED_BADGE_MAKERS.includes(session.user.email);

  const getDownsizedWebpFromUrl = async (imageUrl) => {
    // Best-effort downsize/compress for existing badges.
    // This only runs in-browser and never breaks badge rendering on failure.
    const res = await fetch(imageUrl, { cache: 'force-cache' }).catch(
      () => null,
    );
    if (!res || !res.ok) return null;
    const blob = await res.blob();
    if (!blob) return null;

    // Preserve GIF animation: if it's a GIF, just keep original.
    if (blob.type === 'image/gif') return blob;

    const url = URL.createObjectURL(blob);
    try {
      const img = new Image();
      img.decoding = 'async';
      img.src = url;
      await new Promise((resolve, reject) => {
        img.onload = () => resolve(true);
        img.onerror = () => reject(new Error('Failed to load badge image'));
      });

      // Target max dimension.
      const MAX_DIM = 256;
      const { width, height } = img;
      const scale = Math.min(1, MAX_DIM / Math.max(width, height));
      const outW = Math.max(1, Math.round(width * scale));
      const outH = Math.max(1, Math.round(height * scale));

      const canvas = document.createElement('canvas');
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, outW, outH);

      return await new Promise((resolve) => {
        canvas.toBlob((b) => resolve(b || blob), 'image/webp', 0.75);
      });
    } catch {
      return null;
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  const handleCreateCommunityBadge = async () => {
    if (isBannedBadgeMaker)
      return alert(
        'Your account is banned from uploading/creating community badges.',
      );

    if (communityUploadsLocked && !isVerified)
      return alert(
        'Community badge creation is currently disabled by administrators.',
      );
    if (!newCommBadgeName.trim())
      return alert('Please provide a name for the badge.');
    if (!isVerified && commBadgesCreatedThisMonth >= 2)
      return alert('Monthly limit reached.');

    setIsUploading(true);
    let finalImageUrl = newCommBadgeUrl.trim();

    try {
      if (isUploadMode) {
        let blob;
        let fileName;

        // Auto-compress + downsize even if the user skips cropping.
        // We still preserve GIF animation; only GIFs bypass canvas downsize.
        if (rawFile && rawFile.type === 'image/gif') {
          blob = rawFile;
          fileName = `${session.user.id}_${Date.now()}.gif`;
        } else {
          if (!completedCrop || !imgRef.current) {
            throw new Error('Please select and crop an image.');
          }

          // 1) Crop -> WEBP
          const croppedWebpBlob = await getCroppedImgBlob(
            imgRef.current,
            completedCrop,
          );

          // 2) Downsize further (badges in chat are tiny; keep payload small)
          //    Convert WEBP blob -> Image -> canvas resize.
          const downsized = await (async () => {
            const url = URL.createObjectURL(croppedWebpBlob);
            try {
              const img = new Image();
              img.decoding = 'async';
              img.src = url;
              await new Promise((res, rej) => {
                img.onload = () => res(true);
                img.onerror = () =>
                  rej(new Error('Failed to load badge image for downsize'));
              });

              // Target max dimension (in px) for uploaded badge assets.
              // This should be much smaller than typical originals.
              const MAX_DIM = 256;
              const { width, height } = img;
              const scale = Math.min(1, MAX_DIM / Math.max(width, height));
              const outW = Math.max(1, Math.round(width * scale));
              const outH = Math.max(1, Math.round(height * scale));

              const canvas = document.createElement('canvas');
              canvas.width = outW;
              canvas.height = outH;
              const ctx = canvas.getContext('2d');
              if (!ctx) throw new Error('No canvas context');

              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'high';
              ctx.drawImage(img, 0, 0, outW, outH);

              return new Promise((resolve) => {
                // Keep quality decent for tiny icons while shrinking weight.
                canvas.toBlob(
                  (b) => resolve(b || croppedWebpBlob),
                  'image/webp',
                  0.75,
                );
              });
            } finally {
              URL.revokeObjectURL(url);
            }
          })();

          blob = downsized;
          fileName = `${session.user.id}_${Date.now()}.webp`;
        }

        const { error: uploadError } = await supabase.storage
          .from('badges')
          .upload(fileName, blob);
        if (uploadError) {
          if (uploadError.message.includes('bucket')) {
            throw new Error(
              "Storage bucket 'badges' not found. Please run the SQL command provided.",
            );
          }
          throw uploadError;
        }

        const { data: publicUrlData } = supabase.storage
          .from('badges')
          .getPublicUrl(fileName);
        finalImageUrl = publicUrlData.publicUrl;
      } else {
        if (!finalImageUrl) throw new Error('Please provide an image URL.');
      }

      const { error: dbError } = await supabase
        .from('community_badges')
        .insert([
          {
            creator_id: session.user.id,
            name: newCommBadgeName.trim(),
            description: newCommBadgeDesc.trim(),
            image_url: finalImageUrl,
          },
        ]);

      if (dbError) throw dbError;

      alert('Community badge successfully created!');
      setNewCommBadgeName('');
      setNewCommBadgeDesc('');
      setNewCommBadgeUrl('');
      setImgSrc('');
      setRawFile(null);
      await fetchCommunityBadges();
      await checkMonthlyQuota();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  // === DELETE COMMUNITY BADGE ===
  const deleteCommunityBadge = async (e, badgeId, badgeName) => {
    e.stopPropagation();
    if (!isVerified) return;

    if (
      !window.confirm(
        `Are you sure you want to delete the community badge "${badgeName}"? This cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from('community_badges')
        .delete()
        .eq('id', badgeId);
      if (error) throw error;

      alert('Badge deleted successfully.');
      await fetchCommunityBadges();
    } catch (err) {
      alert('Error deleting badge: ' + err.message);
    }
  };

  // === TOGGLE STAR STATUS (ADMIN ONLY) ===
  const toggleStarCommunityBadge = async (e, badgeId, currentStatus) => {
    e.stopPropagation();
    if (!isVerified) return;

    const isCurrentlyStarred =
      currentStatus === true || String(currentStatus) === 'true';
    const newStatus = !isCurrentlyStarred;

    // Optimistic Update to jump badge instantly
    setCommunityBadges((prev) => {
      const updated = prev.map((b) =>
        b.id === badgeId ? { ...b, is_starred: newStatus } : b,
      );
      return updated.sort((a, b) => {
        const aStarred =
          a.is_starred === true || String(a.is_starred) === 'true' ? 1 : 0;
        const bStarred =
          b.is_starred === true || String(b.is_starred) === 'true' ? 1 : 0;
        if (aStarred !== bStarred) {
          return bStarred - aStarred;
        }
        return new Date(b.created_at) - new Date(a.created_at);
      });
    });

    try {
      // ADDED .select() HERE to catch silent database blocks
      const { data, error } = await supabase
        .from('community_badges')
        .update({ is_starred: newStatus })
        .eq('id', badgeId)
        .select();

      if (error) throw error;

      // Catch the silent RLS failure
      if (!data || data.length === 0) {
        throw new Error(
          'Update blocked by Database Security (RLS). Please ensure you have Admin privileges in the database.',
        );
      }
    } catch (err) {
      alert('Error updating badge star status: ' + err.message);
      await fetchCommunityBadges(); // Revert the UI back if it fails
    }
  };

  // === SECRET EASTER EGG LOGIC ===
  useEffect(() => {
    const checkSecrets = async () => {
      if (isModMode) return;
      const searchLower = countrySearch.toLowerCase().trim();
      if (!searchLower) return;

      const isOwned = (badgeId) =>
        allBadges.includes(badgeId) ||
        allBadges.includes(`disabled_${badgeId}`);
      const activeCount = allBadges.filter(
        (b) => !b.startsWith('disabled_') && b.trim() !== '',
      ).length;

      const foundDynamicSecret = globalSecrets.find(
        (s) => s.keyword === searchLower,
      );
      if (foundDynamicSecret) {
        const customId = `custom_${encodeURIComponent(foundDynamicSecret.name)}_${encodeURIComponent(foundDynamicSecret.url)}`;
        if (!isOwned(customId)) {
          let newBadges = [...allBadges];
          if (activeCount >= 15) {
            newBadges.push(`disabled_${customId}`);
            alert(
              `✨ You discovered the secret "${foundDynamicSecret.name}" badge! (Sent to inventory because you have 15 equipped)`,
            );
          } else {
            newBadges.push(customId);
            alert(
              `✨ You discovered the secret "${foundDynamicSecret.name}" badge!`,
            );
          }
          setAllBadges(newBadges);
          await supabase
            .from('profiles')
            .update({ selected_badge: newBadges })
            .eq('id', session.user.id);
          setCountrySearch('');
          return;
        }
      }

      const hardcodedSecrets = {
        fishessay: 'fisher',
        idf: 'idf',
        igor: 'igor',
        lucky: 'lucky',
      };
      const matchedSecretId = hardcodedSecrets[searchLower];

      if (matchedSecretId && !isOwned(matchedSecretId)) {
        let newBadges = [...allBadges];
        if (activeCount >= 15) {
          newBadges.push(`disabled_${matchedSecretId}`);
          alert(
            `🎉 You found a secret badge! (Sent to inventory because you have 15 equipped)`,
          );
        } else {
          newBadges.push(matchedSecretId);
          alert(`🎉 You found a secret badge!`);
        }
        setAllBadges(newBadges);
        await supabase
          .from('profiles')
          .update({ selected_badge: newBadges })
          .eq('id', session.user.id);
        setCountrySearch('');
      }
    };
    checkSecrets();
  }, [countrySearch, allBadges, session.user.id, isModMode, globalSecrets]);

  // === MOD SEARCH EFFECT ===
  useEffect(() => {
    if (!isModMode || !modSearch.trim()) {
      setModResults([]);
      return;
    }
    const delaySearch = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, selected_badge, avatar_url, is_verified')
        .ilike('username', `%${modSearch}%`)
        .limit(5);
      if (data) setModResults(data);
    }, 500);
    return () => clearTimeout(delaySearch);
  }, [modSearch, isModMode]);

  // === FOLDER LOGIC ===
  const getCategory = (badge) => {
    // Intercept Events before the restricted check pushes it to Hidden
    if (['heart_val2026', 'heartbreak_val2026'].includes(badge.id))
      return 'Events';

    if (['fisher', 'dao', 'idf', 'tardis', 'igor', 'lucky'].includes(badge.id))
      return 'Hidden & Exclusive';
    if (badge.restrictedToUsernames) return 'Hidden & Exclusive';
    if (badge.requiresVerified) return 'Official & Staff';
    if (['panther', 'cbsh'].includes(badge.id)) return 'School Spirit';

    const prideIds = [
      'trans',
      'gay',
      'bi',
      'pan',
      'lesbian',
      'nonbinary',
      'ace',
      'aro',
      'genderfluid',
      'agender',
      'pride',
      'rainbow',
      'mlm',
      'progress',
      'aroace',
      'ally',
      'Femboy',
    ];
    if (prideIds.includes(badge.id)) return 'LGBTQ Flags';

    return 'Community Collection';
  };

  const badgeFolders = badgeDefinitions.reduce((acc, badge) => {
    const category = getCategory(badge);
    if (!acc[category]) acc[category] = [];
    acc[category].push(badge);
    return acc;
  }, {});

  const folderOrder = [
    'Events',
    'Community Collection',
    'School Spirit',
    'LGBTQ Flags',
    'Official & Staff',
    'Hidden & Exclusive',
  ];

  // === BULLETPROOF TOGGLE LOGIC ===
  const toggleBadge = async (badgeId) => {
    const isEditingTarget = isModMode && targetUser;
    const currentRaw = (
      isEditingTarget ? parseBadges(targetUser.selected_badge) : allBadges
    )
      .filter(Boolean)
      .map((b) => b.trim());

    const userIdToUpdate = isEditingTarget ? targetUser.id : session.user.id;

    let active = currentRaw.filter((b) => !b.startsWith('disabled_'));
    let disabled = currentRaw
      .filter((b) => b.startsWith('disabled_'))
      .map((b) => b.replace('disabled_', ''));

    if (isEditingTarget) {
      if (active.includes(badgeId) || disabled.includes(badgeId)) {
        active = active.filter((b) => b !== badgeId);
        disabled = disabled.filter((b) => b !== badgeId);
      } else {
        active.push(badgeId);
      }
    } else {
      if (active.includes(badgeId)) {
        active = active.filter((b) => b !== badgeId);
        if (!disabled.includes(badgeId)) disabled.push(badgeId);
      } else if (disabled.includes(badgeId)) {
        if (active.length >= 15)
          return alert(
            'Limit reached! You can only equip exactly up to 15 active badges.',
          );
        disabled = disabled.filter((b) => b !== badgeId);
        active.push(badgeId);
      } else {
        if (active.length >= 15)
          return alert(
            'Limit reached! You can only equip exactly up to 15 active badges.',
          );
        active.push(badgeId);
      }
    }

    const uniqueBadges = [
      ...new Set([...active, ...disabled.map((b) => `disabled_${b}`)]),
    ];

    if (isEditingTarget)
      setTargetUser({ ...targetUser, selected_badge: uniqueBadges });
    else setAllBadges(uniqueBadges);

    const { error } = await supabase
      .from('profiles')
      .update({ selected_badge: uniqueBadges })
      .eq('id', userIdToUpdate);
    if (error) alert('Error updating badge: ' + error.message);
  };

  const handleStandardToggle = (badgeDef) => {
    if (isModMode && targetUser) return toggleBadge(badgeDef.id);
    const isOwned =
      allBadges.includes(badgeDef.id) ||
      allBadges.includes(`disabled_${badgeDef.id}`);
    if (isOwned) return toggleBadge(badgeDef.id);

    if (badgeDef.requiresVerified && !isVerified) return;
    if (
      badgeDef.restrictedToUsernames &&
      !badgeDef.restrictedToUsernames.includes(myUsername)
    )
      return;
    if (badgeDef.id === 'tardis' && !myUsername.includes('Corvid')) return;

    toggleBadge(badgeDef.id);
  };

  // === CLEAR ALL BADGES LOGIC ===
  const clearAllBadges = async () => {
    if (
      !window.confirm(
        'Are you sure you want to unequip all badges? They will remain in your inventory.',
      )
    )
      return;

    const isEditingTarget = isModMode && targetUser;
    const userIdToUpdate = isEditingTarget ? targetUser.id : session.user.id;
    const currentRaw = (
      isEditingTarget ? parseBadges(targetUser.selected_badge) : allBadges
    )
      .filter(Boolean)
      .map((b) => b.trim());

    const disabledBadges = currentRaw.map((b) =>
      b.startsWith('disabled_') ? b : `disabled_${b}`,
    );
    const uniqueBadges = [...new Set(disabledBadges)];

    if (isEditingTarget)
      setTargetUser({ ...targetUser, selected_badge: uniqueBadges });
    else setAllBadges(uniqueBadges);

    const { error } = await supabase
      .from('profiles')
      .update({ selected_badge: uniqueBadges })
      .eq('id', userIdToUpdate);
    if (error) alert('Error clearing badges: ' + error.message);
  };

  // === AJTECH ADMIN FUNCTIONS ===
  const grantCustomBadge = () => {
    if (myUsername !== 'AJTech') {
      alert('This feature is restricted to AJTech.');
      return;
    }
    if (!customBadgeName.trim() || !customBadgeUrl.trim()) {
      alert('Please provide both a Name and an Image URL.');
      return;
    }
    const customId = `custom_${encodeURIComponent(customBadgeName.trim())}_${encodeURIComponent(customBadgeUrl.trim())}`;
    toggleBadge(customId);
    setCustomBadgeName('');
    setCustomBadgeUrl('');
    alert(`Granted custom badge: ${customBadgeName}`);
  };

  const createGlobalSecret = async () => {
    if (myUsername !== 'AJTech') return;
    if (!secretKeyword.trim() || !secretName.trim() || !secretUrl.trim()) {
      alert('All fields are required for a secret badge.');
      return;
    }
    const definitionId = `secretdef_${encodeURIComponent(secretKeyword.trim())}_${encodeURIComponent(secretName.trim())}_${encodeURIComponent(secretUrl.trim())}`;
    const { data } = await supabase
      .from('profiles')
      .select('selected_badge')
      .eq('id', session.user.id)
      .single();
    const current = parseBadges(data.selected_badge);

    if (current.includes(definitionId)) {
      alert('Secret definition already exists.');
      return;
    }

    const newBadges = [...current, definitionId];
    const { error } = await supabase
      .from('profiles')
      .update({ selected_badge: newBadges })
      .eq('id', session.user.id);

    if (!error) {
      alert(`Secret Created! Keyword: "${secretKeyword}"`);
      setSecretKeyword('');
      setSecretName('');
      setSecretUrl('');
      setAllBadges(newBadges);
      setGlobalSecrets([
        ...globalSecrets,
        {
          id: definitionId,
          keyword: secretKeyword.trim().toLowerCase(),
          name: secretName.trim(),
          url: secretUrl.trim(),
        },
      ]);
    } else {
      alert('Error saving secret.');
    }
  };

  // === REORDER BADGES LOGIC ===
  const [draggedBadgeIndex, setDraggedBadgeIndex] = useState(null);

  const handleDragStart = (_, index) => {
    setDraggedBadgeIndex(index);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e, dropIndex) => {
    e.preventDefault();
    if (draggedBadgeIndex === null || draggedBadgeIndex === dropIndex) return;

    const isEditingTarget = isModMode && targetUser;
    const currentRaw = (
      isEditingTarget ? parseBadges(targetUser.selected_badge) : allBadges
    )
      .filter(Boolean)
      .map((b) => b.trim());

    let active = currentRaw.filter((b) => !b.startsWith('disabled_'));
    let disabled = currentRaw.filter((b) => b.startsWith('disabled_'));

    const draggedItem = active[draggedBadgeIndex];
    active.splice(draggedBadgeIndex, 1);
    active.splice(dropIndex, 0, draggedItem);

    const uniqueBadges = [...new Set([...active, ...disabled])];

    if (isEditingTarget)
      setTargetUser({ ...targetUser, selected_badge: uniqueBadges });
    else setAllBadges(uniqueBadges);

    const userIdToUpdate = isEditingTarget ? targetUser.id : session.user.id;
    const { error } = await supabase
      .from('profiles')
      .update({ selected_badge: uniqueBadges })
      .eq('id', userIdToUpdate);
    if (error) alert('Error saving reordered badges: ' + error.message);

    setDraggedBadgeIndex(null);
  };

  const filteredCountries = countryList.filter((c) =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase()),
  );

  const filteredCommunityBadges = communityBadges.filter(
    (b) =>
      b.name.toLowerCase().includes(commBadgeSearch.toLowerCase()) ||
      (b.description &&
        b.description.toLowerCase().includes(commBadgeSearch.toLowerCase())) ||
      (b.profiles?.username &&
        b.profiles.username
          .toLowerCase()
          .includes(commBadgeSearch.toLowerCase())),
  );

  // === COMPUTED RENDERING LISTS ===
  const allBadgesList =
    isModMode && targetUser
      ? parseBadges(targetUser.selected_badge)
      : allBadges;
  const activeBadgesList = allBadgesList.filter(
    (b) => !b.startsWith('disabled_'),
  );
  const disabledBadgesList = allBadgesList
    .filter((b) => b.startsWith('disabled_'))
    .map((b) => b.replace('disabled_', ''));

  const ownedCustoms = allBadgesList
    .filter(
      (id) => id.startsWith('custom_') || id.startsWith('disabled_custom_'),
    )
    .map((id) => {
      const isEquipped = !id.startsWith('disabled_');
      const parts = id.replace('disabled_', '').split('_');
      try {
        return parts.length >= 3
          ? {
              id: id.replace('disabled_', ''),
              name: decodeURIComponent(parts[1]),
              url: decodeURIComponent(parts[2]),
              isEquipped,
            }
          : null;
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  const ownedFlags = allBadgesList
    .filter((id) => id.startsWith('flag_') || id.startsWith('disabled_flag_'))
    .map((id) => {
      const isEquipped = !id.startsWith('disabled_');
      const code = id.replace('disabled_', '').replace('flag_', '');
      return {
        ...(countryList.find((c) => c.code === code) || { code, name: code }),
        isEquipped,
        actualId: id.replace('disabled_', ''),
      };
    });

  const getBadgeIcon = (id) => {
    const std = badgeDefinitions.find((b) => b.id === id);
    if (std) return std.fileName;

    const comm = communityBadges.find((b) => `comm_${b.id}` === id);
    if (comm) return comm.image_url;

    if (id.startsWith('flag_'))
      return id.replace('flag_', '') === 'PR'
        ? 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/Flag_of_Puerto_Rico.svg/2560px-Flag_of_Puerto_Rico.svg.png'
        : `https://flagsapi.com/${id.replace('flag_', '')}/shiny/64.png`;
    if (id.startsWith('custom_')) {
      try {
        return decodeURIComponent(id.split('_')[2]);
      } catch {
        return null;
      }
    }
    return null;
  };

  if (loading)
    return (
      <div className='min-h-screen bg-slate-950 flex items-center justify-center text-white'>
        Loading...
      </div>
    );

  return (
    <div
      className={`min-h-screen ${isModMode ? 'bg-slate-900' : 'bg-slate-950'} text-white p-6 font-sans transition-colors duration-500`}
    >
      <div className='max-w-6xl mx-auto'>
        {/* HEADER */}
        <div className='flex items-center justify-between mb-8'>
          <div className='flex items-center gap-4'>
            <button
              onClick={() => navigate('/settings')}
              className='text-slate-400 hover:text-white transition'
            >
              <i className='fa-solid fa-arrow-left text-xl'></i>
            </button>
            <h1 className='text-2xl font-bold'>
              {isModMode ? (
                <span className='text-red-400'>🛡️ Admin Badge Control</span>
              ) : (
                'Badges & Cosmetics'
              )}
            </h1>
          </div>
          {isVerified && (
            <button
              onClick={() => {
                setIsModMode(!isModMode);
                setTargetUser(null);
                setModSearch('');
              }}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${isModMode ? 'bg-red-500/20 text-red-400 border border-red-500' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
            >
              <i
                className={`fa-solid ${isModMode ? 'fa-lock-open' : 'fa-shield-halved'}`}
              ></i>{' '}
              {isModMode ? 'Exit Mod Mode' : 'Mod Tools'}
            </button>
          )}
        </div>

        {/* MOD TOOLS UI */}
        {isModMode && (
          <div className='mb-8 bg-slate-800/50 border border-red-500/30 rounded-2xl p-6'>
            <h2 className='text-red-400 font-bold mb-4 flex items-center gap-2'>
              <i className='fa-solid fa-users-viewfinder'></i> Find User to Edit
            </h2>
            <div className='relative max-w-md mb-6'>
              <input
                type='text'
                placeholder='Search username...'
                value={modSearch}
                onChange={(e) => setModSearch(e.target.value)}
                className='w-full bg-slate-900 border border-slate-700 text-white pl-4 pr-10 py-3 rounded-xl focus:border-red-500 focus:outline-none'
              />
              {modResults.length > 0 && (
                <div className='absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden'>
                  {modResults.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => {
                        setTargetUser(user);
                        setModResults([]);
                        setModSearch('');
                      }}
                      className='p-3 hover:bg-slate-800 cursor-pointer flex items-center gap-3 border-b border-slate-800/50'
                    >
                      <img
                        src={user.avatar_url || '/default-avatar.png'}
                        className='w-8 h-8 rounded-full bg-slate-700'
                        alt=''
                      />
                      <div className='font-bold text-sm text-white flex items-center gap-2'>
                        {user.username}{' '}
                        {user.is_verified && (
                          <i className='fa-solid fa-circle-check text-blue-400 text-xs'></i>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {targetUser && (
              <div className='p-4 bg-red-500/10 border border-red-500/50 rounded-xl flex items-center justify-between gap-4'>
                <div className='flex items-center gap-4'>
                  <img
                    src={targetUser.avatar_url || '/default-avatar.png'}
                    className='w-12 h-12 rounded-full border-2 border-red-500'
                    alt=''
                  />
                  <div>
                    <h3 className='text-lg font-bold text-white'>
                      Editing: {targetUser.username}
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => setTargetUser(null)}
                  className='text-slate-400 hover:text-white px-3 py-1 bg-slate-900 rounded-lg text-xs'
                >
                  Cancel
                </button>
              </div>
            )}

            {/* AJTECH MOD SECTIONS */}
            {targetUser && myUsername === 'AJTech' && (
              <div className='mt-6 pt-6 border-t border-slate-700'>
                <h2 className='text-yellow-400 font-bold mb-3'>
                  Create & Assign Custom Badge
                </h2>
                <div className='flex gap-4 items-end'>
                  <input
                    type='text'
                    value={customBadgeName}
                    onChange={(e) => setCustomBadgeName(e.target.value)}
                    placeholder='Name'
                    className='w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-yellow-500'
                  />
                  <input
                    type='text'
                    value={customBadgeUrl}
                    onChange={(e) => setCustomBadgeUrl(e.target.value)}
                    placeholder='Image URL'
                    className='w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-yellow-500'
                  />
                  <button
                    onClick={grantCustomBadge}
                    className='bg-yellow-600 px-6 py-2 rounded-lg text-sm font-bold'
                  >
                    Grant
                  </button>
                </div>
              </div>
            )}

            {myUsername === 'AJTech' && !targetUser && (
              <div className='mt-6 pt-6 border-t border-slate-700'>
                <h2 className='text-purple-400 font-bold mb-3'>
                  Global Secret Manager
                </h2>
                <div className='flex gap-4 items-end'>
                  <input
                    type='text'
                    value={secretKeyword}
                    onChange={(e) => setSecretKeyword(e.target.value)}
                    placeholder='Keyword'
                    className='w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-purple-500'
                  />
                  <input
                    type='text'
                    value={secretName}
                    onChange={(e) => setSecretName(e.target.value)}
                    placeholder='Name'
                    className='w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-purple-500'
                  />
                  <input
                    type='text'
                    value={secretUrl}
                    onChange={(e) => setSecretUrl(e.target.value)}
                    placeholder='Image URL'
                    className='w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-purple-500'
                  />
                  <button
                    onClick={createGlobalSecret}
                    className='bg-purple-600 px-6 py-2 rounded-lg text-sm font-bold'
                  >
                    Create
                  </button>
                </div>
              </div>
            )}

            {/* GLOBAL COMMUNITY SETTINGS */}
            {!targetUser && (
              <div className='mt-6 pt-6 border-t border-slate-700'>
                <h2 className='text-red-400 font-bold mb-3'>
                  Global Community Settings
                </h2>
                <div className='flex items-center justify-between bg-slate-900 p-4 rounded-xl border border-slate-700'>
                  <div>
                    <div className='font-bold text-white'>
                      Lock Community Badge Creation
                    </div>
                    <div className='text-xs text-slate-400'>
                      Prevents non-admins from uploading new badges.
                    </div>
                  </div>
                  <label className='relative inline-flex items-center cursor-pointer'>
                    <input
                      type='checkbox'
                      checked={communityUploadsLocked}
                      onChange={toggleCommunityUploadsLock}
                      className='sr-only peer'
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                  </label>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MAIN USER INTERFACE */}
        {isModMode && !targetUser && myUsername !== 'AJTech' ? (
          <div className='text-center py-20 text-slate-500'>
            <p>Search and select a user above to modify their badges.</p>
          </div>
        ) : (
          <div className='badges-layout flex flex-col md:flex-row gap-6'>
            <div className='badge-selectors flex-1'>
              {/* === COMMUNITY BADGE UPLOAD/CREATOR === */}
              {!isModMode &&
                (communityUploadsLocked && !isVerified ? (
                  <div className='bg-red-900/20 border border-red-500/30 p-6 rounded-2xl text-center mb-8'>
                    <i className='fa-solid fa-lock text-3xl text-red-400 mb-3'></i>
                    <h3 className='text-lg font-bold text-white'>
                      Community Uploads Disabled
                    </h3>
                    <p className='text-sm text-slate-400'>
                      Administrators have temporarily locked the creation of new
                      community badges.
                    </p>
                  </div>
                ) : (
                  <div className='mb-6 bg-emerald-900/20 border border-emerald-500/30 rounded-xl p-6'>
                    <div className='flex justify-between items-center mb-4'>
                      <h2 className='text-emerald-400 font-bold flex items-center gap-2'>
                        <i className='fa-solid fa-cloud-arrow-up'></i> Community
                        Badge Upload
                      </h2>
                      <span className='text-xs font-bold bg-slate-900 px-3 py-1 rounded-full text-slate-400 border border-slate-700'>
                        {isVerified
                          ? 'Unlimited Badges'
                          : `${commBadgesCreatedThisMonth}/2 Badges used this month`}
                      </span>
                    </div>

                    <div className='flex gap-4 mb-4'>
                      <button
                        onClick={() => setIsUploadMode(true)}
                        className={`px-4 py-2 text-sm rounded-lg font-bold transition ${isUploadMode ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                      >
                        Upload Image
                      </button>
                      <button
                        onClick={() => setIsUploadMode(false)}
                        className={`px-4 py-2 text-sm rounded-lg font-bold transition ${!isUploadMode ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                      >
                        Use Link
                      </button>
                    </div>

                    <div className='flex flex-col gap-4'>
                      <input
                        type='text'
                        placeholder='Give your badge a cool name...'
                        value={newCommBadgeName}
                        onChange={(e) => setNewCommBadgeName(e.target.value)}
                        className='w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-sm focus:border-emerald-500 focus:outline-none text-white'
                      />

                      <input
                        type='text'
                        placeholder='Add a short description... (Optional)'
                        value={newCommBadgeDesc}
                        onChange={(e) => setNewCommBadgeDesc(e.target.value)}
                        className='w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-sm focus:border-emerald-500 focus:outline-none text-white'
                      />

                      {isUploadMode ? (
                        <div className='border-2 border-dashed border-slate-700 rounded-xl p-4 text-center'>
                          <input
                            type='file'
                            accept='image/png, image/jpeg, image/webp, image/gif'
                            onChange={onSelectFile}
                            className='mb-4 text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500'
                          />

                          {imgSrc && rawFile?.type !== 'image/gif' && (
                            <div className='mt-4 bg-slate-900 p-2 rounded-lg inline-block'>
                              <p className='text-xs text-slate-400 mb-2'>
                                Drag to crop your badge (must be square)
                              </p>
                              <ReactCrop
                                crop={crop}
                                onChange={(_, percentCrop) =>
                                  setCrop(percentCrop)
                                }
                                onComplete={(c) => setCompletedCrop(c)}
                                aspect={1}
                              >
                                <img
                                  ref={imgRef}
                                  src={imgSrc}
                                  alt='Crop preview'
                                  className='max-h-64 object-contain'
                                />
                              </ReactCrop>
                            </div>
                          )}

                          {/* NEW: SPECIAL UI FOR GIFS */}
                          {imgSrc && rawFile?.type === 'image/gif' && (
                            <div className='mt-4 bg-slate-900 p-4 rounded-lg inline-block border border-emerald-500/30'>
                              <p className='text-xs text-emerald-400 mb-2 font-bold'>
                                <i className='fa-solid fa-bolt'></i> GIF
                                Animation Preserved
                              </p>
                              <img
                                src={imgSrc}
                                alt='GIF preview'
                                className='max-h-32 object-contain rounded mx-auto'
                              />
                              <p className='text-[10px] text-slate-400 mt-2'>
                                GIFs cannot be cropped. They will be uploaded
                                directly.
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <input
                          type='text'
                          placeholder='https://example.com/image.png or .gif'
                          value={newCommBadgeUrl}
                          onChange={(e) => setNewCommBadgeUrl(e.target.value)}
                          className='w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-sm focus:border-emerald-500 focus:outline-none text-white'
                        />
                      )}

                      <div className='relative'>
                        <button
                          onClick={async () => {
                            // Best-effort: compress/downsize existing badges before publishing.
                            // This is safe (failure keeps original images).
                            try {
                              const bad = (communityBadges || []).slice(0, 30);
                              for (const b of bad) {
                                if (!b?.image_url) continue;
                                const downsizedBlob =
                                  await getDownsizedWebpFromUrl(b.image_url);
                                if (!downsizedBlob) continue;

                                const path = `community_badges/${b.id}/${session.user.id}_${Date.now()}.webp`;
                                // Note: assumes community badge images live in the same bucket/path
                                // as the stored image_url. If this path doesn't match your storage,
                                // it will be skipped gracefully by storage errors.
                                const { error: uploadError } =
                                  await supabase.storage
                                    .from('badges')
                                    .upload(path, downsizedBlob, {
                                      upsert: true,
                                    });
                                if (uploadError) continue;

                                const { data: publicUrlData } = supabase.storage
                                  .from('badges')
                                  .getPublicUrl(path);
                                if (!publicUrlData?.publicUrl) continue;

                                await supabase
                                  .from('community_badges')
                                  .update({
                                    image_url: publicUrlData.publicUrl,
                                  })
                                  .eq('id', b.id);
                              }
                            } catch {
                              // Silent: never block badge creation due to downsize.
                            }

                            await handleCreateCommunityBadge();
                          }}
                          onMouseEnter={() => {
                            if (isBannedBadgeMaker) return;
                          }}
                          disabled={
                            isBannedBadgeMaker ||
                            (!isVerified && commBadgesCreatedThisMonth >= 2) ||
                            isUploading
                          }
                          className={`py-3 px-6 rounded-xl text-sm font-bold mt-2 transition-colors w-full group ${(!isVerified && commBadgesCreatedThisMonth >= 2) || isUploading ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'}`}
                          title={
                            isBannedBadgeMaker
                              ? 'Banned from uploading community badges due to violations'
                              : undefined
                          }
                        >
                          {isUploading
                            ? 'Uploading & Saving...'
                            : 'Publish Community Badge'}
                        </button>

                        {/* Hover tooltip for banned badge makers */}
                        {isBannedBadgeMaker && (
                          <div
                            className='pointer-events-none absolute right-0 top-full mt-2 z-50 hidden group-hover:block w-72 bg-slate-900 border border-red-500/30 rounded-xl p-3 shadow-xl'
                            role='tooltip'
                          >
                            <div className='text-sm font-bold text-red-300'>
                              You have been banned from uploading community
                              badges due to repeated violations
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

              {/* === COMMUNITY BADGE GALLERY === */}
              <details
                className='mb-6 bg-slate-900/50 rounded-2xl border border-slate-800'
                open
              >
                <summary className='flex items-center justify-between p-6 cursor-pointer'>
                  <div className='flex items-center gap-3'>
                    <i className='fa-solid fa-globe text-emerald-400 text-xl'></i>
                    <h2 className='text-xl font-bold text-slate-200'>
                      Community Gallery
                    </h2>
                  </div>
                  <i className='fa-solid fa-chevron-down text-slate-400'></i>
                </summary>
                <div className='p-6 pt-0'>
                  <div className='mb-4 relative'>
                    <i className='fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-500'></i>
                    <input
                      type='text'
                      placeholder='Search community badges, descriptions, or creators...'
                      value={commBadgeSearch}
                      onChange={(e) => setCommBadgeSearch(e.target.value)}
                      className='w-full bg-slate-950 border border-slate-700 text-white pl-12 pr-4 py-3 rounded-xl focus:border-emerald-500'
                    />
                  </div>

                  {filteredCommunityBadges.length === 0 ? (
                    <p className='text-slate-500 text-sm text-center py-4'>
                      No community badges found.
                    </p>
                  ) : (
                    <>
                      <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
                        {filteredCommunityBadges
                          .slice(0, visibleCommBadges)
                          .map((badge) => {
                            const badgeId = `comm_${badge.id}`;
                            const isEquipped =
                              activeBadgesList.includes(badgeId);
                            // Robust truthy check
                            const isBadgeStarred =
                              badge.is_starred === true ||
                              String(badge.is_starred) === 'true';

                            return (
                              <div
                                key={badge.id}
                                onClick={() => toggleBadge(badgeId)}
                                className={`bg-slate-900 border rounded-xl p-3 flex flex-col items-center gap-2 cursor-pointer transition-all relative ${isEquipped ? 'border-emerald-500 shadow-lg shadow-emerald-900/20 bg-slate-800' : 'border-slate-800 hover:bg-slate-800'}`}
                              >
                                {/* Checkmark safely stationed in bottom right corner */}
                                {isEquipped && (
                                  <i className='fa-solid fa-circle-check text-emerald-400 absolute bottom-2 right-2 text-sm z-10 bg-slate-800 rounded-full'></i>
                                )}

                                {/* Admin Star Button */}
                                {isVerified && (
                                  <button
                                    onClick={(e) =>
                                      toggleStarCommunityBadge(
                                        e,
                                        badge.id,
                                        badge.is_starred,
                                      )
                                    }
                                    className={`absolute top-2 right-2 rounded-full w-6 h-6 flex items-center justify-center z-10 transition-all shadow-md ${isBadgeStarred ? 'bg-yellow-500 text-white hover:bg-yellow-600' : 'bg-slate-900/80 text-yellow-500 hover:bg-yellow-500/20 hover:text-yellow-400'}`}
                                    title={
                                      isBadgeStarred
                                        ? 'Unstar Badge'
                                        : 'Star Badge (Pin to Top)'
                                    }
                                  >
                                    <i className='fa-solid fa-star text-[10px]'></i>
                                  </button>
                                )}

                                {/* Trash Button */}
                                {isVerified && (
                                  <button
                                    onClick={(e) =>
                                      deleteCommunityBadge(
                                        e,
                                        badge.id,
                                        badge.name,
                                      )
                                    }
                                    className='absolute top-2 left-2 text-red-500/70 hover:text-red-400 bg-slate-900/80 rounded-full w-6 h-6 flex items-center justify-center transition z-10'
                                    title='Delete Community Badge'
                                  >
                                    <i className='fa-solid fa-trash text-[10px]'></i>
                                  </button>
                                )}

                                <img
                                  src={badge.image_url}
                                  alt={badge.name}
                                  className='w-12 h-12 rounded-lg object-cover mt-2'
                                  onError={(e) => (e.target.src = '/DP1.jpg')}
                                />

                                <span className='text-xs font-bold text-center truncate w-full text-slate-200'>
                                  {badge.name}
                                </span>

                                <span className='text-[9px] font-semibold text-emerald-400 truncate w-full text-center'>
                                  By: {badge.profiles?.username || 'Unknown'}
                                </span>

                                {badge.description && (
                                  <span
                                    className='text-[10px] text-slate-500 text-center w-full overflow-hidden text-ellipsis whitespace-nowrap'
                                    title={badge.description}
                                  >
                                    {badge.description}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                      </div>
                      {visibleCommBadges < filteredCommunityBadges.length && (
                        <button
                          onClick={() =>
                            setVisibleCommBadges((prev) => prev + 8)
                          }
                          className='w-full mt-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-bold transition border border-slate-700'
                        >
                          Show More Badges
                        </button>
                      )}
                    </>
                  )}
                </div>
              </details>

              {/* OWNED CUSTOM BADGES */}
              {ownedCustoms.length > 0 && (
                <div className='mb-6 bg-yellow-900/20 border border-yellow-500/30 rounded-xl p-4'>
                  <h3 className='text-xs font-bold text-yellow-300 uppercase tracking-wider mb-3 flex items-center gap-2'>
                    <i className='fa-solid fa-star'></i>{' '}
                    {isModMode
                      ? `Customs owned by ${targetUser?.username}`
                      : 'Your Custom Badges'}
                  </h3>
                  <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
                    {ownedCustoms.map((badge) => (
                      <div
                        key={badge.id}
                        className={`bg-slate-900 border shadow-md rounded-lg p-2 flex flex-col items-center gap-2 transition-all ${badge.isEquipped ? 'border-yellow-500' : 'border-slate-800 opacity-60'}`}
                      >
                        <img
                          src={badge.url}
                          alt={badge.name}
                          className='w-8 h-8 object-contain'
                        />
                        <span className='text-xs font-bold text-center truncate w-full'>
                          {badge.name}
                        </span>
                        <button
                          onClick={() => toggleBadge(badge.id)}
                          className={`w-full py-1 text-[10px] font-bold rounded uppercase transition ${badge.isEquipped ? 'bg-slate-800 text-slate-300' : 'bg-yellow-600 text-white'}`}
                        >
                          {isModMode && targetUser
                            ? 'Revoke'
                            : badge.isEquipped
                              ? 'Unequip'
                              : 'Equip'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* WORLD FLAGS */}
              <details className='mb-6 bg-slate-900/50 rounded-2xl border border-slate-800'>
                <summary className='flex items-center justify-between p-6 cursor-pointer'>
                  <div className='flex items-center gap-3'>
                    <i className='fa-solid fa-earth-americas text-blue-400 text-xl'></i>
                    <h2 className='text-xl font-bold text-slate-200'>
                      World Flags
                    </h2>
                  </div>
                  <i className='fa-solid fa-chevron-down text-slate-400 folder-arrow'></i>
                </summary>
                <div className='folder-content px-6 pb-6'>
                  {ownedFlags.length > 0 && (
                    <div className='mb-6 bg-blue-900/20 border border-blue-500/30 rounded-xl p-4'>
                      <h3 className='text-xs font-bold text-blue-300 uppercase tracking-wider mb-3'>
                        Your Flags
                      </h3>
                      <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
                        {ownedFlags.map((country) => (
                          <div
                            key={country.code}
                            className={`bg-slate-900 border rounded-lg p-2 flex flex-col items-center gap-2 ${country.isEquipped ? 'border-blue-500' : 'border-slate-800 opacity-60'}`}
                          >
                            <img
                              src={
                                country.code === 'PR'
                                  ? 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/Flag_of_Puerto_Rico.svg/2560px-Flag_of_Puerto_Rico.svg.png'
                                  : `https://flagsapi.com/${country.code}/shiny/64.png`
                              }
                              alt={country.name}
                              className='w-8 h-8 object-contain'
                            />
                            <span className='text-xs font-bold text-center truncate w-full'>
                              {country.name}
                            </span>
                            <button
                              onClick={() => toggleBadge(country.actualId)}
                              className={`w-full py-1 text-[10px] font-bold rounded uppercase ${country.isEquipped ? 'bg-slate-800 text-slate-300' : 'bg-blue-600 text-white'}`}
                            >
                              {country.isEquipped ? 'Unequip' : 'Equip'}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className='relative mb-6'>
                    <i className='fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-500'></i>
                    <input
                      type='text'
                      placeholder='Search country to add...'
                      value={countrySearch}
                      onChange={(e) => setCountrySearch(e.target.value)}
                      className='w-full bg-slate-950 border border-slate-700 text-white pl-12 pr-4 py-3 rounded-xl focus:border-blue-500'
                    />
                  </div>
                  {countrySearch && (
                    <div className='grid grid-cols-2 sm:grid-cols-3 gap-4'>
                      {filteredCountries.slice(0, 12).map((country) => (
                        <div
                          key={country.code}
                          className='bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-lg p-3 flex flex-col items-center gap-2 cursor-pointer'
                          onClick={() => toggleBadge(`flag_${country.code}`)}
                        >
                          <img
                            src={
                              country.code === 'PR'
                                ? 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/Flag_of_Puerto_Rico.svg/2560px-Flag_of_Puerto_Rico.svg.png'
                                : `https://flagsapi.com/${country.code}/shiny/64.png`
                            }
                            alt={country.name}
                            className='w-8 h-8 object-contain'
                          />
                          <span className='text-xs font-bold text-center truncate w-full'>
                            {country.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </details>

              {/* STANDARD FOLDERS */}
              {folderOrder.map((folderName) => {
                const badgesInFolder = badgeFolders[folderName] || [];
                const visibleBadges = badgesInFolder.filter((badge) => {
                  if (
                    isModMode ||
                    activeBadgesList.includes(badge.id) ||
                    disabledBadgesList.includes(badge.id)
                  )
                    return true;
                  if (badge.id === 'idf') return false;
                  if (badge.id === 'tardis')
                    return myUsername.includes('Corvid');
                  if (
                    badge.restrictedToUsernames &&
                    !badge.restrictedToUsernames.includes(myUsername)
                  )
                    return false;
                  if (
                    !badge.visibleToAll &&
                    !isVerified &&
                    !badge.restrictedToUsernames
                  )
                    return false;
                  return true;
                });

                if (visibleBadges.length === 0) return null;

                return (
                  <details
                    key={folderName}
                    className='mb-4 bg-slate-900/20 rounded-xl border border-slate-800/50'
                    open
                  >
                    <summary className='flex items-center justify-between p-4 cursor-pointer hover:bg-slate-800/50 rounded-xl transition'>
                      <div className='flex items-center gap-3'>
                        <i
                          className={`fa-solid ${folderName === 'LGBTQ Flags' ? 'fa-flag' : 'fa-folder-open'} text-slate-500`}
                        ></i>
                        <h2 className='text-lg font-bold text-slate-200'>
                          {folderName}
                        </h2>
                      </div>
                      <i className='fa-solid fa-chevron-down text-slate-400 folder-arrow'></i>
                    </summary>
                    <div className='folder-content p-4 pt-0 mt-4'>
                      <div className='grid grid-cols-2 md:grid-cols-3 gap-4'>
                        {visibleBadges.map((badge) => {
                          const isEquipped = activeBadgesList.includes(
                            badge.id,
                          );
                          const isLocked =
                            !isModMode &&
                            !isEquipped &&
                            !disabledBadgesList.includes(badge.id) &&
                            badge.requiresVerified &&
                            !isVerified;
                          return (
                            <div
                              key={badge.id}
                              onClick={() =>
                                !isLocked && handleStandardToggle(badge)
                              }
                              className={`relative cursor-pointer min-h-[140px] rounded-xl p-4 flex flex-col items-center justify-center transition-all border-2 ${isLocked ? 'opacity-50 grayscale border-slate-800' : isEquipped ? 'border-blue-500 bg-slate-900' : 'border-slate-800 bg-slate-900/40 hover:bg-slate-900/80'}`}
                            >
                              {isEquipped && (
                                <i className='fa-solid fa-circle-check text-blue-400 absolute top-2 right-2'></i>
                              )}
                              <img
                                src={badge.fileName}
                                alt={badge.name}
                                className='w-12 h-12 object-contain mb-2'
                              />
                              <h3 className='text-sm font-bold text-white text-center leading-tight mb-1'>
                                {badge.name}
                              </h3>
                              <p className='text-[10px] text-slate-400 text-center'>
                                {badge.description}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </details>
                );
              })}
            </div>

            {/* CHAT PREVIEW SIDEBAR */}
            <div className='preview-sidebar w-full md:w-80 flex-shrink-0'>
              <div
                className={`chat-preview-card rounded-xl p-6 bg-slate-900/80 border ${isModMode ? 'border-red-500/30' : 'border-slate-800'}`}
              >
                <h3 className='text-slate-400 text-xs font-bold uppercase tracking-wider mb-4 border-b border-slate-800 pb-2'>
                  {isModMode && targetUser
                    ? `Preview: ${targetUser.username}`
                    : 'Live Chat Preview'}
                </h3>
                <p className='text-[10px] text-slate-400 mb-4 mt-[-10px]'>
                  Drag and drop the badges below to reorder them.
                </p>

                <div className='flex items-start gap-3'>
                  <img
                    src={
                      isModMode && targetUser
                        ? targetUser.avatar_url || '/default-avatar.png'
                        : myAvatar || '/default-avatar.png'
                    }
                    alt='Avatar'
                    className='w-10 h-10 rounded-full bg-slate-800 object-cover border border-slate-700'
                  />
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center gap-1.5 mb-1 flex-wrap'>
                      {activeBadgesList.map((badgeId, index) => {
                        const iconUrl = getBadgeIcon(badgeId);
                        if (!iconUrl) return null;
                        return (
                          <img
                            key={badgeId}
                            src={iconUrl}
                            alt='badge'
                            className='w-4 h-4 object-contain cursor-grab active:cursor-grabbing hover:scale-125 transition-transform'
                            draggable
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, index)}
                            title='Drag to reorder'
                          />
                        );
                      })}
                      <span className='text-white font-bold text-sm hover:underline cursor-pointer'>
                        {isModMode && targetUser
                          ? targetUser.username
                          : myUsername}
                      </span>
                    </div>

                    <div className='preview-message-bubble bg-slate-800 p-2 rounded-r-lg rounded-bl-lg text-sm text-slate-200 mt-1'>
                      {isModMode
                        ? 'I am receiving badges from an admin!'
                        : 'This is how your badges appear in chat.'}
                    </div>
                    <div className='text-[10px] text-slate-500 mt-1 text-right'>
                      Today at 12:00 PM
                    </div>
                  </div>
                </div>
                <div className='mt-6 text-center border-t border-slate-800 pt-4'>
                  <div className='text-slate-500 text-xs font-bold mb-3'>
                    {activeBadgesList.length} / 15 Active Badges
                  </div>

                  <button
                    onClick={clearAllBadges}
                    disabled={activeBadgesList.length === 0}
                    className={`w-full py-2 rounded-lg text-sm font-bold transition-colors ${activeBadgesList.length === 0 ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-red-900/30 text-red-400 hover:bg-red-900/50 border border-red-500/30'}`}
                  >
                    <i className='fa-solid fa-eraser mr-2'></i>
                    {isModMode && targetUser
                      ? 'Clear User Badges'
                      : 'Clear My Badges'}
                  </button>

                  <p className='text-slate-600 text-[10px] italic mt-3'>
                    {isModMode
                      ? 'Changes saved to user profile.'
                      : 'Changes save automatically.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Badges;
