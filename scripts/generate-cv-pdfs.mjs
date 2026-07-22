import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cvDir = join(root, 'cv');
const publicCvDir = join(root, 'public', 'cv');
const assetsOnly = process.argv.includes('--assets-only');
const documents = [
  { html: 'cv_en.html', pdf: 'cv_en.pdf' },
  { html: 'cv_zh.html', pdf: 'cv_zh.pdf' },
];
const fontFiles = [
  { source: 'noto-sans-sc-chinese-simplified-400-normal.woff2', target: 'noto-sans-sc-400.woff2' },
  { source: 'noto-sans-sc-chinese-simplified-700-normal.woff2', target: 'noto-sans-sc-700.woff2' },
];

mkdirSync(publicCvDir, { recursive: true });

// The two HTML files are the only CV content sources. Copy them and their local
// assets into public/cv so /cv displays the same documents used to generate PDFs.
for (const { html } of documents) {
  copyFileSync(join(cvDir, html), join(publicCvDir, html));
}
copyFileSync(join(cvDir, 'image.png'), join(publicCvDir, 'image.png'));

for (const { source, target } of fontFiles) {
  const packageFont = join(root, 'node_modules', '@fontsource', 'noto-sans-sc', 'files', source);
  if (!existsSync(packageFont)) {
    throw new Error(`Missing ${packageFont}. Run npm install first.`);
  }
  copyFileSync(packageFont, join(cvDir, target));
  copyFileSync(packageFont, join(publicCvDir, target));
}

if (assetsOnly) {
  console.log('Synced CV HTML, image, and fonts to public/cv.');
  process.exit(0);
}

const chromeCandidates = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean);
const executablePath = chromeCandidates.find(existsSync);

if (!executablePath) {
  throw new Error('Chrome/Chromium not found. Set CHROME_PATH to its executable.');
}

const browser = await puppeteer.launch({ executablePath, headless: true });

try {
  for (const { html, pdf } of documents) {
    const page = await browser.newPage();
    const htmlPath = join(cvDir, html);
    const sourcePdf = join(cvDir, pdf);
    const publicPdf = join(publicCvDir, pdf);

    console.log(`Rendering cv/${html}...`);
    await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'networkidle0' });
    await page.evaluate(() => document.fonts.ready);
    await page.pdf({
      path: sourcePdf,
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: false,
    });
    await page.close();

    copyFileSync(sourcePdf, publicPdf);
    console.log(`Generated cv/${pdf} and synced public/cv/${pdf}`);
  }
} finally {
  await browser.close();
}
