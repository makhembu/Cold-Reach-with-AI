
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  let browser = null;

  try {
    const formattedUrl = url.startsWith('http') ? url : `https://${url}`;
    
    // Check if running locally or in Vercel
    const executablePath = await chromium.executablePath();

    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: executablePath || process.env.PUPPETEER_EXECUTABLE_PATH,
      headless: chromium.headless,
      ignoreHTTPSErrors: true
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    
    // Set user agent to avoid bot detection
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Increase timeout for heavy sites
    const timeout = 25000;
    const response = await page.goto(formattedUrl, { waitUntil: 'domcontentloaded', timeout });
    
    // Capture data directly from browser context
    const pageData = await page.evaluate(() => {
      // Performance metrics
      const timing = window.performance.timing;
      const performance = {
        loadTime: timing.loadEventEnd - timing.navigationStart,
        domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
        timeToInteractive: timing.domInteractive - timing.navigationStart
      };

      // Meta extraction
      const getMeta = (name) => document.querySelector(`meta[name="${name}"]`)?.getAttribute('content') || '';
      
      // Email extraction (simple regex on body)
      const bodyText = document.body.innerText;
      const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
      const foundEmails = Array.from(new Set(bodyText.match(emailRegex) || []));

      // Link extraction
      const links = Array.from(document.querySelectorAll('a[href]'))
        .map(a => a.href)
        .slice(0, 15); // Top 15 links

      return {
        performance,
        title: document.title,
        description: getMeta('description'),
        hasViewport: !!document.querySelector('meta[name="viewport"]'),
        emails: foundEmails,
        links,
        html: document.documentElement.outerHTML
      };
    });

    // Capture screenshot
    let screenshot = '';
    try {
        const screenshotBuffer = await page.screenshot({ type: 'jpeg', quality: 50, fullPage: false });
        screenshot = `data:image/jpeg;base64,${screenshotBuffer.toString('base64')}`;
    } catch (e) {
        console.warn("Screenshot capture failed", e);
    }

    // Process Tech Stack & Headers (Server-side)
    const headers = response.headers();
    const techStack = {
      frontend: [],
      backend: [],
      cms: [],
      server: headers['server'] || 'Unknown',
      detectedVersions: {}
    };

    const htmlLower = pageData.html.toLowerCase();
    if (htmlLower.includes('wp-content')) techStack.cms.push('WordPress');
    if (htmlLower.includes('shopify')) techStack.cms.push('Shopify');
    if (htmlLower.includes('wix')) techStack.cms.push('Wix');
    if (htmlLower.includes('react')) techStack.frontend.push('React');
    if (htmlLower.includes('next.js') || htmlLower.includes('__next')) techStack.frontend.push('Next.js');
    if (htmlLower.includes('vue')) techStack.frontend.push('Vue.js');
    if (htmlLower.includes('bootstrap')) techStack.frontend.push('Bootstrap');
    if (htmlLower.includes('tailwind')) techStack.frontend.push('Tailwind CSS');

    const vulnerabilities = [];
    if (!headers['strict-transport-security'] && formattedUrl.startsWith('https')) {
      vulnerabilities.push({
        name: 'Missing HSTS',
        severity: 'LOW',
        description: 'HTTP Strict Transport Security header is missing.',
        exploitScenario: 'Man-in-the-middle attacks could downgrade connections to HTTP.',
        remediation: 'Enable HSTS header.'
      });
    }

    await browser.close();

    res.status(200).json({
      success: true,
      data: {
        screenshot,
        html: pageData.html.substring(0, 15000),
        performance: pageData.performance,
        meta: {
          title: pageData.title,
          description: pageData.description,
          hasViewport: pageData.hasViewport,
          hasSSL: formattedUrl.startsWith('https')
        },
        emails: pageData.emails,
        links: pageData.links,
        techStack,
        vulnerabilities,
        headers: {
          xFrameOptions: !!headers['x-frame-options'],
          strictTransportSecurity: !!headers['strict-transport-security']
        }
      }
    });

  } catch (error) {
    if (browser) {
        try { await browser.close(); } catch(e) {}
    }
    console.error("Puppeteer Error:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Scan failed',
      details: error.toString()
    });
  }
}
