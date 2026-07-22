import { existsSync, copyFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const chromeCandidates = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean);
const chrome = chromeCandidates.find(existsSync);

if (!chrome) {
  throw new Error('Chrome/Chromium not found. Set CHROME_PATH to its executable.');
}

const profilesRoot = mkdtempSync(join(tmpdir(), 'cv-pdf-'));
const documents = [
  { html: 'cv_en.html', pdf: 'cv_en.pdf' },
  { html: 'cv_zh.html', pdf: 'cv_zh.pdf' },
];

mkdirSync(join(root, 'public', 'cv'), { recursive: true });

try {
  for (const { html, pdf } of documents) {
    const htmlPath = join(root, 'cv', html);
    const sourcePdf = join(root, 'cv', pdf);
    const publicPdf = join(root, 'public', 'cv', pdf);
    const profile = join(profilesRoot, pdf.replace('.pdf', ''));

    rmSync(sourcePdf, { force: true });
    console.log(`Rendering cv/${html}...`);

    const result = spawnSync(chrome, [
      '--headless=new',
      '--disable-background-networking',
      '--disable-component-update',
      '--disable-extensions',
      '--disable-sync',
      '--no-first-run',
      '--no-pdf-header-footer',
      '--allow-file-access-from-files',
      `--user-data-dir=${profile}`,
      '--virtual-time-budget=3000',
      `--print-to-pdf=${sourcePdf}`,
      pathToFileURL(htmlPath).href,
    ], { stdio: 'inherit', timeout: 15_000 });

    // Some Chrome versions keep the headless process alive briefly after the PDF
    // has been fully written. The timeout may terminate that idle process; the
    // generated file is the success criterion in that case.
    if (!existsSync(sourcePdf)) {
      throw new Error(`Failed to generate ${pdf}${result.error ? `: ${result.error.message}` : ''}`);
    }

    copyFileSync(sourcePdf, publicPdf);
    console.log(`Generated cv/${pdf} and synced public/cv/${pdf}`);
  }
} finally {
  rmSync(profilesRoot, { recursive: true, force: true });
}
