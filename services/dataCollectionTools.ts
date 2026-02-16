import { getSettings } from './storage';
import { performSinglePassScan } from './api';

export async function captureScreenshotOne(url: string): Promise<string> {
  const settings = getSettings();
  const accessKey = settings.screenshotOneAccessKey;

  if (!accessKey) {
     const result = await performSinglePassScan(url);
     if (result.success && result.data?.screenshot) return result.data.screenshot;
     throw new Error('ScreenshotOne Access Key missing and fallback failed');
  }

  const params = new URLSearchParams({
    access_key: accessKey,
    url: url,
    full_page: 'true',
    response_type: 'image', // Assuming image return based on docs
    format: 'jpg',
    image_quality: '80',
    block_ads: 'true',
    block_cookie_banners: 'true',
    block_trackers: 'true',
    wait_for_selector: 'body'
  });

  const apiUrl = `https://api.screenshotone.com/take?${params.toString()}`;

  const response = await fetch(apiUrl);

  if (!response.ok) {
    throw new Error(`ScreenshotOne failed: ${response.status} ${response.statusText}`);
  }

  const buffer = await response.arrayBuffer();
  const base64 = btoa(
    new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
  );

  return `data:image/jpeg;base64,${base64}`;
}

export async function captureScreenshotAPI(url: string): Promise<string> {
  const settings = getSettings();
  const token = settings.screenshotApiToken;
  
  if (!token) {
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

export async function fetchAndAnalyzeHTML(url: string) {
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
  let html = '';

  try {
      const response = await fetch(proxyUrl);
      if (response.ok) {
          html = await response.text();
      }
  } catch (e) {
      const result = await performSinglePassScan(url);
      if (result.success && result.data) {
          html = result.data.html;
      } else {
          throw new Error(`Failed to fetch ${url}`);
      }
  }

  if (!html) throw new Error("Empty HTML response");
  
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emails = Array.from(new Set(html.match(emailRegex) || []))
    .filter(email => !email.includes('example.com') && !email.includes('sentry') && !email.includes('wixpress'))
    .slice(0, 10);
  
  const phoneRegex = /\+?[0-9]{1,4}?[-.\s]?\(?[0-9]{1,3}?\)?[-.\s]?[0-9]{1,4}[-.\s]?[0-9]{1,4}[-.\s]?[0-9]{1,9}/g;
  const phoneNumbers = Array.from(new Set(html.match(phoneRegex) || [])).slice(0, 5);
  
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
    headers: {},
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