
import { Business, ReconnaissancePlan, CollectedData, ProfessionalAnalysis, OutreachStrategy, FullAnalysisResult } from '../types';

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operationName: string
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error(`${operationName} timeout (${timeoutMs}ms)`)),
      timeoutMs
    )
  );
  return Promise.race([promise, timeoutPromise]);
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function cleanJSONResponse(response: string): string {
  let cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  cleaned = cleaned.trim();
  return cleaned;
}

// ==========================================
// MAIN AUTONOMOUS AGENT FUNCTION
// ==========================================

export async function analyzeAsAutonomousAgent(
  business: Business,
  onLog: (msg: string) => void
): Promise<FullAnalysisResult> {
  
  const agentThoughts: string[] = [];
  
  onLog("🧠 Autonomous AI Agent initializing...");
  agentThoughts.push("Agent activated for: " + business.name);
  
  // Import functions from other modules
  const { createReconnaissancePlan, executeReconnaissancePlan } = await import('./agentPhases');
  const { performDeepProfessionalAnalysis, determineOutreachStrategy } = await import('./agentAnalysis');
  
  // PHASE 1: AI RECONNAISSANCE PLANNING
  onLog("📋 Phase 1: Creating reconnaissance strategy...");
  
  let reconPlan: ReconnaissancePlan;
  try {
    reconPlan = await withTimeout(
      createReconnaissancePlan(business, agentThoughts),
      30000,
      "Reconnaissance planning"
    );
    onLog(`Strategy: ${reconPlan.strategy}`);
  } catch (e: any) {
    onLog(`⚠️ Planning failed: ${e.message}. Using default plan.`);
    reconPlan = {
      strategy: "Default scan due to planning failure",
      reasoning: "Fallback",
      tools_needed: [{ tool: "fetch_html", target: business.website, reason: "Backup", priority: 1 }],
      focus_areas: ["basic_check"],
      estimated_time: "30s"
    };
  }
  
  // PHASE 2: EXECUTE AI'S PLAN
  onLog("🔍 Phase 2: Executing reconnaissance...");
  
  const collectedData = await executeReconnaissancePlan(
    business,
    reconPlan,
    onLog,
    agentThoughts
  );
  
  // Filter for valid data, but be permissive - if we got a screenshot OR html, keep it
  const dataKeys = Object.keys(collectedData).filter(k => {
    const d = collectedData[k];
    const hasScreenshot = !!d.screenshot && d.screenshot.length > 100;
    const hasHtml = !!d.html && d.html.length > 50;
    return hasScreenshot || hasHtml;
  });

  if (dataKeys.length === 0) {
      onLog("⚠️ No valid data collected. Proceeding with limited inference.");
      // Create a dummy data point so analysis doesn't crash
      collectedData[business.website] = {
          html: '',
          error: 'All collection methods failed',
          emails: [],
          phoneNumbers: []
      };
  } else {
      onLog(`✓ Collected ${dataKeys.length} data sources`);
  }
  
  // PHASE 3: DEEP PROFESSIONAL ANALYSIS
  onLog("🔬 Phase 3: Deep analysis...");
  
  const analysis = await withTimeout(
    performDeepProfessionalAnalysis(business, collectedData, agentThoughts),
    90000,
    "Analysis"
  );
  
  onLog(`Score: ${analysis.overall_score}/100`);
  onLog(`Verdict: ${analysis.verdict}`);
  
  // PHASE 4: STRATEGIC DECISION
  onLog("🎯 Phase 4: Strategy determination...");
  
  const strategy = await withTimeout(
    determineOutreachStrategy(business, analysis, agentThoughts),
    30000,
    "Strategy"
  );
  
  onLog(`Strategy: ${strategy.primary_strategy}`);
  onLog("✅ Complete!");
  
  return {
    reconPlan,
    collectedData,
    analysis,
    strategy,
    timestamp: new Date().toISOString(),
    agentThoughts
  };
}
