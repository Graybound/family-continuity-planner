/**
 * How to hand over access without the plan holding any secret.
 *
 * Product rule: the plan never stores passwords, PINs, recovery codes or full account numbers.
 * It stores pointers: where the secret lives, who can get it, and the exact steps to get in.
 *
 * The methods are ranked by how well they work for a non-technical person acting alone, on a
 * bad day. Vendor facts were checked against the vendor's own help pages on the date in
 * HANDOFF_CHECKED_ON; docs/handoff-methods.md has the sources and the reasoning. Recheck them
 * when that date is more than a year old.
 */
import type { ChecklistItem } from './plan';
import { CHECKLIST_GROUPS } from './sections';

export const HANDOFF_CHECKED_ON = '2026-11-26';

export interface HandoffMethod {
  id: string;
  title: string;
  /** One sentence: what it gives the family. */
  gives: string;
  /** What it does not do, so nobody is surprised on the day. */
  limits: string;
  /** What the creator should write in the plan (a pointer, never the secret). */
  write: string;
}

export const HANDOFF_METHODS: HandoffMethod[] = [
  {
    id: 'password-manager-emergency-access',
    title: 'Emergency access to your password manager',
    gives: 'One request opens every login you keep there. In Bitwarden, the person you choose asks for access and gets it after a wait you set (one day or more), unless you turn it down.',
    limits: 'It has to be set up while you are alive. In Bitwarden it needs a paid plan for you, and they need their own account (a free one is fine). 1Password works differently: rely on its printed Emergency Kit, and on a family plan make your family member a second organizer.',
    write: 'Which password manager you use, who has emergency access, how they request it, and how long the wait is.',
  },
  {
    id: 'printed-emergency-kit',
    title: 'A printed emergency kit in a known place',
    gives: 'Works for any service and on any device, with no company to ask. Most password managers can print one, and you can add your main password by hand.',
    limits: 'Paper goes out of date when you change the password, so update it when you do. Keep it locked away: a home safe, a safe deposit box your family can open, or with your lawyer.',
    write: 'Where the kit is, how to get into that place (who has the key or the safe code location), and when you last updated it.',
  },
  {
    id: 'keep-the-phone',
    title: 'Keep your phone and phone number working',
    gives: 'Many accounts send a sign-in code to your phone. While the phone and number work, your family can receive those codes.',
    limits: 'It only helps if they can unlock the phone. If the phone plan is cancelled, the codes stop and many accounts lock.',
    write: 'Where the phone unlock code is kept (not the code), and "Do not cancel this phone number for at least a year".',
  },
  {
    id: 'apple-legacy-contact',
    title: 'Apple Legacy Contact',
    gives: 'Your photos, messages, notes, files and device backups in iCloud, for three years after Apple approves the first request. The person does not need an Apple device or account.',
    limits: 'They need the access key you give them and a death certificate, and Apple has to approve it. It does not include saved passwords, passkeys or payment details, or purchased movies, music and books.',
    write: 'Who your Legacy Contact is and where the printed access key is kept.',
  },
  {
    id: 'google-inactive-account-manager',
    title: 'Google Inactive Account Manager',
    gives: 'After your account has been unused for a period you choose, up to 10 people get an email and, if you allowed it, a link to download the data you picked (for example Gmail, Drive and Photos).',
    limits: 'It only starts after months of inactivity and gives a download, not your account. It does not help in the first weeks.',
    write: 'That it is set up, who your trusted contacts are, and how long the wait is.',
  },
  {
    id: 'facebook-legacy-contact',
    title: 'Facebook legacy contact',
    gives: 'Someone you choose can look after your memorialized profile: pin a post, change the profile photo and, if you allowed it, download a copy of what you shared.',
    limits: 'They cannot log in as you or read your private messages.',
    write: 'Who your legacy contact is, and whether you want the account memorialized or deleted.',
  },
  {
    id: 'microsoft-account',
    title: 'Microsoft accounts (Outlook.com, OneDrive, Windows sign-in)',
    gives: 'Microsoft has no legacy contact. Your family can close the account themselves if they can sign in, so keep this login in your password manager.',
    limits: 'Without a login, Microsoft generally needs a court order. Unused Outlook.com and OneDrive accounts are frozen after a year and their files deleted soon after. Copy anything important out first.',
    write: 'That the Microsoft login is in the password manager, and which files in OneDrive matter.',
  },
];

/** A stable id so the app can find this step again, including after a backup is restored. */
export const PRACTICE_HANDOFF_ID = 'practice-handoff';

export const PRACTICE_HANDOFF_TITLE = 'Practice the handoff once';
export const PRACTICE_HANDOFF_NOTE = 'Sit down with the person who would take over. Have them actually use what you set up: request emergency access, open the printed kit, or find the key to the safe. Fix whatever did not work. Then cancel the request. Tick this when it worked.';

export function practiceHandoffItem(): ChecklistItem {
  return { id: PRACTICE_HANDOFF_ID, group: CHECKLIST_GROUPS[2], title: PRACTICE_HANDOFF_TITLE, note: PRACTICE_HANDOFF_NOTE, due: '', done: false };
}

export type PracticeStatus = 'not-planned' | 'planned' | 'done';

export function practiceStatus(checklist: ChecklistItem[]): PracticeStatus {
  const item = checklist.find((c) => c.id === PRACTICE_HANDOFF_ID);
  if (!item) return 'not-planned';
  return item.done ? 'done' : 'planned';
}
