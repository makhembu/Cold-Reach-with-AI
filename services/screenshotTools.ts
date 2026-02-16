
import { getSettings } from './storage';
import { performSinglePassScan } from './api';

// Optimized buffer to base64 conversion
function bufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// --- Internal Service Implementations ---

async function tryScreenshotOne(url: string, key: string): Promise<string> {
  const params = new URLSearchParams({
    url: url,
    full_page: 'true',
    response_type: 'image',
    format: 'jpg',
    image_quality: '80',
    block_ads: 'true',
    block_cookie_banners: 'true',
    block_trackers: 'true',
    wait_for_selector: 'body',
    access_key: key
  });

  const response = await fetch(`https://api.screenshotone.com/take?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Status ${response.status} ${response.statusText}`);
  }
  const buffer = await response.arrayBuffer();
  return `data:image/jpeg;base64,${bufferToBase64(buffer)}`;
}

async function tryScreenshotAPI(url: string, token: string): Promise<string> {
  const params = new URLSearchParams({
    token: token,
    url: url,
    full_page: 'true',
    output: 'image',
    file_type: 'png',
    wait_for_event: 'load',
    delay: '2000'
  });
  
  const response = await fetch(`https://shot.screenshotapi.net/screenshot?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Status ${response.status} ${response.statusText}`);
  }
  const buffer = await response.arrayBuffer();
  return `data:image/png;base64,${bufferToBase64(buffer)}`;
}

async function tryApiFlash(url: string, key: string): Promise<string> {
  const params = new URLSearchParams({
    access_key: key,
    url: url,
    full_page: 'true',
    fresh: 'true',
    delay: '2',
    wait_until: 'page_loaded',
    no_ads: 'true',
    no_cookie_banners: 'true',
    no_tracking: 'true'
  });
  
  const response = await fetch(`https://api.apiflash.com/v1/urltoimage?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Status ${response.status} ${response.statusText}`);
  }
  const buffer = await response.arrayBuffer();
  return `data:image/jpeg;base64,${bufferToBase64(buffer)}`;
}

// --- Exported Specific Wrappers (Legacy Support) ---

export async function captureScreenshotOne(url: string): Promise<string> {
  const settings = getSettings();
  if (!settings.screenshotOneAccessKey) throw new Error('ScreenshotOne Access Key missing');
  return tryScreenshotOne(url, settings.screenshotOneAccessKey);
}

export async function captureScreenshotAPI(url: string): Promise<string> {
  const settings = getSettings();
  if (!settings.screenshotApiToken) throw new Error('ScreenshotAPI token missing');
  return tryScreenshotAPI(url, settings.screenshotApiToken);
}

export async function captureScreenshotAPIFlash(url: string): Promise<string> {
  const settings = getSettings();
  if (!settings.apiflashKey) throw new Error('ApiFlash key missing');
  return tryApiFlash(url, settings.apiflashKey);
}

// --- The Master Strategy Function ---

export async function captureBestScreenshot(url: string): Promise<string> {
  const settings = getSettings();
  const errors: string[] = [];

  // Strategy 1: ApiFlash (Often most reliable for basic renders)
  if (settings.apiflashKey) {
    try {
      return await tryApiFlash(url, settings.apiflashKey);
    } catch (e: any) {
      console.warn("ApiFlash failed, trying next strategy...", e);
      errors.push(`ApiFlash: ${e.message}`);
    }
  }

  // Strategy 2: ScreenshotAPI
  if (settings.screenshotApiToken) {
    try {
      return await tryScreenshotAPI(url, settings.screenshotApiToken);
    } catch (e: any) {
      console.warn("ScreenshotAPI failed, trying next strategy...", e);
      errors.push(`ScreenshotAPI: ${e.message}`);
    }
  }

  // Strategy 3: ScreenshotOne
  if (settings.screenshotOneAccessKey) {
    try {
      return await tryScreenshotOne(url, settings.screenshotOneAccessKey);
    } catch (e: any) {
      console.warn("ScreenshotOne failed, trying next strategy...", e);
      errors.push(`ScreenshotOne: ${e.message}`);
    }
  }

  // Strategy 4: Internal Puppeteer (API Route / Fallback)
  // This runs on the server (if using Vercel) or locally
  try {
    const result = await performSinglePassScan(url);
    if (result.success && result.data?.screenshot) {
      return result.data.screenshot;
    }
    if (result.error) {
      errors.push(`Internal Engine: ${result.error}`);
    }
  } catch (e: any) {
    errors.push(`Internal Engine: ${e.message}`);
  }

  // If we get here, everything failed.
  throw new Error(`All screenshot methods failed. Details: ${errors.join(' | ')}`);
}
