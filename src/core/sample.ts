/**
 * Fictional sample plan for trying the app. Every name, number, and place here
 * is invented. Phone numbers use the 555-01xx range reserved for fiction and
 * email addresses use example.com.
 */
import { newId } from './ids';
import { blankPlan, type Plan, type RecordItem } from './plan';
import { SECTIONS, type SectionId } from './sections';
import { addDays, todayString } from './dates';

function rec(section: SectionId, values: Record<string, string>): RecordItem {
  const r: RecordItem = { id: newId() };
  for (const f of SECTIONS[section].fields) r[f.key] = values[f.key] ?? '';
  return r;
}

export function samplePlan(now: Date = new Date()): Plan {
  const today = todayString(now);
  const p = blankPlan(now);
  p.info.planName = 'The Morgan Household (sample)';
  p.info.region = 'Exampleville';
  p.info.trustedContact = 'Pat Lee, neighbor, 555-0140';
  p.info.isSample = true;
  p.assessment = {
    areas: { finances: 'mostly-me', technology: 'mostly-me', taxes: 'mostly-me', household: 'shared', children: 'shared', pets: 'shared', healthcare: 'someone-else', vehicles: 'mostly-me' },
    risks: ['bills', 'autopay', 'taxes', 'internet', 'photos', 'seasonal'],
    completedAt: now.toISOString(),
  };
  p.records.responsibilities = [
    rec('responsibilities', {
      name: 'Paying the monthly bills', domain: 'Finances and bills', frequency: 'Monthly', owner: 'Alex Morgan', backupPerson: 'Jordan Morgan',
      howItWorks: 'Most bills autopay from the joint checking account at Sample Credit Union.\nThe water bill is paid by hand on the city website around the 10th.\nI check the account every Sunday morning for anything unusual.',
      recordsLocation: 'Paper statements: blue folder in the office file drawer.', whoCanHelp: 'Sample Credit Union branch staff can explain the autopays.', guidance: 'Simplify it', notes: 'Consider moving the water bill to autopay so there is nothing to remember.',
    }),
    rec('responsibilities', {
      name: 'Preparing and filing taxes', domain: 'Taxes', frequency: 'Annually', owner: 'Alex Morgan', backupPerson: 'Casey Rivera (accountant)',
      howItWorks: 'Casey Rivera at Example Tax Partners prepares our return each March.\nI collect the year-end forms in the "Taxes this year" envelope and drop them off by March 1.',
      recordsLocation: 'Past returns: fire safe, bottom shelf. Seven years kept.', whoCanHelp: 'Casey Rivera, 555-0110', guidance: 'Transfer it',
    }),
    rec('responsibilities', {
      name: 'Home Wi-Fi and devices', domain: 'Technology and devices', frequency: 'As needed', owner: 'Alex Morgan', backupPerson: 'Riley (teenager) knows the basics',
      howItWorks: 'The router is in the hall closet. Unplugging it for 30 seconds fixes most problems.\nThe internet provider is Example Fiber.',
      recordsLocation: 'Router admin details are in the family password manager under "Router".', whoCanHelp: 'Example Fiber support, 555-0150', guidance: 'Keep doing it',
    }),
    rec('responsibilities', {
      name: 'Furnace filter and fall maintenance', domain: 'Home maintenance', frequency: 'Seasonal', owner: 'Alex Morgan',
      howItWorks: 'Filter size 16x25x1, changed every three months. Example HVAC Services does a check every October.',
      whoCanHelp: 'Example HVAC Services, 555-0111', guidance: 'Keep doing it',
    }),
    rec('responsibilities', {
      name: 'Feeding and walking Biscuit', domain: 'Pets', frequency: 'Weekly', owner: 'Jordan and Riley',
      howItWorks: 'Two meals a day, one cup each. Walks morning and evening. Vet is Sample Animal Clinic.', guidance: 'Keep doing it',
    }),
  ];
  p.records.people = [
    rec('people', { name: 'Alex Morgan', relationship: 'Plan author', phone: '555-0100', email: 'alex@example.com', address: '123 Example Street, Exampleville', notes: 'Wrote this plan and handles most paperwork.' }),
    rec('people', { name: 'Jordan Morgan', relationship: 'Partner', phone: '555-0101', email: 'jordan@example.com', address: '123 Example Street, Exampleville' }),
    rec('people', { name: 'Riley Morgan', relationship: 'Child', needs: 'Riley does best with a clear daily schedule. School pickup is at 3:15.' }),
  ];
  p.records.contacts = [
    rec('contacts', { name: 'Pat Lee', role: 'Neighbor with a spare key', priority: 'Primary', phone: '555-0140', instructions: 'Call first for anything at the house. Pat can let helpers in.' }),
    rec('contacts', { name: 'Casey Rivera, Example Tax Partners', role: 'Accountant', priority: 'Primary', phone: '555-0110', email: 'casey@example.com', instructions: 'Call within the first few weeks. Casey knows our finances well and can explain what needs attention.' }),
    rec('contacts', { name: 'Sample Insurance Company', role: 'Home and auto insurance', priority: 'Service', phone: '555-0120', instructions: 'Call for any claim. Policy details are in the fire safe.' }),
    rec('contacts', { name: 'Example HVAC Services', role: 'Heating and cooling', priority: 'Service', phone: '555-0111', instructions: 'Annual furnace check in October. Call if the heat stops.' }),
  ];
  p.records.health = [
    rec('health', { person: 'Riley Morgan', recordType: 'Provider', name: 'Dr. Sam Example, Example Family Clinic', phone: '555-0160', instructions: 'Annual checkup each August.' }),
  ];
  p.records.home = [
    rec('home', { name: 'Water main shutoff', type: 'Water', provider: 'Exampleville Water', phone: '555-0170', location: 'Basement, north wall, red handle.', instructions: 'Turn clockwise a quarter turn to close.' }),
    rec('home', { name: 'Home internet', type: 'Internet', provider: 'Example Fiber', phone: '555-0150', instructions: 'Router is in the hall closet.' }),
  ];
  p.records.accounts = [
    rec('accounts', { name: 'Sample Credit Union', type: 'Banking', owner: 'Alex and Jordan', identifier: 'Checking ends 0000', website: 'Sample Credit Union app', phone: '555-0130', access: 'Family password manager, emergency access granted to Jordan.', notes: 'Most bills autopay from this account.' }),
    rec('accounts', { name: 'Family password manager', type: 'Digital', owner: 'Alex Morgan', website: 'Password manager app', access: 'Jordan has emergency access. Recovery kit is in the fire safe.', notes: 'This is where every other login lives.' }),
  ];
  p.records.documents = [
    rec('documents', { name: 'Will and estate documents', category: 'Legal', owner: 'Alex and Jordan', location: 'Original with Example Law Office. Copy in fire safe.', expires: addDays(today, 400) }),
    rec('documents', { name: 'Home insurance policy', category: 'Insurance', owner: 'Alex and Jordan', location: 'Fire safe, top shelf.', expires: addDays(today, 120) }),
  ];
  p.records.plans = [
    rec('plans', { name: 'If Alex is suddenly unavailable', trigger: 'Alex is in the hospital or cannot be reached for more than a day', lead: 'Jordan Morgan', backup: 'Pat Lee', meetup: 'Pat Lee’s house next door', steps: 'Call Pat Lee to help with Riley and Biscuit\nCheck the "First 24 hours" checklist\nCall Casey Rivera only after the first week\nNothing financial is urgent in the first week', reviewed: today }),
  ];
  p.records.notes = [
    rec('notes', { name: 'Trash and recycling', category: 'Routine', details: 'Trash goes out Tuesday night.\nRecycling every other Tuesday (green bin).', reviewed: today }),
  ];
  p.modules = { health: 'review-later' };
  p.messages = [
    { id: newId(), audience: 'Jordan', title: 'For you first', body: 'You know more of this than you think. Take it slowly, and lean on Pat and Casey.' },
  ];
  return p;
}
