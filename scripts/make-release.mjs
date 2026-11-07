// Build the files attached to a GitHub Release. Run `npm run release`.
//
// release/Family-Continuity-Planner-vX.Y.Z.html   the whole app in one file
// release/Family-Continuity-Planner-vX.Y.Z.zip    the app plus plain-language instructions and samples
// release/SHA256SUMS.txt                          checksums for both
//
// No dependencies: the zip is written with Node's built-in zlib.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { deflateRawSync, crc32 } from 'node:zlib';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const v = pkg.version;
const base = `Family-Continuity-Planner-v${v}`;
const html = readFileSync('dist/index.html');
if (!html.includes('Content-Security-Policy')) throw new Error('dist/index.html has no CSP. Run "npm run build" first.');

const startHere = `Family Continuity Planner ${v}
${'='.repeat(30)}

Most estate planning focuses on what you own. Family Continuity Planner
focuses on what you know: the practical information your family may need
if you are no longer available to help.

HOW TO OPEN IT
1. Extract this folder somewhere you will remember (your Documents folder,
   a USB drive, or a private network drive).
2. Double-click "Family-Continuity-Planner.html". It opens in your web
   browser. No internet connection, account, or installation is needed.
3. Always open the planner from the same place, in the same browser.
   Your plan is saved inside that browser for that file.

WHERE YOUR INFORMATION IS KEPT
- Only in the browser on this computer. Nothing is sent anywhere.
- It is NOT encrypted. Anyone who uses this computer account and browser
  can open it. On a shared computer, use the "Erase all plan data" button
  in Settings when you are finished, and keep your backup file safe.
- If you move or rename the file, or use a different browser, the plan may
  look empty. It is not deleted: open the file from its original place, or
  restore your latest backup.

BACKUPS (IMPORTANT)
- Click "Export backup" after any big change. Keep the backup file
  somewhere private, and tell a trusted person where it is.
- To restore, go to Settings and backup, then "Restore from file".
  You will see a preview before anything is replaced.
- Backups made with the original version of this app also restore.

PRINTING
- Click "Print" to make a paper packet that starts with a "Start Here"
  page for your family. Private details are left out unless you choose to
  include them. Store printouts securely and shred old copies.

TRY IT FIRST
- Settings and backup, then "Load sample data", fills the planner with a
  fictional family so you can look around. "Remove sample data" clears it.
- sample-plan.json in this folder is the same sample as a backup file.

THIS IS NOT A WILL
- This planner works alongside a will; it does not replace one. If you do
  not have a will, or yours is out of date, we recommend having one prepared
  with a qualified estate planning professional where you live. Then record
  where it is kept in the planner's Documents section.
- It is also not legal, financial, or medical advice.

See LICENSE.txt for the software license (MIT).
`;

const files = [
  [`${base}/Family-Continuity-Planner.html`, html],
  [`${base}/START-HERE.txt`, Buffer.from(startHere.replace(/\n/g, '\r\n'))],
  [`${base}/LICENSE.txt`, readFileSync('LICENSE')],
  [`${base}/sample-plan.json`, readFileSync('examples/sample-plan.json')],
  [`${base}/sample-original-format-backup.json`, readFileSync('examples/legacy-v1-backup.json')],
];

// Minimal zip writer (deflate, no encryption). Fixed timestamps keep builds reproducible.
function zip(entries) {
  const DOS_TIME = 0; // 00:00:00
  const DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1; // 2026-01-01
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const [name, data] of entries) {
    const nameBuf = Buffer.from(name, 'utf8');
    const comp = deflateRawSync(data, { level: 9 });
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(8, 8); local.writeUInt16LE(DOS_TIME, 10); local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14); local.writeUInt32LE(comp.length, 18); local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26); local.writeUInt16LE(0, 28);
    locals.push(local, nameBuf, comp);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8); central.writeUInt16LE(8, 10); central.writeUInt16LE(DOS_TIME, 12);
    central.writeUInt16LE(DOS_DATE, 14); central.writeUInt32LE(crc, 16); central.writeUInt32LE(comp.length, 20);
    central.writeUInt32LE(data.length, 24); central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBuf);
    offset += local.length + nameBuf.length + comp.length;
  }
  const cd = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, end]);
}

rmSync('release', { recursive: true, force: true });
mkdirSync('release');
const outputs = [[`${base}.html`, html], [`${base}.zip`, zip(files)]];
for (const [name, data] of outputs) writeFileSync(`release/${name}`, data);
const sums = outputs.map(([name, data]) => `${createHash('sha256').update(data).digest('hex')}  ${name}`).join('\n') + '\n';
writeFileSync('release/SHA256SUMS.txt', sums);
console.log(`release/ written for v${v}:\n${sums}`);
