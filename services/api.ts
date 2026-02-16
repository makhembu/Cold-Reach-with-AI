
import { Business, BusinessStatus, EmailConfig } from '../types';
import { getSettings } from './storage';
import axios from 'axios';

// --- Types ---

export interface ScanResult {
  success: boolean;
  data?: {
    screenshot: string;
    html: string;
    performance: {
      loadTime: number;
      domContentLoaded: number;
      timeToInteractive: number;
    };
    meta: {
      title: string;
      description: string;
      hasViewport: boolean;
      hasSSL: boolean;
    };
    emails: string[];
    links: string[];
    techStack: any;
    vulnerabilities: any[];
    headers: any;
  };
  error?: string;
  details?: string;
}

// --- Utilities ---

export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operationName: string
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error(`${operationName} timeout (${timeoutMs}ms)`)),
      timeoutMs
    )
  );
  return Promise.race([promise, timeoutPromise]);
}

// --- API Methods ---

export const performSinglePassScan = async (url: string): Promise<ScanResult> => {
  try {
    // Attempt to call the backend API
    const response = await axios.post('/api/scan', { url }, { 
      timeout: 45000, 
      validateStatus: () => true 
    });

    if (response.status === 200 && response.data.success) {
      return response.data as ScanResult;
    } else {
      console.warn("Backend scan failed, falling back to client-side analysis:", response.data.error);
      // Fallback object to allow the app to continue even if backend fails
      return {
        success: false,
        error: response.data.error || `Scan failed with status ${response.status}`,
        details: response.data.details
      };
    }
  } catch (error: any) {
    console.warn("Backend unavailable, using limited client-side data.", error);
    return {
      success: false,
      error: error.message || "Network connection failed",
      details: error.toString()
    };
  }
};

// Legacy support (redirects to single pass)
export const performFullAudit = async (url: string) => {
  const result = await performSinglePassScan(url);
  if (result.success && result.data) {
    return {
      status: 'success',
      screenshot: result.data.screenshot,
      techStack: result.data.techStack,
      vulnerabilities: result.data.vulnerabilities,
      rawHtml: result.data.html,
      loadTime: result.data.performance.loadTime
    };
  }
  return { status: 'error', reason: result.error };
};

export const fetchRawHtml = async (url: string): Promise<string> => {
  // Ensure protocol
  let targetUrl = url;
  if (!targetUrl.startsWith('http')) {
    targetUrl = 'https://' + targetUrl;
  }

  // List of proxies to try
  const proxies = [
    (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
    (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
    // Fallback: Direct fetch (works for some configured CORS sites)
    (u: string) => u
  ];

  for (const proxyGenerator of proxies) {
    try {
      const proxyUrl = proxyGenerator(targetUrl);
      console.log(`Attempting fetch via: ${proxyUrl}`);
      
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 8000); // 8s timeout
      
      const response = await fetch(proxyUrl, { 
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      clearTimeout(id);

      if (response.ok) {
        const text = await response.text();
        if (text && text.length > 50) return text;
      }
    } catch (error) {
      console.warn(`Fetch failed for proxy`, error);
      continue;
    }
  }

  console.error(`All proxies failed for ${targetUrl}`);
  return ""; 
};

export const sendEmailViaResend = async (
  to: string, 
  subject: string, 
  html: string, 
  config: EmailConfig
): Promise<boolean> => {
  if (!config.resendApiKey) throw new Error("Resend API Key missing");

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.resendApiKey}`
    },
    body: JSON.stringify({
      from: `${config.fromName} <${config.fromEmail}>`,
      to: [to],
      subject: subject,
      html: html
    })
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Failed to send email via Resend');
  }
  
  return true;
};
