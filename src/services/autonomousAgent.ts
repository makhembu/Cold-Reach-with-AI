
import { Business, ReconnaissancePlan, CollectedData, ProfessionalAnalysis, OutreachStrategy, FullAnalysisResult } from '../types';

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

async function withTimeout<T>(
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

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function cleanJSONResponse(response: string): string {
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
  
  const reconPlan = await withTimeout(
    createReconnaissancePlan(business, agentThoughts),
    30000,
    "Reconnaissance planning"
  );
  
  onLog(`Strategy: ${reconPlan.strategy}`);
  onLog(`Tools: ${reconPlan.tools_needed.map((t: any) => t.tool).join(', ')}`);
  
  // PHASE 2: EXECUTE AI'S PLAN
  onLog("🔍 Phase 2: Executing reconnaissance...");
  
  const collectedData = await executeReconnaissancePlan(
    business,
    reconPlan,
    onLog,
    agentThoughts
  );
  
  const dataKeys = Object.keys(collectedData).filter(k => !collectedData[k].error);
  onLog(`✓ Collected ${dataKeys.length} data sources`);
  
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

// Export utilities for use in other modules
export { withTimeout, sleep, cleanJSONResponse };
