import React, { useState, useEffect, useRef } from 'react';
import { Play, CheckCircle2, AlertTriangle, Shield, Smartphone, Monitor, Loader2, Lock, Search, Code, Terminal, Server, Layers, Globe, Eye, History, Bug, Skull, Zap, Gauge } from 'lucide-react';
import { getBusinesses, updateBusiness } from '../services/storage';
import { performSinglePassScan, withTimeout } from '../services/api';
import { analyzeWebsiteComplete, analyzeBusinessFromSearch } from '../services/geminiService';
import { Business, BusinessStatus, AnalysisResult } from '../types';

const TechBadge: React.FC<{ label: string }> = ({ label }) => (
  <span className="px-2 py-1 bg-slate-800 text-slate-200 text-xs rounded font-mono border border-slate-700">
    {label}
  </span>
);

const VulnerabilityCard = ({ vuln }: { vuln: any }) => (
  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-2">
    <div className="flex justify-between items-start mb-1">
      <span className="font-bold text-red-900 text-sm flex items-center gap-2">
        <Bug size={14} /> {vuln.name}
      </span>
      <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${vuln.severity === 'CRITICAL' ? 'bg-red-600 text-white' : 'bg-red-200 text-red-800'}`}>
        {vuln.severity}
      </span>
    </div>
    <p className="text-xs text-red-700 mb-2">{vuln.description}</p>
  </div>
);

const AnalysisDetail = ({ result, screenshot }: { result: AnalysisResult, screenshot?: string }) => (
  <div className="mt-4 bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
    <div className="bg-slate-900 p-4 border-b border-slate-800">
      <h4 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
        <Server size={14} /> Technology Stack
      </h4>
      <div className="flex flex-wrap gap-2">
         {result.techStack?.frontend?.map((t: string) => <TechBadge key={t} label={t} />)}
         {result.techStack?.cms?.map((t: string) => <TechBadge key={t} label={t} />)}
         {result.techStack?.server && <TechBadge label={result.techStack.server} />}
         {(!result.techStack?.frontend?.length && !result.techStack?.cms?.length) && (
           <span className="text-slate-500 text-xs italic">No explicit technologies detected.</span>
         )}
      </div>
    </div>

    <div className="p-6 flex flex-col lg:flex-row gap-6">
      <div className="lg:w-1/3 shrink-0 space-y-4">
         {screenshot ? (
           <div className="rounded-lg border border-slate-200 shadow-sm overflow-hidden bg-white relative group">
              <img src={screenshot} alt="Site Screenshot" className="w-full object-cover" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium">
                <Eye size={16} className="mr-2" /> Captured Viewport
              </div>
           </div>
         ) : (
           <div className="h-48 bg-slate-200 rounded-lg flex items-center justify-center text-slate-400 text-xs border border-slate-300">
             <div className="text-center p-4">
               <Eye size={24} className="mx-auto mb-2 opacity-50" />
               No Visual Data
             </div>
           </div>
         )}

         {result.security && (
           <div>
             <h5 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-2">
               <Shield size={12} /> Security Scan
             </h5>
             <div className="space-y-1">
               {result.security.vulnerabilities.map((v, i) => (
                 <VulnerabilityCard key={i} vuln={v} />
               ))}
               {result.security.vulnerabilities.length === 0 && (
                 <div className="text-xs text-green-600 bg-green-50 p-2 rounded border border-green-100 flex items-center gap-2">
                   <CheckCircle2 size={12}/> System Secure
                 </div>
               )}
             </div>
           </div>
         )}
      </div>
      
      <div className="flex-1 space-y-4">
        {result.strategy?.focus === 'SECURITY' && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg shadow-sm">
            <div className="flex items-center gap-2 text-red-800 font-bold mb-1">
              <Shield size={18} />
              SECURITY RISK DETECTED
            </div>
            <p className="text-sm text-red-700">
              Vulnerabilities found. Recommended strategy is to pitch immediate remediation.
            </p>
          </div>
        )}

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-orange-500" /> Key Findings
          </h4>
          <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
            {result.criticalIssues.map((issue, i) => (
              <li key={i}>{issue}</li>
            ))}
          </ul>
        </div>
        
        <div className="bg-slate-900 p-4 rounded-lg text-sm text-slate-300 border border-slate-800 flex gap-3 font-mono">
           <Terminal size={16} className="shrink-0 mt-0.5 text-green-400"/>
           <div>
             <strong className="text-green-400">root@coldreach:~#</strong> {result.reasoning}
           </div>
        </div>
      </div>
    </div>
  </div>
);

export const Analysis: React.FC = () => {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const terminalRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    setBusinesses(getBusinesses());
  }, [analyzingId]);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const handleAnalyze = async (business: Business) => {
    setAnalyzingId(business.id);
    setLogs([]);
    const logHistory: string[] = [];
    
    const logAndSave = (msg: string) => {
      const fullMsg = `[${new Date().toLocaleTimeString()}] ${msg}`;
      logHistory.push(fullMsg);
      addLog(msg);
    };

    logAndSave(`Target: ${business.website}`);

    try {
      // Step 1: Single-pass Scan
      logAndSave("Launching scan agent (max 30s)...");
      
      const scanResult = await withTimeout(
        performSinglePassScan(business.website),
        40000, 
        "Website Scan"
      );
      
      if (!scanResult.success || !scanResult.data) {
         logAndSave(`WARN: Direct scan failed (${scanResult.error}). Switching to Search Fallback...`);
         
         const fallbackAnalysis = await analyzeBusinessFromSearch(business);
         logAndSave("Success: Analysis inferred via Google Search.");
         
         updateBusiness(business.id, {
           status: BusinessStatus.ANALYZED,
           analysis: fallbackAnalysis,
           logs: logHistory,
         });
         return;
      }
      
      logAndSave(`✓ Captured Visuals & HTML (${scanResult.data.html.length} chars)`);
      logAndSave(`✓ Metrics: Load ${Math.round(scanResult.data.performance.loadTime)}ms`);

      if (scanResult.data.emails.length > 0) {
        logAndSave(`✓ Contact Found: ${scanResult.data.emails[0]}`);
      }
      
      // Step 2: AI Analysis
      logAndSave("Processing with Gemini 2.5...");
      
      const analysis = await withTimeout(
        analyzeWebsiteComplete(business, scanResult.data),
        60000,
        "AI Analysis"
      );
      
      logAndSave(`✓ Score: ${analysis.overallScore}/100`);
      
      updateBusiness(business.id, {
        status: BusinessStatus.ANALYZED,
        analysis: analysis,
        screenshot: scanResult.data.screenshot,
        email: scanResult.data.emails[0] || business.email,
        logs: logHistory,
        contactInfo: scanResult.data.emails[0] ? {
            email: scanResult.data.emails[0],
            source: 'scraped',
            verified: true,
            confidenceScore: 1
        } : undefined
      });
      
      logAndSave("Complete.");

    } catch (e: any) {
      console.error(e);
      logAndSave(`CRITICAL FAIL: ${e.message}`);
      updateBusiness(business.id, { 
        logs: logHistory,
        status: BusinessStatus.DISCOVERED // Reset status on failure
      });
    } finally {
      setTimeout(() => setAnalyzingId(null), 1000);
    }
  };

  const renderLogs = (businessLogs: string[]) => (
    <div className="w-1/2 bg-black rounded-lg p-4 font-mono text-xs text-green-400 h-32 overflow-y-auto shadow-inner border border-slate-800" ref={terminalRef}>
      {businessLogs.map((log, i) => <div key={i} className="whitespace-nowrap">{log}</div>)}
      {analyzingId && <div className="animate-pulse">_</div>}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Deep Analysis Lab</h2>
        <p className="text-slate-500 mt-1">Single-pass full-stack introspection</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="divide-y divide-slate-100">
          {businesses.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Search size={48} className="mx-auto mb-4 opacity-30" />
              <p>No businesses found. Start in Discovery.</p>
            </div>
          ) : (
            businesses.map((business) => (
              <div key={business.id} className="p-6 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      business.analysis ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {business.analysis ? <CheckCircle2 size={24} /> : <Search size={24} />}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg">{business.name}</h3>
                      <a href={business.website} target="_blank" className="text-sm text-brand-600 hover:underline flex items-center gap-1">
                        {business.website} <Globe size={12}/>
                      </a>
                    </div>
                  </div>

                  {analyzingId === business.id ? (
                     renderLogs(logs)
                  ) : !business.analysis ? (
                    <button onClick={() => handleAnalyze(business)} className="bg-slate-900 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-slate-800 flex items-center gap-2 shadow-lg shadow-slate-200/50">
                      <Play size={16} /> Start Scan
                    </button>
                  ) : (
                    <div className="flex items-center gap-4">
                       <div className="text-right">
                         <span className={`block text-2xl font-bold leading-none ${business.analysis.overallScore < 50 ? 'text-red-600' : 'text-slate-900'}`}>
                           {business.analysis.overallScore}
                         </span>
                         <span className="text-xs text-slate-500 font-medium">SCORE</span>
                      </div>
                    </div>
                  )}
                </div>

                {business.analysis && (
                  <AnalysisDetail result={business.analysis} screenshot={business.screenshot} />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};