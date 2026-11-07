import { formatDate, formatIsoTime, todayString } from '../../core/dates';
import { KEYS, recoveryKeys } from '../../core/storage';
import { h } from '../dom';
import { chooseBackupFile, deleteRecoveryCopies, downloadRecoveryCopies, eraseEverything, exportBackup, loadSampleData, removeSampleData } from '../backupFlow';
import { openPrintDialog } from '../printDialog';
import { getPlan, getStorageRef, mutate, render } from '../store';
import { applyTheme, currentTheme } from '../theme';
import { button, viewHead } from './common';

function toggleRow(id: string, title: string, help: string, checked: boolean, onChange: (v: boolean) => void): HTMLElement {
  const box = h('input', { attrs: { type: 'checkbox', id, 'aria-describedby': `${id}-help`, 'data-focus-key': id }, props: { checked } });
  box.addEventListener('change', () => onChange(box.checked));
  return h('div', { class: 'check-row' }, box, h('div', null, h('label', { attrs: { for: id } }, h('strong', null, title)), h('small', { attrs: { id: `${id}-help` } }, help)));
}

export function settingsView(): HTMLElement {
  const plan = getPlan();
  const storage = getStorageRef();
  const recovery = storage ? recoveryKeys(storage) : [];
  const bytes = new Blob([JSON.stringify(plan)]).size;
  const input = (id: string, label: string, value: string, help?: string) => h('div', { class: 'field' },
    h('label', { attrs: { for: id } }, label),
    h('input', { attrs: { id, autocomplete: 'off', 'aria-describedby': help ? `${id}-help` : undefined }, props: { value } }),
    help ? h('span', { class: 'help', attrs: { id: `${id}-help` } }, help) : null,
  );

  const details = h('form', { attrs: { 'aria-labelledby': 'details-h' } },
    h('div', { class: 'form-grid' },
      input('plan-name', 'Plan name', plan.info.planName, 'Shown on the overview and the printed cover page.'),
      input('plan-region', 'Home city or region', plan.info.region),
      h('div', { class: 'full' }, input('plan-trusted', 'First person to contact', plan.info.trustedContact, 'Name and phone number of the person a reader should call first.')),
    ),
    h('div', { class: 'btn-row', style: { 'margin-top': '14px' } }, h('button', { class: 'btn primary', attrs: { type: 'submit' } }, 'Save details')),
  );
  details.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = (id: string) => (details.querySelector<HTMLInputElement>(`#${id}`)?.value ?? '').trim();
    mutate((p) => {
      p.info.planName = val('plan-name');
      p.info.region = val('plan-region');
      p.info.trustedContact = val('plan-trusted');
    }, { message: 'Details saved' });
  });

  const card = (id: string, title: string, intro: string, ...children: Parameters<typeof h>[2][]) =>
    h('section', { class: 'card card-pad', attrs: { 'aria-labelledby': id } }, h('h2', { attrs: { id }, style: { 'margin-top': '0' } }, title), h('p', { class: 'help' }, intro), ...children);

  return h('div', null,
    viewHead({ eyebrow: 'Settings', title: 'Settings and backup', description: 'Plan details, privacy, appearance, backups, and printing.' }),
    h('div', { class: 'grid two' },
      card('details-h', 'Plan details', 'These appear on the overview and printed packet.', details),
      card('review-h', 'Plan review', 'Reading the plan through once a year keeps it trustworthy.',
        h('p', null, plan.info.lastReviewedAt ? `Last marked as reviewed on ${formatDate(plan.info.lastReviewedAt)}.` : 'Not yet marked as reviewed.'),
        button('I reviewed the plan today', () => mutate((p) => {
          p.info.lastReviewedAt = todayString();
        }, { message: 'Plan marked as reviewed today' }), { cls: 'btn primary', focusKey: 'mark-reviewed' }),
      ),
      card('backup-h', 'Backup and restore', 'Your plan lives only in this browser. A backup file is the only way to move it or recover it.',
        h('div', { class: 'setting-row' }, h('div', null, h('strong', null, 'Export a backup'), h('small', null, plan.info.lastExportedAt ? `Last exported ${formatIsoTime(plan.info.lastExportedAt)}.` : 'No backup exported yet.')), button('Export backup', exportBackup, { focusKey: 'export' })),
        h('div', { class: 'setting-row' }, h('div', null, h('strong', null, 'Restore a backup'), h('small', null, 'You will see a preview and confirm before anything is replaced. Backups from the original version of this app work too.')), button('Restore from file', chooseBackupFile, { focusKey: 'restore' })),
        h('p', { class: 'help' }, 'Backup files are not encrypted. Anyone who opens one can read it. Keep backups on a drive or folder only you and trusted people can reach.'),
      ),
      card('print-h', 'Printed packet', 'A paper copy works when no computer is available. It starts with Start Here, then immediate actions and trusted contacts.',
        toggleRow('print-private', 'Include private details when printing', 'Off by default. Private fields are replaced with "Withheld" when this is off.', plan.preferences.includePrivateInPrint, (v) => mutate((p) => {
          p.preferences.includePrivateInPrint = v;
        }, { message: v ? 'Private details will be printed' : 'Private details will be withheld from printouts', touch: false })),
        button('Print packet', openPrintDialog, { cls: 'btn primary' }),
      ),
      card('appearance-h', 'Privacy and appearance', 'These settings apply to this device.',
        toggleRow('pref-dark', 'Dark mode', 'Saved in this browser only.', currentTheme() === 'dark', (v) => {
          applyTheme(v ? 'dark' : 'light');
          render();
        }),
        toggleRow('pref-privacy', 'Start in privacy mode', 'Hides private details when the planner opens, useful on a shared screen. Privacy mode is a screen shield, not security.', plan.preferences.privacyDefault, (v) => mutate((p) => {
          p.preferences.privacyDefault = v;
        }, { touch: false })),
      ),
      card('sample-h', 'Sample data', 'Try the planner with a fictional family. Sample data is never mixed into a real plan.',
        plan.info.isSample
          ? button('Remove sample data', removeSampleData, { cls: 'btn' })
          : button('Load sample data', loadSampleData, { cls: 'btn' }),
      ),
      card('storage-h', 'Where your data is stored', 'Everything stays in this browser. Nothing is sent anywhere.',
        h('ul', { class: 'help' },
          h('li', null, `Storage: browser localStorage, key "${KEYS.plan}" (about ${Math.max(1, Math.round(bytes / 1024))} KB).`),
          h('li', null, 'It is tied to this browser profile and, for a downloaded copy, this file location. Another browser or device will not see it.'),
          h('li', null, 'Clearing browsing data for this site or file will erase it. Keep backups.'),
          h('li', null, `Version ${__APP_VERSION__}, data format ${plan.schemaVersion}. Project page and downloads: `, h('a', { attrs: { href: __REPO_URL__, target: '_blank', rel: 'noopener noreferrer' } }, 'GitHub'), '.'),
        ),
        recovery.length ? h('div', { class: 'banner warn' },
          h('p', null, recovery.length === 1 ? 'A copy of saved data that could not be read is kept in this browser.' : `${recovery.length} copies of saved data that could not be read are kept in this browser.`),
          button('Download it', downloadRecoveryCopies, { cls: 'btn small' }),
          button('Delete it', deleteRecoveryCopies, { cls: 'btn small danger' }),
        ) : null,
      ),
      card('erase-h', 'Erase this browser’s copy', 'For shared computers, or when you are done using the planner here.',
        button('Erase all plan data in this browser', eraseEverything, { cls: 'btn danger' }),
      ),
    ),
  );
}
