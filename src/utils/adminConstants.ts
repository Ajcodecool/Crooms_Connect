// adminConstants.ts

// 1. Special Freshman (Tier 1 - Full Power)
export const SPECIAL_FRESHMAN_EMAILS = [
  'ajtech@croomsconnect.local', // Replace with the actuual owner's email
];

// 2. Acapoco Special (Tier 2 - Can only ban)
export const ACAPOCO_SPECIAL_EMAILS = [
  'acapoco@croomsconnect.local', // Replace with Acapoco's email
];

// 2.5 Local Artist Bypass (upload instantly; do not wait for pending modaeration)
// Add local emails here to allow those accounts to upload art without it being pending.
export const ART_IMMEDIATE_UPLOAD_EMAILS: string[] = [
  'pauldeadserious@croomsconnect.local',
  'coldturkey286@croomsconnect.local',
  'ameliam@croomsconnect.local',
];

// 3. Senior Dev (Tier 3 - Full Power, can reset Tier 1 password)
export const SENIOR_DEV_EMAILS: string[] = [
];

// 4. Dev (Tier 4 - Full Power, standard hierarchy protections)
export const DEV_EMAILS = [
  'someone@croomsconnect.local',
  'archivis7@croomsconnect.local',
  'mustard@croomsconnect.local',
  'corvid_mobile@croomsconnect.local',
];

// 5. Backwards Compatibility for chatFilter.js and other files
// This combines all tiers so you don't have to rewrite your chat filter bypass logic!
export const DEVELOPER_EMAILS = [
  ...SPECIAL_FRESHMAN_EMAILS,
  ...ACAPOCO_SPECIAL_EMAILS,
  ...SENIOR_DEV_EMAILS,
  ...DEV_EMAILS,
];

// Accounts that can NEVER be granted admin status
export const NEVER_ADMIN_EMAILS = ['mrsmartguy177@croomsconnect.local'];

// 6. Hardcode-Banned Users
// These emails are permanently banned at the app level, regardless of DB status.
// No admin action can unban them — only removing from this list will do.
export const BANNED_EMAILS: string[] = [
  // Add emails here to permanently ban someone:
  'placeholder@croomsconnect.local',
];

// 7. Hardcode-Banned Badge Makers
// These emails are permanently blocked from uploading/creating new community badges
// (both file upload and link-based creation).
export const BANNED_BADGE_MAKERS: string[] = [
  // Add emails here to block community badge creation:
  'mrsmartguy177@croomsconnect.local',
  'Therealgoober@croomsconnect.local',
];
