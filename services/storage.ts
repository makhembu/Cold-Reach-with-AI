
import { Business, BusinessStatus, Settings, UserProfile } from '../types';

const KEYS = {
  BUSINESSES: 'coldreach_businesses',
  SETTINGS: 'coldreach_settings',
  PROFILE: 'coldreach_profile'
};

const DEFAULT_SETTINGS: Settings = {
  geminiApiKey: '',
  outscraperApiKey: '',
  deepseekApiKey: '',
  openRouterApiKey: '',
  screenshotApiToken: '',
  apiflashKey: '',
  screenshotOneAccessKey: '',
  dailyEmailLimit: 50,
  emailConfig: {
    provider: 'gmail',
    fromEmail: '',
    fromName: ''
  }
};

const DEFAULT_PROFILE: UserProfile = {
  name: '',
  businessName: '',
  bio: '',
  onboardingCompleted: false
};

// Compression helper for base64 images to save space
const compressScreenshot = (base64: string): string => {
  if (base64.length > 500000) { // If larger than ~500KB
    // In a real scenario, we'd canvas resize here. 
    // For now, we rely on the quota handler to strip it if needed.
    return base64; 
  }
  return base64;
};

// Safe storage wrapper to handle quota limits
const safeSetItem = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
    // Notify app that save was successful (optional custom event)
    window.dispatchEvent(new CustomEvent('coldreach-storage-saved'));
  } catch (e: any) {
    if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
      console.warn("LocalStorage Quota Exceeded. Attempting to cleanup...");
      
      if (key === KEYS.BUSINESSES) {
        try {
          const businesses: Business[] = JSON.parse(value);
          
          // Strategy 1: Remove oldest analysis logs and chat history
          const slimBusinesses = businesses.map(b => ({
            ...b,
            logs: undefined,       
            chatHistory: undefined 
          }));
          
          try {
             localStorage.setItem(key, JSON.stringify(slimBusinesses));
             console.log("Recovered by stripping logs.");
             return;
          } catch(e2) {
             // Strategy 2: Remove screenshots from all but the most recent 5
             const sortedByDate = [...slimBusinesses].sort((a,b) => b.foundAt - a.foundAt);
             const aggressiveSlim = sortedByDate.map((b, i) => ({
                 ...b,
                 screenshot: i < 5 ? b.screenshot : undefined,
                 assets: { ...b.assets, mockupHtml: undefined } // Remove large HTML mockups
             }));
             localStorage.setItem(key, JSON.stringify(aggressiveSlim));
             console.log("Recovered by stripping screenshots and mockups.");
             alert("Storage full! Older screenshots were removed to make space.");
             return;
          }
        } catch (err) {
          console.error("Failed to recover from storage quota", err);
        }
      }
      alert("Critical: Storage Full. Some data could not be saved.");
    }
  }
};

export const initStorage = () => {
  if (!localStorage.getItem(KEYS.BUSINESSES)) {
    localStorage.setItem(KEYS.BUSINESSES, JSON.stringify([]));
  }
  if (!localStorage.getItem(KEYS.SETTINGS)) {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
  }
  if (!localStorage.getItem(KEYS.PROFILE)) {
    localStorage.setItem(KEYS.PROFILE, JSON.stringify(DEFAULT_PROFILE));
  }
};

export const getBusinesses = (): Business[] => {
  const data = localStorage.getItem(KEYS.BUSINESSES);
  return data ? JSON.parse(data) : [];
};

export const saveBusinesses = (businesses: Business[]) => {
  safeSetItem(KEYS.BUSINESSES, JSON.stringify(businesses));
};

export const addBusiness = (business: Business) => {
  const list = getBusinesses();
  if (list.some(b => b.id === business.id)) return;
  list.push(business);
  saveBusinesses(list);
};

export const updateBusiness = (id: string, updates: Partial<Business>) => {
  const list = getBusinesses();
  const index = list.findIndex(b => b.id === id);
  if (index !== -1) {
    list[index] = { ...list[index], ...updates };
    saveBusinesses(list);
  }
};

export const deleteBusiness = (id: string) => {
  const list = getBusinesses();
  saveBusinesses(list.filter(b => b.id !== id));
};

export const getSettings = (): Settings => {
  const data = localStorage.getItem(KEYS.SETTINGS);
  return data ? JSON.parse(data) : DEFAULT_SETTINGS;
};

export const saveSettings = (settings: Settings) => {
  safeSetItem(KEYS.SETTINGS, JSON.stringify(settings));
};

export const getUserProfile = (): UserProfile => {
  const data = localStorage.getItem(KEYS.PROFILE);
  return data ? JSON.parse(data) : DEFAULT_PROFILE;
};

export const saveUserProfile = (profile: UserProfile) => {
  safeSetItem(KEYS.PROFILE, JSON.stringify(profile));
};

export const clearData = () => {
  localStorage.removeItem(KEYS.BUSINESSES);
  initStorage();
};
