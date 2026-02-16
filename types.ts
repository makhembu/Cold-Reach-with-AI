

export enum BusinessStatus {
  DISCOVERED = 'DISCOVERED',
  ANALYZED = 'ANALYZED',
  GENERATED = 'GENERATED',
  CONTACTED = 'CONTACTED',
  REPLIED = 'REPLIED'
}

export enum Page {
  DASHBOARD = 'DASHBOARD',
  DISCOVERY = 'DISCOVERY',
  ANALYSIS = 'ANALYSIS',
  GENERATION = 'GENERATION',
  OUTREACH = 'OUTREACH',
  SETTINGS = 'SETTINGS',
}

export interface UserProfile {
  name: string;
  businessName: string;
  bio: string;
  website?: string;
  portfolioText?: string;
  onboardingCompleted: boolean;
}

export interface EmailConfig {
  provider: 'gmail' | 'resend' | 'custom_smtp';
  resendApiKey?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  fromEmail: string;
  fromName: string;
}

export interface TechStack {
  frontend: string[];
  backend?: string[];
  cms: string[];
  analytics?: string[];
  hosting?: string[];
  server?: string;
  detectedVersions?: Record<string, string>;
}

export interface NavigationStep {
  url: string;
  status: 'SUCCESS' | 'BLOCKED' | 'ERROR';
  screenshot?: string;
  commentary: string;
  timestamp: number;
}

export interface SecurityVulnerability {
  name: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  exploitScenario: string;
  remediation: string;
}

export interface SecurityAudit {
  https: boolean;
  headers: {
    xFrameOptions: boolean;
    contentSecurityPolicy: boolean;
    strictTransportSecurity: boolean;
    xContentTypeOptions: boolean;
  };
  vulnerabilities: SecurityVulnerability[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface LighthouseData {
  url: string;
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
  pwa?: number;
  screenshot?: string;
  failedAudits?: string[];
}

export interface StrategicAnalysis {
  country: string;
  currency: string;
  localTrends: string; 
  focus: 'SECURITY' | 'DESIGN' | 'SEO' | 'CONVERSION' | 'PERFORMANCE' | 'MOBILE';
  suggestedPrice: string; 
  rationale: string;
  roadmap: string[]; 
}

// --- NEW AGENT INTERFACES ---

export interface ReconnaissancePlan {
  strategy: string;
  reasoning: string;
  tools_needed: Array<{
    tool: string;
    target: string;
    reason: string;
    priority: number;
  }>;
  focus_areas: string[];
  estimated_time: string;
}

export interface CollectedData {
  [url: string]: {
    screenshot?: string;
    html?: string;
    emails?: string[];
    phoneNumbers?: string[];
    techStack?: string[];
    error?: string;
    method?: string;
    [key: string]: any;
  };
}

export interface ProfessionalAssessment {
  what_i_see: string;
  biggest_problem: string;
  why_it_matters: string;
  opportunity_cost: string;
}

export interface ProfessionalAnalysis {
  executive_summary: string;
  overall_score: number;
  verdict: string;
  professional_assessment: ProfessionalAssessment;
  critical_issues: Array<{
    issue: string;
    severity: string;
    business_impact: string;
    technical_details: string;
    fix_complexity: string;
    estimated_fix_time: string;
  }>;
  quick_wins: Array<{
    action: string;
    expected_impact: string;
    effort: string;
    priority: number;
    why_do_this_first: string;
  }>;
  technical_deep_dive: {
    tech_stack: string[];
    performance_metrics: any;
    code_quality: string;
    security_concerns: string[];
    mobile_experience: string;
  };
  recommended_strategy: {
    approach: string;
    reasoning: string;
    estimated_investment: string;
    expected_roi: string;
    timeline: string;
  };
  pitch_angle: {
    hook: string;
    pain_point_to_hit: string;
    proof_point: string;
    urgency_factor: string;
  };
}

export interface OutreachStrategy {
  primary_strategy: string;
  reasoning: string;
  email_subject_line: string;
  opening_hook: string;
  proof_points: string[];
  call_to_action: string;
  mockup_focus: string;
  expected_response_rate: string;
}

export interface FullAnalysisResult {
  reconPlan: ReconnaissancePlan;
  collectedData: CollectedData;
  analysis: ProfessionalAnalysis;
  strategy: OutreachStrategy;
  timestamp: string;
  agentThoughts: string[];
}

export interface AnalysisResult {
  overallScore: number;
  designScore: number;
  uxScore: number;
  mobileScore: number;
  contentScore: number;
  performanceScore: number;
  
  lighthouse?: LighthouseData; 
  secondaryLighthouse?: LighthouseData[]; 
  
  techStack?: TechStack;
  navigationLog?: NavigationStep[];
  
  criticalIssues: string[];
  quickWins: string[];
  needsRedesign: boolean;
  reasoning: string;
  
  security?: SecurityAudit;
  strategy?: StrategicAnalysis;
  
  interventionRequired?: boolean; 
  interventionReason?: string;
  
  // Agent specific optional fields
  professionalAssessment?: ProfessionalAssessment;
  verdict?: string;
  recommendedStrategy?: any;
  pitchAngle?: any;
}

export interface GeneratedAssets {
  mockupUrl?: string; 
  mockupHtml?: string; 
  mockupTimestamp?: number;
  
  securityReportMd?: string; 
  
  emailSubject?: string;
  emailBody?: string;
  generatedAt?: number;
  pitchScore?: number;
  pitchCritique?: string;
  pitchVersionsCount?: number;
}

export interface ContactInfo {
  email: string;
  source: 'scraped' | 'inferred' | 'database';
  verified: boolean;
  confidenceScore: number;
}

export interface ChatMessage {
  role: 'user' | 'agent';
  content: string;
  model?: string;
  timestamp: number;
}

export interface Business {
  id: string;
  name: string;
  website: string;
  email?: string;
  contactInfo?: ContactInfo; 
  phone?: string;
  address?: string;
  category: string;
  location: string;
  status: BusinessStatus;
  foundAt: number;
  screenshot?: string; 
  logs?: string[]; 
  analysis?: AnalysisResult;
  assets?: GeneratedAssets;
  chatHistory?: ChatMessage[];
  
  // New Agent Fields
  agentResult?: FullAnalysisResult;
  agentAnalysis?: FullAnalysisResult;
  
  outreach?: {
    lastContactedAt?: number;
    followUpCount: number;
    status: 'sent' | 'opened' | 'replied' | 'bounced' | null;
  };
}

export interface Settings {
  geminiApiKey: string;
  outscraperApiKey?: string;
  
  // Advanced Agent API Keys
  deepseekApiKey?: string;
  openRouterApiKey?: string; 
  gcpProjectId?: string;
  gcpLocation?: string;
  gcpAccessToken?: string;

  screenshotApiToken?: string;
  apiflashKey?: string;
  screenshotOneAccessKey?: string;
  
  emailConfig: EmailConfig;
  dailyEmailLimit: number;
}

export interface StatCardProps {
  title: string;
  value: string | number;
  icon: any;
  trend?: string;
  color: string;
}