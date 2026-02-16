import { GoogleGenAI } from '@google/genai';

function getAPIKeys() {
  const settings = localStorage.getItem('coldreach_settings');
  if (!settings) throw new Error('Configure API keys in Settings');
  const parsed = JSON.parse(settings);
  if (!parsed.geminiApiKey) throw new Error('Gemini key missing');
  
  return {
    geminiKey: parsed.geminiApiKey,
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
    openrouter: { used: usage.openrouter, limit: 50, remaining: 50 }
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
  const { openRouterKey } = getAPIKeys();

  // Try OpenRouter first
  if (openRouterKey) {
      try {
          const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${openRouterKey}`,
              "Content-Type": "application/json",
              "HTTP-Referer": window.location.href,
              "X-Title": "ColdReach AI",
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
          }
      } catch (e) {
          console.warn("OpenRouter error", e);
      }
  }
  
  // Fallback to Gemini
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