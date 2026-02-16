import { Business, ProfessionalAnalysis, OutreachStrategy, CollectedData } from '../types';
import { callHybridAI } from './hybridAI';
import { cleanJSONResponse } from './autonomousAgent';

// ==========================================
// PHASE 3: DEEP PROFESSIONAL ANALYSIS
// ==========================================

export async function performDeepProfessionalAnalysis(
  business: Business,
  data: CollectedData,
  thoughts: string[]
): Promise<ProfessionalAnalysis> {
  
  thoughts.push("Starting analysis...");
  
  const hasScreenshots = Object.values(data).some(d => d.screenshot);
  const hasHTML = Object.values(data).some(d => d.html);
  
  thoughts.push(`Data: Screenshots=${hasScreenshots}, HTML=${hasHTML}`);
  
  const prompt = `You are a senior web design consultant delivering a $500 audit.

CLIENT:
- Name: ${business.name}
- Website: ${business.website}
- Category: ${business.category || 'Unknown'}
- Location: ${business.address || 'Unknown'}

DATA COLLECTED:
${JSON.stringify(data, null, 2)}

TASK: Professional analysis.

BE SPECIFIC, NOT GENERIC:
❌ BAD: "Website lacks mobile responsiveness"
✅ GOOD: "Mobile menu breaks on iPhone due to CSS overflow. 68% of searches are mobile. Killing conversions."

FOCUS ON BUSINESS IMPACT:
❌ BAD: "Slow loading"
✅ GOOD: "8.3s load time. Google prioritizes sub-2s sites. Losing to faster competitors worth $2000+ per conversion."

Return ONLY valid JSON (no markdown):
{
  "executive_summary": "2-3 sentence overview",
  "overall_score": 0-100,
  "verdict": "CRITICAL_REDESIGN_NEEDED" | "SIGNIFICANT_IMPROVEMENTS_NEEDED" | "MINOR_TWEAKS" | "ACTUALLY_PRETTY_GOOD",
  
  "professional_assessment": {
    "what_i_see": "Honest first impression",
    "biggest_problem": "ONE thing hurting them most (specific)",
    "why_it_matters": "Business impact",
    "opportunity_cost": "Revenue/customers losing"
  },
  
  "critical_issues": [
    {
      "issue": "Specific problem with technical details",
      "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
      "business_impact": "How affects revenue/customers",
      "technical_details": "What's broken",
      "fix_complexity": "QUICK_FIX" | "MODERATE" | "REQUIRES_REBUILD",
      "estimated_fix_time": "2 hours | 1 day | 1 week"
    }
  ],
  
  "quick_wins": [
    {
      "action": "Specific actionable change",
      "expected_impact": "What improves with metrics",
      "effort": "LOW" | "MEDIUM" | "HIGH",
      "priority": 1-5,
      "why_do_this_first": "Strategic reasoning"
    }
  ],
  
  "technical_deep_dive": {
    "tech_stack": ["detected technologies"],
    "performance_metrics": {
      "load_time": "measurement",
      "page_size": "size",
      "requests": "number",
      "bottlenecks": ["specific issues"]
    },
    "code_quality": "assessment",
    "security_concerns": ["issues"],
    "mobile_experience": "detailed assessment"
  },
  
  "recommended_strategy": {
    "approach": "REBUILD_FROM_SCRATCH" | "MAJOR_REDESIGN" | "INCREMENTAL_IMPROVEMENTS" | "MAINTENANCE_MODE",
    "reasoning": "Why for THIS business",
    "estimated_investment": "ballpark cost/time",
    "expected_roi": "what they get",
    "timeline": "realistic timeline"
  },
  
  "pitch_angle": {
    "hook": "What makes THEM respond",
    "pain_point_to_hit": "Biggest worry",
    "proof_point": "Specific finding proving expertise",
    "urgency_factor": "Why act now"
  }
}`;

  const screenshots = Object.values(data)
    .filter(d => d.screenshot)
    .map(d => d.screenshot as string);
  
  thoughts.push(`Sending ${screenshots.length} screenshots to AI`);
  
  const { response } = await callHybridAI({ 
    prompt, 
    screenshots, 
    taskType: 'analysis' 
  });
  
  try {
    const analysis = JSON.parse(cleanJSONResponse(response));
    thoughts.push(`Analysis: Score=${analysis.overall_score}`);
    return analysis;
  } catch (e) {
    throw new Error(`Invalid analysis: ${response.substring(0, 200)}`);
  }
}

// ==========================================
// PHASE 4: STRATEGIC DECISION
// ==========================================

export async function determineOutreachStrategy(
  business: Business,
  analysis: ProfessionalAnalysis,
  thoughts: string[]
): Promise<OutreachStrategy> {
  
  thoughts.push("Determining strategy...");
  
  const prompt = `You are a sales strategist for cold outreach.

BUSINESS: ${business.name}
ANALYSIS: ${JSON.stringify(analysis, null, 2)}

TASK: Decide outreach strategy.

Think strategically:
- Are they aware site is bad?
- What would make THEM open email?
- What proof do we have?
- What pain point resonates?

STRATEGIC ANGLES:
- SECURITY_SCARE: Vulnerabilities found
- COMPETITIVE_PRESSURE: Competitors beating them
- REVENUE_OPPORTUNITY: Fix X = Y revenue
- DESIGN_UPGRADE: Site looks outdated
- PERFORMANCE_FIX: Slow site killing SEO
- MOBILE_CRISIS: Mobile broken (critical)

Return ONLY valid JSON (no markdown):
{
  "primary_strategy": "SECURITY_SCARE" | "COMPETITIVE_PRESSURE" | "REVENUE_OPPORTUNITY" | "DESIGN_UPGRADE" | "PERFORMANCE_FIX" | "MOBILE_CRISIS",
  "reasoning": "Why this works for THIS prospect",
  "email_subject_line": "Compelling subject (mention business name)",
  "opening_hook": "First sentence proving we looked (specific)",
  "proof_points": [
    "Specific finding #1",
    "Specific finding #2",
    "Specific finding #3"
  ],
  "call_to_action": "What asking them to do (realistic)",
  "mockup_focus": "What to focus on in redesign mockup",
  "expected_response_rate": "HIGH" | "MEDIUM" | "LOW"
}`;

  thoughts.push("Asking AI for strategy...");
  
  const { response } = await callHybridAI({ prompt, taskType: 'strategy' });
  
  try {
    const strategy = JSON.parse(cleanJSONResponse(response));
    thoughts.push(`Strategy: ${strategy.primary_strategy}`);
    return strategy;
  } catch (e) {
    throw new Error(`Invalid strategy: ${response.substring(0, 200)}`);
  }
}