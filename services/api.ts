
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
    const response = await axios.post('/api/scan', { url }, { 
      timeout: 40000, // Client side timeout slightly larger than server
      validateStatus: () => true 
    });

    if (response.status === 200 && response.data.success) {
      return response.data as ScanResult;
    } else {
      return {
        success: false,
        error: response.data.error || `Scan failed with status ${response.status}`,
        details: response.data.details
      };
    }
  } catch (error: any) {
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
  const proxies = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    `https://corsproxy.io/?${encodeURIComponent(url)}`,
  ];

  for (const proxy of proxies) {
    try {
      const response = await fetch(proxy);
      if (response.ok) {
        const text = await response.text();
        if (text.length > 100) return text;
      }
    } catch (error) {
      continue;
    }
  }
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
