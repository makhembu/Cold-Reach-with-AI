
import { getSettings } from './storage';
import { GoogleGenAI } from '@google/genai';

// ==========================================
// DEEPSEEK REASONER (Planning & Strategy)
// ==========================================

export async function callDeepSeekReasoner(prompt: string): Promise<string> {
  const settings = getSettings();
  
  // Option 1: DeepSeek
  if (settings.deepseekApiKey) {
      try {
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${settings.deepseekApiKey}`
            },
            body: JSON.stringify({
            model: 'deepseek-reasoner',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.4,
            max_tokens: 8000
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            return data.choices[0].message.content;
        }
        console.warn(`DeepSeek failed: ${response.status}, falling back to Gemini`);
      } catch (e) {
          console.error("DeepSeek error", e);
      }
  }
  
  // Option 2: Gemini Fallback
  if (settings.geminiApiKey) {
      const ai = new GoogleGenAI({ apiKey: settings.geminiApiKey });
      const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash', // Flash is efficient for reasoning tasks too
          contents: prompt,
          config: {
              systemInstruction: "You are a deep reasoning engine. Think step-by-step before answering.",
          }
      });
      return response.text || "";
  }
  
  throw new Error("No AI API keys configured (DeepSeek or Gemini)");
}

// ==========================================
// DEEPSEEK CHAT (Analysis with Images)
// ==========================================

export async function callDeepSeekWithImages(
  prompt: string,
  screenshots: string[]
): Promise<string> {
  const settings = getSettings();
  
  if (settings.deepseekApiKey) {
    try {
        const content: any[] = [{ type: 'text', text: prompt }];
        
        for (const screenshot of screenshots) {
            const base64Data = screenshot.replace(/^data:image\/[a-z]+;base64,/, '');
            content.push({
            type: 'image_url',
            image_url: { url: `data:image/png;base64,${base64Data}` }
            });
        }
        
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${settings.deepseekApiKey}`
            },
            body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [{ role: 'user', content: content }],
            temperature: 0.3,
            max_tokens: 8000
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            return data.choices[0].message.content;
        }
    } catch (e) {
        console.error("DeepSeek Image error", e);
    }
  }

  // Gemini Fallback
  if (settings.geminiApiKey) {
      const ai = new GoogleGenAI({ apiKey: settings.geminiApiKey });
      const parts: any[] = [{ text: prompt }];
      
      for (const screenshot of screenshots) {
          const base64Data = screenshot.replace(/^data:image\/[a-z]+;base64,/, '');
          parts.push({
              inlineData: {
                  mimeType: 'image/png', // Assumption
                  data: base64Data
              }
          });
      }

      const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: { parts }
      });
      return response.text || "";
  }
  
  throw new Error("No AI API keys configured");
}
