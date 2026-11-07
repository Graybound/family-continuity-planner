/**
 * Section (module) definitions. A section is a life domain that holds records.
 *
 * The field definitions drive the edit form, the record cards, search, print,
 * and import validation. Field keys for the eight original sections match the
 * recovered v1 application exactly so old backups keep working.
 */

export type FieldType = 'text' | 'textarea' | 'select' | 'date' | 'tel' | 'email';

export interface FieldDef {
  key: string;
  label: string;
  type?: FieldType;
  required?: boolean;
  /** Wide fields span both columns in the edit form and on cards. */
  wide?: boolean;
  /** Private fields are hidden in privacy mode and left out of print unless the user opts in. */
  private?: boolean;
  options?: readonly string[];
  help?: string;
}

export const SECTION_IDS = [
  'responsibilities',
  'people',
  'contacts',
  'health',
  'home',
  'accounts',
  'documents',
  'plans',
  'notes',
] as const;

export type SectionId = (typeof SECTION_IDS)[number];

export interface SectionDef {
  id: SectionId;
  title: string;
  singular: string;
  description: string;
  icon: string;
  /** Field shown as the record title. */
  titleField: string;
  /** Field shown under the title, usually the type or role. */
  subtitleField?: string;
  /** Select field used for the type filter. */
  filterField?: string;
  callout?: { title: string; body: string };
  fields: readonly FieldDef[];
}

export const AREA_LABELS = {
  finances: 'Finances and bills',
  household: 'Household operations',
  technology: 'Technology and devices',
  maintenance: 'Home maintenance',
  vehicles: 'Vehicles',
  taxes: 'Taxes',
  insurance: 'Insurance',
  children: 'Children',
  pets: 'Pets',
  healthcare: 'Healthcare coordination',
  coordination: 'Family coordination',
  work: 'Work or business',
  records: 'Important records',
  digital: 'Digital services and photos',
} as const;

export type AreaId = keyof typeof AREA_LABELS;
export const AREA_IDS = Object.keys(AREA_LABELS) as AreaId[];

/** Responsibility "domain" options are the area labels plus Other, so audit rules can match them. */
const DOMAIN_OPTIONS = [...Object.values(AREA_LABELS), 'Other'] as const;

export const SECTIONS: Record<SectionId, SectionDef> = {
  responsibilities: {
    id: 'responsibilities',
    title: 'Who handles what',
    singular: 'responsibility',
    description: 'The jobs you quietly do today, how they work, and what should happen to them later.',
    icon: '⇄',
    titleField: 'name',
    subtitleField: 'domain',
    filterField: 'domain',
    callout: {
      title: 'Start with what only you know',
      body: 'Pick one thing you do every month that nobody else could pick up easily. Describe how it works in a few plain sentences.',
    },
    fields: [
      { key: 'name', label: 'Responsibility', required: true, wide: true, help: 'For example: Paying the water bill, Renewing car registration, Managing the home Wi-Fi.' },
      { key: 'domain', label: 'Area', type: 'select', options: DOMAIN_OPTIONS },
      { key: 'frequency', label: 'How often', type: 'select', options: ['As needed', 'Weekly', 'Monthly', 'Quarterly', 'Seasonal', 'Annually'] },
      { key: 'owner', label: 'Who does it today' },
      { key: 'backupPerson', label: 'Who could take it over' },
      { key: 'howItWorks', label: 'How it works', type: 'textarea', wide: true },
      { key: 'recordsLocation', label: 'Where the related records are', wide: true, private: true },
      { key: 'whoCanHelp', label: 'Who can help', wide: true },
      { key: 'guidance', label: 'What to do with it later', type: 'select', options: ['Keep doing it', 'Simplify it', 'Transfer it', 'Cancel it', 'Sell it', 'Safe to ignore', 'Decide later'] },
      { key: 'notes', label: 'Notes', type: 'textarea', wide: true },
    ],
  },
  people: {
    id: 'people',
    title: 'People',
    singular: 'person',
    description: 'Who is part of the household and what do helpers need to know?',
    icon: '♙',
    titleField: 'name',
    subtitleField: 'relationship',
    fields: [
      { key: 'name', label: 'Full name', required: true, wide: true },
      { key: 'relationship', label: 'Relationship or role' },
      { key: 'phone', label: 'Phone', type: 'tel' },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'address', label: 'Address', wide: true, private: true },
      { key: 'needs', label: 'Care or communication needs', type: 'textarea', wide: true },
      { key: 'notes', label: 'Important notes', type: 'textarea', wide: true },
    ],
  },
  contacts: {
    id: 'contacts',
    title: 'Trusted contacts',
    singular: 'contact',
    description: 'Trusted people and services to call when normal routines break.',
    icon: '☎',
    titleField: 'name',
    subtitleField: 'role',
    filterField: 'priority',
    fields: [
      { key: 'name', label: 'Contact or organization', required: true, wide: true },
      { key: 'role', label: 'Role' },
      { key: 'priority', label: 'Priority', type: 'select', options: ['Primary', 'Backup', 'Service'] },
      { key: 'phone', label: 'Phone', type: 'tel' },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'instructions', label: 'When to contact', type: 'textarea', wide: true },
    ],
  },
  health: {
    id: 'health',
    title: 'Health',
    singular: 'health record',
    description: 'Care instructions, providers, medications, allergies, and insurance details.',
    icon: '✚',
    titleField: 'name',
    subtitleField: 'recordType',
    filterField: 'recordType',
    fields: [
      { key: 'person', label: 'Person', required: true },
      { key: 'recordType', label: 'Record type', type: 'select', options: ['Medication', 'Allergy', 'Provider', 'Insurance', 'Care instruction'], required: true },
      { key: 'name', label: 'Name or item', required: true, wide: true },
      { key: 'details', label: 'Details', wide: true, private: true },
      { key: 'phone', label: 'Provider phone', type: 'tel' },
      { key: 'instructions', label: 'Instructions', type: 'textarea', wide: true, private: true },
    ],
  },
  home: {
    id: 'home',
    title: 'Home and utilities',
    singular: 'home record',
    description: 'How to access, protect, and operate the places your family depends on.',
    icon: '⌂',
    titleField: 'name',
    subtitleField: 'type',
    filterField: 'type',
    fields: [
      { key: 'name', label: 'Utility, property, or service', required: true, wide: true },
      { key: 'type', label: 'Type', type: 'select', options: ['Electric', 'Gas', 'Water', 'Internet', 'Security', 'Property', 'Vehicle', 'Other'] },
      { key: 'provider', label: 'Provider or owner' },
      { key: 'account', label: 'Account or identifier', private: true },
      { key: 'phone', label: 'Emergency phone', type: 'tel' },
      { key: 'location', label: 'Shutoff, key, or access location', wide: true, private: true },
      { key: 'instructions', label: 'Operating instructions', type: 'textarea', wide: true },
    ],
  },
  accounts: {
    id: 'accounts',
    title: 'Accounts',
    singular: 'account',
    description: 'A locator for essential accounts. Do not store passwords.',
    icon: '▣',
    titleField: 'name',
    subtitleField: 'type',
    filterField: 'type',
    callout: {
      title: 'Store a locator, not a secret',
      body: 'Do not save passwords, PINs, full card numbers, or recovery codes here. Write down which password manager you use and how a trusted person can get emergency access.',
    },
    fields: [
      { key: 'name', label: 'Institution or service', required: true, wide: true },
      { key: 'type', label: 'Type', type: 'select', options: ['Banking', 'Insurance', 'Retirement', 'Mortgage or rent', 'Utilities', 'Digital', 'Subscription', 'Other'] },
      { key: 'owner', label: 'Owner' },
      { key: 'identifier', label: 'Last four digits or safe hint', private: true },
      { key: 'website', label: 'Website or app name' },
      { key: 'phone', label: 'Support phone', type: 'tel' },
      { key: 'access', label: 'Where access instructions are stored', wide: true, private: true },
      { key: 'notes', label: 'Continuity notes', type: 'textarea', wide: true, private: true },
    ],
  },
  documents: {
    id: 'documents',
    title: 'Documents',
    singular: 'document',
    description: 'Where critical records are stored and when they need attention.',
    icon: '▤',
    titleField: 'name',
    subtitleField: 'category',
    filterField: 'category',
    fields: [
      { key: 'name', label: 'Document', required: true, wide: true },
      { key: 'category', label: 'Category', type: 'select', options: ['Identity', 'Legal', 'Financial', 'Insurance', 'Property', 'Medical', 'Other'] },
      { key: 'owner', label: 'Owner or covered person' },
      { key: 'location', label: 'Physical or digital location', required: true, wide: true, private: true },
      { key: 'expires', label: 'Expiration or review date', type: 'date' },
      { key: 'notes', label: 'Notes', type: 'textarea', wide: true, private: true },
    ],
  },
  plans: {
    id: 'plans',
    title: 'Emergency plans',
    singular: 'plan',
    description: 'Simple, ordered instructions for moments when clear thinking is hardest.',
    icon: '◇',
    titleField: 'name',
    subtitleField: 'trigger',
    fields: [
      { key: 'name', label: 'Plan name', required: true, wide: true },
      { key: 'trigger', label: 'When to use this plan', required: true, wide: true },
      { key: 'lead', label: 'Primary lead' },
      { key: 'backup', label: 'Backup lead' },
      { key: 'meetup', label: 'Meeting point', wide: true, private: true },
      { key: 'steps', label: 'Steps, one per line', type: 'textarea', required: true, wide: true },
      { key: 'reviewed', label: 'Last reviewed', type: 'date' },
    ],
  },
  notes: {
    id: 'notes',
    title: 'Notes',
    singular: 'note',
    description: 'Routines and context that do not fit anywhere else.',
    icon: '✎',
    titleField: 'name',
    subtitleField: 'category',
    filterField: 'category',
    fields: [
      { key: 'name', label: 'Title', required: true, wide: true },
      { key: 'category', label: 'Category', type: 'select', options: ['General', 'Handoff', 'Routine', 'Care', 'Travel', 'Follow-up'] },
      { key: 'details', label: 'Note', type: 'textarea', required: true, wide: true, private: true },
      { key: 'reviewed', label: 'Review date', type: 'date' },
    ],
  },
};

export const CHECKLIST_GROUPS = ['First 24 hours', 'Information to gather', 'People to brief', 'Quarterly upkeep'] as const;
export const OTHER_GROUP = 'Other';

export function isSectionId(v: unknown): v is SectionId {
  return typeof v === 'string' && (SECTION_IDS as readonly string[]).includes(v);
}

/** The visible title of a record, with a safe fallback. */
export function recordTitle(section: SectionId, r: Record<string, string>): string {
  const def = SECTIONS[section];
  return r[def.titleField] || r.person || r.name || `Untitled ${def.singular}`;
}
