import {
  useState,
  useEffect,
  useCallback,
  type SubmitEventHandler,
  type FC,
  type ReactElement,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import {
  SPECIAL_FRESHMAN_EMAILS,
  ACAPOCO_SPECIAL_EMAILS,
  SENIOR_DEV_EMAILS,
  DEV_EMAILS,
  BANNED_EMAILS,
} from '../utils/adminConstants';
import type { Session } from '@supabase/supabase-js';
import type {
  BellSchedule,
  ModLog,
  PasswordResetRequest,
  Profile,
} from '../utils/databaseDefinitions';
import { generateStrongTemporaryPassword } from '../utils/passwordResetUtils';

type EnrichedModLog = ModLog & {
  admin_username: string;
  target_username: string;
};

// Extended types to satisfy TypeScript for new columns not yeet in definitions
type ExtendedProfile = Profile & {
  ban_reason?: string | null;
};

type ExtendedPasswordResetRequest = PasswordResetRequest & {
  user_email: string;
  student_id: string;
};

const Admin: FC<{ session: Session }> = ({ session }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<
    'users' | 'schedules' | 'modlogs' | 'requests'
  >('users');
  const [accessDenied, setAccessDenied] = useState(false);
  const [modLogs, setModLogs] = useState<EnrichedModLog[]>([]);
  const [logsFetched, setLogsFetched] = useState(false);

  // === NEW: RANK SYSTEM ===
  const getUserRank = (email?: string | null, isVerified?: boolean): number => {
    if (!email) return 6;
    if (SPECIAL_FRESHMAN_EMAILS.includes(email)) return 1;
    if (ACAPOCO_SPECIAL_EMAILS.includes(email)) return 2;
    if (SENIOR_DEV_EMAILS.includes(email)) return 3;
    if (DEV_EMAILS.includes(email)) return 4;
    if (isVerified) return 5;
    return 6;
  };

  const currentUserRank = getUserRank(session?.user?.email, true);

  // Keep grouped dev areas open to rank 1, 3, 4
  const isDeveloper =
    currentUserRank === 1 ||
    currentUserRank === 2 ||
    currentUserRank === 3 ||
    currentUserRank === 4; // Acapoco Special has full dev perms

  // Accounts that can NEVER be grantned admin status
  const NEVER_ADMIN_EMAILS = ['placeholder@croomsconnect.local'];

  // === GLOBAL SETTINGS STATE ===
  const [chatLocked, setChatLocked] = useState(false);
  const [trustedOnly, setTrustedOnly] = useState(false);
  const [allowSignup, setAllowSignup] = useState(true);
  const [rateLimit, setRateLimit] = useState(6);
  const [weatherTest, setWeatherTest] = useState(false);
  const [weatherTestMsg, setWeatherTestMsg] = useState('');

  // === CHAT FREEZE STATE ===
  const [chatFreezeActive, setChatFreezeActive] = useState(false);
  const [chatFreezeEndTime, setChatFreezeEndTime] = useState<Date | null>(null);
  const [chatFreezeDuration, setChatFreezeDuration] = useState(5);
  const [chatFreezeReason, setChatFreezeReason] = useState('');

  // === USER MANAGEMENT STATE ===
  const [users, setUsers] = useState<ExtendedProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showTrustedOnly, setShowTrustedOnly] = useState(false);
  const [isFetchingUsers, setIsFetchingUsers] = useState(false);

  // Pagination & Sorting State
  const [sortBy, setSortBy] = useState<string>('username');
  const [sortDesc, setSortDesc] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [hasMoreUsers, setHasMoreUsers] = useState(true);
  const PAGE_SIZE = 50;

  // === ACTION MODAL STATE ===
  const [selectedUser, setSelectedUser] = useState<ExtendedProfile | null>(
    null,
  );
  const [modalAction, setModalAction] = useState<ModLog['action'] | null>(null);
  const [actionValue, setActionValue] = useState('');
  const [adminMessage, setAdminMessage] = useState('');
  const [timeoutUnit, setTimeoutUnit] = useState('minutes');
  const [saving, setSaving] = useState(false);

  // === DEVELOPER AUTH MODAL STATE ===
  const [devAuthModal, setDevAuthModal] = useState(false);
  const [devPassword, setDevPassword] = useState('');
  const [pendingAction, setPendingAction] = useState<ModLog['action'] | null>(
    null,
  );
  const [pendingUser, setPendingUser] = useState<ExtendedProfile | null>(null);
  const [devAuthLoading, setDevAuthLoading] = useState(false);

  // === SCHEDULE STATE ===
  const [schedules, setSchedules] = useState<BellSchedule>([]);
  const [schedulesFetched, setSchedulesFetched] = useState(false);

  // === PASSWORD RESET REQUESTS STATE (NEW) ===
  const [resetRequests, setResetRequests] = useState<
    ExtendedPasswordResetRequest[]
  >([]);
  const [requestsFetched, setRequestsFetched] = useState(false);

  // === FEEDBACK STATE ===
  const [msg, setMsg] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);

  // === INITIALIZATION ===
  useEffect(() => {
    const checkAdmin = async (): Promise<void> => {
      // === HARDCODE BAN CHECK ===
      // FIXED: Use session?.user?.email instead of user.email
      // FIXED: Use setLoading instead of setIsLoading
      if (session?.user?.email && BANNED_EMAILS.includes(session.user.email)) {
        setAccessDenied(true);
        setLoading(false);
        return;
      }

      if (!session?.user) {
        navigate('/auth');
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('is_verified')
        .eq('id', session.user.id)
        .single();

      const isHardcodedAdmin = getUserRank(session.user.email, false) <= 4;

      if (!isHardcodedAdmin && (error || !profile?.is_verified)) {
        setAccessDenied(true);
        setLoading(false);
        return;
      }

      await fetchSystemSettings();
      setLoading(false);
    };

    checkAdmin();
  }, [session?.user, session?.user?.id, navigate]);

  if (session.user.email === undefined) throw new Error('User email required');

  const fetchSystemSettings = async (): Promise<void> => {
    const { data } = await supabase.from('system_settings').select('*');
    if (data) {
      data.forEach((setting) => {
        if (setting.key === 'chat_locked')
          setChatLocked(setting.value === 'true');
        if (setting.key === 'trusted_only')
          setTrustedOnly(setting.value === 'true');
        if (setting.key === 'allow_signup')
          setAllowSignup(setting.value !== 'false');
        if (setting.key === 'chat_rate_limit')
          setRateLimit(parseInt(setting.value) || 6);
        if (setting.key === 'weather_alert_test')
          setWeatherTest(setting.value === 'true');
        if (setting.key === 'weather_alert_test_message')
          setWeatherTestMsg(setting.value);
        if (setting.key === 'chat_freeze_active')
          setChatFreezeActive(setting.value === 'true');
        if (setting.key === 'chat_freeze_end')
          setChatFreezeEndTime(setting.value ? new Date(setting.value) : null);
      });
    }
  };

  //Chat Freeze
  const triggerChatFreeze = async (): Promise<void> => {
    if (chatFreezeActive) {
      // Unfreeze chat
      try {
        await supabase.from('system_settings').upsert([
          { key: 'chat_freeze_active', value: 'false' },
          { key: 'chat_freeze_end', value: '' },
        ]);
        setChatFreezeActive(false);
        setChatFreezeEndTime(null);

        await supabase.from('mod_logs').insert([
          {
            admin_id: session.user.id,
            action: 'chat_unfreeze' as unknown as ModLog['action'],
            details: 'Chat unfrozen',
          },
        ]);

        showMsg('Chat unfrozen!');
      } catch {
        showMsg('Failed to unfreeze chat', 'error');
      }
      return;
    }

    // Freeze chat
    const durationMinutes = chatFreezeDuration;
    if (isNaN(durationMinutes) || durationMinutes <= 0) {
      showMsg('Enter valid duration', 'error');
      return;
    }

    const endTime = new Date(
      Date.now() + durationMinutes * 60000,
    ).toISOString();

    try {
      await supabase.from('system_settings').upsert([
        { key: 'chat_freeze_active', value: 'true' },
        { key: 'chat_freeze_end', value: endTime },
        {
          key: 'chat_freeze_reason',
          value: chatFreezeReason || 'Admin freeze',
        },
      ]);

      setChatFreezeActive(true);
      setChatFreezeEndTime(new Date(endTime));

      await supabase.from('mod_logs').insert([
        {
          admin_id: session.user.id,
          action: 'chat_freeze' as unknown as ModLog['action'],
          details: `Froze chat for ${durationMinutes} minutes: ${chatFreezeReason || 'No reason'}`,
        },
      ]);

      showMsg(`Chat frozen for ${durationMinutes} minutes!`);
    } catch {
      showMsg('Failed to freeze chat', 'error');
    }
  };

  // === SERVER-SIDE USERS SEARCH & PAGINATION ===
  const loadUsers = useCallback(
    async (isLoadMore = false, explicitPageIndex?: number) => {
      setIsFetchingUsers(true);
      let req = supabase.from('profiles').select('*');

      if (searchQuery)
        req = req.or(
          `username.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,verified_student_id.ilike.%${searchQuery}%`,
        );
      if (showTrustedOnly) req = req.eq('croomie', true);

      req = req.order(sortBy, { ascending: !sortDesc });

      // Use explicit page index if provided (for load more), otherwise use state
      const currentPageIndex = explicitPageIndex ?? pageIndex;
      const from = isLoadMore ? currentPageIndex * PAGE_SIZE : 0;
      const to = from + PAGE_SIZE - 1;
      req = req.range(from, to);

      const { data, error } = await req;

      if (data) {
        if (isLoadMore) {
          setUsers((prev) => [...prev, ...data] as ExtendedProfile[]);
          setPageIndex(currentPageIndex + 1);
        } else {
          setUsers(data as ExtendedProfile[]);
          setPageIndex(1);
        }
        setHasMoreUsers(data.length === PAGE_SIZE);
      }
      if (error) console.error('Error fetching users:', error);

      setIsFetchingUsers(false);
    },
    // Remove pageIndex from deps to avoid stale closure - pass explicitly instead
    [searchQuery, showTrustedOnly, sortBy, sortDesc],
  );

  useEffect(() => {
    if (loading || accessDenied) return;
    if (view === 'users') {
      const timer = setTimeout(() => {
        loadUsers(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [
    searchQuery,
    showTrustedOnly,
    sortBy,
    sortDesc,
    view,
    accessDenied,
    loadUsers,
    loading,
  ]);

  useEffect(() => {
    if (loading || accessDenied) return;
    if (view === 'schedules' && !schedulesFetched) fetchSchedules();
    else if (view === 'modlogs' && !logsFetched) fetchModLogs();
    else if (view === 'requests' && !requestsFetched) fetchResetRequests();
  }, [
    view,
    loading,
    accessDenied,
    schedulesFetched,
    logsFetched,
    requestsFetched,
  ]);

  // Check chat freeze status periodically
  useEffect(() => {
    if (!chatFreezeActive || !chatFreezeEndTime) return;

    const checkFreeze = (): void => {
      if (new Date() > chatFreezeEndTime) {
        setChatFreezeActive(false);
        setChatFreezeEndTime(null);
      }
    };

    const interval = setInterval(checkFreeze, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [chatFreezeActive, chatFreezeEndTime]);

  const fetchSchedules = async (): Promise<void> => {
    const { data } = await supabase
      .from('schedules')
      .select('*')
      .order('period_name');
    if (data) {
      setSchedules(data);
      setSchedulesFetched(true);
    }
  };

  const fetchModLogs = async (): Promise<void> => {
    const { data } = await supabase
      .from('mod_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (data) {
      const userIds = new Set<string>();
      data.forEach((log) => {
        if (log.admin_id) userIds.add(log.admin_id);
        if (log.target_user_id) userIds.add(log.target_user_id);
      });

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', Array.from(userIds));
      if (!profiles) throw new Error("Couldn't fetch profiles");
      const profileMap = new Map(profiles.map((p) => [p.id, p.username]));

      const enrichedLogs = data.map((log) => ({
        ...log,
        admin_username:
          (log.admin_id && profileMap.get(log.admin_id)) || 'Unknown',
        target_username:
          (log.target_user_id && profileMap.get(log.target_user_id)) ||
          'Unknown',
      }));

      setModLogs(enrichedLogs);
      setLogsFetched(true);
    }
  };

  // === NEW: FETCH RESET REQUESTS ===
  const fetchResetRequests = async (): Promise<void> => {
    const { data, error } = await supabase
      .from('password_reset_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (data && !error) {
      setResetRequests(data as ExtendedPasswordResetRequest[]);
      setRequestsFetched(true);
    }
  };

  // === NEW: APPROVE PASSWORD RESET ===
  const handleApproveReset = async (
    requestId: string,
    targetUserId: string,
  ): Promise<void> => {
    try {
      const tempPass = generateStrongTemporaryPassword();
      const { error: rpcError } = await supabase.rpc('admin_reset_password', {
        target_user_id: targetUserId,
        temp_password: tempPass,
      });
      if (rpcError) throw rpcError;

      await supabase
        .from('profiles')
        .update({ force_password_reset: true })
        .eq('id', targetUserId);

      await supabase
        .from('password_reset_requests')
        .update({ status: 'approved' })
        .eq('id', requestId);

      await supabase.from('mod_logs').insert([
        {
          admin_id: session.user.id,
          action: 'approve_reset' as unknown as ModLog['action'],
          target_user_id: targetUserId,
          details: 'Approved password reset request.',
        },
      ]);

      showMsg(`Password reset approved. Temporary password: ${tempPass}`);
      // Show the temp password in a reliable way (toast + alert + copy)
      showMsg(`Temporary password generated (copy it): ${tempPass}`);
      window.alert(
        `Temporary password for request ${requestId}:\n\n${tempPass}`,
      );
      try {
        void navigator.clipboard?.writeText(tempPass);
      } catch {
        /* ignore clipboard errors */
      }
      setResetRequests((prev) => prev.filter((req) => req.id !== requestId));
    } catch (err) {
      showMsg(
        'Failed to approve request: ' +
          (err instanceof Error ? err.message : 'unkown'),
        'error',
      );
    }
  };

  // === NEW: REJECT PASSWORD RESET ===
  const handleRejectReset = async (requestId: string): Promise<void> => {
    try {
      await supabase
        .from('password_reset_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);
      showMsg('Password reset request rejected.');
      setResetRequests((prev) => prev.filter((req) => req.id !== requestId));
    } catch (err) {
      showMsg(
        'Failed to reject request: ' +
          (err instanceof Error ? err.message : 'unknown'),
        'error',
      );
    }
  };

  // === ACTIONS ===
  const showMsg = (
    text: string,
    type: 'success' | 'error' = 'success',
  ): void => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 3000);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateSetting = async (key: string, value: any): Promise<void> => {
    try {
      const strValue = String(value);
      const { error } = await supabase
        .from('system_settings')
        .upsert({ key, value: strValue }, { onConflict: 'key' });
      if (error) throw error;

      if (key === 'chat_locked') setChatLocked(value);
      if (key === 'trusted_only') setTrustedOnly(value);
      if (key === 'allow_signup') setAllowSignup(value);
      if (key === 'chat_rate_limit') setRateLimit(value);
      if (key === 'weather_alert_test') setWeatherTest(value);
      if (key === 'weather_alert_test_message') setWeatherTestMsg(value);

      await supabase.from('mod_logs').insert([
        {
          admin_id: session.user.id,
          action: 'update_setting',
          target_user_id: null,
          details: `Updated ${key} to ${strValue}`,
        },
      ]);

      showMsg('Setting updated');
    } catch {
      showMsg('Failed to update setting', 'error');
    }
  };

  const triggerJumpscare = async (): Promise<void> => {
    if (
      !window.confirm(
        'Trigger global jumpscare? Make sure FoxyScare.js is active. Note that this will be quite loud, so dont forget to mute your sound!',
      )
    )
      return;

    const channel = supabase.channel('public:room1');

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.send({
          type: 'broadcast',
          event: 'jumpscare',
          payload: { time: Date.now() },
        });

        await supabase.from('mod_logs').insert([
          {
            admin_id: session.user.id,
            action: 'update_setting',
            details: 'Triggered global jumpscare',
          },
        ]);

        setTimeout(() => {
          supabase.removeChannel(channel);
        }, 1000);
        showMsg('Jumpscare Broadcast Sent!', 'success');
      } else if (status === 'CHANNEL_ERROR') {
        showMsg('Failed to connect to broadcast channel', 'error');
      }
    });
  };

  const triggerGlobalRefresh = async (): Promise<void> => {
    if (
      !window.confirm(
        '⚠️ DANGER: Please note that this will immediately reload the page for EVERY user currently on the site (including you).\n\nAre you sure you want to force a global refresh?',
      )
    )
      return;

    setSaving(true);
    const channel = supabase.channel('public:room1');

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Channel subscription timeout'));
      }, 5000);

      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          clearTimeout(timeout);
          try {
            // Log the action immediately
            await supabase.from('mod_logs').insert([
              {
                admin_id: session.user.id,
                action: 'global_refresh',
                target_user_id: null,
                details: 'Triggered global refresh for all users',
              },
            ]);

            // Send the broadcast
            const broadcastStatus = await channel.send({
              type: 'broadcast',
              event: 'force_refresh',
              payload: { time: Date.now() },
            });

            if (broadcastStatus === 'ok') {
              showMsg('Global refresh signal sent to all users!', 'success');
              resolve();
            } else reject(new Error('Broadcast send failed'));
          } catch (err) {
            reject(err);
          }
        } else if (status === 'CHANNEL_ERROR') {
          clearTimeout(timeout);
          reject(new Error('Channel subscription error'));
        }
      });
    })
      .then(() =>
        // Wait a bit to ensure broadcast propagates before reloading
        setTimeout(window.location.reload, 2000),
      )
      .catch((err) =>
        showMsg('Failed to trigger global refresh: ' + err.message, 'error'),
      )
      .finally(() => {
        supabase.removeChannel(channel);
        setSaving(false);
      });
  };
  const handleTrustUserPrompt = async (
    user: ExtendedProfile,
  ): Promise<void> => {
    const defaultName = user.username;
    const userInput = window.prompt(
      `Assign a Verified Display Name for ${user.username}:\n(Leave blank to just use their username)`,
      defaultName,
    );

    if (userInput === null) return;

    const finalVerifiedName =
      userInput.trim() === '' ? defaultName : userInput.trim();

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          croomie: true,
          verified_name: finalVerifiedName,
        })
        .eq('id', user.id);

      if (error) throw error;

      setUsers(
        users.map((u) =>
          u.id === user.id
            ? { ...u, croomie: true, verified_name: finalVerifiedName }
            : u,
        ),
      );
      showMsg(`Successfully marked ${user.username} as Trusted!`);

      await supabase.from('mod_logs').insert([
        {
          admin_id: session.user.id,
          action: 'croomie',
          target_user_id: user.id,
          details: `Marked ${user.username} as Trusted. Verified Name set to: ${finalVerifiedName}`,
        },
      ]);

      if (logsFetched) await fetchModLogs();
    } catch (err) {
      showMsg(
        'Failed to trust user: ' +
          (err instanceof Error ? err.message : 'unknown'),
        'error',
      );
    }
  };

  const handleDevAuth: SubmitEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    if (!pendingAction || !pendingUser) return;
    setDevAuthLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: session.user.email!,
        password: devPassword,
      });
      if (error) {
        showMsg('Authentication failed. Incorrect password.', 'error');
        setDevAuthLoading(false);
        return;
      }

      setDevAuthModal(false);
      setDevPassword('');
      setModalAction(pendingAction);
      setSelectedUser(pendingUser);
      setPendingAction(null);
      setPendingUser(null);
      await executeAction();
    } catch (err) {
      showMsg(
        'Authentication error: ' +
          (err instanceof Error ? err.message : 'unknown'),
        'error',
      );
    } finally {
      setDevAuthLoading(false);
    }
  };

  const executeAction = async (): Promise<void> => {
    if (!selectedUser) {
      showMsg('Action failed: no user selection', 'error');
      return;
    }

    const targetUserRank = getUserRank(
      selectedUser?.email,
      selectedUser?.is_verified,
    );

    // Hierarchy Permissions Logic
    if (currentUserRank !== 1 && currentUserRank !== 2) {
      const isSeniorDevResettingOwner =
        currentUserRank === 3 &&
        targetUserRank === 1 &&
        modalAction === 'reset_password';

      if (targetUserRank <= currentUserRank && !isSeniorDevResettingOwner) {
        showMsg(
          'Action denied: Cannot modify users of equal or higher tier.',
          'error',
        );
        setModalAction(null);
        setSelectedUser(null);
        return;
      }
    }

    const isBlacklistedAdmin =
      selectedUser?.email && NEVER_ADMIN_EMAILS.includes(selectedUser.email);

    if (isBlacklistedAdmin && modalAction === 'verify') {
      showMsg(
        'Action denied: This account is permanently restricted from receiving admin privileges.',
        'error',
      );
      setModalAction(null);
      setSelectedUser(null);
      return;
    }

    setSaving(true);

    try {
      let updates = {};
      let logMessage = '';

      if (modalAction === 'reset_password') {
        const tempPass = generateStrongTemporaryPassword();
        // Always show the generated password on success paths so the admin can copy it.
        // Note: This runs in the UI thread; if popups are blocked, the toast still displays.
        try {
          showMsg(`Temporary password generated: ${tempPass}`);
          window.alert(`Temporary password for ${selectedUser.username}:

${tempPass}`);
          try {
            void navigator.clipboard?.writeText(tempPass);
          } catch {
            /* ignore clipboard errors */
          }
        } catch {
          /* ignore UI errors */
        }
        const { error } = await supabase.rpc('admin_reset_password', {
          target_user_id: selectedUser.id,
          temp_password: tempPass,
        });
        if (error) throw error;

        await supabase
          .from('profiles')
          .update({ force_password_reset: true })
          .eq('id', selectedUser.id);
        setUsers(
          users.map((u) =>
            u.id === selectedUser.id ? { ...u, force_password_reset: true } : u,
          ),
        );
        logMessage = `Reset password for ${selectedUser.username}.`;
      } else if (modalAction === 'delete_user') {
        // Note: Direct DELETE is blocked by RLS (silently does nothing).
        // Workaround: Use UPDATE to mark user as banned + is_verified=false + croomie=false
        // This effectively removes the user from the system without needing delete permissions.
        try {
          console.log('Soft-deleting user (via UPDATE):', selectedUser.id);

          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              is_banned: true,
              ban_reason: 'Permanently deleted by admin',
              is_verified: false,
              croomie: false,
              verified_student_id: null,
              verified_name: null,
              full_name: null,
            })
            .eq('id', selectedUser.id);

          if (updateError) {
            console.error('Soft delete error:', updateError);
            throw new Error(`Delete failed: ${updateError.message}`);
          }

          console.log('User soft-deleted successfully');

          // Remove from local list
          setUsers(users.filter((u) => u.id !== selectedUser.id));
          logMessage = `Permanently deleted user ${selectedUser.username}. (Account disabled)`;
        } catch (deleteErr) {
          console.error('User deletion error:', deleteErr);
          throw deleteErr;
        }
      } else if (modalAction === 'remove_verification') {
        updates = {
          verified_student_id: null,
          verified_name: null,
          full_name: null,
          croomie: false,
          is_verified: false,
        };
        const { error } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', selectedUser.id);
        if (error) throw error;
        setUsers(
          users.map((u) =>
            u.id === selectedUser.id ? { ...u, ...updates } : u,
          ),
        );
        logMessage = `Stripped all verification data and trusted status from ${selectedUser.username}.`;
      } else {
        switch (modalAction) {
          case 'verify':
            updates = { is_verified: true };
            logMessage = `Granted admin privileges to ${selectedUser.username}`;
            break;
          case 'unverify':
            updates = { is_verified: false };
            logMessage = `Revoked admin privileges from ${selectedUser.username}`;
            break;
          case 'uncroomie':
            updates = { croomie: false };
            logMessage = `Removed Trusted status from ${selectedUser.username}`;
            break;
          case 'ban':
            updates = { is_banned: true, ban_reason: adminMessage };
            logMessage = `Banned ${selectedUser.username}`;
            break;
          case 'unban':
            updates = { is_banned: false, ban_reason: null };
            logMessage = `Unbanned ${selectedUser.username}`;
            break;
          case 'timeout': {
            const minutes = parseInt(actionValue);
            if (isNaN(minutes)) return;
            const multiplier =
              timeoutUnit === 'hours' ? 60 : timeoutUnit === 'days' ? 1440 : 1;
            const totalMinutes = minutes * multiplier;
            const timeoutDate = new Date(
              Date.now() + totalMinutes * 60000,
            ).toISOString();
            updates = {
              chat_timeout_until: timeoutDate,
              ban_reason: adminMessage,
            };
            logMessage = `Timed out ${selectedUser.username} for ${minutes} ${timeoutUnit}${minutes !== 1 ? 's' : ''}`;
            break;
          }

          case 'remove_timeout':
            updates = { chat_timeout_until: null, ban_reason: null };
            logMessage = `Removed timeout for ${selectedUser.username}`;
            break;
          case 'warn':
            await supabase.from('user_warnings').insert([
              {
                user_id: selectedUser.id,
                message: actionValue,
                created_by: session.user.id,
              },
            ]);
            logMessage = `Warned ${selectedUser.username}`;
            break;
          default:
            break;
        }

        if (modalAction !== 'warn') {
          const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', selectedUser.id);
          if (error) throw error;
        }
        setUsers(
          users.map((u) =>
            u.id === selectedUser.id ? { ...u, ...updates } : u,
          ),
        );
      }

      await supabase.from('mod_logs').insert([
        {
          admin_id: session.user.id,
          action: modalAction,
          target_user_id: selectedUser.id,
          details:
            modalAction === 'timeout'
              ? logMessage // Use logMessage for timeout (includes duration)
              : modalAction === 'reset_password' ||
                  modalAction === 'delete_user' ||
                  modalAction === 'remove_verification'
                ? logMessage
                : adminMessage || actionValue || '',
        },
      ]);

      showMsg(logMessage);
      if (logsFetched) await fetchModLogs();

      setModalAction(null);
      setSelectedUser(null);
      setAdminMessage('');
      setActionValue('');
    } catch (err) {
      showMsg(
        'Action failed: ' + (err instanceof Error ? err.message : 'unknown'),
        'error',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLog = async (logId: string): Promise<void> => {
    if (!window.confirm('Are you sure you want to delete this log entry?'))
      return;
    try {
      await supabase.from('mod_logs').delete().eq('id', logId);
      setModLogs((prev) => prev.filter((log) => log.id !== logId));
      showMsg('Log entry deleted successfully.');
    } catch (err) {
      showMsg(
        'Failed to delete log: ' +
          (err instanceof Error ? err.message : 'unknown'),
        'error',
      );
    }
  };

  const renderLogDetails = (log: ModLog): ReactElement => {
    if (log.action === 'message_edit' || log.action === 'message_delete') {
      try {
        const parsed = JSON.parse(log.details);
        if (log.action === 'message_edit') {
          return (
            <div className='space-y-2 mt-1'>
              <div className='bg-red-950/20 p-2 rounded border border-red-900/40 text-slate-300'>
                <span className='text-[10px] font-bold text-red-400 uppercase mb-1 block'>
                  Original:
                </span>
                <div
                  className='[&_img]:max-h-24 [&_video]:max-h-24 [&_img]:rounded [&_video]:rounded overflow-hidden'
                  dangerouslySetInnerHTML={{ __html: parsed.old }}
                />
              </div>
              <div className='bg-green-950/20 p-2 rounded border border-green-900/40 text-slate-300'>
                <span className='text-[10px] font-bold text-green-400 uppercase mb-1 block'>
                  Edited To:
                </span>
                <div
                  className='[&_img]:max-h-24 [&_video]:max-h-24 [&_img]:rounded [&_video]:rounded overflow-hidden'
                  dangerouslySetInnerHTML={{ __html: parsed.new }}
                />
              </div>
            </div>
          );
        } else {
          return (
            <div className='bg-slate-950 p-2 rounded border border-slate-800 text-slate-300 mt-1'>
              <span className='text-[10px] font-bold text-slate-500 uppercase mb-1 block'>
                Deleted Content:
              </span>
              <div
                className='[&_img]:max-h-24 [&_video]:max-h-24 [&_img]:rounded [&_video]:rounded overflow-hidden'
                dangerouslySetInnerHTML={{ __html: parsed.content }}
              />
            </div>
          );
        }
      } catch {
        /* Fallback */
      }
    }
    return (
      <div className='truncate max-w-sm' title={log.details}>
        {log.details || 'No details'}
      </div>
    );
  };

  if (accessDenied) {
    return (
      <div className='flex items-center justify-center h-screen bg-slate-950 text-red-500'>
        <div className='text-center'>
          <i className='fa-solid fa-lock text-6xl mb-4'></i>
          <h1 className='text-3xl font-bold'>Access Denied</h1>
          <p className='text-slate-400 mt-2'>
            You must be a verified admin to view this page.
          </p>
          <button
            onClick={() => navigate('/')}
            className='mt-6 px-6 py-2 bg-slate-800 text-white rounded hover:bg-slate-700'
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (loading)
    return (
      <div className='p-10 text-white text-center bg-slate-950 min-h-screen pt-20'>
        Loading Admin Panel...
      </div>
    );

  return (
    <div className='min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30'>
      {/* HEADER */}
      <header className='bg-slate-900 border-b border-slate-800 sticky top-0 z-50 backdrop-blur-md bg-opacity-80'>
        <div className='max-w-7xl mx-auto px-6 py-4 flex justify-between items-center'>
          <div className='flex items-center gap-4'>
            <button
              onClick={() => navigate('/')}
              className='text-slate-400 hover:text-white transition-colors'
            >
              <i className='fa-solid fa-arrow-left'></i>
            </button>
            <h1 className='text-xl font-bold text-white flex items-center gap-2'>
              <span className='bg-blue-600 text-white w-8 h-8 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/50'>
                <i className='fa-solid fa-shield-halved text-sm'></i>
              </span>
              Admin Console
            </h1>
          </div>

          <div className='flex items-center gap-3'>
            <div className='flex gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800'>
              <button
                onClick={() => setView('users')}
                className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${view === 'users' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Users
              </button>
              <button
                onClick={() => setView('schedules')}
                className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${view === 'schedules' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Schedules
              </button>

              {/* === NEW: RESET REQUESTS BUTTON === */}
              <button
                onClick={() => setView('requests')}
                className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${view === 'requests' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Reset Requests
              </button>

              <button
                onClick={() => setView('modlogs')}
                className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${view === 'modlogs' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Mod Logs
              </button>
            </div>
            <button
              onClick={() => navigate('/DMMod')}
              className='px-4 py-1.5 rounded-md text-sm font-bold transition-all bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-900/20 flex items-center gap-2 border border-indigo-500 active:scale-95'
            >
              <i className='fa-solid fa-envelope-open-text'></i> DM Mod
            </button>
          </div>
        </div>
      </header>

      {/* TOAST */}
      {msg && (
        <div
          className={`fixed bottom-6 right-6 px-6 py-3 rounded-xl shadow-2xl border animate-in slide-in-from-bottom-5 z-[100] flex items-center gap-3 ${msg.type === 'error' ? 'bg-red-950/90 border-red-900 text-red-200' : 'bg-slate-800/90 border-slate-700 text-emerald-400'}`}
        >
          <i
            className={`fa-solid ${msg.type === 'error' ? 'fa-triangle-exclamation' : 'fa-circle-check'}`}
          ></i>
          {msg.text}
        </div>
      )}

      <main className='max-w-7xl mx-auto px-6 py-8'>
        {/* === GLOBAL CONTROLS SECTION === */}
        <section className='mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
          {/* === VERIFIED ARTIST GRANT (admin UI tool) === */}
          {isDeveloper && (
            <div className='p-5 rounded-xl border border-emerald-900/40 bg-emerald-950/20 flex flex-col gap-3 transition-all hover:border-emerald-700'>
              <div className='flex items-center gap-2'>
                <i className='fa-solid fa-star text-emerald-400'></i>
                <h3 className='font-bold text-emerald-200'>
                  Give User Verified Artist
                </h3>
              </div>
              <p className='text-xs text-slate-300'>
                Enter the username, then click the button.
              </p>
              <div className='flex flex-col gap-2'>
                <input
                  type='text'
                  value={actionValue}
                  onChange={(e) => setActionValue(e.target.value)}
                  placeholder='username'
                  className='w-full bg-slate-950/50 border border-slate-700/50 text-white text-xs px-3 py-2 rounded focus:border-emerald-500 focus:outline-none transition-colors placeholder-slate-600'
                />

                <button
                  onClick={async () => {
                    const targetUsername = actionValue.trim();
                    if (!targetUsername) {
                      showMsg('Enter a username first.', 'error');
                      return;
                    }

                    // Only allow Senior Dev emails + Special Freshmen emails to grant Verified Artist.
                    const email = session?.user?.email || '';
                    const isAllowedGrant =
                      SPECIAL_FRESHMAN_EMAILS.includes(email) ||
                      SENIOR_DEV_EMAILS.includes(email);

                    if (!isAllowedGrant) {
                      showMsg(
                        'Denied: Only Senior Dev + Special Freshmen can grant Verified Artist.',
                        'error',
                      );
                      return;
                    }

                    try {
                      setSaving(true);
                      // Fetch current selected_badge so we can safely append the badge.
                      const { data: profile } = await supabase
                        .from('profiles')
                        .select('selected_badge, username, id')
                        .eq('username', targetUsername)
                        .single();

                      if (!profile) {
                        showMsg('User not found.', 'error');
                        return;
                      }

                      const badgeId = 'approved_artist';
                      const raw = profile.selected_badge as unknown;

                      let selectedBadges: string[] = [];
                      if (Array.isArray(raw)) selectedBadges = raw.map(String);
                      else if (typeof raw === 'string') {
                        const cleaned = raw.trim();
                        if (cleaned.startsWith('[')) {
                          try {
                            selectedBadges = JSON.parse(cleaned).map(String);
                          } catch {
                            selectedBadges = [];
                          }
                        } else if (cleaned.length) {
                          selectedBadges = [cleaned];
                        }
                      }

                      if (
                        !selectedBadges.includes(badgeId) &&
                        !selectedBadges.includes(`disabled_${badgeId}`)
                      ) {
                        const next = [...selectedBadges, badgeId];
                        const { error } = await supabase
                          .from('profiles')
                          .update({ selected_badge: next })
                          .eq('id', profile.id);
                        if (error) throw error;
                      }

                      await fetchSystemSettings();
                      showMsg('Verified Artist badge granted!', 'success');
                      setActionValue('');
                    } catch (err) {
                      showMsg(
                        'Failed to grant Verified Artist: ' +
                          (err instanceof Error ? err.message : 'unknown'),
                        'error',
                      );
                    } finally {
                      setSaving(false);
                    }
                  }}
                  disabled={saving}
                  className='px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-sm transition-colors disabled:opacity-50'
                >
                  <i className='fa-solid fa-user-check mr-2'></i>
                  Give User Verified Artist
                </button>
              </div>
            </div>
          )}

          <div
            className={`p-5 rounded-xl border flex items-center justify-between transition-all relative overflow-hidden group ${chatLocked ? 'bg-red-950/30 border-red-900/50' : 'bg-slate-900 border-slate-800'}`}
          >
            <div className='relative z-10'>
              <h3
                className={`font-bold ${chatLocked ? 'text-red-400' : 'text-white'}`}
              >
                <i className='fa-solid fa-lock mr-2'></i>Lock Chat
              </h3>
              <p className='text-xs text-slate-500 mt-1'>Prevent non-admins.</p>
            </div>
            <label className='relative inline-flex items-center cursor-pointer z-10'>
              <input
                type='checkbox'
                checked={chatLocked}
                onChange={(e) => updateSetting('chat_locked', e.target.checked)}
                className='sr-only peer'
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
            </label>
          </div>

          <div
            className={`p-5 rounded-xl border flex items-center justify-between transition-all relative overflow-hidden group ${trustedOnly ? 'bg-indigo-900/30 border-indigo-900/50' : 'bg-slate-900 border-slate-800'}`}
          >
            <div className='relative z-10'>
              <h3
                className={`font-bold ${trustedOnly ? 'text-indigo-400' : 'text-white'}`}
              >
                <i className='fa-solid fa-shield-heart mr-2'></i>Trusted Only
              </h3>
              <p className='text-xs text-slate-500 mt-1'>
                Only Trusted & Admins.
              </p>
            </div>
            <label className='relative inline-flex items-center cursor-pointer z-10'>
              <input
                type='checkbox'
                checked={trustedOnly}
                onChange={(e) =>
                  updateSetting('trusted_only', e.target.checked)
                }
                className='sr-only peer'
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          <div
            className={`p-5 rounded-xl border flex items-center justify-between transition-all relative overflow-hidden group ${!allowSignup ? 'bg-amber-950/30 border-amber-900/50' : 'bg-slate-900 border-slate-800'}`}
          >
            <div className='relative z-10'>
              <h3
                className={`font-bold ${!allowSignup ? 'text-amber-400' : 'text-white'}`}
              >
                <i className='fa-solid fa-user-plus mr-2'></i>Allow Signups
              </h3>
              <p className='text-xs text-slate-500 mt-1'>Pause new accounts.</p>
            </div>
            <label className='relative inline-flex items-center cursor-pointer z-10'>
              <input
                type='checkbox'
                checked={allowSignup}
                onChange={(e) =>
                  updateSetting('allow_signup', e.target.checked)
                }
                className='sr-only peer'
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
            </label>
          </div>

          <div
            className={`p-5 rounded-xl border flex flex-col gap-4 transition-all relative overflow-hidden group ${weatherTest ? 'bg-orange-900/30 border-orange-900/50' : 'bg-slate-900 border-slate-800'}`}
          >
            <div className='flex justify-between items-center w-full relative z-10'>
              <div>
                <h3
                  className={`font-bold ${weatherTest ? 'text-orange-400' : 'text-white'}`}
                >
                  <i className='fa-solid fa-cloud-bolt mr-2'></i>Weather Test
                </h3>
                <p className='text-xs text-slate-500 mt-1'>
                  Force show banner.
                </p>
              </div>
              <label className='relative inline-flex items-center cursor-pointer'>
                <input
                  type='checkbox'
                  checked={weatherTest}
                  onChange={(e) =>
                    updateSetting('weather_alert_test', e.target.checked)
                  }
                  className='sr-only peer'
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
              </label>
            </div>
            <div className='w-full relative z-10'>
              <input
                type='text'
                placeholder='Custom Test Message...'
                value={weatherTestMsg}
                onChange={(e) => setWeatherTestMsg(e.target.value)}
                onBlur={() =>
                  updateSetting('weather_alert_test_message', weatherTestMsg)
                }
                className='w-full bg-slate-950/50 border border-slate-700/50 text-white text-xs px-3 py-2 rounded focus:border-orange-500 focus:outline-none transition-colors placeholder-slate-600'
              />
            </div>
          </div>

          <div className='p-5 rounded-xl border border-slate-800 bg-slate-900 flex items-center justify-between transition-all hover:border-slate-700'>
            <div>
              <h3 className='font-bold text-white'>
                <i className='fa-solid fa-hourglass-half mr-2 text-blue-500'></i>
                Rate Limit
              </h3>
              <p className='text-xs text-slate-500 mt-1'>Delay (Sec).</p>
            </div>
            <div className='flex items-center gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800'>
              <input
                type='number'
                min='0'
                max='60'
                value={rateLimit}
                onChange={(e) => setRateLimit(parseFloat(e.target.value))}
                onBlur={(e) => updateSetting('chat_rate_limit', e.target.value)}
                className='w-12 bg-transparent text-white text-center font-mono font-bold focus:outline-none'
              />
            </div>
          </div>

          <div
            className={`p-5 rounded-xl border flex flex-col gap-4 transition-all relative overflow-hidden group ${chatFreezeActive ? 'bg-purple-950/30 border-purple-900/50' : 'bg-slate-900 border-slate-800'}`}
          >
            <div className='flex justify-between items-center w-full relative z-10'>
              <div>
                <h3
                  className={`font-bold ${chatFreezeActive ? 'text-purple-400' : 'text-white'}`}
                >
                  <i className='fa-solid fa-pause-circle mr-2'></i>Chat Freeze
                </h3>
                <p className='text-xs text-slate-500 mt-1'>Stop all chat.</p>
              </div>
              <button
                onClick={triggerChatFreeze}
                disabled={saving}
                className={`px-3 py-1 text-xs font-bold rounded border transition-all active:scale-95 ${
                  chatFreezeActive
                    ? 'bg-purple-600 hover:bg-purple-500 text-white border-purple-500 shadow-lg shadow-purple-900/30'
                    : 'bg-slate-950 hover:bg-slate-800 text-slate-500 hover:text-white border-slate-800 hover:border-slate-600'
                }`}
              >
                {chatFreezeActive ? 'Unfreeze' : 'Freeze'}
              </button>
            </div>

            {!chatFreezeActive ? (
              <>
                <div className='w-full relative z-10'>
                  <input
                    type='number'
                    min='1'
                    max='60'
                    value={chatFreezeDuration}
                    onChange={(e) =>
                      setChatFreezeDuration(parseFloat(e.target.value))
                    }
                    placeholder='Minutes'
                    className='w-full bg-slate-950/50 border border-slate-700/50 text-white text-xs px-3 py-2 rounded focus:border-purple-500 focus:outline-none transition-colors placeholder-slate-600'
                  />
                </div>
                <input
                  type='text'
                  placeholder='Reason (optional)'
                  value={chatFreezeReason}
                  onChange={(e) => setChatFreezeReason(e.target.value)}
                  className='w-full bg-slate-950/50 border border-slate-700/50 text-white text-xs px-3 py-2 rounded focus:border-purple-500 focus:outline-none transition-colors placeholder-slate-600'
                />
              </>
            ) : (
              <div className='text-xs text-purple-300 bg-purple-950/50 p-2 rounded border border-purple-900/30'>
                {chatFreezeEndTime
                  ? `Ends: ${chatFreezeEndTime.toLocaleTimeString()}`
                  : 'Active'}
              </div>
            )}
          </div>

          <div className='p-5 rounded-xl border border-slate-800 bg-slate-900 flex flex-col justify-center gap-3 transition-all hover:border-slate-700'>
            <div>
              <h3 className='font-bold text-white'>
                <i className='fa-solid fa-bullhorn mr-2 text-rose-500'></i>
                Global Broadcast
              </h3>
              <p className='text-xs text-slate-500 mt-1'>
                Trigger special events
              </p>
            </div>
            <div className='flex gap-2 w-full'>
              <button
                onClick={triggerJumpscare}
                disabled={saving}
                className='flex-1 py-2 bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 hover:text-rose-300 text-xs font-bold rounded border border-rose-900/50 transition-all'
              >
                Jumpscare
              </button>
              <button
                onClick={triggerGlobalRefresh}
                disabled={saving}
                className='flex-1 py-2 bg-red-950/40 hover:bg-red-900/60 text-red-400 hover:text-red-300 text-xs font-bold rounded border border-red-900/50 transition-all flex items-center justify-center gap-1 group'
              >
                <i className='fa-solid fa-rotate group-active:animate-spin-fast'></i>{' '}
                Force Refresh
              </button>
            </div>
          </div>

          {/* New User Deletion / Hierarchy Area Placeholder */}
          {isDeveloper && (
            <div className='p-5 rounded-xl border border-blue-900/50 bg-blue-950/20 flex flex-col justify-center gap-3 transition-all hover:border-blue-800/60 col-span-1 md:col-span-2 lg:col-span-1'>
              <div>
                <h3 className='font-bold text-blue-400'>
                  <i className='fa-solid fa-code mr-2'></i>Dev Ops
                </h3>
                <p className='text-xs text-slate-500 mt-1'>
                  Elevated permissions unlocked
                </p>
              </div>
              <div className='text-xs text-slate-400 bg-slate-950/50 p-2 rounded border border-slate-800/50 flex items-center gap-2'>
                <i className='fa-solid fa-circle-info text-blue-500'></i> You
                have access to destructive user actions.
              </div>
            </div>
          )}
        </section>

        {/* === MAIN CONTENT AREA === */}
        {view === 'users' && (
          <div className='bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-2xl'>
            <div className='p-6 border-b border-slate-800 flex flex-wrap gap-4 items-center justify-between bg-slate-900/50'>
              <div className='relative flex-1 min-w-[250px]'>
                <i className='fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-500'></i>
                <input
                  type='text'
                  placeholder='Search by username, email, ID...'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className='w-full bg-slate-950 border border-slate-800 text-white pl-10 pr-4 py-2 rounded-lg focus:border-blue-500 focus:outline-none transition-colors'
                />
              </div>

              <div className='flex gap-4 items-center'>
                <label className='flex items-center gap-2 text-sm text-slate-300 cursor-pointer hover:text-white transition-colors'>
                  <input
                    type='checkbox'
                    checked={showTrustedOnly}
                    onChange={(e) => setShowTrustedOnly(e.target.checked)}
                    className='rounded border-slate-700 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-slate-900 bg-slate-950'
                  />
                  Trusted Only
                </label>

                <div className='h-6 w-px bg-slate-700 hidden sm:block'></div>

                <div className='flex items-center gap-2'>
                  <span className='text-sm text-slate-500'>Sort:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className='bg-slate-950 border border-slate-800 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2 outline-none'
                  >
                    <option value='username'>Username</option>
                    <option value='created_at'>Join Date</option>
                    <option value='email'>Email</option>
                  </select>
                  <button
                    onClick={() => setSortDesc(!sortDesc)}
                    className='p-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors'
                    title={sortDesc ? 'Descending' : 'Ascending'}
                  >
                    <i
                      className={`fa-solid fa-arrow-${sortDesc ? 'down' : 'up'}`}
                    ></i>
                  </button>
                </div>
              </div>
            </div>

            <div className='overflow-x-auto'>
              <table className='w-full text-left text-sm text-slate-400'>
                <thead className='text-xs uppercase bg-slate-950 text-slate-500 border-b border-slate-800'>
                  <tr>
                    <th className='px-6 py-4 font-bold'>User</th>
                    <th className='px-6 py-4 font-bold'>Identity</th>
                    <th className='px-6 py-4 font-bold'>Status</th>
                    <th className='px-6 py-4 font-bold text-right'>Actions</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-slate-800/50'>
                  {users.map((user) => {
                    const r = getUserRank(user.email, user.is_verified);
                    const rankLabel =
                      r === 1
                        ? 'Special Freshman'
                        : r === 2
                          ? 'Acapoco Special'
                          : r === 3
                            ? 'Senior Dev'
                            : r === 4
                              ? 'Dev'
                              : r === 5
                                ? 'Admin'
                                : 'User';

                    return (
                      <tr
                        key={user.id}
                        className='hover:bg-slate-800/30 transition-colors group'
                      >
                        <td className='px-6 py-4'>
                          <div className='flex items-center gap-3'>
                            <div className='w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-bold border border-slate-700 shrink-0 overflow-hidden relative'>
                              {user.avatar_url ? (
                                <img
                                  src={user.avatar_url}
                                  alt='avatar'
                                  className='w-full h-full object-cover'
                                />
                              ) : (
                                user.username.charAt(0).toUpperCase()
                              )}
                              {r <= 5 && (
                                <div className='absolute -bottom-1 -right-1 bg-slate-900 rounded-full p-0.5 border border-slate-700'>
                                  <i
                                    className={`fa-solid fa-shield-halved text-[10px] ${r <= 4 ? 'text-blue-500' : 'text-slate-400'}`}
                                  ></i>
                                </div>
                              )}
                            </div>
                            <div>
                              <div className='font-bold text-white flex items-center gap-2'>
                                {user.username}
                                {user.croomie && (
                                  <i
                                    className='fa-solid fa-circle-check text-indigo-400 text-xs'
                                    title='Trusted'
                                  ></i>
                                )}
                                {user.is_verified && (
                                  <span className='px-2 py-0.5 rounded text-[10px] font-bold bg-blue-900/30 text-blue-400 border border-blue-800/50'>
                                    {rankLabel}
                                  </span>
                                )}
                              </div>
                              <div className='text-xs text-slate-500 font-mono mt-0.5'>
                                ID: {user.id.substring(0, 8)}...
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className='px-6 py-4'>
                          <div className='text-slate-300'>{user.email}</div>
                          <div className='text-xs text-slate-500 flex flex-col gap-0.5 mt-1'>
                            {user.full_name && (
                              <span className='flex items-center gap-1'>
                                <i className='fa-solid fa-id-card text-slate-600'></i>{' '}
                                {user.full_name}
                              </span>
                            )}
                            {user.verified_student_id && (
                              <span className='flex items-center gap-1'>
                                <i className='fa-solid fa-hashtag text-slate-600'></i>{' '}
                                {user.verified_student_id}
                              </span>
                            )}
                            {user.verified_name && (
                              <span className='flex items-center gap-1 text-indigo-300'>
                                <i className='fa-solid fa-signature'></i>{' '}
                                {user.verified_name}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className='px-6 py-4'>
                          <div className='flex flex-col gap-2'>
                            {user.is_banned ? (
                              <span className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-red-950/50 text-red-400 border border-red-900/50 w-fit'>
                                <i className='fa-solid fa-ban'></i> Banned
                              </span>
                            ) : user.chat_timeout_until &&
                              new Date(user.chat_timeout_until) > new Date() ? (
                              <span className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-orange-950/50 text-orange-400 border border-orange-900/50 w-fit'>
                                <i className='fa-solid fa-clock'></i> Timed Out
                              </span>
                            ) : (
                              <span className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-950/50 text-emerald-400 border border-emerald-900/50 w-fit'>
                                <i className='fa-solid fa-check'></i> Active
                              </span>
                            )}
                            {user.ban_reason && (
                              <div
                                className='text-[10px] text-slate-500 truncate max-w-[150px]'
                                title={user.ban_reason}
                              >
                                Reason: {user.ban_reason}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className='px-6 py-4 text-right'>
                          <div className='flex items-center justify-end gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity'>
                            {!user.is_verified && (
                              <button
                                onClick={() => {
                                  setSelectedUser(user);
                                  setModalAction('verify');
                                }}
                                className='p-2 text-blue-400 hover:bg-blue-950 hover:text-blue-300 rounded-lg transition-colors border border-transparent hover:border-blue-900'
                                title='Grant Admin'
                              >
                                <i className='fa-solid fa-shield-halved'></i>
                              </button>
                            )}
                            {user.is_verified && (
                              <button
                                onClick={() => {
                                  setSelectedUser(user);
                                  setModalAction('unverify');
                                }}
                                className='p-2 text-slate-400 hover:bg-slate-800 hover:text-white rounded-lg transition-colors border border-transparent hover:border-slate-700'
                                title='Revoke Admin'
                              >
                                <i className='fa-solid fa-shield-slash'></i>
                              </button>
                            )}

                            {!user.croomie ? (
                              <button
                                onClick={() => handleTrustUserPrompt(user)}
                                className='p-2 text-indigo-400 hover:bg-indigo-950 hover:text-indigo-300 rounded-lg transition-colors border border-transparent hover:border-indigo-900'
                                title='Mark as Trusted'
                              >
                                <i className='fa-solid fa-shield-heart'></i>
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setSelectedUser(user);
                                  setModalAction('uncroomie');
                                }}
                                className='p-2 text-slate-400 hover:bg-slate-800 hover:text-white rounded-lg transition-colors border border-transparent hover:border-slate-700'
                                title='Remove Trusted Status'
                              >
                                <i className='fa-solid fa-heart-crack'></i>
                              </button>
                            )}

                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setModalAction('warn');
                              }}
                              className='p-2 text-amber-400 hover:bg-amber-950 hover:text-amber-300 rounded-lg transition-colors border border-transparent hover:border-amber-900'
                              title='Warn User'
                            >
                              <i className='fa-solid fa-triangle-exclamation'></i>
                            </button>

                            {(!user.chat_timeout_until ||
                              new Date(user.chat_timeout_until) <=
                                new Date()) && (
                              <button
                                onClick={() => {
                                  setSelectedUser(user);
                                  setModalAction('timeout');
                                }}
                                className='p-2 text-orange-400 hover:bg-orange-950 hover:text-orange-300 rounded-lg transition-colors border border-transparent hover:border-orange-900'
                                title='Timeout User'
                              >
                                <i className='fa-solid fa-clock'></i>
                              </button>
                            )}
                            {user.chat_timeout_until &&
                              new Date(user.chat_timeout_until) >
                                new Date() && (
                                <button
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setModalAction('remove_timeout');
                                  }}
                                  className='p-2 text-slate-400 hover:bg-slate-800 hover:text-white rounded-lg transition-colors border border-transparent hover:border-slate-700'
                                  title='Remove Timeout'
                                >
                                  <i className='fa-solid fa-clock-rotate-left'></i>
                                </button>
                              )}

                            {!user.is_banned ? (
                              <button
                                onClick={() => {
                                  setSelectedUser(user);
                                  setModalAction('ban');
                                }}
                                className='p-2 text-red-500 hover:bg-red-950 hover:text-red-400 rounded-lg transition-colors border border-transparent hover:border-red-900'
                                title='Ban User'
                              >
                                <i className='fa-solid fa-gavel'></i>
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setSelectedUser(user);
                                  setModalAction('unban');
                                }}
                                className='p-2 text-emerald-500 hover:bg-emerald-950 hover:text-emerald-400 rounded-lg transition-colors border border-transparent hover:border-emerald-900'
                                title='Unban User'
                              >
                                <i className='fa-solid fa-unlock'></i>
                              </button>
                            )}

                            {isDeveloper && (
                              <div className='relative ml-2 pl-2 border-l border-slate-700 flex gap-1'>
                                <button
                                  onClick={() => {
                                    setPendingUser(user);
                                    setPendingAction('reset_password');
                                    setDevAuthModal(true);
                                  }}
                                  className='p-2 text-slate-400 hover:bg-slate-800 hover:text-white rounded-lg transition-colors border border-transparent hover:border-slate-700'
                                  title='DEV: Reset Password'
                                >
                                  <i className='fa-solid fa-key'></i>
                                </button>
                                <button
                                  onClick={() => {
                                    setPendingUser(user);
                                    setPendingAction('remove_verification');
                                    setDevAuthModal(true);
                                  }}
                                  className='p-2 text-yellow-500 hover:bg-yellow-950 hover:text-yellow-400 rounded-lg transition-colors border border-transparent hover:border-yellow-900'
                                  title='DEV: Strip Verification'
                                >
                                  <i className='fa-solid fa-user-slash'></i>
                                </button>
                                <button
                                  onClick={() => {
                                    setPendingUser(user);
                                    setPendingAction('delete_user');
                                    setDevAuthModal(true);
                                  }}
                                  className='p-2 text-red-600 hover:bg-red-950 hover:text-red-400 rounded-lg transition-colors border border-transparent hover:border-red-900'
                                  title='DEV: Permanent Delete User'
                                >
                                  <i className='fa-solid fa-trash'></i>
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {users.length === 0 && !isFetchingUsers && (
                    <tr>
                      <td
                        colSpan={4}
                        className='px-6 py-12 text-center text-slate-500'
                      >
                        <i className='fa-solid fa-users-slash text-4xl mb-3 block opacity-50'></i>
                        No users found matching your criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {hasMoreUsers && users.length > 0 && (
              <div className='p-4 border-t border-slate-800 bg-slate-900/50 flex justify-center'>
                <button
                  onClick={() => loadUsers(true, pageIndex)}
                  disabled={isFetchingUsers}
                  className='px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors text-sm font-bold flex items-center gap-2 disabled:opacity-50'
                >
                  {isFetchingUsers ? (
                    <i className='fa-solid fa-circle-notch fa-spin'></i>
                  ) : (
                    <i className='fa-solid fa-chevron-down'></i>
                  )}
                  Load More Users
                </button>
              </div>
            )}
          </div>
        )}

        {view === 'schedules' && (
          <div className='bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-2xl p-6'>
            <h2 className='text-xl font-bold text-white mb-6 flex items-center gap-2'>
              <i className='fa-solid fa-bell text-yellow-500'></i> Bell
              Schedules Data
            </h2>
            <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
              {schedules.map((s) => (
                <div
                  key={s.id}
                  className='bg-slate-950 p-4 rounded-lg border border-slate-800 flex justify-between items-center'
                >
                  <div>
                    <div className='font-bold text-white'>{s.period_name}</div>
                    <div className='text-xs text-slate-500 mt-1'>
                      Type: {s.schedule_type}
                    </div>
                  </div>
                  <div className='text-right'>
                    <div className='text-emerald-400 font-mono text-sm'>
                      {s.start_time.substring(0, 5)}
                    </div>
                    <div className='text-slate-600 text-[10px] uppercase font-bold my-0.5'>
                      Until
                    </div>
                    <div className='text-rose-400 font-mono text-sm'>
                      {s.end_time.substring(0, 5)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* === NEW: RESET REQUESTS VIEW === */}
        {view === 'requests' && (
          <div className='bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-2xl p-6'>
            <div className='flex justify-between items-center mb-6'>
              <h2 className='text-xl font-bold text-white flex items-center gap-2'>
                <i className='fa-solid fa-key text-emerald-500'></i> Password
                Reset Requests
              </h2>
              <button
                onClick={fetchResetRequests}
                className='px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-sm transition-colors'
              >
                <i className='fa-solid fa-rotate-right'></i> Refresh
              </button>
            </div>

            {resetRequests.length === 0 ? (
              <div className='text-center py-12 text-slate-500 bg-slate-950/50 rounded-lg border border-slate-800/50 block'>
                <i className='fa-solid fa-inbox text-4xl mb-3 opacity-50 block'></i>
                No pending requests.
              </div>
            ) : (
              <div className='overflow-x-auto'>
                <table className='w-full text-left text-sm text-slate-400'>
                  <thead className='text-xs uppercase bg-slate-950 text-slate-500 border-b border-slate-800'>
                    <tr>
                      <th className='px-6 py-4 font-bold'>Date</th>
                      <th className='px-6 py-4 font-bold'>User Email</th>
                      <th className='px-6 py-4 font-bold'>Student ID</th>
                      <th className='px-6 py-4 font-bold text-right'>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-slate-800/50'>
                    {resetRequests.map((req) => (
                      <tr
                        key={req.id}
                        className='hover:bg-slate-800/30 transition-colors'
                      >
                        <td className='px-6 py-4 whitespace-nowrap text-slate-500'>
                          {new Date(req.created_at).toLocaleString()}
                        </td>
                        <td className='px-6 py-4 font-bold text-white'>
                          {req.user_email}
                        </td>
                        <td className='px-6 py-4 font-mono'>
                          {req.student_id}
                        </td>
                        <td className='px-6 py-4 text-right'>
                          <div className='flex items-center justify-end gap-2'>
                            <button
                              onClick={() => handleRejectReset(req.id)}
                              className='px-3 py-1.5 bg-red-950/40 text-red-400 hover:bg-red-900 hover:text-white rounded border border-red-900/50 transition-colors text-xs font-bold'
                            >
                              Reject
                            </button>
                            <button
                              onClick={() =>
                                handleApproveReset(req.id, req.user_id)
                              }
                              className='px-3 py-1.5 bg-emerald-950/40 text-emerald-400 hover:bg-emerald-900 hover:text-white rounded border border-emerald-900/50 transition-colors text-xs font-bold'
                            >
                              Approve
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {view === 'modlogs' && (
          <div className='bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-2xl'>
            <div className='p-6 border-b border-slate-800 flex justify-between items-center'>
              <h2 className='text-xl font-bold text-white flex items-center gap-2'>
                <i className='fa-solid fa-clipboard-list text-indigo-500'></i>{' '}
                Moderator Activity Logs
              </h2>
              <button
                onClick={fetchModLogs}
                className='px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-sm transition-colors'
              >
                <i className='fa-solid fa-rotate-right'></i> Refresh
              </button>
            </div>
            <div className='overflow-x-auto'>
              <table className='w-full text-left text-sm text-slate-400'>
                <thead className='text-xs uppercase bg-slate-950 text-slate-500 border-b border-slate-800'>
                  <tr>
                    <th className='px-6 py-4 font-bold'>Date</th>
                    <th className='px-6 py-4 font-bold'>Admin</th>
                    <th className='px-6 py-4 font-bold'>Action</th>
                    <th className='px-6 py-4 font-bold'>Target User</th>
                    <th className='px-6 py-4 font-bold w-1/3'>Details</th>
                    <th className='px-6 py-4 font-bold'></th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-slate-800/50'>
                  {modLogs.map((log) => (
                    <tr
                      key={log.id}
                      className='hover:bg-slate-800/30 transition-colors group'
                    >
                      <td className='px-6 py-4 whitespace-nowrap text-xs text-slate-500'>
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className='px-6 py-4 font-bold text-white'>
                        {log.admin_username}
                      </td>
                      <td className='px-6 py-4'>
                        <span
                          className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${
                            log.action === 'ban'
                              ? 'bg-red-950/50 text-red-400 border-red-900/50'
                              : log.action === 'timeout'
                                ? 'bg-orange-950/50 text-orange-400 border-orange-900/50'
                                : log.action === 'warn'
                                  ? 'bg-amber-950/50 text-amber-400 border-amber-900/50'
                                  : log.action.includes('un') ||
                                      (log.action as string) ===
                                        'approve_reset' ||
                                      log.action === 'croomie'
                                    ? 'bg-emerald-950/50 text-emerald-400 border-emerald-900/50'
                                    : log.action === 'message_delete'
                                      ? 'bg-rose-950/50 text-rose-400 border-rose-900/50'
                                      : log.action === 'message_edit'
                                        ? 'bg-blue-950/50 text-blue-400 border-blue-900/50'
                                        : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          {log.action.replace('_', ' ')}
                        </span>
                      </td>
                      <td className='px-6 py-4 text-slate-300'>
                        {log.target_username !== 'Unknown' ? (
                          log.target_username
                        ) : (
                          <span className='text-slate-600'>-</span>
                        )}
                      </td>
                      <td className='px-6 py-4 text-sm'>
                        {renderLogDetails(log)}
                      </td>
                      <td className='px-6 py-4 text-right'>
                        <button
                          onClick={() => handleDeleteLog(log.id)}
                          className='text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity'
                          title='Delete Log'
                        >
                          <i className='fa-solid fa-trash-can'></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {modLogs.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className='px-6 py-12 text-center text-slate-500'
                      >
                        No logs found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* === ACTION MODAL === */}
      {modalAction && selectedUser && !pendingAction && (
        <div className='fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in'>
          <div className='bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95'>
            <div
              className={`p-6 border-b border-slate-800 ${
                modalAction === 'ban' || modalAction === 'delete_user'
                  ? 'bg-red-950/20'
                  : modalAction === 'timeout' || modalAction === 'warn'
                    ? 'bg-orange-950/20'
                    : 'bg-blue-950/20'
              }`}
            >
              <h2 className='text-xl font-bold text-white flex items-center gap-3'>
                <i
                  className={`fa-solid ${
                    modalAction === 'ban'
                      ? 'fa-gavel text-red-500'
                      : modalAction === 'timeout'
                        ? 'fa-clock text-orange-500'
                        : modalAction === 'warn'
                          ? 'fa-triangle-exclamation text-amber-500'
                          : modalAction === 'unban' ||
                              modalAction === 'remove_timeout'
                            ? 'fa-unlock text-emerald-500'
                            : 'fa-shield-halved text-blue-500'
                  }`}
                ></i>
                {modalAction === 'verify'
                  ? 'Grant Admin Rights'
                  : modalAction === 'unverify'
                    ? 'Revoke Admin Rights'
                    : modalAction === 'uncroomie'
                      ? 'Remove Trusted Status'
                      : modalAction === 'ban'
                        ? 'Ban User'
                        : modalAction === 'unban'
                          ? 'Unban User'
                          : modalAction === 'timeout'
                            ? 'Timeout User'
                            : modalAction === 'remove_timeout'
                              ? 'Remove Timeout'
                              : modalAction === 'warn'
                                ? 'Warn User'
                                : 'Confirm Action'}
              </h2>
            </div>

            <div className='p-6'>
              <p className='text-slate-300 mb-6'>
                Are you sure you want to perform this action on{' '}
                <strong className='text-white'>{selectedUser.username}</strong>?
              </p>

              {(modalAction === 'ban' || modalAction === 'timeout') && (
                <div className='mb-4 space-y-2'>
                  <label className='block text-xs font-bold text-slate-400 uppercase tracking-wider'>
                    Reason (shown to user)
                  </label>
                  <input
                    type='text'
                    value={adminMessage}
                    onChange={(e) => setAdminMessage(e.target.value)}
                    placeholder='e.g., Spamming in global chat'
                    className='w-full bg-slate-950 border border-slate-700 text-white px-4 py-2 rounded-lg focus:border-blue-500 focus:outline-none transition-colors'
                  />
                </div>
              )}

              {modalAction === 'timeout' && (
                <div className='mb-6 space-y-2'>
                  <label className='block text-xs font-bold text-slate-400 uppercase tracking-wider'>
                    Duration
                  </label>
                  <div className='flex gap-2'>
                    <input
                      type='number'
                      value={actionValue}
                      onChange={(e) => setActionValue(e.target.value)}
                      placeholder='Duration'
                      className='flex-1 bg-slate-950 border border-slate-700 text-white px-4 py-2 rounded-lg focus:border-blue-500 focus:outline-none transition-colors'
                    />
                    <select
                      value={timeoutUnit}
                      onChange={(e) => setTimeoutUnit(e.target.value)}
                      className='bg-slate-950 border border-slate-700 text-white px-4 py-2 rounded-lg focus:border-blue-500 focus:outline-none transition-colors'
                    >
                      <option value='minutes'>Minutes</option>
                      <option value='hours'>Hours</option>
                      <option value='days'>Days</option>
                    </select>
                  </div>
                </div>
              )}

              {modalAction === 'warn' && (
                <div className='mb-6 space-y-2'>
                  <label className='block text-xs font-bold text-slate-400 uppercase tracking-wider'>
                    Warning Message
                  </label>
                  <textarea
                    value={actionValue}
                    onChange={(e) => setActionValue(e.target.value)}
                    placeholder='Enter warning message...'
                    rows={3}
                    className='w-full bg-slate-950 border border-slate-700 text-white px-4 py-2 rounded-lg focus:border-amber-500 focus:outline-none transition-colors resize-none'
                  />
                </div>
              )}

              <div className='flex gap-3 justify-end pt-4 border-t border-slate-800 mt-4'>
                <button
                  onClick={() => {
                    setModalAction(null);
                    setSelectedUser(null);
                    setAdminMessage('');
                    setActionValue('');
                  }}
                  className='px-4 py-2 text-slate-400 hover:text-white transition-colors'
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  onClick={executeAction}
                  disabled={
                    saving ||
                    (modalAction === 'timeout' && !actionValue) ||
                    (modalAction === 'warn' && !actionValue)
                  }
                  className={`px-6 py-2 text-white font-bold rounded-lg transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 shadow-lg ${
                    modalAction === 'ban'
                      ? 'bg-red-600 hover:bg-red-500 shadow-red-900/20'
                      : modalAction === 'timeout' || modalAction === 'warn'
                        ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/20'
                        : 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/20'
                  }`}
                >
                  {saving ? (
                    <i className='fa-solid fa-circle-notch fa-spin'></i>
                  ) : (
                    'Confirm'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === DEVELOPER AUTH MODAL === */}
      {devAuthModal && pendingUser && pendingAction && (
        <div className='fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4 animate-in fade-in'>
          <div className='bg-slate-900 rounded-2xl border border-red-900/50 shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 relative overflow-hidden'>
            {/* Warning stripes background */}
            <div
              className='absolute inset-0 opacity-5 pointer-events-none'
              style={{
                backgroundImage:
                  'repeating-linear-gradient(45deg, transparent, transparent 10px, #ef4444 10px, #ef4444 20px)',
              }}
            ></div>

            <div className='relative z-10'>
              <div className='p-6 border-b border-slate-800 bg-slate-950/50 flex flex-col items-center text-center'>
                <div className='w-16 h-16 bg-red-950 border border-red-900 text-red-500 rounded-full flex items-center justify-center text-2xl mb-4 shadow-[0_0_30px_rgba(239,68,68,0.2)]'>
                  <i className='fa-solid fa-triangle-exclamation animate-pulse'></i>
                </div>
                <h2 className='text-xl font-bold text-white mb-1'>
                  Developer Authentication Required
                </h2>
                <p className='text-xs text-red-400 font-bold uppercase tracking-widest'>
                  Restricted Action
                </p>
              </div>

              <form onSubmit={handleDevAuth} className='p-6'>
                <div className='bg-slate-950 border border-slate-800 p-4 rounded-lg mb-6'>
                  <div className='text-sm text-slate-400 mb-2'>
                    Action:{' '}
                    <strong className='text-white uppercase'>
                      {pendingAction.replace('_', ' ')}
                    </strong>
                  </div>
                  <div className='text-sm text-slate-400'>
                    Target:{' '}
                    <strong className='text-white'>
                      {pendingUser.username}
                    </strong>{' '}
                    <span className='text-xs text-slate-500'>
                      ({pendingUser.email})
                    </span>
                  </div>
                </div>

                <div className='space-y-4'>
                  <p className='text-sm text-slate-300'>
                    Please enter your password to confirm this destructive
                    action.
                  </p>
                  <div>
                    <label className='block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2'>
                      Your Password
                    </label>
                    <input
                      type='password'
                      value={devPassword}
                      onChange={(e) => setDevPassword(e.target.value)}
                      placeholder='••••••••'
                      className='w-full bg-slate-950 border border-slate-700 text-white px-4 py-3 rounded-lg focus:border-red-500 focus:outline-none transition-colors'
                      required
                    />
                  </div>
                </div>

                <div className='flex gap-3 justify-end pt-4 border-t border-slate-800 mt-4'>
                  <button
                    type='button'
                    onClick={() => {
                      setDevAuthModal(false);
                      setDevPassword('');
                      setPendingAction(null);
                      setPendingUser(null);
                    }}
                    className='px-4 py-2 text-slate-400 hover:text-white transition-colors'
                  >
                    Cancel
                  </button>
                  <button
                    type='submit'
                    disabled={devAuthLoading || !devPassword.trim()}
                    className={`px-6 py-2 text-white font-bold rounded-lg transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 shadow-lg ${pendingAction === 'delete_user' ? 'bg-red-600 hover:bg-red-500 shadow-red-900/20' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/20'}`}
                  >
                    {devAuthLoading ? (
                      <i className='fa-solid fa-circle-notch fa-spin'></i>
                    ) : (
                      'Authenticate'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
