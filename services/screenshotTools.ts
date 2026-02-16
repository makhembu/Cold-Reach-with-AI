import { getSettings } from './storage';
import { performSinglePassScan } from './api';

// Optimized buffer to base64 conversion (prevents O(n²) string concatenation issues)
function bufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function captureScreenshotOne(url: string): Promise<string> {
  const settings = getSettings();
  const accessKey = settings.screenshotOneAccessKey;

  if (!accessKey) {
     const result = await performSinglePassScan(url);
     if (result.success && result.data?.screenshot) return result.data.screenshot;
     throw new Error('ScreenshotOne Access Key missing and fallback failed');
  }

  const params = new URLSearchParams({
    url: url,
    full_page: 'true',
    response_type: 'image',
    format: 'jpg',
    image_quality: '80',
    block_ads: 'true',
    block_cookie_banners: 'true',
    block_trackers: 'true',
    wait_for_selector: 'body'
  });

  const apiUrl = `https://api.screenshotone.com/take?${params.toString()}`;

  const response = await fetch(apiUrl, {
    method: 'GET',
    headers: {
      'X-Access-Key': accessKey
    }
  });

  if (!response.ok) {
    throw new Error(`ScreenshotOne failed: ${response.status} ${response.statusText}`);
  }

  const buffer = await response.arrayBuffer();
  const base64 = bufferToBase64(buffer);

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
  
  const params = new URLSearchParams({
    token: token,
    url: url,
    full_page: 'true',
    output: 'image',
    file_type: 'png',
    wait_for_event: 'load',
    delay: '2000'
  });
  
  const apiUrl = `https://shot.screenshotapi.net/screenshot?${params.toString()}`;
  
  const response = await fetch(apiUrl);
  
  if (!response.ok) {
    throw new Error(`ScreenshotAPI failed: ${response.status} ${response.statusText}`);
  }
  
  const buffer = await response.arrayBuffer();
  const base64 = bufferToBase64(buffer);
  
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
  
  const params = new URLSearchParams({
    access_key: apiKey,
    url: url,
    full_page: 'true',
    fresh: 'true',
    delay: '2',
    wait_until: 'page_loaded',
    no_ads: 'true',
    no_cookie_banners: 'true',
    no_tracking: 'true'
  });
  
  const apiUrl = `https://api.apiflash.com/v1/urltoimage?${params.toString()}`;
  
  const response = await fetch(apiUrl);
  
  if (!response.ok) {
    throw new Error(`ApiFlash failed: ${response.status} ${response.statusText}`);
  }
  
  const buffer = await response.arrayBuffer();
  const base64 = bufferToBase64(buffer);
  
  return `data:image/jpeg;base64,${base64}`;
}