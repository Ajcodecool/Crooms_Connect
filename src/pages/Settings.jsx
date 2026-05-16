import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import Cropper from 'react-cropper';
import { useTheme } from '../hooks/useTheme';
import 'cropperjs/dist/cropper.css';
import './Chat.css';

const cropperStyle = `
  .cropper-view-box, .cropper-face {
    border-radius: 50%;
  }
  .cropper-container-custom {
    width: 100%;
    height: 400px;
    background: #1a1b2f;
  }
`;

const Settings = ({ session }) => {
  const navigate = useNavigate();

  // === THEME HOOK ===
  const { themeClass, themeStyle } = useTheme();

  const [loading, setLoading] = useState(true);

  // === AUTHENTICATION GATE STATE ===
  // Check if authenticated within the last 15 minutes (15 * 60 * 1000 ms)
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const lastAuth = localStorage.getItem('settingsAuthTimestamp');
    if (lastAuth && Date.now() - parseInt(lastAuth) < 15 * 60 * 1000) {
      console.log(
        '[Settings Debug] User is authenticated via cached timestamp.',
      );
      return true;
    }
    console.log(
      '[Settings Debug] User needs to authenticate to access settings.',
    );
    return false;
  });

  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // === DATA STATE ===
  const [username, setUsername] = useState('');
  const [pronouns, setPronouns] = useState('');
  const [status, setStatus] = useState('');
  const [lunchType, setLunchType] = useState('A');
  const [gradYear, setGradYear] = useState('');
  const [gradYearVisibility, setGradYearVisibility] = useState('public');
  const [avatarUrl, setAvatarUrl] = useState(null);

  // === BIRTHDAY STATE ===
  const [birthdayMonth, setBirthdayMonth] = useState('');
  const [birthdayDay, setBirthdayDay] = useState('');
  const [birthdayVisibility, setBirthdayVisibility] = useState('private');
  const [originalBirthday, setOriginalBirthday] = useState({
    month: '',
    day: '',
  });
  const [lastBirthdayChange, setLastBirthdayChange] = useState(null);

  const [allowFireworks, setAllowFireworks] = useState(true);
  const [hideBadges, setHideBadges] = useState(false);
  const [allowDms, setAllowDms] = useState(false);
  const [customPeriods, setCustomPeriods] = useState({});
  const [allowDashboardCustomization, setAllowDashboardCustomization] =
    useState(false);
  const [compactMode, setCompactMode] = useState(false);

  // === PASSWORD PROTECTION STATE ===
  const [requireSettingsPassword, setRequireSettingsPassword] = useState(true);
  const [passwordProtectedAreas, setPasswordProtectedAreas] = useState({});
  const [passwordLogs, setPasswordLogs] = useState([]);

  // === SERVER-SIDE BLOCKING STATE ===
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [blockInput, setBlockInput] = useState('');

  // === UI STATE ===
  const [uploading, setUploading] = useState(false);
  const [savingPronouns, setSavingPronouns] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);

  // === VERIFICATION STATE ===
  const [isVerified, setIsVerified] = useState(false);
  const [verifiedInfo, setVerifiedInfo] = useState({ date: null, name: '' });

  // === EDITING NAME STATE ===
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');

  // === MODALS STATE ===
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [authLoadingName, setAuthLoadingName] = useState(false);
  const [authErrorName, setAuthErrorName] = useState('');

  // === PASSWORD RESET MODAL STATE ===
  const [isPasswordReset, setIsPasswordReset] = useState(false);
  const [resetCurrentPassword, setResetCurrentPassword] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');

  // === CROPPER STATE ===
  const [showCropper, setShowCropper] = useState(false);
  const [imageSrc, setImageSrc] = useState(null);
  const cropperRef = useRef(null);

  // === ACCOUNT LOG STATE ===
  const [showAccountLog, setShowAccountLog] = useState(false);

  // === MESSAGES ===
  const [msg, setMsg] = useState('');

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  const getDefaultAvatar = (name) => {
    if (!name) return '/DP1.jpg';
    let hash = 0;
    for (let i = 0; i < name.length; i++)
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    const index = (Math.abs(hash) % 4) + 1;
    return `/DP${index}.jpg`;
  };

  const getBrowserInfo = () => {
    const ua = navigator.userAgent;
    let browserName = 'Unknown';
    let browserVersion = 'Unknown';

    if (ua.indexOf('Firefox') > -1) {
      browserName = 'Firefox';
      browserVersion = ua.match(/Firefox\/(\d+)/)?.[1] || 'Unknown';
    } else if (ua.indexOf('Chrome') > -1) {
      browserName = 'Chrome';
      browserVersion = ua.match(/Chrome\/(\d+)/)?.[1] || 'Unknown';
    } else if (ua.indexOf('Safari') > -1) {
      browserName = 'Safari';
      browserVersion = ua.match(/Version\/(\d+)/)?.[1] || 'Unknown';
    } else if (ua.indexOf('Edge') > -1) {
      browserName = 'Edge';
      browserVersion = ua.match(/Edge\/(\d+)/)?.[1] || 'Unknown';
    }

    return `${browserName} ${browserVersion}`;
  };

  const getDeviceInfo = () => {
    const ua = navigator.userAgent;
    if (/mobile/i.test(ua)) return 'Mobile';
    if (/tablet/i.test(ua)) return 'Tablet';
    return 'Desktop';
  };

  const logPasswordUsage = (action) => {
    console.log(`[Settings Debug] Logging password usage action: ${action}`);
    const timestamp = new Date().toLocaleString();
    const browser = getBrowserInfo();
    const device = getDeviceInfo();

    const logEntry = {
      action,
      timestamp,
      browser,
      device,
      id: Date.now(),
    };

    setPasswordLogs((prev) => [logEntry, ...prev.slice(0, 49)]);
    saveField('password_logs', [logEntry, ...passwordLogs.slice(0, 49)]);
  };

  // === AUTHENTICATION GATE HANDLER ===
  const handleAuthGate = async (e) => {
    e.preventDefault();
    console.log('[Settings Debug] Attempting authentication gate...');
    setAuthLoading(true);
    setAuthError('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: session.user.email,
        password: authPassword,
      });

      if (error) {
        console.error('[Settings Error] Auth gate failed:', error.message);
        setAuthError('Incorrect password. Please try again.');
        setAuthLoading(false);
        return;
      }

      // Authentication successful
      console.log('[Settings Debug] Auth gate successful. Unlocking settings.');
      logPasswordUsage('Settings Access');
      localStorage.setItem('settingsAuthTimestamp', Date.now().toString());
      setIsAuthenticated(true);
      setAuthPassword('');
      setLoading(false);
    } catch (err) {
      console.error('[Settings Error] Unexpected authentication error:', err);
      setAuthError('Authentication failed. Please try again.');
      setAuthLoading(false);
    }
  };

  // === GLOBAL SYNC ON MOUNT ===
  useEffect(() => {
    // === FETCH BLOCKED USERS ===
    const fetchBlockedUsers = async () => {
      console.log('[Settings Debug] Fetching blocked users...');
      try {
        const { data, error } = await supabase
          .from('user_blocks')
          .select('blocked_username')
          .eq('blocker_id', session.user.id);

        if (error) throw error;
        console.log('[Settings Debug] Blocked users fetched:', data);
        setBlockedUsers(data.map((r) => r.blocked_username));
      } catch (err) {
        console.error('[Settings Error] Failed to fetch blocks:', err);
      }
    };

    if (session) {
      fetchBlockedUsers();
      if (isAuthenticated) {
        setLoading(false);
      }
    }
  }, [session, isAuthenticated]);

  // 1. Fetch Profile Data (only if authenticated)
  useEffect(() => {
    if (!isAuthenticated) return;

    const getProfile = async () => {
      console.log(
        `[Settings Debug] Fetching profile data for user ID: ${session.user.id}`,
      );
      try {
        const user = session.user;

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') throw error;

        if (data) {
          console.log('[Settings Debug] Profile data received:', data);
          setUsername(data.username || '');
          setPronouns(data.pronouns || '');
          setStatus(data.status || '');
          setLunchType(data.lunch_type || 'A');
          setGradYear(data.grad_year || '');
          setGradYearVisibility(data.grad_year_visibility || 'public');
          setIsVerified(data.is_verified || false);

          setBirthdayMonth(data.birthday_month || '');
          setBirthdayDay(data.birthday_day || '');
          setOriginalBirthday({
            month: data.birthday_month || '',
            day: data.birthday_day || '',
          });
          setBirthdayVisibility(data.birthday_visibility || 'private');
          setLastBirthdayChange(data.last_birthday_change || null);

          setAllowFireworks(data.allow_fireworks !== false);
          setHideBadges(data.hide_badges || false);
          setAllowDms(data.allow_dms ?? false);
          setCustomPeriods(data.custom_periods || {});
          setAllowDashboardCustomization(
            data.allow_dashboard_customization ?? false,
          );
          setCompactMode(data.compact_mode ?? false);
          setRequireSettingsPassword(data.require_settings_password !== false);
          setPasswordProtectedAreas(data.password_protected_areas || {});
          setPasswordLogs(data.password_logs || []);

          if (data.verified_at) {
            setVerifiedInfo({
              date: data.verified_at,
              name: data.verified_name || data.username,
            });
          } else if (data.croomie) {
            setIsVerified(true);
          }

          if (data.avatar_url) {
            setAvatarUrl(data.avatar_url);
          } else {
            const metaAvatar = user.user_metadata?.avatar_url;
            setAvatarUrl(
              metaAvatar && !metaAvatar.includes('dicebear')
                ? metaAvatar
                : null,
            );
          }
        } else {
          console.log('[Settings Debug] No profile data found for this user.');
        }
      } catch (error) {
        console.error(
          '[Settings Error] Error loading profile:',
          error.message,
          error,
        );
      }
    };

    getProfile();
  }, [isAuthenticated, session]);

  const saveField = async (field, value) => {
    console.log(
      `[Settings Debug] Attempting to save field: '${field}', Value:`,
      value,
    );
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ [field]: value })
        .eq('id', session.user.id);

      if (error) {
        console.error(
          `[Settings Error] Supabase returned an error saving '${field}':`,
          error,
        );
        throw error;
      }
      console.log(`[Settings Debug] Successfully saved field: '${field}'`);
    } catch (err) {
      console.error(
        `[Settings Error] Caught exception saving '${field}':`,
        err,
      );
    }
  };

  const handleSavePronouns = async () => {
    console.log('[Settings Debug] Triggered handleSavePronouns');
    setSavingPronouns(true);
    try {
      await saveField('pronouns', pronouns.trim());
    } finally {
      setSavingPronouns(false);
    }
  };

  // FIXED: Changed substring limit to 100
  const handleSaveStatus = async () => {
    console.log('[Settings Debug] Triggered handleSaveStatus');
    setSavingStatus(true);
    try {
      await saveField('status', status.trim().substring(0, 100));
    } finally {
      setSavingStatus(false);
    }
  };

  const handleSaveCustomPeriods = async () => {
    console.log('[Settings Debug] Triggered handleSaveCustomPeriods');
    await saveField('custom_periods', customPeriods);
    setMsg('Class schedule saved!');
    setTimeout(() => setMsg(''), 3000);
  };

  const handleSaveBirthday = async () => {
    console.log('[Settings Debug] Triggered handleSaveBirthday');
    const isBirthdayChanged =
      String(birthdayMonth) !== String(originalBirthday.month) ||
      String(birthdayDay) !== String(originalBirthday.day);

    console.log(`[Settings Debug] Birthday changed? ${isBirthdayChanged}`);

    // Spam Check: 30 days limit on month/day changes
    if (isBirthdayChanged && lastBirthdayChange) {
      const lastChangeDate = new Date(lastBirthdayChange);
      const now = new Date();
      const diffTime = Math.abs(now - lastChangeDate);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      console.log(
        `[Settings Debug] Last birthday change was ${diffDays} days ago.`,
      );
      if (diffDays < 30) {
        console.warn(
          `[Settings Debug] Spam check failed. User must wait ${30 - diffDays} more days.`,
        );
        alert(
          `You can only change your birthday once every 30 days. Please wait ${30 - diffDays} more days.`,
        );
        // Revert UI to match DB
        setBirthdayMonth(originalBirthday.month);
        setBirthdayDay(originalBirthday.day);
        return;
      }
    }

    const updates = {
      birthday_visibility: birthdayVisibility,
    };

    if (isBirthdayChanged) {
      updates.birthday_month = birthdayMonth ? parseInt(birthdayMonth) : null;
      updates.birthday_day = birthdayDay ? parseInt(birthdayDay) : null;

      const nowIso = new Date().toISOString();
      updates.last_birthday_change = nowIso;

      setLastBirthdayChange(nowIso);
      setOriginalBirthday({ month: birthdayMonth, day: birthdayDay });
      console.log(
        '[Settings Debug] Submitting updated birthday fields:',
        updates,
      );
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', session.user.id);

      if (error) throw error;

      console.log('[Settings Debug] Birthday saved successfully.');
      setMsg('Birthday settings updated!');
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      console.error('[Settings Error] Failed to save birthday settings:', err);
      alert('Failed to save birthday settings.');
    }
  };

  const handleFileSelect = (e) => {
    console.log('[Settings Debug] Profile picture file selected.');
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImageSrc(reader.result);
        setShowCropper(true);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleCropUpload = async () => {
    console.log('[Settings Debug] Triggered handleCropUpload');
    if (!cropperRef.current) return;
    try {
      setUploading(true);
      cropperRef.current.cropper
        .getCroppedCanvas({ width: 300, height: 300 })
        .toBlob(async (blob) => {
          const fileName = `${session.user.id}.png`;
          console.log(
            `[Settings Debug] Uploading cropped image to Supabase Storage: ${fileName}`,
          );

          const { error: uploadError } = await supabase.storage
            .from('profile-pictures')
            .upload(fileName, blob, { upsert: true, cacheControl: '3600' });

          if (uploadError) {
            console.error('[Settings Error] Upload error:', uploadError);
            throw uploadError;
          }

          const {
            data: { publicUrl },
          } = supabase.storage.from('profile-pictures').getPublicUrl(fileName);
          const versionedUrl = `${publicUrl}?t=${Date.now()}`;

          console.log(
            `[Settings Debug] Updating user auth and profile with new avatar URL: ${versionedUrl}`,
          );
          await supabase.auth.updateUser({
            data: { avatar_url: versionedUrl },
          });
          await supabase
            .from('profiles')
            .update({ avatar_url: versionedUrl })
            .eq('id', session.user.id);

          setAvatarUrl(versionedUrl);
          setShowCropper(false);
          setMsg('Profile picture updated!');
          setTimeout(() => setMsg(''), 3000);
        }, 'image/png');
    } catch (error) {
      console.error('[Settings Error] Error in handleCropUpload:', error);
      alert(error.message);
    } finally {
      setUploading(false);
    }
  };

  const updateLunch = async (type) => {
    console.log(`[Settings Debug] Updating lunch preference to: ${type}`);
    setLunchType(type);
    await saveField('lunch_type', type);
    setMsg('Lunch preference saved!');
    setTimeout(() => setMsg(''), 3000);
  };

  const updateGradYear = async (e) => {
    const year = e.target.value;
    console.log(`[Settings Debug] Updating grad year to: ${year}`);
    setGradYear(year);
    await saveField('grad_year', year);
    setMsg(`Class of ${year} saved!`);
    setTimeout(() => setMsg(''), 3000);
  };

  const updateGradYearVisibility = async (e) => {
    const vis = e.target.value;
    console.log(`[Settings Debug] Updating grad year visibility to: ${vis}`);
    setGradYearVisibility(vis);
    await saveField('grad_year_visibility', vis);
    setMsg('Graduation year visibility updated!');
    setTimeout(() => setMsg(''), 3000);
  };

  const toggleFireworks = () => {
    const newVal = !allowFireworks;
    console.log(`[Settings Debug] Toggling fireworks to: ${newVal}`);
    setAllowFireworks(newVal);
    saveField('allow_fireworks', newVal);
  };

  const toggleHideBadges = () => {
    const newVal = !hideBadges;
    console.log(`[Settings Debug] Toggling hide badges to: ${newVal}`);
    setHideBadges(newVal);
    saveField('hide_badges', newVal);
  };

  const toggleAllowDms = () => {
    const newVal = !allowDms;
    console.log(`[Settings Debug] Toggling allow DMs to: ${newVal}`);
    setAllowDms(newVal);
    saveField('allow_dms', newVal);
    setMsg(newVal ? 'DMs Enabled' : 'DMs Disabled');
    setTimeout(() => setMsg(''), 3000);
  };

  const toggleDashboardCustomization = () => {
    const newVal = !allowDashboardCustomization;
    console.log(
      `[Settings Debug] Toggling dashboard customization to: ${newVal}`,
    );
    setAllowDashboardCustomization(newVal);
    saveField('allow_dashboard_customization', newVal);
    setMsg(newVal ? 'Dashboard Editing Enabled' : 'Dashboard Editing Disabled');
    setTimeout(() => setMsg(''), 3000);
  };

  const toggleCompactMode = () => {
    const newVal = !compactMode;
    console.log(`[Settings Debug] Toggling compact mode to: ${newVal}`);
    setCompactMode(newVal);
    saveField('compact_mode', newVal);
    localStorage.setItem('compactMode', newVal);
    setMsg(newVal ? 'Compact Mode Enabled' : 'Compact Mode Disabled');
    setTimeout(() => setMsg(''), 3000);
  };

  const toggleRequireSettingsPassword = () => {
    const newVal = !requireSettingsPassword;
    console.log(
      `[Settings Debug] Toggling require settings password to: ${newVal}`,
    );
    setRequireSettingsPassword(newVal);
    saveField('require_settings_password', newVal);
    logPasswordUsage(`Settings Password ${newVal ? 'Enabled' : 'Disabled'}`);
    setMsg(newVal ? 'Settings Password Enabled' : 'Settings Password Disabled');
    setTimeout(() => setMsg(''), 3000);
  };

  const toggleAreaPasswordProtection = (area) => {
    const newAreas = { ...passwordProtectedAreas };
    newAreas[area] = !newAreas[area];
    console.log(
      `[Settings Debug] Toggling password protection for area: ${area} to ${newAreas[area]}`,
    );
    setPasswordProtectedAreas(newAreas);
    saveField('password_protected_areas', newAreas);
    logPasswordUsage(
      `${area} Password Protection ${newAreas[area] ? 'Enabled' : 'Disabled'}`,
    );
    setMsg(`${area} protection ${newAreas[area] ? 'enabled' : 'disabled'}`);
    setTimeout(() => setMsg(''), 3000);
  };

  const initiateNameChange = () => {
    console.log('[Settings Debug] Initiating name change.');
    setTempName(username);
    setIsEditingName(true);
  };

  const promptPassword = () => {
    console.log('[Settings Debug] Prompting password for name change.');
    if (!tempName.trim()) return alert('Display name cannot be empty.');
    if (tempName === username) {
      console.log('[Settings Debug] Name is identical, aborting change.');
      setIsEditingName(false);
      return;
    }
    setShowPasswordModal(true);
    setAuthErrorName('');
    setPassword('');
  };

  const confirmNameChange = async (e) => {
    e.preventDefault();
    console.log('[Settings Debug] Confirming name change via password auth...');
    setAuthLoadingName(true);
    setAuthErrorName('');
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: session.user.email,
        password,
      });
      if (error) throw error;

      console.log(
        `[Settings Debug] Password verified. Updating username to: ${tempName}`,
      );
      logPasswordUsage('Display Name Changed');
      await saveField('username', tempName);
      await supabase.auth.updateUser({ data: { username: tempName } });

      setUsername(tempName);
      setShowPasswordModal(false);
      setIsEditingName(false);
      setMsg('Username updated!');
      setTimeout(() => setMsg(''), 3000);
    } catch (error) {
      console.error(
        '[Settings Error] Password confirmation failed for name change:',
        error,
      );
      setAuthErrorName('Incorrect password.');
    } finally {
      setAuthLoadingName(false);
    }
  };

  // === SERVER-SIDE BLOCKING HANDLERS ===
  const handleBlockUser = async () => {
    const target = blockInput.trim();
    if (!target) return;

    console.log(`[Settings Debug] Attempting to block user: ${target}`);
    if (target === username) {
      console.warn('[Settings Debug] Block aborted: Cannot block yourself.');
      alert('You cannot block yourself.');
      return;
    }
    if (blockedUsers.includes(target)) {
      console.warn('[Settings Debug] Block aborted: User already blocked.');
      alert('User is already blocked.');
      return;
    }

    try {
      const { error } = await supabase.from('user_blocks').insert({
        blocker_id: session.user.id,
        blocked_username: target,
      });

      if (error) {
        console.error('[Settings Error] Error blocking user:', error);
        throw error;
      }

      console.log(`[Settings Debug] Successfully blocked user: ${target}`);
      setBlockedUsers((prev) => [...prev, target]);
      setBlockInput('');
      setMsg(`Blocked ${target}`);
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      console.error(
        '[Settings Error] Caught exception in handleBlockUser:',
        err,
      );
      alert('Failed to block user. Try again.');
    }
  };

  const handleUnblockUser = async (nameToUnblock) => {
    console.log(
      `[Settings Debug] Attempting to unblock user: ${nameToUnblock}`,
    );
    try {
      const { error } = await supabase
        .from('user_blocks')
        .delete()
        .eq('blocker_id', session.user.id)
        .eq('blocked_username', nameToUnblock);

      if (error) {
        console.error('[Settings Error] Error unblocking user:', error);
        throw error;
      }

      console.log(
        `[Settings Debug] Successfully unblocked user: ${nameToUnblock}`,
      );
      setBlockedUsers((prev) => prev.filter((n) => n !== nameToUnblock));
      setMsg(`Unblocked ${nameToUnblock}`);
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      console.error(
        '[Settings Error] Caught exception in handleUnblockUser:',
        err,
      );
      alert('Failed to unblock user.');
    }
  };

  // === PASSWORD RESET HANDLER ===
  const handlePasswordReset = async (e) => {
    e.preventDefault();
    console.log('[Settings Debug] Attempting password reset...');
    setResetLoading(true);
    setResetError('');

    if (resetNewPassword.length < 6) {
      console.warn(
        '[Settings Debug] Password reset aborted: New password too short.',
      );
      setResetError('New password must be at least 6 characters.');
      setResetLoading(false);
      return;
    }

    try {
      console.log('[Settings Debug] Verifying current password...');
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: session.user.email,
        password: resetCurrentPassword,
      });

      if (authError) {
        console.error(
          '[Settings Error] Current password verification failed:',
          authError,
        );
        setResetError('Current password is incorrect.');
        setResetLoading(false);
        return;
      }

      console.log('[Settings Debug] Updating user password...');
      const { error: updateError } = await supabase.auth.updateUser({
        password: resetNewPassword,
      });

      if (updateError) {
        console.error(
          '[Settings Error] Failed to update password in auth system:',
          updateError,
        );
        throw updateError;
      }

      console.log('[Settings Debug] Password reset successful.');
      logPasswordUsage('Password Changed');
      setMsg('Password updated successfully!');
      setIsPasswordReset(false);
      setResetCurrentPassword('');
      setResetNewPassword('');
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      console.error('[Settings Error] Password Reset Error:', err);
      setResetError(err.message || 'Failed to reset password.');
    } finally {
      setResetLoading(false);
    }
  };

  const copyLogToClipboard = () => {
    console.log('[Settings Debug] Copying account log to clipboard.');
    const logText = passwordLogs
      .map(
        (entry) =>
          `[${entry.timestamp}] ${entry.action} - ${entry.browser} (${entry.device})`,
      )
      .join('\n');
    navigator.clipboard.writeText(logText);
    setMsg('Account log copied to clipboard!');
    setTimeout(() => setMsg(''), 3000);
  };

  // === AUTHENTICATION GATE (before rendering settings) ===
  if (!isAuthenticated && requireSettingsPassword) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${themeClass}`}
        style={themeStyle}
      >
        <div className='dashboard-card rounded-2xl p-8 max-w-sm w-full shadow-2xl'>
          <div className='text-center mb-6'>
            <div className='flex justify-center mb-4'>
              <div className='bg-blue-600/20 p-4 rounded-full'>
                <i className='fa-solid fa-lock text-2xl text-blue-400'></i>
              </div>
            </div>
            <h1 className='text-2xl font-bold mb-2'>Settings</h1>
            <p className='opacity-60 text-sm'>
              Enter your password to access your settings
            </p>
          </div>

          <form onSubmit={handleAuthGate}>
            <div className='mb-4'>
              <input
                type='password'
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                className='w-full dashboard-input rounded-lg px-4 py-3 focus:border-blue-500 focus:outline-none text-center text-lg tracking-widest'
                placeholder='••••••••'
                autoFocus
                disabled={authLoading}
              />
              {authError && (
                <p className='text-red-400 text-xs mt-3 font-bold text-center'>
                  <i className='fa-solid fa-circle-exclamation mr-1'></i>
                  {authError}
                </p>
              )}
            </div>

            <button
              type='submit'
              disabled={authLoading || !authPassword}
              className='w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 mb-2'
            >
              {authLoading ? (
                <>
                  <i className='fa-solid fa-circle-notch fa-spin'></i>
                  Authenticating...
                </>
              ) : (
                <>
                  <i className='fa-solid fa-unlock'></i>
                  Unlock Settings
                </>
              )}
            </button>

            <button
              type='button'
              onClick={() => navigate('/')}
              className='w-full bg-black/20 hover:bg-black/30 opacity-80 hover:opacity-100 font-bold py-2 rounded-lg transition border border-white/10'
            >
              <i className='fa-solid fa-arrow-left mr-2'></i>
              Back
            </button>

            <button
              type='button'
              onClick={() => {
                console.log(
                  '[Settings Debug] User signing out from authentication gate.',
                );
                supabase.auth.signOut();
              }}
              className='w-full mt-4 text-red-400 hover:text-red-300 opacity-80 hover:opacity-100 font-bold py-2 rounded-lg transition border border-red-500/20 bg-red-500/10'
            >
              <i className='fa-solid fa-right-from-bracket mr-2'></i>
              Sign Out
            </button>
          </form>

          <p className='text-xs opacity-40 text-center mt-6'>
            Your authentication session lasts for 15 minutes.
          </p>
        </div>
      </div>
    );
  }

  if (loading)
    return (
      <div
        className={`min-h-screen flex items-center justify-center opacity-70 ${themeClass}`}
        style={themeStyle}
      >
        Loading Settings...
      </div>
    );

  return (
    <div
      className={`min-h-screen p-6 pb-24 font-sans relative ${themeClass}`}
      style={themeStyle}
    >
      <style>{cropperStyle}</style>

      {/* CROPPER MODAL */}
      {showCropper && (
        <div className='fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200'>
          <div className='dashboard-card rounded-xl shadow-2xl p-6 w-full max-w-lg'>
            <h3 className='text-xl font-bold mb-4'>Crop Profile Picture</h3>
            <div className='relative w-full h-80 bg-black rounded-lg overflow-hidden border border-white/10'>
              <Cropper
                src={imageSrc}
                style={{ height: '100%' }}
                aspectRatio={1}
                viewMode={1}
                ref={cropperRef}
              />
            </div>
            <div className='flex gap-3 mt-4'>
              <button
                onClick={() => setShowCropper(false)}
                className='flex-1 bg-black/20 hover:bg-black/30 opacity-80 hover:opacity-100 font-bold py-2 rounded-lg transition border border-white/10'
              >
                Cancel
              </button>
              <button
                onClick={handleCropUpload}
                className='flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-lg transition shadow-lg shadow-blue-900/20'
              >
                Save Picture
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PASSWORD MODAL */}
      {showPasswordModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200'>
          <div className='dashboard-card rounded-xl shadow-2xl p-6 max-w-sm w-full'>
            <h3 className='text-xl font-bold mb-2'>Confirm Identity</h3>
            <p className='text-sm mb-4 opacity-70'>
              Please enter your password to change your display name.
            </p>
            <form onSubmit={confirmNameChange}>
              <div className='mb-4'>
                <input
                  type='password'
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className='w-full dashboard-input rounded-lg px-4 py-3 focus:border-blue-500 focus:outline-none'
                  placeholder='Your Password'
                  autoFocus
                />
                {authErrorName && (
                  <p className='text-red-400 text-xs mt-2 font-bold'>
                    <i className='fa-solid fa-circle-exclamation mr-1'></i>{' '}
                    {authErrorName}
                  </p>
                )}
              </div>
              <div className='flex gap-3'>
                <button
                  type='button'
                  onClick={() => setShowPasswordModal(false)}
                  className='flex-1 bg-black/20 hover:bg-black/30 opacity-80 hover:opacity-100 font-bold py-2 rounded-lg transition border border-white/10'
                >
                  Cancel
                </button>
                <button
                  type='submit'
                  disabled={authLoadingName || !password}
                  className='flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-lg transition disabled:opacity-50 flex justify-center items-center'
                >
                  {authLoadingName ? (
                    <i className='fa-solid fa-circle-notch fa-spin'></i>
                  ) : (
                    'Confirm'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PASSWORD RESET MODAL */}
      {isPasswordReset && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200'>
          <div className='dashboard-card rounded-xl shadow-2xl p-6 max-w-sm w-full'>
            <h3 className='text-xl font-bold mb-2'>Change Password</h3>
            <p className='text-sm mb-4 opacity-70'>
              Enter your current password and a new one to update your account
              security.
            </p>
            <form onSubmit={handlePasswordReset}>
              <div className='mb-4'>
                <label className='block text-sm font-bold mb-2 opacity-70'>
                  Current Password
                </label>
                <input
                  type='password'
                  value={resetCurrentPassword}
                  onChange={(e) => setResetCurrentPassword(e.target.value)}
                  className='w-full dashboard-input rounded-lg px-4 py-3 focus:border-green-500 focus:outline-none'
                  placeholder='••••••••'
                  autoFocus
                />
              </div>
              <div className='mb-4'>
                <label className='block text-sm font-bold mb-2 opacity-70'>
                  New Password
                </label>
                <input
                  type='password'
                  value={resetNewPassword}
                  onChange={(e) => setResetNewPassword(e.target.value)}
                  className='w-full dashboard-input rounded-lg px-4 py-3 focus:border-green-500 focus:outline-none'
                  placeholder='••••••••'
                />
              </div>
              {resetError && (
                <p className='text-red-400 text-xs mt-2 font-bold'>
                  <i className='fa-solid fa-circle-exclamation mr-1'></i>{' '}
                  {resetError}
                </p>
              )}
              <div className='flex gap-3 mt-4'>
                <button
                  type='button'
                  onClick={() => {
                    setIsPasswordReset(false);
                    setResetError('');
                    setResetCurrentPassword('');
                    setResetNewPassword('');
                  }}
                  className='flex-1 bg-black/20 hover:bg-black/30 opacity-80 hover:opacity-100 font-bold py-2 rounded-lg transition border border-white/10'
                >
                  Cancel
                </button>
                <button
                  type='submit'
                  disabled={
                    resetLoading || !resetCurrentPassword || !resetNewPassword
                  }
                  className='flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded-lg transition disabled:opacity-50 flex justify-center items-center'
                >
                  {resetLoading ? (
                    <i className='fa-solid fa-circle-notch fa-spin'></i>
                  ) : (
                    'Update Password'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ACCOUNT LOG MODAL */}
      {showAccountLog && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200'>
          <div className='dashboard-card rounded-xl shadow-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto'>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-xl font-bold'>Account Activity Log</h3>
              <button
                onClick={() => setShowAccountLog(false)}
                className='text-xl opacity-60 hover:opacity-100'
              >
                <i className='fa-solid fa-times'></i>
              </button>
            </div>

            <p className='text-xs opacity-50 mb-4'>
              Shows the last 50 password-related actions
            </p>

            {passwordLogs.length > 0 ? (
              <>
                <div className='bg-black/20 rounded-lg border border-white/5 overflow-hidden mb-4'>
                  <div className='overflow-x-auto'>
                    <table className='w-full text-xs'>
                      <thead>
                        <tr className='border-b border-white/5'>
                          <th className='px-4 py-2 text-left opacity-70'>
                            Timestamp
                          </th>
                          <th className='px-4 py-2 text-left opacity-70'>
                            Action
                          </th>
                          <th className='px-4 py-2 text-left opacity-70'>
                            Browser
                          </th>
                          <th className='px-4 py-2 text-left opacity-70'>
                            Device
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {passwordLogs.map((log) => (
                          <tr
                            key={log.id}
                            className='border-b border-white/5 last:border-0 hover:bg-black/20 transition'
                          >
                            <td className='px-4 py-2 opacity-80'>
                              {log.timestamp}
                            </td>
                            <td className='px-4 py-2 opacity-80 font-medium text-blue-400'>
                              {log.action}
                            </td>
                            <td className='px-4 py-2 opacity-80'>
                              {log.browser}
                            </td>
                            <td className='px-4 py-2 opacity-80'>
                              {log.device}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className='flex gap-2'>
                  <button
                    onClick={copyLogToClipboard}
                    className='flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-lg transition flex items-center justify-center gap-2'
                  >
                    <i className='fa-solid fa-copy'></i>
                    Copy Log
                  </button>
                  <button
                    onClick={() => setShowAccountLog(false)}
                    className='flex-1 bg-black/20 hover:bg-black/30 opacity-80 hover:opacity-100 font-bold py-2 rounded-lg transition border border-white/10'
                  >
                    Close
                  </button>
                </div>
              </>
            ) : (
              <p className='text-center opacity-60 py-8'>
                No activity logged yet
              </p>
            )}
          </div>
        </div>
      )}

      <div className='max-w-md mx-auto'>
        <div className='flex items-center gap-4 mb-8'>
          <button
            onClick={() => navigate('/')}
            className='opacity-70 hover:opacity-100 transition'
          >
            <i className='fa-solid fa-arrow-left text-xl'></i>
          </button>
          <h1 className='text-2xl font-bold'>Settings</h1>
        </div>

        {msg && (
          <p className='text-blue-400 text-center mb-4 font-bold animate-pulse'>
            <i className='fa-solid fa-check mr-2'></i>
            {msg}
          </p>
        )}

        {/* PROFILE CARD */}
        <div className='dashboard-card rounded-2xl p-6 shadow-xl mb-6'>
          <div className='mb-8 flex flex-col items-center'>
            <div className='relative group'>
              <img
                src={avatarUrl || getDefaultAvatar(username)}
                alt='Profile'
                className='w-24 h-24 rounded-full border-4 border-white/10 object-cover shadow-lg bg-black/20'
                onError={(e) => {
                  if (
                    e.target.src !==
                    window.location.origin + getDefaultAvatar(username)
                  )
                    e.target.src = getDefaultAvatar(username);
                }}
              />
              <label className='absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity'>
                <i className='fa-solid fa-camera text-white text-xl'></i>
                <input
                  type='file'
                  accept='image/*'
                  onChange={handleFileSelect}
                  className='hidden'
                  disabled={uploading}
                />
              </label>
            </div>
            <p className='opacity-60 text-xs mt-3 font-medium'>
              Tap image to change
            </p>
          </div>
          <hr className='my-6 border-white/10' />

          <div className='mb-6'>
            <label className='block opacity-70 text-sm font-bold mb-3'>
              Display Name
            </label>
            {!isEditingName ? (
              <div className='bg-black/20 border border-white/5 rounded-xl p-4 flex justify-between items-center group'>
                <span className='text-lg font-medium'>{username}</span>
                <button
                  onClick={initiateNameChange}
                  className='bg-black/20 hover:bg-blue-600 hover:text-white opacity-70 hover:opacity-100 p-2 rounded-lg transition'
                >
                  <i className='fa-solid fa-pencil'></i>
                </button>
              </div>
            ) : (
              <div className='animate-in fade-in zoom-in duration-200'>
                <input
                  type='text'
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  className='w-full dashboard-input border-blue-500 rounded-xl px-4 py-3 focus:outline-none mb-3'
                  autoFocus
                />
                <div className='flex gap-2'>
                  <button
                    onClick={() => setIsEditingName(false)}
                    className='flex-1 bg-black/20 opacity-80 font-bold py-2 rounded-lg hover:bg-black/30 transition'
                  >
                    Cancel
                  </button>
                  <button
                    onClick={promptPassword}
                    className='flex-1 bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-500 transition shadow-lg shadow-blue-900/20'
                  >
                    Save
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className='mb-6'>
            <label className='block opacity-70 text-sm font-bold mb-3'>
              Pronouns
            </label>
            <div className='relative'>
              <input
                type='text'
                value={pronouns}
                onChange={(e) => setPronouns(e.target.value)}
                onBlur={handleSavePronouns}
                placeholder='e.g. he/him'
                maxLength={20}
                className='w-full dashboard-input rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors'
              />
              {savingPronouns && (
                <div className='absolute right-4 top-3.5 text-blue-500 animate-pulse'>
                  <i className='fa-solid fa-circle-notch fa-spin'></i>
                </div>
              )}
            </div>
          </div>

          <div className='mb-6'>
            <label className='block opacity-70 text-sm font-bold mb-3'>
              Status
            </label>
            <div className='relative'>
              <input
                type='text'
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                onBlur={handleSaveStatus}
                placeholder='e.g. Grinding AP LUNCH BOI ඞ'
                // FIXED: Changed maxLength to 100
                maxLength={100}
                className='w-full dashboard-input rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors'
              />
              {savingStatus && (
                <div className='absolute right-4 top-3.5 text-blue-500 animate-pulse'>
                  <i className='fa-solid fa-circle-notch fa-spin'></i>
                </div>
              )}
            </div>
            {/* FIXED: Changed visual counter out of 100 */}
            <p className='text-right text-xs opacity-50 mt-2'>
              {status.length}/100
            </p>
          </div>

          <div className='mb-2'>
            <label className='block opacity-70 text-sm font-bold mb-3'>
              Birthday & Visibility
            </label>
            <div className='flex gap-2 mb-2'>
              <select
                value={birthdayMonth}
                onChange={(e) => setBirthdayMonth(e.target.value)}
                className='flex-1 dashboard-input rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none cursor-pointer text-sm'
              >
                <option value=''>Month</option>
                {months.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <select
                value={birthdayDay}
                onChange={(e) => setBirthdayDay(e.target.value)}
                className='flex-1 dashboard-input rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none cursor-pointer text-sm'
              >
                <option value=''>Day</option>
                {[...Array(31)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}
                  </option>
                ))}
              </select>
              <select
                value={birthdayVisibility}
                onChange={(e) => setBirthdayVisibility(e.target.value)}
                className='flex-1 dashboard-input rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none cursor-pointer text-sm'
              >
                <option value='private'>Private</option>
                <option value='public'>Public</option>
                <option value='friends'>Friends</option>
              </select>
            </div>
            <div className='flex justify-end'>
              <button
                onClick={handleSaveBirthday}
                className='bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-lg transition text-xs shadow-lg shadow-blue-900/20'
              >
                Save Birthday
              </button>
            </div>
            <p className='text-xs opacity-50 mt-3 leading-relaxed'>
              We only ask for the month and day. Note: Your birthday date can
              only be changed once every 30 days.
            </p>
          </div>
        </div>

        {/* EDITOR LINK */}
        <div className='dashboard-card rounded-2xl p-6 shadow-xl mb-6'>
          <h2 className='text-lg font-bold mb-4 flex items-center gap-2'>
            <i className='fa-solid fa-wand-magic-sparkles opacity-70'></i>{' '}
            Profile Editor
          </h2>
          <p className='opacity-60 text-sm mb-4 leading-relaxed'>
            Customize your profile layout, colors, banner, and add widgets in
            our new visual editor.
          </p>
          <button
            onClick={() => navigate('/editor')}
            className='w-full bg-black/20 hover:bg-black/30 font-bold py-4 rounded-xl border border-white/5 transition flex items-center justify-center gap-2 group'
          >
            <i className='fa-solid fa-pen-ruler text-blue-500 group-hover:scale-110 transition-transform'></i>{' '}
            Open Visual Editor{' '}
            <i className='fa-solid fa-arrow-right text-xs opacity-50 group-hover:translate-x-1 transition-transform'></i>
          </button>
        </div>

        {/* CUSTOM SCHEDULE CARD */}
        <div className='dashboard-card rounded-2xl p-6 shadow-xl mb-6'>
          <h2 className='text-lg font-bold mb-4 flex items-center gap-2'>
            <i className='fa-solid fa-book opacity-70'></i> Custom Schedule
          </h2>
          <p className='opacity-60 text-sm mb-4'>
            Rename your periods so they show up as your actual classes on the
            dashboard.
          </p>

          <div className='space-y-3 mb-4'>
            {[1, 2, 3, 4, 5, 6, 7].map((num) => {
              const key = `Period ${num}`;
              return (
                <div key={key} className='flex items-center gap-3'>
                  <label className='w-20 text-sm font-bold opacity-70'>
                    {key}
                  </label>
                  <input
                    type='text'
                    value={customPeriods[key] || ''}
                    onChange={(e) =>
                      setCustomPeriods((prev) => ({
                        ...prev,
                        [key]: e.target.value,
                      }))
                    }
                    placeholder={`e.g. AP Calc`}
                    className='flex-1 dashboard-input rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none'
                  />
                </div>
              );
            })}
          </div>
          <button
            onClick={handleSaveCustomPeriods}
            className='w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-blue-900/20'
          >
            Save Class Schedule
          </button>
        </div>

        {/* BADGES LINK */}
        <div className='dashboard-card rounded-2xl p-6 shadow-xl mb-6'>
          <h2 className='text-lg font-bold mb-4 flex items-center gap-2'>
            <i className='fa-solid fa-certificate opacity-70'></i> Badges &
            Cosmetics
          </h2>
          <p className='opacity-60 text-sm mb-4 leading-relaxed'>
            Equip badges, flags, and customize your chat identity.
          </p>
          <button
            onClick={() => navigate('/badges')}
            className='w-full bg-black/20 hover:bg-black/30 font-bold py-4 rounded-xl border border-white/5 transition flex items-center justify-center gap-2 group'
          >
            <i className='fa-solid fa-award text-yellow-500 group-hover:scale-110 transition-transform'></i>
            Manage Badges
            <i className='fa-solid fa-arrow-right text-xs opacity-50 group-hover:translate-x-1 transition-transform'></i>
          </button>
        </div>

        {/* PREFERENCES CARD */}
        <div className='dashboard-card rounded-2xl p-6 shadow-xl mb-6'>
          <h2 className='text-lg font-bold mb-6 flex items-center gap-2'>
            <i className='fa-solid fa-sliders opacity-70'></i> Preferences
          </h2>

          <div className='mb-6'>
            <label className='block opacity-70 text-sm font-bold mb-3'>
              Class of... & Visibility
            </label>
            <div className='flex gap-2'>
              <div className='relative flex-1'>
                <select
                  value={gradYear}
                  onChange={updateGradYear}
                  className='w-full dashboard-input rounded-xl px-4 py-3 appearance-none focus:border-blue-500 focus:outline-none cursor-pointer text-sm'
                >
                  <option value='' disabled>
                    Select Year
                  </option>
                  {['2026', '2027', '2028', '2029', '2030'].map((year) => (
                    <option key={year} value={year}>
                      Class of {year}
                    </option>
                  ))}
                </select>
                <div className='absolute right-4 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none'>
                  <i className='fa-solid fa-chevron-down'></i>
                </div>
              </div>
              <select
                value={gradYearVisibility}
                onChange={updateGradYearVisibility}
                className='flex-1 dashboard-input rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none cursor-pointer text-sm'
              >
                <option value='private'>Private</option>
                <option value='public'>Public</option>
                <option value='friends'>Friends</option>
              </select>
            </div>
          </div>

          <div className='mb-6'>
            <label className='block opacity-70 text-sm font-bold mb-3'>
              Lunch Schedule
            </label>
            <div className='grid grid-cols-2 gap-4'>
              <button
                onClick={() => updateLunch('A')}
                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${lunchType === 'A' ? 'border-blue-500 bg-blue-500/10 text-blue-400' : 'border-transparent bg-black/20'}`}
              >
                <i className='fa-solid fa-burger text-2xl'></i>
                <span className='font-bold'>Lunch A</span>
              </button>
              <button
                onClick={() => updateLunch('B')}
                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${lunchType === 'B' ? 'border-blue-500 bg-blue-500/10 text-blue-400' : 'border-transparent bg-black/20'}`}
              >
                <i className='fa-solid fa-utensils text-2xl'></i>
                <span className='font-bold'>Lunch B</span>
              </button>
            </div>
          </div>

          <div
            onClick={toggleFireworks}
            className='flex items-center justify-between bg-black/10 p-4 rounded-xl border border-white/5 cursor-pointer hover:bg-black/20 transition group mb-3'
          >
            <div className='flex items-center gap-3'>
              <div className='bg-black/20 p-2 rounded-lg opacity-70 group-hover:opacity-100 transition'>
                <i className='fa-solid fa-wand-magic-sparkles text-blue-400'></i>
              </div>
              <div>
                <p className='font-bold'>Enable Effects</p>
                <p className='text-xs opacity-50'>Allow confetti & fireworks</p>
              </div>
            </div>
            <div
              className={`w-12 h-6 rounded-full transition-colors relative ${allowFireworks ? 'bg-blue-600' : 'bg-slate-700'}`}
            >
              <div
                className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${allowFireworks ? 'left-7' : 'left-1'}`}
              ></div>
            </div>
          </div>

          <div
            onClick={toggleHideBadges}
            className='flex items-center justify-between bg-black/10 p-4 rounded-xl border border-white/5 cursor-pointer hover:bg-black/20 transition group mb-3'
          >
            <div className='flex items-center gap-3'>
              <div className='bg-black/20 p-2 rounded-lg opacity-70 group-hover:opacity-100 transition'>
                <i className='fa-solid fa-id-badge text-amber-400'></i>
              </div>
              <div>
                <p className='font-bold'>Hide Badges</p>
                <p className='text-xs opacity-50'>
                  Don&apos;t show badges in chat
                </p>
              </div>
            </div>
            <div
              className={`w-12 h-6 rounded-full transition-colors relative ${hideBadges ? 'bg-blue-600' : 'bg-slate-700'}`}
            >
              <div
                className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${hideBadges ? 'left-7' : 'left-1'}`}
              ></div>
            </div>
          </div>

          <div
            onClick={toggleAllowDms}
            className='flex items-center justify-between bg-black/10 p-4 rounded-xl border border-white/5 cursor-pointer hover:bg-black/20 transition group mb-3'
          >
            <div className='flex items-center gap-3'>
              <div className='bg-black/20 p-2 rounded-lg opacity-70 group-hover:opacity-100 transition'>
                <i className='fa-solid fa-envelope text-purple-400'></i>
              </div>
              <div>
                <p className='font-bold'>Allow DMs</p>
                <p className='text-xs opacity-50'>Let users message you</p>
              </div>
            </div>
            <div
              className={`w-12 h-6 rounded-full transition-colors relative ${allowDms ? 'bg-blue-600' : 'bg-slate-700'}`}
            >
              <div
                className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${allowDms ? 'left-7' : 'left-1'}`}
              ></div>
            </div>
          </div>

          <div
            onClick={toggleDashboardCustomization}
            className='flex items-center justify-between bg-black/10 p-4 rounded-xl border border-white/5 cursor-pointer hover:bg-black/20 transition group mb-3'
          >
            <div className='flex items-center gap-3'>
              <div className='bg-black/20 p-2 rounded-lg opacity-70 group-hover:opacity-100 transition'>
                <i className='fa-solid fa-table-cells-large text-emerald-400'></i>
              </div>
              <div>
                <p className='font-bold'>Dashboard Customization</p>
                <p className='text-xs opacity-50'>
                  Allow resizing & moving widgets
                </p>
              </div>
            </div>
            <div
              className={`w-12 h-6 rounded-full transition-colors relative ${allowDashboardCustomization ? 'bg-blue-600' : 'bg-slate-700'}`}
            >
              <div
                className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${allowDashboardCustomization ? 'left-7' : 'left-1'}`}
              ></div>
            </div>
          </div>

          <div
            onClick={toggleCompactMode}
            className='flex items-center justify-between bg-black/10 p-4 rounded-xl border border-white/5 cursor-pointer hover:bg-black/20 transition group'
          >
            <div className='flex items-center gap-3'>
              <div className='bg-black/20 p-2 rounded-lg opacity-70 group-hover:opacity-100 transition'>
                <i className='fa-solid fa-compress text-pink-400'></i>
              </div>
              <div>
                <p className='font-bold'>Compact Chat Mode</p>
                <p className='text-xs opacity-50'>
                  Shrink messages to fit more on screen
                </p>
              </div>
            </div>
            <div
              className={`w-12 h-6 rounded-full transition-colors relative ${compactMode ? 'bg-blue-600' : 'bg-slate-700'}`}
            >
              <div
                className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${compactMode ? 'left-7' : 'left-1'}`}
              ></div>
            </div>
          </div>
        </div>

        {/* SECURITY SETTINGS CARD */}
        <div className='dashboard-card rounded-2xl p-6 shadow-xl mb-6'>
          <h2 className='text-lg font-bold mb-6 flex items-center gap-2'>
            <i className='fa-solid fa-lock opacity-70'></i> Security Settings
          </h2>

          <div
            onClick={toggleRequireSettingsPassword}
            className='flex items-center justify-between bg-black/10 p-4 rounded-xl border border-white/5 cursor-pointer hover:bg-black/20 transition group mb-4'
          >
            <div className='flex items-center gap-3'>
              <div className='bg-black/20 p-2 rounded-lg opacity-70 group-hover:opacity-100 transition'>
                <i className='fa-solid fa-shield text-red-400'></i>
              </div>
              <div>
                <p className='font-bold'>Require Password for Settings</p>
                <p className='text-xs opacity-50'>
                  Lock settings access with password
                </p>
              </div>
            </div>
            <div
              className={`w-12 h-6 rounded-full transition-colors relative ${requireSettingsPassword ? 'bg-blue-600' : 'bg-slate-700'}`}
            >
              <div
                className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${requireSettingsPassword ? 'left-7' : 'left-1'}`}
              ></div>
            </div>
          </div>

          <div className='space-y-3 mb-4'>
            <p className='text-xs opacity-60 font-bold'>
              Password-Protected Areas:
            </p>
            {['Dashboard', 'Badges', 'Mindful', 'Profile'].map((area) => (
              <div
                key={area}
                onClick={() => toggleAreaPasswordProtection(area)}
                className='flex items-center justify-between bg-black/10 p-3 rounded-lg border border-white/5 cursor-pointer hover:bg-black/20 transition'
              >
                <div className='flex items-center gap-2'>
                  <i className='fa-solid fa-lock text-amber-400 text-sm'></i>
                  <span className='text-sm opacity-80'>{area}</span>
                </div>
                <div
                  className={`w-10 h-5 rounded-full transition-colors relative ${passwordProtectedAreas[area] ? 'bg-green-600' : 'bg-slate-700'}`}
                >
                  <div
                    className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-all ${passwordProtectedAreas[area] ? 'left-6' : 'left-1'}`}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ACCOUNT LOG CARD */}
        <div className='dashboard-card rounded-2xl p-6 shadow-xl mb-6'>
          <h2 className='text-lg font-bold mb-4 flex items-center gap-2'>
            <i className='fa-solid fa-history opacity-70'></i> Account Activity
            Log
          </h2>
          <p className='opacity-60 text-sm mb-4'>
            Track password-related actions with browser and device information.
          </p>
          <button
            onClick={() => setShowAccountLog(true)}
            className='w-full bg-black/20 hover:bg-black/30 font-bold py-4 rounded-xl border border-white/5 transition flex items-center justify-center gap-2 group mb-3'
          >
            <i className='fa-solid fa-rectangle-list text-cyan-400 group-hover:scale-110 transition-transform'></i>
            View Activity Log
            <i className='fa-solid fa-arrow-right text-xs opacity-50 group-hover:translate-x-1 transition-transform'></i>
          </button>
          {passwordLogs.length > 0 && (
            <p className='text-xs opacity-50 text-center'>
              {passwordLogs.length} activities logged
            </p>
          )}
        </div>

        {/* PRIVACY & BLOCKING CARD */}
        <div className='dashboard-card rounded-2xl p-6 shadow-xl mb-6'>
          <h2 className='text-lg font-bold mb-4 flex items-center gap-2'>
            <i className='fa-solid fa-user-shield opacity-70'></i> Privacy &
            Blocking
          </h2>
          <p className='opacity-60 text-sm mb-4'>
            Block users to hide their messages in chat. They will not be
            notified.
          </p>

          <div className='flex gap-2 mb-4'>
            <input
              type='text'
              value={blockInput}
              onChange={(e) => setBlockInput(e.target.value)}
              placeholder='Enter username'
              className='flex-1 dashboard-input rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none'
            />
            <button
              onClick={handleBlockUser}
              className='bg-red-900/50 hover:bg-red-900 border border-red-800 text-red-200 px-4 rounded-xl font-bold transition'
            >
              Block
            </button>
          </div>

          {blockedUsers.length > 0 && (
            <div className='bg-black/20 rounded-xl border border-white/5 overflow-hidden'>
              {blockedUsers.map((user, idx) => (
                <div
                  key={idx}
                  className='flex items-center justify-between p-3 border-b border-white/5 last:border-0'
                >
                  <span className='text-sm font-medium opacity-80'>{user}</span>
                  <button
                    onClick={() => handleUnblockUser(user)}
                    className='text-xs bg-black/20 hover:bg-black/40 opacity-70 hover:opacity-100 px-3 py-1 rounded-lg transition'
                  >
                    Unblock
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* VERIFICATION CARD */}
        <div className='dashboard-card rounded-2xl border border-white/5 p-6 shadow-xl mb-6'>
          <h2 className='text-lg font-bold mb-6 flex items-center gap-2'>
            <i className='fa-solid fa-shield-halved opacity-70'></i>{' '}
            Verification
          </h2>
          {isVerified ? (
            <div className='text-center'>
              <button
                disabled
                className='w-full bg-blue-900/20 border border-blue-900/50 text-blue-400 font-bold py-4 rounded-xl opacity-75 flex items-center justify-center gap-2 mb-2 cursor-not-allowed'
              >
                <i className='fa-solid fa-check-circle'></i> Verified
              </button>
              {verifiedInfo.date && (
                <p className='text-xs opacity-50'>
                  Verified as{' '}
                  <span className='opacity-100 font-bold'>
                    {verifiedInfo.name}
                  </span>
                </p>
              )}
            </div>
          ) : (
            <a
              href='/verify'
              target='_blank'
              rel='noopener noreferrer'
              className='flex items-center justify-center gap-2 w-full bg-black/20 hover:bg-black/30 text-blue-400 font-bold py-4 rounded-xl border border-white/10 transition'
            >
              Verify Identity{' '}
              <i className='fa-solid fa-arrow-up-right-from-square text-sm'></i>
            </a>
          )}
        </div>

        {/* SECURITY CARD */}
        <div className='dashboard-card rounded-2xl p-6 shadow-xl mb-6'>
          <h2 className='text-lg font-bold mb-4 flex items-center gap-2'>
            <i className='fa-solid fa-shield-alt opacity-70'></i> Security
          </h2>
          <p className='opacity-60 text-sm mb-4 leading-relaxed'>
            Manage your account security settings, including password changes.
          </p>
          <button
            onClick={() => setIsPasswordReset(true)}
            className='w-full bg-black/20 hover:bg-black/30 font-bold py-4 rounded-xl border border-white/5 transition flex items-center justify-center gap-2 group'
          >
            <i className='fa-solid fa-key text-green-500 group-hover:scale-110 transition-transform'></i>
            Change Password
            <i className='fa-solid fa-arrow-right text-xs opacity-50 group-hover:translate-x-1 transition-transform'></i>
          </button>
        </div>

        {/* THEMES CARD */}
        <div className='dashboard-card rounded-2xl p-6 shadow-xl mb-6'>
          <h2 className='text-lg font-bold mb-4 flex items-center gap-2'>
            <i className='fa-solid fa-palette opacity-70'></i> Appearance
          </h2>
          <p className='opacity-60 text-sm mb-4 leading-relaxed'>
            Change the look and feel of your chat interface with custom themes.
          </p>
          <button
            onClick={() => navigate('/themes')}
            className='w-full bg-black/20 hover:bg-black/30 font-bold py-4 rounded-xl border border-white/5 transition flex items-center justify-center gap-2 group'
          >
            <i className='fa-solid fa-paint-roller text-purple-500 group-hover:scale-110 transition-transform'></i>
            Customize Theme
            <i className='fa-solid fa-arrow-right text-xs opacity-50 group-hover:translate-x-1 transition-transform'></i>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
