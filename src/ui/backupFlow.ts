/**
 * Export, restore, sample data, and reset flows. Restoring always shows a
 * preview first, offers to export the current plan, and requires explicit
 * confirmation before anything is replaced.
 */
import { backupFileName, parseBackup, parseBackupFile, safeJsonParse, serializeBackup, type BackupPreview } from '../core/backup';
import { formatIsoDateTime, formatIsoTime } from '../core/dates';
import { decideDraft, draftKey, HTML_FILE_LIMIT_BYTES, readDraftMeta, savedFileStem, type DraftMeta } from '../core/embedded';
import { LIMITS } from '../core/normalize';
import { blankPlan, isEffectivelyEmpty, type Plan } from '../core/plan';
import { samplePlan } from '../core/sample';
import { SECTION_IDS } from '../core/sections';
import { getStorage, KEYS, recoveryKeys } from '../core/storage';
import { domId, h } from './dom';
import { confirmDialog, openModal } from './dialogs';
import { buildSavedFile } from './selfCopy';
import { addBanner, discardDraft, eraseAllLocalData, getPlan, getStorageRef, initFromFile, mutate, noteSavedAs, removeBanner, render, replacePlan } from './store';
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

/** Mark the plan as exported now and return the previous export time (for same-minute file names). */
function markExported(now: Date): string {
  const previous = getPlan().info.lastExportedAt;
  // The export works even when saving does not; a "could not save, export a backup" error here would contradict it.
  mutate((p) => {
    p.info.lastExportedAt = now.toISOString();
  }, { touch: false, silentSaveError: true });
  return previous;
}

/**
 * Export backup: the whole app as one HTML file with this plan inside, named
 * like WhenImGone_2026-11-26_1432.html. It opens offline on its own and can be
 * restored like a JSON backup. See docs/specs/self-contained-plan-file.md.
 */
export function exportBackup(): void {
  const now = new Date();
  const previous = markExported(now);
  const name = `${savedFileStem(now, previous)}.html`;
  download(name, buildSavedFile(serializeBackup(getPlan(), __APP_VERSION__, now)), 'text/html');
  noteSavedAs(name);
  toast(`Saved ${name}. It holds the app and your whole plan, and opens offline: double-click it. Keep it somewhere private.`);
}

/** The plan data only, as a JSON file (for other tools, or a smaller file). */
export function exportJsonBackup(): void {
  const now = new Date();
  const previous = markExported(now);
  download(backupFileName(now, previous), serializeBackup(getPlan(), __APP_VERSION__, now));
  toast('Plan data downloaded as a .json file. Store it somewhere private.');
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

function showRestorePreview(plan: Plan, pv: BackupPreview, fileName: string): void {
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
    // Keep the dialog open if the restore could not be saved, so it is clear nothing changed.
    if (replacePlan(plan, 'Backup restored')) m.close();
  });
}

export function chooseBackupFile(): void {
  const input = h('input', { attrs: { type: 'file', accept: 'application/json,.json,text/html,.html,.htm' } });
  input.style.setProperty('display', 'none');
  document.body.appendChild(input);
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    input.remove();
    if (!file) return;
    const isHtml = /\.html?$/i.test(file.name) || file.type === 'text/html';
    if (file.size > (isHtml ? HTML_FILE_LIMIT_BYTES : LIMITS.fileBytes)) {
      toast(`That file is larger than ${isHtml ? 12 : 10} MB, which is far bigger than any plan. It was not opened.`, 'error');
      return;
    }
    const text = await file.text();
    const r = parseBackupFile(text);
    if (!r.ok) {
      toast(`Could not restore: ${r.error}`, 'error');
      return;
    }
    showRestorePreview(r.plan, r.preview, file.name);
  });
  input.click();
}

/**
 * Startup for a saved plan file: always show the plan inside the file. If this
 * browser holds unsaved changes made in this same file, offer them back; never
 * apply them by themselves. See docs/specs/self-contained-plan-file.md.
 */
export function startSavedFile(onRender: () => void, file: { plan: Plan; preview: BackupPreview }): void {
  const savedOn = file.preview.savedAt || file.preview.exportedAt || file.plan.info.updatedAt;
  const key = draftKey(location);
  let raw: string | null;
  try {
    raw = getStorage()?.getItem(key) ?? null;
  } catch {
    raw = null;
  }
  let draft: { plan: Plan; meta: DraftMeta } | null = null;
  if (raw !== null) {
    const parsed = parseBackup(raw);
    const json = safeJsonParse(raw);
    const meta = json.ok ? readDraftMeta(json.value) : null;
    if (parsed.ok && meta) draft = { plan: parsed.plan, meta };
  }
  const which = decideDraft(draft && { meta: draft.meta, updatedAt: draft.plan.info.updatedAt }, { savedOn, updatedAt: file.plan.info.updatedAt });
  const keepMeta = draft && (which === 'unsaved' || which === 'saved-elsewhere');
  const { storageAvailable } = initFromFile(onRender, file.plan, key, keepMeta ? draft!.meta : { draftOf: savedOn });
  if (!storageAvailable) {
    addBanner({ id: 'nostorage', tone: 'warn', text: 'This browser is not letting the planner keep changes (private browsing or strict settings can cause this). You can read the plan. If you change anything, use Export backup before closing, or the changes will be lost.', actions: [{ label: 'Export backup', run: exportBackup }], dismissible: false });
    return;
  }
  if (which === 'unsaved' && draft) {
    const d = draft;
    addBanner({
      id: 'draft', tone: 'warn',
      text: `You have unsaved changes from ${formatIsoDateTime(d.plan.info.updatedAt) || 'an earlier visit'} that are not in this file. This page shows the plan as it was saved in the file. If you change anything before restoring them, those unsaved changes will be replaced.`,
      actions: [
        { label: 'Restore my unsaved changes', run: () => {
          if (replacePlan(d.plan, 'Your unsaved changes are back. Use Export backup to save them to a new file.')) removeBanner('draft');
        } },
        { label: 'Discard them', run: () => {
          discardDraft();
          removeBanner('draft');
          toast('Unsaved changes discarded. This page shows the plan saved in this file.');
        } },
      ],
      dismissible: false,
    });
  } else if (which === 'saved-elsewhere' && draft) {
    addBanner({
      id: 'draft', tone: 'info',
      text: `Changes made in this file were saved to a newer file, ${draft.meta.savedAs}. That file has the latest version of this plan.`,
      actions: [],
      dismissible: true,
    });
  }
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
  const copies = recoveryKeys(storage).map((k) => [k, storage.getItem(k)] as const);
  for (const [k, raw] of copies) {
    if (raw !== null) download(`family-continuity-damaged-data-${k.slice(-24).replace(/[^0-9A-Za-z-]/g, '-')}.txt`, raw, 'text/plain');
  }
  // When there was no room for a recovery copy, the unreadable data is still in the plan key itself.
  const current = storage.getItem(KEYS.plan);
  if (current !== null && !parses(current) && !copies.some(([, raw]) => raw === current)) {
    download('family-continuity-damaged-data-current.txt', current, 'text/plain');
  }
}

function parses(text: string): boolean {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
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
