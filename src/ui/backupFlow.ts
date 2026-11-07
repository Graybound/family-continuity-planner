/**
 * Export, restore, sample data, and reset flows. Restoring always shows a
 * preview first, offers to export the current plan, and requires explicit
 * confirmation before anything is replaced.
 */
import { backupFileName, parseBackup, serializeBackup, type BackupPreview } from '../core/backup';
import { formatIsoTime } from '../core/dates';
import { LIMITS } from '../core/normalize';
import { blankPlan, isEffectivelyEmpty } from '../core/plan';
import { samplePlan } from '../core/sample';
import { SECTION_IDS } from '../core/sections';
import { recoveryKeys } from '../core/storage';
import { domId, h } from './dom';
import { confirmDialog, openModal } from './dialogs';
import { eraseAllLocalData, getPlan, getStorageRef, mutate, render, replacePlan } from './store';
import { toast } from './toast';

function download(filename: string, text: string, type = 'application/json'): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = h('a', { attrs: { href: url, download: filename } });
  a.style.setProperty('display', 'none');
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoking immediately can cancel the download in some browsers.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function exportBackup(): void {
  const now = new Date();
  mutate((p) => {
    p.info.lastExportedAt = now.toISOString();
  }, { touch: false });
  download(backupFileName(now), serializeBackup(getPlan(), __APP_VERSION__, now));
  toast('Backup downloaded. Store it somewhere private.');
}

function totalRecords(): number {
  const p = getPlan();
  return SECTION_IDS.reduce((n, s) => n + p.records[s].length, 0);
}

function previewBody(pv: BackupPreview): HTMLElement {
  const dl = (rows: [string, string][]) => h('dl', { class: 'record-data' }, rows.filter(([, v]) => v).map(([k, v]) => h('div', null, h('dt', null, k), h('dd', null, v))));
  return h('div', null,
    dl([
      ['Plan name', pv.planName || 'Not named'],
      ['File format', pv.sourceVersion === 1 ? 'Original app (version 1), will be upgraded' : `Version ${pv.sourceVersion}`],
      ['Created', formatIsoTime(pv.createdAt)],
      ['Last changed', formatIsoTime(pv.updatedAt)],
      ['Exported', formatIsoTime(pv.exportedAt)],
      ['Sample data', pv.isSample ? 'Yes, this is the fictional sample' : ''],
    ]),
    h('h3', null, 'Contents'),
    h('table', { class: 'preview-table' },
      h('caption', { class: 'sr-only' }, 'Number of entries in each section of the backup'),
      h('thead', null, h('tr', null, h('th', { attrs: { scope: 'col' } }, 'Section'), h('th', { attrs: { scope: 'col' } }, 'Entries'))),
      h('tbody', null,
        pv.counts.map((c) => h('tr', null, h('td', null, c.title), h('td', { class: 'num' }, String(c.count)))),
        h('tr', null, h('td', null, 'Checklist items'), h('td', { class: 'num' }, String(pv.checklistItems))),
        h('tr', null, h('td', null, 'Personal messages'), h('td', { class: 'num' }, String(pv.messages))),
      ),
    ),
    pv.actions.length ? [h('h3', null, 'Changes made while upgrading'), h('ul', null, pv.actions.map((a) => h('li', null, a)))] : null,
    pv.warnings.length ? [h('h3', null, 'Problems found and fixed'), h('ul', null, pv.warnings.map((w) => h('li', null, w)))] : h('p', null, 'No problems were found in the file.'),
  );
}

function showRestorePreview(plan: ReturnType<typeof blankPlan>, pv: BackupPreview, fileName: string): void {
  const current = totalRecords();
  const ackId = domId('ack');
  const ack = h('input', { attrs: { type: 'checkbox', id: ackId } });
  const replace = h('button', { class: 'btn danger', attrs: { type: 'button' }, props: { disabled: true } }, 'Replace my plan');
  const exportFirst = h('button', { class: 'btn spacer', attrs: { type: 'button' } }, 'Export my current plan first');
  const cancel = h('button', { class: 'btn', attrs: { type: 'button' } }, 'Cancel');
  ack.addEventListener('change', () => (replace.disabled = !ack.checked));
  const m = openModal({
    title: 'Review backup before restoring',
    description: `File: ${fileName}. Nothing has changed yet.`,
    body: [
      previewBody(pv),
      h('div', { class: 'callout' },
        h('strong', null, 'Restoring replaces the plan in this browser'),
        h('p', null, current ? `Your current plan has ${current} entr${current === 1 ? 'y' : 'ies'}. They will be replaced, not merged. Export your current plan first if you might want it back.` : 'Your current plan is empty, so nothing will be lost.'),
      ),
      h('div', { class: 'check-row' }, ack, h('label', { attrs: { for: ackId } }, 'I understand this replaces the plan currently in this browser.')),
    ],
    footer: [exportFirst, cancel, replace],
    initialFocus: cancel,
  });
  exportFirst.addEventListener('click', () => exportBackup());
  cancel.addEventListener('click', m.close);
  replace.addEventListener('click', () => {
    m.close();
    replacePlan(plan, 'Backup restored');
  });
}

export function chooseBackupFile(): void {
  const input = h('input', { attrs: { type: 'file', accept: 'application/json,.json' } });
  input.style.setProperty('display', 'none');
  document.body.appendChild(input);
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    input.remove();
    if (!file) return;
    if (file.size > LIMITS.fileBytes) {
      toast('That file is larger than 10 MB, which is far bigger than any plan. It was not opened.', 'error');
      return;
    }
    const text = await file.text();
    const r = parseBackup(text);
    if (!r.ok) {
      toast(`Could not restore: ${r.error}`, 'error');
      return;
    }
    showRestorePreview(r.plan, r.preview, file.name);
  });
  input.click();
}

export async function loadSampleData(): Promise<void> {
  if (!isEffectivelyEmpty(getPlan())) {
    const ok = await confirmDialog({
      title: 'Replace your plan with sample data?',
      message: 'Sample data is never mixed into a real plan. Loading it replaces everything in this browser. Export a backup first if you want to keep your plan.',
      confirmLabel: 'Replace with sample',
      danger: true,
      acknowledge: 'I have exported a backup or do not need this plan.',
    });
    if (!ok) return;
  }
  replacePlan(samplePlan(), 'Sample data loaded. Everything in it is fictional.');
}

export async function removeSampleData(): Promise<void> {
  const ok = await confirmDialog({ title: 'Remove sample data?', message: 'This clears the fictional sample and gives you a fresh, empty plan.', confirmLabel: 'Remove sample data' });
  if (ok) replacePlan(blankPlan(), 'Sample data removed. You have a fresh plan.');
}

export async function eraseEverything(): Promise<void> {
  const ok = await confirmDialog({
    title: 'Erase all plan data in this browser?',
    message: 'This permanently removes your plan, any copy saved by the original version of this app, and any recovery copies from this browser. Backups you exported are not affected.',
    confirmLabel: 'Erase everything',
    danger: true,
    acknowledge: 'I understand this cannot be undone without a backup.',
  });
  if (ok) {
    eraseAllLocalData();
    toast('All plan data was erased from this browser.');
  }
}

export function downloadRecoveryCopies(): void {
  const storage = getStorageRef();
  if (!storage) return;
  for (const k of recoveryKeys(storage)) {
    const raw = storage.getItem(k);
    if (raw !== null) download(`family-continuity-damaged-data-${k.slice(-24).replace(/[^0-9A-Za-z-]/g, '-')}.txt`, raw, 'text/plain');
  }
}

export async function deleteRecoveryCopies(): Promise<void> {
  const storage = getStorageRef();
  if (!storage) return;
  const ok = await confirmDialog({ title: 'Delete recovery copies?', message: 'The damaged data that could not be read will be removed from this browser. Download it first if you want to try to recover it.', confirmLabel: 'Delete', danger: true });
  if (!ok) return;
  recoveryKeys(storage).forEach((k) => storage.removeItem(k));
  toast('Recovery copies deleted');
  render();
}
