import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import axios from 'axios';
import * as cheerio from 'cheerio';

// Optimize chromium for serverless environment
chromium.setHeadlessMode = true;
chromium.setGraphicsMode = false;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  let browser = null;
  const auditLog = [];

  try {
    const formattedUrl = url.startsWith('http') ? url : `https://${url}`;
    
    // 1. Launch Browser
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    // 2. Navigation & Screenshot
    const startTime = Date.now();
    const response = await page.goto(formattedUrl, { waitUntil: 'networkidle2', timeout: 15000 });
    const loadTime = Date.now() - startTime;
    
    const screenshotBuffer = await page.screenshot({ type: 'jpeg', quality: 60, fullPage: false });
    const screenshot = `data:image/jpeg;base64,${screenshotBuffer.toString('base64')}`;

    const content = await page.content();
    const $ = cheerio.load(content);

    // 3. Tech Stack & Headers Analysis
    const headers = response.headers();
    const techStack = {
      frontend: [],
      backend: [],
      cms: [],
      server: headers['server'] || 'Unknown'
    };

    // React Detection
    if ($('[data-reactroot]').length > 0 || content.includes('_reactInternalInstance')) techStack.frontend.push('React');
    if ($('script[src*="next"]').length > 0 || $('#__next').length > 0) techStack.frontend.push('Next.js');
    if ($('script[src*="wp-content"]').length > 0 || headers['x-powered-by']?.includes('WP')) techStack.cms.push('WordPress');
    
    // 4. Active Security Scanning
    const vulnerabilities = [];
    const scanEndpoints = async (path, name, severity) => {
      try {
        const checkUrl = `${formattedUrl.replace(/\/$/, '')}${path}`;
        const check = await axios.get(checkUrl, { timeout: 3000, validateStatus: () => true });
        if (check.status === 200) {
          return {
            name: `${name} Exposed`,
            severity,
            description: `The path ${path} is publicly accessible.`,
            exploitScenario: `Attackers can access ${name} to gather sensitive information or launch attacks.`,
            remediation: `Restrict access to ${path} via .htaccess or web server config.`
          };
        }
      } catch (e) { return null; }
      return null;
    };

    // Run active checks in parallel
    const securityChecks = [
      scanEndpoints('/.env', 'Environment Variables', 'CRITICAL'),
      scanEndpoints('/.git/config', 'Git Config', 'CRITICAL'),
      scanEndpoints('/wp-login.php', 'WordPress Login', 'MEDIUM'),
      scanEndpoints('/xmlrpc.php', 'XML-RPC', 'HIGH'),
      scanEndpoints('/composer.json', 'Composer Dependencies', 'LOW'),
      scanEndpoints('/package.json', 'NPM Dependencies', 'LOW')
    ];

    const results = await Promise.all(securityChecks);
    results.filter(r => r).forEach(r => vulnerabilities.push(r));

    // Header Checks
    if (!headers['strict-transport-security']) {
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
      screenshot,
      loadTime,
      techStack,
      headers: {
        xFrameOptions: !!headers['x-frame-options'],
        contentSecurityPolicy: !!headers['content-security-policy'],
        strictTransportSecurity: !!headers['strict-transport-security'],
      },
      vulnerabilities,
      rawHtml: content.substring(0, 5000) // First 5k chars for AI analysis
    });

  } catch (error) {
    if (browser) await browser.close();
    console.error(error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      screenshot: null
    });
  }
}