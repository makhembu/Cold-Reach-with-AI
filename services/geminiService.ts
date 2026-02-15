import { GoogleGenAI } from '@google/genai';
import { load } from 'cheerio';
import { getSettings } from './storage';
import { AnalysisResult, Business, BusinessStatus, UserProfile, ContactInfo, LighthouseData } from '../types';
import { fetchRawHtml } from './api';

const getAI = () => {
  const settings = getSettings();
  if (!settings.geminiApiKey) {
    throw new Error("Gemini API key is missing.");
  }
  return new GoogleGenAI({ apiKey: settings.geminiApiKey });
};

// --- Discovery ---

export const generateProfileFromInput = async (input: string): Promise<Partial<UserProfile>> => {
  const ai = getAI();
  const prompt = `Analyze: "${input}". Create JSON: { "businessName": string, "bio": string }`;
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: { responseMimeType: 'application/json' }
  });
  return JSON.parse(response.text || '{}');
};

export const getDiscoverySuggestions = async (profile: UserProfile): Promise<string[]> => {
  const ai = getAI();
  const prompt = `Based on: ${profile.businessName} (${profile.bio}), suggest 5 Google Maps queries for finding clients with bad sites. JSON: { "queries": string[] }`;
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: { responseMimeType: 'application/json' }
  });
  const data = JSON.parse(response.text || '{}');
  return data.queries || [];
};

export const searchBusinessesWithGemini = async (query: string): Promise<Business[]> => {
  const ai = getAI();
  const prompt = `Find 10 businesses for "${query}". Return valid JSON array: [{ "name": string, "website": string, "location": string, "category": string }]`;
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: { tools: [{ googleSearch: {} }] }
  });
  
  // Clean potential markdown code blocks
  const text = (response.text || '').replace(/```json/g, '').replace(/```/g, '');
  try {
     const rawBusinesses = JSON.parse(text);
     return rawBusinesses.map((b: any) => ({
      id: b.website || Math.random().toString(36).substring(2),
      name: b.name,
      website: b.website,
      address: b.location,
      category: b.category,
      location: b.location,
      status: BusinessStatus.DISCOVERED,
      foundAt: Date.now(),
      assets: {},
      outreach: { followUpCount: 0, status: null }
    }));
  } catch (e) {
    return [];
  }
};

// --- Email Verification & Discovery System ---

export const findAndVerifyEmail = async (business: Business, htmlContent: string): Promise<ContactInfo | null> => {
  const ai = getAI();
  const domain = business.website.replace(/(^\w+:|^)\/\//, '').split('/')[0].replace('www.', '');

  // 1. Scrape HTML with Cheerio
  const $ = load(htmlContent);
  const textContent = $('body').text();
  const hrefs = $('a[href^="mailto:"]').map((_, el) => $(el).attr('href')).get();
  
  // Regex extraction
  const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
  const bodyEmails = textContent.match(emailRegex) || [];
  
  const scrapedEmails = [...hrefs.map(h => h.replace('mailto:', '')), ...bodyEmails]
    .filter(e => e.includes(domain)) // Filter for business domain match
    .filter((v, i, a) => a.indexOf(v) === i); // Unique

  if (scrapedEmails.length > 0) {
    return {
      email: scrapedEmails[0],
      source: 'scraped',
      verified: true, // It's on their site, so it's valid
      confidenceScore: 0.95
    };
  }

  // 2. Permutation & Search Verification (if no scraped email)
  // We construct potential emails and check if they exist on the web via Search Grounding
  const prompt = `
    Task: Find a valid contact email for domain "@${domain}".
    
    1. Search for "contact ${domain} email", "info@${domain}", "support@${domain}".
    2. Check if specific emails like "info@${domain}" appear in search results.
    
    Return JSON: { "email": string | null, "confidence": number }
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: { 
      tools: [{ googleSearch: {} }],
      responseMimeType: 'application/json' 
    }
  });

  const result = JSON.parse(response.text || '{}');
  
  if (result.email) {
    return {
      email: result.email,
      source: 'inferred',
      verified: result.confidence > 0.7,
      confidenceScore: result.confidence
    };
  }

  return null;
};

// --- Deep Analysis & Security Vulnerability Engine ---

export const analyzeWebsiteWithGemini = async (
  business: Business,
  lighthouseResults: LighthouseData[],
  rawHtml: string
): Promise<AnalysisResult> => {
  const ai = getAI();

  // Extract meta tags via Cheerio for hints
  const $ = load(rawHtml);
  const generator = $('meta[name="generator"]').attr('content') || 'Unknown';
  const hasHttps = business.website.startsWith('https');

  // Format Lighthouse findings for context
  const auditSummary = lighthouseResults.map((lr, index) => `
    Page ${index + 1} (${lr.url}):
    - Performance: ${lr.performance}
    - Accessibility: ${lr.accessibility}
    - SEO: ${lr.seo}
    - Key Tech Issues: ${lr.failedAudits?.join(', ') || 'None critical'}
  `).join('\n');

  const prompt = `
    Act as a Senior Web Consultant & Security Expert.
    
    Target: ${business.website}
    Generator: ${generator}
    Protocol: ${hasHttps ? 'HTTPS' : 'HTTP'}
    
    Lighthouse Audit Data (Use this for technical critique):
    ${auditSummary}

    Raw HTML Snippet:
    ${rawHtml.substring(0, 1000)}...

    Task 1: Visual & Technical Analysis (Based on Screenshots & Audit Data)
    - Analyze the provided screenshots (Home + internal pages if available).
    - Critique the design modernity, mobile responsiveness, and user journey.
    - Reference the specific Lighthouse failures (e.g. if Performance is low, mention why).
    
    Task 2: Vulnerability Scan
    - Identify risks based on the tech stack (outdated WP, etc).
    - If HTTP, flag as Critical.

    Task 3: Sales Strategy
    - Based on the WORST finding (ugly design vs security risk), pick a strategy.
    
    Return JSON:
    {
      "techStack": { "cms": ["string"], "frontend": ["string"], "detectedVersions": { "Soft": "Ver" } },
      "interventionRequired": boolean,
      "interventionReason": "string",
      "overallScore": number,
      "designScore": number,
      "uxScore": number,
      "mobileScore": number,
      "performanceScore": number,
      "contentScore": number,
      "security": {
        "https": boolean,
        "riskLevel": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
        "vulnerabilities": [{ "name": "string", "severity": "string", "description": "string", "exploitScenario": "string", "remediation": "string" }]
      },
      "criticalIssues": ["string"],
      "quickWins": ["string"],
      "strategy": {
        "focus": "SECURITY" | "DESIGN" | "SEO",
        "rationale": "string",
        "suggestedPrice": "string",
        "vulnerabilityExplainer": "string",
        "country": "string",
        "roadmap": ["string"]
      },
      "reasoning": "string"
    }
  `;

  const parts: any[] = [{ text: prompt }];
  
  // Attach all screenshots
  lighthouseResults.forEach((lr) => {
    if (lr.screenshot) {
      const base64Data = lr.screenshot.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
      parts.push({
        inlineData: { mimeType: 'image/jpeg', data: base64Data }
      });
    }
  });

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts },
    config: { responseMimeType: 'application/json' }
  });

  return JSON.parse(response.text || '{}');
};

export const analyzeBusinessFromSearch = async (business: Business): Promise<AnalysisResult> => {
  const ai = getAI();
  const prompt = `
    I cannot access the website ${business.website} directly for a scan.
    Please analyze this business using Google Search to infer its digital presence.
    
    1. Find out what they do and verify if the website is active or if they have other presence (socials, maps).
    2. Look for reviews or mentions.
    3. Infer potential issues based on their industry (${business.category}) and location (${business.location}).
    
    Return a provisional Analysis JSON with conservatively estimated scores (average 50-60 if unknown):
    {
      "overallScore": number,
      "designScore": number,
      "uxScore": number,
      "mobileScore": number,
      "performanceScore": number,
      "contentScore": number,
      "criticalIssues": ["string"],
      "quickWins": ["string"],
      "reasoning": "string",
      "strategy": { 
        "focus": "DESIGN" | "SEO" | "CONVERSION",
        "rationale": "string",
        "suggestedPrice": "string",
        "country": "string",
        "roadmap": ["string"]
      }
    }
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: { 
      tools: [{ googleSearch: {} }],
      responseMimeType: 'application/json' 
    }
  });

  const partial = JSON.parse(response.text || '{}');
  
  // Fill in missing fields with defaults to satisfy type safety
  return {
    overallScore: 50,
    designScore: 50,
    uxScore: 50,
    mobileScore: 50,
    contentScore: 50,
    performanceScore: 50,
    needsRedesign: true,
    criticalIssues: ["Site not directly accessible"],
    quickWins: ["Ensure website uptime"],
    reasoning: "Analysis inferred from external search signals due to access failure.",
    ...partial
  };
};

// --- Asset Generation ---

export const generateMockupWithGemini = async (business: Business, analysis: AnalysisResult): Promise<string> => {
  const ai = getAI();
  const prompt = `Create a single-file HTML landing page (Tailwind CSS) for ${business.name}. Fix these issues: ${analysis.criticalIssues.join(', ')}. Return ONLY HTML code.`;
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: { responseMimeType: 'text/plain' }
  });
  return (response.text || '').replace(/```html/g, '').replace(/```/g, '');
};

export const generateSecurityReportWithGemini = async (business: Business, analysis: AnalysisResult): Promise<string> => {
  const ai = getAI();
  const vulns = analysis.security?.vulnerabilities.map(v => 
    `- **${v.name}** (${v.severity}): ${v.description}\n  *Hacker View:* ${v.exploitScenario}`
  ).join('\n') || "No specific vulnerabilities listed.";

  const prompt = `
    Generate a Penetration Test Report (Markdown) for ${business.website}.
    
    Executive Summary:
    This site is at ${analysis.security?.riskLevel || 'UNKNOWN'} risk.
    
    Detailed Findings:
    ${vulns}
    
    Remediation:
    Steps to fix immediately.
  `;
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: { responseMimeType: 'text/plain' }
  });
  return response.text || '';
};

export const generatePitchWithGemini = async (business: Business, analysis: AnalysisResult, userProfile: UserProfile): Promise<{ subject: string; body: string }> => {
  const ai = getAI();
  const isSecurity = analysis.strategy?.focus === 'SECURITY';
  
  // Extract the scariest vulnerability if security focus
  const scaryVuln = analysis.security?.vulnerabilities.find(v => v.severity === 'CRITICAL' || v.severity === 'HIGH') || analysis.security?.vulnerabilities[0];
  
  const context = isSecurity 
    ? `
      FOCUS: CRITICAL SECURITY RISK.
      Vulnerability: ${scaryVuln?.name || 'Potential Exposure'}
      Exploit Scenario (Use this to scare them respectfully): ${scaryVuln?.exploitScenario || 'Data leakage risk'}
      Solution: We patch this for ${analysis.strategy?.suggestedPrice || '$500'}.
    ` 
    : `FOCUS: DESIGN/CONVERSION. Issue: ${analysis.criticalIssues[0]}`;

  const prompt = `
    Write a cold email to ${business.name}.
    Sender: ${userProfile.name} from ${userProfile.businessName}.
    
    ${context}
    
    Rules:
    - If Security focus: Subject line must be alarming (e.g. "Security vulnerability on [Domain]").
    - If Security focus: Body must explain the exploit scenario clearly.
    - Short (<150 words).
    - Call to action: "Are you aware of this?"
    
    Return JSON: { "subject": string, "body": string }
  `;
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: { responseMimeType: 'application/json' }
  });
  return JSON.parse(response.text || '{}');
};

// --- Quality Assurance ---

export const judgePitchWithGemini = async (business: Business, pitch: any, strategy: any): Promise<any> => {
  const ai = getAI();
  const prompt = `Rate this cold email 1-10. Does it mention the specific issue defined in strategy (${strategy?.focus})? JSON: { "score": number, "critique": string }`;
  const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: 'application/json' } });
  return JSON.parse(response.text || '{}');
};

export const generateRefinedPitchWithGemini = async (business: Business, oldPitch: any, critique: string): Promise<any> => {
  const ai = getAI();
  const prompt = `Refine email based on critique: "${critique}". JSON: { "subject": string, "body": string }`;
  const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: 'application/json' } });
  return JSON.parse(response.text || '{}');
};