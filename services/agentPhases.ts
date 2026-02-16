import { Business, ReconnaissancePlan, CollectedData } from '../types';
import { callHybridAI } from './hybridAI';
import { captureScreenshotAPI, captureScreenshotAPIFlash, fetchAndAnalyzeHTML } from './dataCollectionTools';
import { cleanJSONResponse, sleep } from './autonomousAgent';

export async function createReconnaissancePlan(
  business: Business,
  thoughts: string[]
): Promise<ReconnaissancePlan> {
  
  const prompt = `You are a senior web design consultant analyzing a potential client.

TARGET:
- Name: ${business.name}
- Website: ${business.website}
- Category: ${business.category || 'Unknown'}
- Location: ${business.address || 'Unknown'}

AVAILABLE TOOLS:
1. screenshot_api(url) - ScreenshotAPI.net
2. screenshot_apiflash(url) - ApiFlash
3. fetch_html(url) - Get HTML, extract emails/phones/tech

TASK: Create reconnaissance plan.

Think strategically:
- What data do I NEED?
- Homepage screenshot is obvious, but what else?
- Should I check /services, /contact pages?
- Category-specific concerns? (restaurants→mobile, lawyers→security)

Be SMART. Don't waste API calls.

Return ONLY valid JSON (no markdown):
{
  "strategy": "Your approach in 2-3 sentences",
  "reasoning": "Why this makes sense for THIS business",
  "tools_needed": [
    {
      "tool": "screenshot_api",
      "target": "${business.website}",
      "reason": "Specific reason",
      "priority": 1
    },
    {
      "tool": "fetch_html",
      "target": "${business.website}",
      "reason": "Specific reason",
      "priority": 2
    }
  ],
  "focus_areas": ["design", "mobile", "performance"],
  "estimated_time": "90 seconds"
}`;

  thoughts.push("Creating plan...");
  
  const { response } = await callHybridAI({ prompt, taskType: 'planning' });
  
  try {
    const plan = JSON.parse(cleanJSONResponse(response));
    thoughts.push(`Plan: ${plan.strategy}`);
    return plan;
  } catch (e) {
    throw new Error(`Invalid plan: ${response.substring(0, 200)}`);
  }
}

export async function executeReconnaissancePlan(
  business: Business,
  plan: ReconnaissancePlan,
  onLog: (msg: string) => void,
  thoughts: string[]
): Promise<CollectedData> {
  
  const collectedData: CollectedData = {};
  
  const sortedTools = [...plan.tools_needed].sort((a, b) => a.priority - b.priority);
  
  for (const tool of sortedTools) {
    onLog(`  → ${tool.tool} on ${tool.target}...`);
    thoughts.push(`Executing: ${tool.tool}`);
    
    try {
      switch (tool.tool) {
        case 'screenshot_api':
          const screenshot1 = await captureScreenshotAPI(tool.target);
          collectedData[tool.target] = {
            ...collectedData[tool.target],
            screenshot: screenshot1,
            method: 'screenshotapi'
          };
          onLog(`    ✓ Screenshot captured (API)`);
          break;
          
        case 'screenshot_apiflash':
          const screenshot2 = await captureScreenshotAPIFlash(tool.target);
          collectedData[tool.target] = {
            ...collectedData[tool.target],
            screenshot: screenshot2,
            method: 'apiflash'
          };
          onLog(`    ✓ Screenshot captured (Flash)`);
          break;
          
        case 'fetch_html':
          const htmlData = await fetchAndAnalyzeHTML(tool.target);
          collectedData[tool.target] = {
            ...collectedData[tool.target],
            ...htmlData
          };
          onLog(`    ✓ HTML analyzed (${htmlData.emails?.length || 0} emails)`);
          break;
      }
      
      thoughts.push(`Success: ${tool.tool}`);
      
    } catch (e: any) {
      onLog(`    ✗ Failed: ${e.message}`);
      collectedData[tool.target] = {
        ...collectedData[tool.target],
        error: e.message
      };
      thoughts.push(`Failed: ${tool.tool}`);
    }
    
    await sleep(500);
  }
  
  return collectedData;
}