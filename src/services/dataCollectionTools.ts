
import { getSettings } from './storage';
import { performSinglePassScan } from './api';

// ==========================================
// SCREENSHOT APIS
// ==========================================

export async function captureScreenshotAPI(url: string): Promise<string> {
  const settings = getSettings();
  const token = settings.screenshotApiToken;
  
  if (!token) {
    // Fallback to Puppeteer if key is missing
    const result = await performSinglePassScan(url);
    if (result.success && result.data?.screenshot) return result.data.screenshot;
    throw new Error('ScreenshotAPI token missing and fallback failed');
  }
  
  const apiUrl = `https://shot.screenshotapi.net/screenshot?` + new URLSearchParams({
    token: token,
    url: url,
    full_page: 'true',
    output: 'image',
    file_type: 'png',
    wait_for_event: 'load',
    delay: '2000'
  });
  
  const response = await fetch(apiUrl);
  
  if (!response.ok) {
    throw new Error(`ScreenshotAPI failed: ${response.status}`);
  }
  
  const buffer = await response.arrayBuffer();
  const base64 = btoa(
    new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
  );
  
  return `data:image/png;base64,${base64}`;
}

export async function captureScreenshotAPIFlash(url: string): Promise<string> {
  const settings = getSettings();
  const apiKey = settings.apiflashKey;
  
  if (!apiKey) {
      // Fallback
      const result = await performSinglePassScan(url);
      if (result.success && result.data?.screenshot) return result.data.screenshot;
      throw new Error('ApiFlash key missing and fallback failed');
  }
  
  const apiUrl = `https://api.apiflash.com/v1/urltoimage?` + new URLSearchParams({
    access_key: apiKey,
    url: url,
    full_page: 'true',
    fresh: 'true',
    response_type: 'image',
    format: 'jpeg',
    quality: '80',
    delay: '2',
    wait_until: 'page_loaded'
  });
  
  const response = await fetch(apiUrl);
  
  if (!response.ok) {
    throw new Error(`ApiFlash failed: ${response.status}`);
  }
  
  const buffer = await response.arrayBuffer();
  const base64 = btoa(
    new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
  );
  
  return `data:image/jpeg;base64,${base64}`;
}

// ==========================================
// HTML FETCHING & ANALYSIS
// ==========================================

export async function fetchAndAnalyzeHTML(url: string) {
  // Try proxy fetch first
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
  let html = '';
  let responseHeaders = new Headers();

  try {
      const response = await fetch(proxyUrl);
      if (response.ok) {
          html = await response.text();
      }
  } catch (e) {
      // If proxy fails, fall back to our backend scan
      const result = await performSinglePassScan(url);
      if (result.success && result.data) {
          html = result.data.html;
      } else {
          throw new Error(`Failed to fetch ${url}`);
      }
  }

  if (!html) throw new Error("Empty HTML response");
  
  // Extract emails
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emails = Array.from(new Set(html.match(emailRegex) || []))
    .filter(email => !email.includes('example.com'))
    .filter(email => !email.includes('sentry'))
    .filter(email => !email.includes('wixpress'))
    .slice(0, 10);
  
  // Extract phone numbers
  const phoneRegex = /\+?[0-9]{1,4}?[-.\s]?\(?[0-9]{1,3}?\)?[-.\s]?[0-9]{1,4}[-.\s]?[0-9]{1,4}[-.\s]?[0-9]{1,9}/g;
  const phoneNumbers = Array.from(new Set(html.match(phoneRegex) || [])).slice(0, 5);
  
  // Detect tech stack
  const techStack: string[] = [];
  const htmlLower = html.toLowerCase();
  if (htmlLower.includes('wp-content')) techStack.push('WordPress');
  if (htmlLower.includes('_next')) techStack.push('Next.js');
  if (htmlLower.includes('react')) techStack.push('React');
  if (htmlLower.includes('ng-')) techStack.push('Angular');
  if (htmlLower.includes('vue')) techStack.push('Vue.js');
  if (htmlLower.includes('shopify')) techStack.push('Shopify');
  if (htmlLower.includes('wix.com')) techStack.push('Wix');
  if (htmlLower.includes('squarespace')) techStack.push('Squarespace');
  if (htmlLower.match(/jquery[.-]/i)) techStack.push('jQuery');
  if (htmlLower.includes('bootstrap')) techStack.push('Bootstrap');
  if (htmlLower.includes('tailwind')) techStack.push('Tailwind');
  
  const hasViewport = htmlLower.includes('viewport');
  const hasSSL = url.startsWith('https://');
  const pageTitle = html.match(/<title>(.*?)<\/title>/i)?.[1] || '';
  const metaDescription = html.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i)?.[1] || '';
  
  return {
    html: html.substring(0, 50000),
    htmlLength: html.length,
    headers: {}, // Headers not available via proxy in a standard way
    emails,
    phoneNumbers,
    techStack,
    hasViewport,
    hasSSL,
    pageTitle,
    metaDescription,
    server: 'Unknown'
  };
}
