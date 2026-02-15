
import { playAudit } from 'playwright-lighthouse';
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Usage: node scripts/audit.js <URL> <PORT>
const url = process.argv[2] || 'https://example.com';
const port = parseInt(process.argv[3] || '9222');

(async () => {
  console.log(`Starting Lighthouse audit for: ${url} on port ${port}`);

  let browser;
  try {
    browser = await chromium.launch({
      args: [`--remote-debugging-port=${port}`],
      headless: true
    });
    
    const page = await browser.newPage();
    await page.goto(url);

    const reportDir = path.join(__dirname, '../reports');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir);
    }

    const reportName = `lighthouse-${new Date().getTime()}`;

    await playAudit({
      page: page,
      port: port,
      thresholds: {
        performance: 50,
        accessibility: 50,
        'best-practices': 50,
        seo: 50,
      },
      reports: {
        formats: {
          json: true,
          html: true,
          csv: false,
        },
        name: reportName,
        directory: reportDir,
      },
    });

    console.log(`Audit complete. Report saved to ${path.join(reportDir, reportName)}.html`);

    await browser.close();
  } catch (error) {
    console.error('Audit failed:', error);
    if (browser) await browser.close();
    process.exit(1);
  }
})();
