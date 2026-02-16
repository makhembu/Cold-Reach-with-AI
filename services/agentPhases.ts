
import { Business, ReconnaissancePlan, CollectedData } from '../types';
import { callHybridAI } from './hybridAI';
import { captureBestScreenshot } from './screenshotTools';
import { fetchAndAnalyzeHTML } from './dataCollectionTools';
import { cleanJSONResponse, sleep } from './autonomousAgent';

// ==========================================
// PHASE 1: RECONNAISSANCE PLANNING
// ==========================================

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
1. screenshot_tool(url) - Captures a visual snapshot of the site (auto-selects best service).
2. fetch_html(url) - Get HTML, extract emails/phones/tech.

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
      "tool": "screenshot_tool",
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

// ==========================================
// PHASE 2: EXECUTE RECONNAISSANCE PLAN
// ==========================================

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
      let screenshot = null;
      
      // Normalize screenshot tools to the best available strategy
      if (tool.tool.includes('screenshot')) {
          screenshot = await captureBestScreenshot(tool.target);
          collectedData[tool.target] = {
            ...collectedData[tool.target],
            screenshot: screenshot,
            method: 'universal_screenshot'
          };
          onLog(`    ✓ Screenshot captured`);
      } 
      else if (tool.tool === 'fetch_html') {
          const htmlData = await fetchAndAnalyzeHTML(tool.target);
          collectedData[tool.target] = {
            ...collectedData[tool.target],
            ...htmlData
          };
          onLog(`    ✓ HTML analyzed (${htmlData.emails?.length || 0} emails)`);
      }
      else {
         onLog(`    ? Unknown tool: ${tool.tool}`);
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
