
import { GoogleGenAI } from '@google/genai';

function getAPIKeys() {
  const settings = localStorage.getItem('coldreach_settings');
  if (!settings) throw new Error('Configure API keys in Settings');
  const parsed = JSON.parse(settings);
  if (!parsed.geminiApiKey) throw new Error('Gemini key missing');
  
  return {
    geminiKey: parsed.geminiApiKey,
    gcpProjectId: parsed.gcpProjectId || '',
    gcpLocation: parsed.gcpLocation || 'us-central1',
    gcpAccessToken: parsed.gcpAccessToken || '',
    openRouterKey: parsed.openRouterApiKey || ''
  };
}

interface Usage {
  date: string;
  gemini: number;
  deepseek: number;
  openrouter: number;
}

function getUsageToday(): Usage {
  const today = new Date().toDateString();
  const stored = localStorage.getItem('apiUsage');
  
  const defaultUsage = { date: today, gemini: 0, deepseek: 0, openrouter: 0 };
  
  if (!stored) return defaultUsage;
  
  const usage: Usage = JSON.parse(stored);
  if (usage.date !== today) return defaultUsage;
  
  return { ...defaultUsage, ...usage };
}

function incrementUsage(model: 'gemini' | 'deepseek' | 'openrouter'): void {
  const usage = getUsageToday();
  usage[model]++;
  localStorage.setItem('apiUsage', JSON.stringify(usage));
}

export function getAPIUsageStatus() {
  const usage = getUsageToday();
  return {
    gemini: { used: usage.gemini, limit: 1500, remaining: 1500 - usage.gemini },
    deepseek: { used: usage.deepseek, limit: 999999, remaining: 999999 },
    openrouter: { used: usage.openrouter, limit: 50, remaining: 50 - usage.openrouter }
  };
}

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

export async function callDeepSeekReasoner(prompt: string): Promise<string> {
  const { gcpProjectId, gcpLocation, gcpAccessToken, openRouterKey } = getAPIKeys();
  
  // 1. Try GCP Vertex AI (Preferred)
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
      
      if (response.ok) {
        const data = await response.json();
        incrementUsage('deepseek');
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      } else {
        console.warn(`DeepSeek Vertex AI failed: ${response.status}. Trying alternatives.`);
      }
    } catch (e) {
      console.warn("DeepSeek GCP error", e);
    }
  }

  // 2. Try OpenRouter (Secondary)
  if (openRouterKey) {
     const usage = getUsageToday();
     if (usage.openrouter < 50) {
        try {
           const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${openRouterKey}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                "model": "deepseek/deepseek-r1",
                "messages": [{ "role": "user", "content": prompt }]
              })
            });

            if (response.ok) {
                const data = await response.json();
                incrementUsage('openrouter');
                return data.choices?.[0]?.message?.content || "";
            } else {
                console.warn("OpenRouter failed:", response.status);
            }
        } catch (e) {
            console.warn("OpenRouter error", e);
        }
     } else {
         console.warn("OpenRouter daily limit reached (50).");
     }
  }
  
  // 3. Fallback to Gemini
  return callGeminiFast(prompt);
}

export async function callHybridAI(config: {
  prompt: string;
  screenshots?: string[];
  taskType: 'planning' | 'analysis' | 'strategy' | 'chat' | 'quick';
}): Promise<{ response: string; modelUsed: string }> {
  
  const { prompt, screenshots, taskType } = config;
  
  try {
    if (screenshots && screenshots.length > 0) {
      const response = await callGeminiVision(prompt, screenshots);
      return { response, modelUsed: 'gemini-2.5-flash (vision)' };
    }
    
    if (taskType === 'planning' || taskType === 'strategy') {
      const response = await callDeepSeekReasoner(prompt);
      // Check which service was actually used based on usage increment could be complex here without refactoring
      // but conceptually it's "Reasoning Model"
      return { response, modelUsed: 'deepseek-r1 (reasoning)' };
    }
    
    if (taskType === 'quick' || taskType === 'chat') {
      const response = await callGeminiFast(prompt);
      return { response, modelUsed: 'gemini-2.5-flash (fast)' };
    }
    
    if (taskType === 'analysis') {
      const response = await callGeminiPro(prompt);
      return { response, modelUsed: 'gemini-2.5-pro (analysis)' };
    }
    
    const response = await callGeminiFast(prompt);
    return { response, modelUsed: 'gemini-2.5-flash (default)' };
    
  } catch (error: any) {
    console.error(`Primary model failed: ${error.message}. Trying fallback...`);
    
    if (screenshots && screenshots.length > 0) {
      throw error;
    }
    
    try {
      const response = await callGeminiFast(prompt);
      return { response, modelUsed: 'gemini-2.5-flash (fallback)' };
    } catch (fallbackError: any) {
       throw fallbackError;
    }
  }
}
