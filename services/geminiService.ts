
import { GoogleGenAI } from '@google/genai';
import { load } from 'cheerio';
import { getSettings } from './storage';
import { AnalysisResult, Business, BusinessStatus, UserProfile, ContactInfo, LighthouseData } from '../types';
import { fetchRawHtml, ScanResult } from './api';

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
  const prompt = `
    Act as a Growth Strategist for the agency "${profile.businessName || 'Creative Digital'}".
    
    AGENCY CONTEXT:
    Bio/Skills: "${profile.bio || 'Web Design & Automation'}"
    Additional Context: "${profile.portfolioText || ''}"
    
    OBJECTIVE:
    Generate 6 targeted Google Maps search queries to find local businesses that likely need this agency's specific services.
    
    CRITERIA:
    1. Focus on high-ticket niches (Law, Medical, Construction) if not specified otherwise.
    2. Suggest queries that might reveal outdated businesses (e.g., "Oldest [niche] in [city]").
    3. If the bio mentions a location, use it. Otherwise use major cities or general terms.
    4. Vary the intent (e.g., "Best rated..." vs "Low rated...").
    
    Output JSON: { "queries": ["string"] }
  `;

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

// --- Single Pass Analysis ---

export const analyzeWebsiteComplete = async (
  business: Business,
  scanData: NonNullable<ScanResult['data']>
): Promise<AnalysisResult> => {
  const ai = getAI();
  
  // Prepare screenshot
  const screenshotPart = scanData.screenshot ? {
    inlineData: {
      mimeType: 'image/jpeg',
      data: scanData.screenshot.replace(/^data:image\/(png|jpeg|jpg);base64,/, '')
    }
  } : null;

  const prompt = `
    Analyze this business website for cold outreach potential.
    
    BUSINESS CONTEXT:
    - Name: ${business.name}
    - URL: ${business.website}
    - Category: ${business.category}
    
    TECHNICAL METRICS (from direct scan):
    - Load Time: ${Math.round(scanData.performance.loadTime)}ms (Threshold: <2000ms is good)
    - Mobile Viewport Detected: ${scanData.meta.hasViewport}
    - SSL/HTTPS: ${scanData.meta.hasSSL}
    - Title Tag: "${scanData.meta.title}"
    - Emails Found: ${scanData.emails.join(', ') || 'None'}
    - Tech Stack: ${[...scanData.techStack.frontend, ...scanData.techStack.cms].join(', ') || 'Unknown'}
    
    HTML SNIPPET (Structure):
    ${scanData.html.substring(0, 5000)}...
    
    TASK:
    Act as a Senior Web Consultant. Score the website 0-100 based on the screenshot and technical data.
    Identify if they need a redesign or technical fix.
    
    SCORING CRITERIA:
    - Design: Modern aesthetics?
    - UX: Navigation clarity?
    - Mobile: Is it responsive? (If no viewport tag, score mobile < 20)
    - Performance: Is it slow?
    - Content: Is the messaging clear?
    
    Return JSON:
    {
      "overallScore": 0-100,
      "designScore": 0-100,
      "uxScore": 0-100,
      "mobileScore": 0-100,
      "performanceScore": 0-100,
      "contentScore": 0-100,
      "criticalIssues": ["issue1", "issue2", "issue3"],
      "quickWins": ["win1", "win2"],
      "needsRedesign": boolean,
      "reasoning": "2-3 sentences explaining the score",
      "strategy": {
        "focus": "DESIGN" | "PERFORMANCE" | "SECURITY" | "SEO",
        "rationale": "Why this angle?",
        "suggestedPrice": "$1,000 - $5,000",
        "country": "US",
        "roadmap": ["Step 1", "Step 2"]
      }
    }
  `;

  const parts: any[] = [{ text: prompt }];
  if (screenshotPart) parts.push(screenshotPart);

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts },
    config: { responseMimeType: 'application/json' }
  });

  const analysis = JSON.parse(response.text || '{}');
  
  // Enhance result with real tech data
  return {
    ...analysis,
    techStack: scanData.techStack,
    security: {
      riskLevel: scanData.vulnerabilities.length > 0 ? 'HIGH' : 'LOW',
      vulnerabilities: scanData.vulnerabilities,
      https: scanData.meta.hasSSL
    },
    // Calculate performance score from real metrics if AI hallucinates
    performanceScore: analysis.performanceScore || Math.max(0, 100 - (scanData.performance.loadTime / 50))
  };
};

export const analyzeBusinessFromSearch = async (business: Business): Promise<AnalysisResult> => {
  const ai = getAI();
  const prompt = `
    I cannot access the website ${business.website} directly.
    Analyze this business via Google Search.
    
    1. Verify if website is active.
    2. Infer issues based on industry (${business.category}).
    
    Return provisional Analysis JSON (scores ~50):
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
      "needsRedesign": true,
      "strategy": { 
        "focus": "DESIGN",
        "rationale": "Inferred from search",
        "suggestedPrice": "$1500",
        "country": "US",
        "roadmap": ["Verify domain", "Build Landing Page"]
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
  return {
    ...partial,
    techStack: { frontend: [], cms: [], detectedVersions: {} },
    security: { riskLevel: 'UNKNOWN', vulnerabilities: [], https: false }
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

  const prompt = `Generate a Penetration Test Report (Markdown) for ${business.website}.\nFindings:\n${vulns}`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: { responseMimeType: 'text/plain' }
  });
  return response.text || '';
};

export const generatePitchWithGemini = async (business: Business, analysis: AnalysisResult, userProfile: UserProfile): Promise<{ subject: string; body: string }> => {
  const ai = getAI();
  const prompt = `
    Write a cold email to ${business.name} from ${userProfile.name}.
    Focus: ${analysis.strategy?.focus || 'Improvement'}.
    Issues: ${analysis.criticalIssues.join(', ')}.
    Return JSON: { "subject": string, "body": string }
  `;
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: { responseMimeType: 'application/json' }
  });
  return JSON.parse(response.text || '{}');
};

export const judgePitchWithGemini = async (business: Business, pitch: any, strategy: any): Promise<any> => {
  const ai = getAI();
  const prompt = `Rate this cold email 1-10. Strategy: ${strategy?.focus}. JSON: { "score": number, "critique": string }`;
  const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: 'application/json' } });
  return JSON.parse(response.text || '{}');
};

export const generateRefinedPitchWithGemini = async (business: Business, oldPitch: any, critique: string): Promise<any> => {
  const ai = getAI();
  const prompt = `Refine email based on critique: "${critique}". JSON: { "subject": string, "body": string }`;
  const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: 'application/json' } });
  return JSON.parse(response.text || '{}');
};
