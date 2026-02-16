
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
1. screenshot_tool(url) - Captures a visual snapshot of the site.
2. fetch_html(url) - Get HTML, extract emails/phones/tech.

TASK: Create a robust reconnaissance plan.

MANDATORY STRATEGY:
1. ALWAYS target the Homepage for a screenshot and HTML analysis.
2. ALWAYS check for a 'Contact' or 'About' page (e.g., /contact, /about-us) and schedule a 'fetch_html' on it to find hidden emails.
3. If the homepage screenshot is critical, give it priority 1.

Return ONLY valid JSON (no markdown):
{
  "strategy": "Your strategy summary (e.g. 'Scan homepage and check contact page for direct leads')",
  "reasoning": "Why this plan maximizes data collection",
  "tools_needed": [
    {
      "tool": "screenshot_tool",
      "target": "${business.website}",
      "reason": "Visual assessment",
      "priority": 1
    },
    {
      "tool": "fetch_html",
      "target": "${business.website}",
      "reason": "Tech stack & email extraction",
      "priority": 1
    },
    {
      "tool": "fetch_html",
      "target": "${business.website}/contact",
      "reason": "Find direct contact info",
      "priority": 2
    }
  ],
  "focus_areas": ["design", "mobile_responsiveness", "conversion_paths"],
  "estimated_time": "45 seconds"
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
