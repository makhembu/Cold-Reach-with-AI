import { Business } from '../types';
import { callHybridAI } from './hybridAI';

export async function chatWithAgent(
  business: Business, 
  message: string, 
  history: Array<{ role: 'user' | 'agent', content: string, model?: string }>
) {
  // Construct context for the AI
  const historyText = history.map(m => `${m.role}: ${m.content}`).join('\n');
  const context = `
    You are an AI assistant analyzing the business "${business.name}" (${business.website}).
    Current Analysis Score: ${business.analysis?.overallScore || 'N/A'}.
    
    Conversation History:
    ${historyText}
    
    User message: ${message}
    
    Respond as the agent. Be helpful, professional, and concise.
  `;
  
  const { response, modelUsed } = await callHybridAI({
    prompt: context,
    taskType: 'chat'
  });
  
  return {
    message: response,
    modelUsed,
    updatedAnalysis: null, // Logic to update analysis could be implemented here
    newScreenshot: null
  };
}