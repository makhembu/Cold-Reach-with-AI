import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import axios from 'axios';
import * as cheerio from 'cheerio';

export default async function handler(req, res) {
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
    
    const executablePath = await chromium.executablePath();

    browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--single-process',
        '--no-zygote'
      ],
      defaultViewport: chromium.defaultViewport,
      executablePath: executablePath || process.env.PUPPETEER_EXECUTABLE_PATH,
      headless: chromium.headless,
      ignoreHTTPSErrors: true
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    
    // Increase timeout for heavy sites
    const timeout = 30000;
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
    const screenshotBuffer = await page.screenshot({ type: 'jpeg', quality: 60, fullPage: false });
    const screenshot = `data:image/jpeg;base64,${screenshotBuffer.toString('base64')}`;

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

    // Quick Security Checks
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

    if (headers['x-powered-by']) {
      vulnerabilities.push({
        name: 'Information Leakage',
        severity: 'LOW',
        description: `Server reveals technology via X-Powered-By: ${headers['x-powered-by']}`,
        exploitScenario: 'Attackers can target specific exploits for known versions.',
        remediation: 'Remove X-Powered-By headers.'
      });
    }

    await browser.close();

    res.status(200).json({
      success: true,
      data: {
        screenshot,
        html: pageData.html.substring(0, 15000), // Increased limit for AI
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
    if (browser) await browser.close();
    console.error("Puppeteer Error:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Unknown scan error',
      details: error.toString()
    });
  }
}