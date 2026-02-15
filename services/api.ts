import { Business, BusinessStatus, EmailConfig } from '../types';
import { getSettings } from './storage';
import axios from 'axios';

// --- HTML Fetching (CORS Proxy) ---

export const fetchRawHtml = async (url: string): Promise<string> => {
  const proxies = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    `https://corsproxy.io/?${encodeURIComponent(url)}`,
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
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
  
  console.warn("All proxies failed to fetch HTML for", url);
  return "";
};

// --- Deep Analysis & Security Scan (Serverless) ---

export const performFullAudit = async (url: string): Promise<{
  screenshot: string | undefined;
  status: 'success' | 'blocked' | 'error' | 'fallback';
  techStack?: any;
  vulnerabilities?: any[];
  securityHeaders?: any;
  loadTime?: number;
  reason?: string;
  rawHtml?: string;
}> => {
  try {
    // Determine API URL based on environment
    const apiUrl = '/api/scan'; 

    const response = await axios.post(apiUrl, { url }, { timeout: 45000 }); // Longer timeout for puppeteer
    const data = response.data;

    if (!data.success) {
      throw new Error(data.error || "Backend reported failure");
    }

    return {
      screenshot: data.screenshot,
      status: 'success',
      techStack: data.techStack,
      vulnerabilities: data.vulnerabilities,
      securityHeaders: data.headers,
      loadTime: data.loadTime,
      rawHtml: data.rawHtml
    };
  } catch (error: any) {
    console.warn("Deep scan failed, attempting client-side fallback...", error.message);
    
    // Fallback: Fetch raw HTML directly via proxy
    try {
      const rawHtml = await fetchRawHtml(url);
      if (rawHtml && rawHtml.length > 100) {
        return {
          status: 'fallback',
          screenshot: undefined,
          techStack: { frontend: [], cms: [], detectedVersions: {} }, // Empty stack
          vulnerabilities: [],
          securityHeaders: {},
          loadTime: 0,
          rawHtml: rawHtml
        };
      }
    } catch (fallbackError) {
      console.error("Fallback also failed", fallbackError);
    }

    // If both fail
    return { 
      screenshot: undefined, 
      status: 'error', 
      reason: error.response?.data?.error || error.message || "Analysis failed" 
    };
  }
};

// --- Legacy Screenshot (Fallback) ---
export const captureRobustScreenshot = async (url: string) => {
    return performFullAudit(url);
};

// --- Email Sending ---

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

export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));