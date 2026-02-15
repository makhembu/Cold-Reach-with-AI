import { Business, BusinessStatus, AnalysisResult } from '../types';
import { getSettings } from './storage';

// Real API implementations

export const discoverBusinesses = async (limit: number, location: string, category: string): Promise<Business[]> => {
  const settings = getSettings();
  
  if (!settings.outscraperApiKey) {
    throw new Error("Outscraper API Key is missing. Please add it in Settings.");
  }

  const query = `${category} in ${location}`;
  // Use 'https://api.app.outscraper.com/maps/search-v2'
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
  // Outscraper returns { data: [ [ { ...business } ] ] }
  const flatResults = json.data ? json.data.flat() : [];

  return flatResults
    .filter((r: any) => r.site) // Must have website
    .map((r: any) => ({
      id: r.place_id || Math.random().toString(36).substring(2),
      name: r.name,
      website: r.site,
      email: r.email_1, // Primary email found
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

export const fetchPageSpeedData = async (url: string): Promise<{ screenshot?: string, mobileScore: number, loadTime: number }> => {
  const settings = getSettings();
  // Use Gemini Key as Google Cloud Key if available, else try keyless (might be rate limited)
  let apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile&category=PERFORMANCE`;
  if (settings.geminiApiKey) {
    apiUrl += `&key=${settings.geminiApiKey}`;
  }

  const response = await fetch(apiUrl);
  if (!response.ok) {
    // If PageSpeed fails, we return defaults to not block the flow completely, 
    // but we log the error. The analysis will just be text-based.
    console.warn("PageSpeed API failed", await response.text());
    return { mobileScore: 0, loadTime: 0 };
  }

  const data = await response.json();
  const screenshot = data.lighthouseResult?.audits?.['final-screenshot']?.details?.data;
  const score = (data.lighthouseResult?.categories?.performance?.score || 0) * 100;
  const tti = data.lighthouseResult?.audits?.['interactive']?.numericValue || 0;

  return {
    screenshot,
    mobileScore: Math.round(score),
    loadTime: Math.round(tti)
  };
};

// Helper for waiting if needed
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
