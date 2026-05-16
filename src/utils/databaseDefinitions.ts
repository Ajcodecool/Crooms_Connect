// Temporary types for database objects until we can get Supabase types

export type Profile = {
  id: string;
  username: string;
  full_name: string;
  is_verified: boolean;
  is_banned: boolean;
  croomie: boolean;
  hide_badges: boolean;
  email: string;
  avatar_url: string;
  created_at: string;
  verified_name?: string;
  verified_at?: string;
  verified_student_id?: string;
  force_password_reset: boolean;
  chat_timeout_until: string;
};
export interface User {
  user_id: string;
  username: string;
  avatar_url: string;
  email?: string;
  count: number;
}
export type ChatMessage = {
  id: string;
  message: string;
  avatar_url: string;
  user_id: string;
  username: string;
  is_deleted: boolean;
  badge_type: string[];
  is_edited: boolean;
  timestamp: string;
};
export type ProfileBadges = string[];
export interface Warning {
  id: number;
  message: string;
}
export interface Notification {
  id: string;
  senderName: string;
  avatar: string;
  message: string;
}
export interface ModLog {
  id: string;
  action:
    | 'verify'
    | 'unverify'
    | 'croomie'
    | 'uncroomie'
    | 'warn'
    | 'timeout'
    | 'remove_timeout'
    | 'ban'
    | 'unban'
    | 'reset_password'
    | 'remove_verification'
    | 'delete_user'
    | 'message_edit'
    | 'message_delete'
    | 'admin_login'
    | 'update_setting'
    | 'global_refresh';
  details: string;
  created_at: string;
}
export type BellSchedule = { [key: string]: string }[];
export type BellScheduleType =
  | 'No School'
  | 'Standard'
  | 'Wednesday'
  | 'Thursday';
export type LunchType = 'A' | 'B';
export type CustomPeriods = { [periodname: string]: string }; // profiles table, custom_periods col
export interface PasswordResetRequest {
  id: string;
  status: string;
  created_at: string;
  username: string;
  user_id: string;
}
