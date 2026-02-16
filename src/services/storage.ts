

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

// Safe storage wrapper to handle quota limits
const safeSetItem = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch (e: any) {
    if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
      console.warn("LocalStorage Quota Exceeded. Attempting to cleanup...");
      // Try to clean up businesses that are just discovered but old? 
      // Or just warn user. For now, we'll try to strip heavy logs/screenshots from the payload being saved.
      
      if (key === KEYS.BUSINESSES) {
        try {
          // Parse the businesses, strip screenshots/logs from older ones
          const businesses: Business[] = JSON.parse(value);
          const slimBusinesses = businesses.map(b => ({
            ...b,
            screenshot: undefined, // Drop screenshots to save space
            logs: undefined,       // Drop logs
            chatHistory: undefined // Drop chat history
          }));
          localStorage.setItem(key, JSON.stringify(slimBusinesses));
          alert("Storage full! Screenshots and logs were removed to save your data.");
          return;
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