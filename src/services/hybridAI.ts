
import { GoogleGenAI } from '@google/genai';

// ==========================================
// API KEY MANAGEMENT
// ==========================================

function getAPIKeys() {
  const settings = localStorage.getItem('coldreach_settings');
  if (!settings) throw new Error('Configure API keys in Settings');
  const parsed = JSON.parse(settings);
  if (!parsed.geminiApiKey) throw new Error('Gemini key missing');
  
  return {
    geminiKey: parsed.geminiApiKey,
    gcpProjectId: parsed.gcpProjectId || '',
    gcpLocation: parsed.gcpLocation || 'us-central1',
    gcpAccessToken: parsed.gcpAccessToken || ''
  };
}

// ==========================================
// USAGE TRACKING
// ==========================================

interface Usage {
  date: string;
  gemini: number;
  deepseek: number;
}

function getUsageToday(): Usage {
  const today = new Date().toDateString();
  const stored = localStorage.getItem('apiUsage');
  if (!stored) return { date: today, gemini: 0, deepseek: 0 };
  const usage: Usage = JSON.parse(stored);
  return usage.date === today ? usage : { date: today, gemini: 0, deepseek: 0 };
}

function incrementUsage(model: 'gemini' | 'deepseek'): void {
  const usage = getUsageToday();
  usage[model]++;
  localStorage.setItem('apiUsage', JSON.stringify(usage));
}

export function getAPIUsageStatus() {
  const usage = getUsageToday();
  return {
    gemini: { used: usage.gemini, limit: 1500, remaining: 1500 - usage.gemini },
    deepseek: { used: usage.deepseek, limit: 999999, remaining: 999999 }
  };
}

// ==========================================
// GEMINI CLIENTS (Vision + General)
// ==========================================

export async function callGeminiVision(prompt: string, screenshots: string[]): Promise<string> {
  const { geminiKey } = getAPIKeys();
  const ai = new GoogleGenAI({ apiKey: geminiKey });
  
  const parts: any[] = [{ text: prompt }];
  
  for (const screenshot of screenshots) {
    if (screenshot) {
      const base64Data = screenshot.replace(/^data:image\/[a-z]+;base64,/, '');
      parts.push({
        inlineData: {
          data: base64Data,
          mimeType: 'image/png'
        }
      });
    }
  }
  
  const response = await ai.models.generateContent({ 
    model: 'gemini-2.5-flash',
    contents: { parts },
    config: {
      temperature: 0.3,
      maxOutputTokens: 8000
    }
  });
  
  incrementUsage('gemini');
  return response.text || "";
}

export async function callGeminiFast(prompt: string): Promise<string> {
  const { geminiKey } = getAPIKeys();
  const ai = new GoogleGenAI({ apiKey: geminiKey });
  
  const response = await ai.models.generateContent({ 
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      temperature: 0.4,
      maxOutputTokens: 8000
    }
  });
  
  incrementUsage('gemini');
  return response.text || "";
}

export async function callGeminiPro(prompt: string): Promise<string> {
  const { geminiKey } = getAPIKeys();
  const ai = new GoogleGenAI({ apiKey: geminiKey });
  
  const response = await ai.models.generateContent({ 
    model: 'gemini-2.5-flash', // Using 2.5 flash as a robust default
    contents: prompt,
    config: {
      temperature: 0.4,
      maxOutputTokens: 8000
    }
  });
  
  incrementUsage('gemini');
  return response.text || "";
}

// ==========================================
// DEEPSEEK VIA VERTEX AI
// ==========================================

export async function callDeepSeekReasoner(prompt: string): Promise<string> {
  const { gcpProjectId, gcpLocation, gcpAccessToken } = getAPIKeys();
  
  if (gcpProjectId && gcpAccessToken) {
    const endpoint = `https://${gcpLocation}-aiplatform.googleapis.com/v1/projects/${gcpProjectId}/locations/${gcpLocation}/publishers/deepseek/models/deepseek-r1:generateContent`;
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${gcpAccessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.6,
            maxOutputTokens: 8192
          }
        })
      });
      
      if (!response.ok) {
        console.warn(`DeepSeek Vertex AI failed: ${response.status}. Fallback to Gemini.`);
        // Fallback below
      } else {
        const data = await response.json();
        incrementUsage('deepseek');
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      }
    } catch (e) {
      console.warn("DeepSeek error", e);
    }
  }
  
  // Fallback to Gemini
  return callGeminiFast(prompt);
}

// ==========================================
// HYBRID AI ORCHESTRATOR
// ==========================================

export async function callHybridAI(config: {
  prompt: string;
  screenshots?: string[];
  taskType: 'planning' | 'analysis' | 'strategy' | 'chat' | 'quick';
}): Promise<{ response: string; modelUsed: string }> {
  
  const { prompt, screenshots, taskType } = config;
  
  try {
    // Decision logic: Which model to use?
    if (screenshots && screenshots.length > 0) {
      // Always use Gemini for vision tasks
      const response = await callGeminiVision(prompt, screenshots);
      return { response, modelUsed: 'gemini-2.5-flash (vision)' };
    }
    
    if (taskType === 'planning' || taskType === 'strategy') {
      // Use DeepSeek R1 for deep reasoning
      const response = await callDeepSeekReasoner(prompt);
      return { response, modelUsed: 'deepseek-r1 (reasoning)' };
    }
    
    if (taskType === 'quick' || taskType === 'chat') {
      // Use Gemini Flash for speed
      const response = await callGeminiFast(prompt);
      return { response, modelUsed: 'gemini-2.5-flash (fast)' };
    }
    
    if (taskType === 'analysis') {
      // Use Gemini Pro for balanced performance
      const response = await callGeminiPro(prompt);
      return { response, modelUsed: 'gemini-2.5-pro (analysis)' };
    }
    
    // Default: Gemini Flash
    const response = await callGeminiFast(prompt);
    return { response, modelUsed: 'gemini-2.5-flash (default)' };
    
  } catch (error: any) {
    console.error(`Primary model failed: ${error.message}. Trying fallback...`);
    
    if (screenshots && screenshots.length > 0) {
      throw error; // Vision can't easily fallback if API key is invalid
    }
    
    // Try Gemini Fast as fallback
    try {
      const response = await callGeminiFast(prompt);
      return { response, modelUsed: 'gemini-2.5-flash (fallback)' };
    } catch (fallbackError: any) {
       throw fallbackError;
    }
  }
}
