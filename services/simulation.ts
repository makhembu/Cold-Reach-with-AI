
import { Business, BusinessStatus, AnalysisResult, LighthouseData } from '../types';
import { getSettings } from './storage';
import * as cheerio from 'cheerio';

// Real API implementations

export const discoverBusinesses = async (limit: number, location: string, category: string): Promise<Business[]> => {
  const settings = getSettings();
  
  if (!settings.outscraperApiKey) {
    throw new Error("Outscraper API Key is missing. Please add it in Settings.");
  }

  const query = `${category} in ${location}`;
  const url = `https://api.app.outscraper.com/maps/search-v2?query=${encodeURIComponent(query)}&limit=${limit}&drop_duplicates=true`;

  const response = await fetch(url, {
    headers: {
      'X-API-KEY': settings.outscraperApiKey
    }
  });

  if (!response.ok) {
    if (response.status === 403) throw new Error("Invalid Outscraper API Key or quota exceeded.");
    throw new Error("Failed to fetch businesses from Outscraper.");
  }

  const json = await response.json();
  const flatResults = json.data ? json.data.flat() : [];

  return flatResults
    .filter((r: any) => r.site) 
    .map((r: any) => ({
      id: r.place_id || Math.random().toString(36).substring(2),
      name: r.name,
      website: r.site,
      email: r.email_1, 
      phone: r.phone,
      address: r.full_address,
      category: r.type || category,
      location: location,
      status: BusinessStatus.DISCOVERED,
      foundAt: Date.now(),
      assets: {},
      outreach: {
        followUpCount: 0,
        status: null
      }
    }));
};

export const extractRelevantLinks = (html: string, baseUrl: string): string[] => {
  try {
    const $ = cheerio.load(html);
    const links = new Set<string>();
    const domain = new URL(baseUrl).hostname;

    $('a').each((_, element) => {
      let href = $(element).attr('href');
      if (!href) return;

      // Normalize URL
      if (href.startsWith('/')) {
        href = new URL(href, baseUrl).toString();
      } else if (!href.startsWith('http')) {
        return;
      }

      const urlObj = new URL(href);
      if (!urlObj.hostname.includes(domain)) return;

      const path = urlObj.pathname.toLowerCase();
      // Prioritize key pages
      if (path.includes('about') || path.includes('service') || path.includes('contact') || path.includes('pricing')) {
        links.add(href);
      }
    });

    return Array.from(links).slice(0, 2); // Return top 2 relevant links
  } catch (e) {
    return [];
  }
};

export const runLighthouseAudit = async (url: string): Promise<{ lighthouse: LighthouseData, loadTime: number, screenshot?: string }> => {
  const settings = getSettings();
  
  // Construct API URL with all categories
  let apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile`;
  
  // Add categories
  apiUrl += '&category=PERFORMANCE&category=ACCESSIBILITY&category=BEST_PRACTICES&category=SEO';
  
  if (settings.geminiApiKey) {
    // We can reuse the Google Cloud Key (Gemini Key often works for PSI too if in same project)
    apiUrl += `&key=${settings.geminiApiKey}`;
  }

  try {
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      console.warn("Lighthouse API failed", await response.text());
      return { 
        lighthouse: { url, performance: 0, accessibility: 0, bestPractices: 0, seo: 0 }, 
        loadTime: 0 
      };
    }

    const data = await response.json();
    const lighthouseResult = data.lighthouseResult;

    // Extract failed audits for context
    const audits = lighthouseResult?.audits || {};
    const failedAudits = Object.values(audits)
      .filter((a: any) => a.score !== null && a.score < 0.9)
      .sort((a: any, b: any) => (a.score || 0) - (b.score || 0)) // Lowest score first
      .slice(0, 5) // Top 5 issues
      .map((a: any) => a.title);

    const screenshot = lighthouseResult?.audits?.['final-screenshot']?.details?.data;

    const lighthouse: LighthouseData = {
      url,
      performance: Math.round((lighthouseResult?.categories?.performance?.score || 0) * 100),
      accessibility: Math.round((lighthouseResult?.categories?.accessibility?.score || 0) * 100),
      bestPractices: Math.round((lighthouseResult?.categories?.['best-practices']?.score || 0) * 100),
      seo: Math.round((lighthouseResult?.categories?.seo?.score || 0) * 100),
      failedAudits,
      screenshot
    };

    const tti = lighthouseResult?.audits?.['interactive']?.numericValue || 0;

    return {
      lighthouse,
      loadTime: Math.round(tti),
      screenshot
    };
  } catch (e) {
    console.error("Lighthouse Audit Error:", e);
    return { 
      lighthouse: { url, performance: 0, accessibility: 0, bestPractices: 0, seo: 0 }, 
      loadTime: 0 
    };
  }
};

export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
