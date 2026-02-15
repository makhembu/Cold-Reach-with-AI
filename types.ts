
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
  detectedVersions?: Record<string, string>; // e.g. { "WordPress": "5.2" }
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
  exploitScenario: string; // "A bad actor could..."
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

export interface StrategicAnalysis {
  country: string;
  currency: string;
  localTrends: string; 
  focus: 'SECURITY' | 'DESIGN' | 'SEO' | 'CONVERSION';
  suggestedPrice: string; 
  rationale: string;
  roadmap: string[]; 
}

export interface AnalysisResult {
  overallScore: number;
  designScore: number;
  uxScore: number;
  mobileScore: number;
  contentScore: number;
  performanceScore: number;
  
  techStack?: TechStack;
  navigationLog?: NavigationStep[];
  
  criticalIssues: string[];
  quickWins: string[];
  needsRedesign: boolean;
  reasoning: string;
  
  security?: SecurityAudit;
  strategy?: StrategicAnalysis;
  
  interventionRequired?: boolean; // Captcha or login block
  interventionReason?: string;
}

export interface GeneratedAssets {
  mockupUrl?: string; 
  mockupHtml?: string; 
  mockupTimestamp?: number;
  
  securityReportMd?: string; // Markdown report for security focus
  
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

export interface Business {
  id: string;
  name: string;
  website: string;
  email?: string;
  contactInfo?: ContactInfo; // Enhanced contact info
  phone?: string;
  address?: string;
  category: string;
  location: string;
  status: BusinessStatus;
  foundAt: number;
  screenshot?: string; // Main entry screenshot
  logs?: string[]; // Analysis logs
  analysis?: AnalysisResult;
  assets?: GeneratedAssets;
  outreach?: {
    lastContactedAt?: number;
    followUpCount: number;
    status: 'sent' | 'opened' | 'replied' | 'bounced' | null;
  };
}

export interface Settings {
  geminiApiKey: string;
  outscraperApiKey?: string;
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
