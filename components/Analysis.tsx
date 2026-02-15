
import React, { useState, useEffect, useRef } from 'react';
import { Play, CheckCircle2, AlertTriangle, Shield, Smartphone, Monitor, Loader2, Lock, Search, Code, Terminal, Server, Layers, Globe, Eye, History, Bug, Skull, Zap, Gauge } from 'lucide-react';
import { getBusinesses, updateBusiness } from '../services/storage';
import { performFullAudit } from '../services/api';
import { runLighthouseAudit, extractRelevantLinks } from '../services/simulation';
import { analyzeWebsiteWithGemini, findAndVerifyEmail } from '../services/geminiService';
import { Business, BusinessStatus, AnalysisResult, LighthouseData } from '../types';

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
    <div className="bg-white p-2 rounded border border-red-100">
       <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase mb-1">
         <Skull size={12} className="text-slate-800" /> Potential Exploit
       </div>
       <p className="text-xs text-slate-800 font-mono italic">"{vuln.exploitScenario}"</p>
    </div>
  </div>
);

const AnalysisDetail = ({ result, screenshot }: { result: AnalysisResult, screenshot?: string }) => (
  <div className="mt-4 bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
    {/* Tech Stack Header */}
    <div className="bg-slate-900 p-4 border-b border-slate-800">
      <h4 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
        <Server size={14} /> Full Stack Enumeration
      </h4>
      <div className="flex flex-wrap gap-2">
         {result.techStack?.frontend?.map((t: string) => <TechBadge key={t} label={t} />)}
         {result.techStack?.cms?.map((t: string) => <TechBadge key={t} label={t} />)}
         {result.techStack?.server && <TechBadge label={result.techStack.server} />}
         {Object.entries(result.techStack?.detectedVersions || {}).map(([soft, ver]) => (
            <span key={soft} className="px-2 py-1 bg-blue-900 text-blue-200 text-xs rounded font-mono border border-blue-800">
              {soft}: {ver as string}
            </span>
         ))}
         {(!result.techStack?.frontend?.length && !result.techStack?.cms?.length) && (
           <span className="text-slate-500 text-xs italic">No explicit technologies detected via headers/DOM.</span>
         )}
      </div>
    </div>

    <div className="p-6 flex flex-col lg:flex-row gap-6">
      <div className="lg:w-1/3 shrink-0 space-y-4">
         {screenshot ? (
           <div className="rounded-lg border border-slate-200 shadow-sm overflow-hidden bg-white relative group">
              <img src={screenshot} alt="Site Screenshot" className="w-full" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium">
                <Eye size={16} className="mr-2" /> Captured Viewport
              </div>
           </div>
         ) : (
           <div className="h-48 bg-slate-200 rounded-lg flex items-center justify-center text-slate-400 text-xs border border-slate-300">
             <div className="text-center p-4">
               <Eye size={24} className="mx-auto mb-2 opacity-50" />
               Visual Scan Failed<br/>(Text Analysis Only)
             </div>
           </div>
         )}

         {/* Security Summary */}
         {result.security && (
           <div>
             <h5 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-2">
               <Shield size={12} /> Active Vulnerability Scan
             </h5>
             <div className="space-y-1">
               {result.security.vulnerabilities.map((v, i) => (
                 <VulnerabilityCard key={i} vuln={v} />
               ))}
               {result.security.vulnerabilities.length === 0 && (
                 <div className="text-xs text-green-600 bg-green-50 p-2 rounded border border-green-100 flex items-center gap-2">
                   <CheckCircle2 size={12}/> No active threats detected on scanned paths.
                 </div>
               )}
             </div>
           </div>
         )}
      </div>
      
      <div className="flex-1 space-y-4">
        {/* Strategy Pivot Alert */}
        {result.strategy?.focus === 'SECURITY' && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg shadow-sm">
            <div className="flex items-center gap-2 text-red-800 font-bold mb-1">
              <Shield size={18} />
              SECURITY FOCUS RECOMMENDED
            </div>
            <p className="text-sm text-red-700 mb-2">
              Critical vulnerabilities found. The generated pitch will leverage these exploits to create urgency.
            </p>
          </div>
        )}

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-orange-500" /> AI Analysis Findings
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
    setLogs([]); // Clear logs for new scan
    const logHistory: string[] = [];
    const logAndSave = (msg: string) => {
      const fullMsg = `[${new Date().toLocaleTimeString()}] ${msg}`;
      logHistory.push(fullMsg);
      addLog(msg);
    };

    logAndSave(`Target Acquired: ${business.website}`);

    try {
      // Step 1: Initial Backend Scan for HTML & Security
      logAndSave("Connecting to backend for security scan...");
      const auditData = await performFullAudit(business.website);
      
      if (auditData.status === 'error') {
         logAndSave(`ERR: Backend Audit failed. ${auditData.reason}`);
         // If generic scan fails, we likely can't do much, but let's try proceeding if we have any fallback logic
         // For now, abort if basic connectivity is dead
         throw new Error(auditData.reason || "Server scan failed");
      }
      
      logAndSave("Security scan complete. Extracting site map...");
      
      // Step 2: Extract Relevant Links from the HTML we just got
      const internalLinks = extractRelevantLinks(auditData.rawHtml || '', business.website);
      logAndSave(`Found ${internalLinks.length} relevant internal pages to audit.`);

      // Step 3: Run Lighthouse Audits on Main + Internal Pages (Sequential/Parallel)
      const pagesToAudit = [business.website, ...internalLinks];
      const lighthouseResults: LighthouseData[] = [];

      for (const url of pagesToAudit) {
        logAndSave(`Running Lighthouse Audit on: ${url}...`);
        const result = await runLighthouseAudit(url);
        if (result.lighthouse.screenshot) {
          lighthouseResults.push(result.lighthouse);
          logAndSave(`Captured screenshot & metrics for ${url}`);
        } else {
          logAndSave(`Failed to capture visual data for ${url}`);
        }
      }

      if (lighthouseResults.length === 0) {
        throw new Error("Lighthouse failed to capture any screenshots.");
      }

      if (auditData.vulnerabilities && auditData.vulnerabilities.length > 0) {
        logAndSave(`ALERT: Detected ${auditData.vulnerabilities.length} active vulnerabilities.`);
      }

      // Step 4: Email Discovery
      logAndSave("Scanning DOM for contact vectors...");
      const htmlToScan = auditData.rawHtml || "";
      const contactInfo = await findAndVerifyEmail(business, htmlToScan);
      
      if (contactInfo) {
        logAndSave(`CONTACT: ${contactInfo.email} (Source: ${contactInfo.source})`);
      }

      // Step 5: AI Synthesis (Gemini)
      logAndSave("Synthesizing multi-page audit data with Gemini 2.5...");
      
      // Use the Homepage screenshot as the primary one for the record, but pass all to Gemini
      const primaryScreenshot = lighthouseResults[0].screenshot;

      const analysis = await analyzeWebsiteWithGemini(business, lighthouseResults, htmlToScan);
      
      // Inject Main Page Lighthouse Data into Analysis for record keeping
      analysis.lighthouse = lighthouseResults[0];
      analysis.performanceScore = lighthouseResults[0].performance;

      // Merge Active Scan Vulnerabilities into Gemini's result
      if (auditData.vulnerabilities && auditData.vulnerabilities.length > 0) {
          analysis.security = {
              ...analysis.security,
              riskLevel: auditData.vulnerabilities.some((v: any) => v.severity === 'CRITICAL') ? 'CRITICAL' : 'HIGH',
              vulnerabilities: [
                  ...auditData.vulnerabilities,
                  ...(analysis.security?.vulnerabilities || [])
              ]
          } as any;
          
          analysis.strategy = {
              ...analysis.strategy,
              focus: 'SECURITY',
              rationale: 'Active vulnerabilities detected. Immediate patch required.'
          } as any;
      }

      // Merge Tech Stack
      if (auditData.techStack) {
          analysis.techStack = {
              frontend: Array.from(new Set([...(analysis.techStack?.frontend || []), ...(auditData.techStack.frontend || [])])),
              backend: Array.from(new Set([...(analysis.techStack?.backend || []), ...(auditData.techStack.backend || [])])),
              cms: Array.from(new Set([...(analysis.techStack?.cms || []), ...(auditData.techStack.cms || [])])),
              analytics: Array.from(new Set([...(analysis.techStack?.analytics || []), ...(auditData.techStack.analytics || [])])),
              hosting: Array.from(new Set([...(analysis.techStack?.hosting || []), ...(auditData.techStack.hosting || [])])),
              server: auditData.techStack.server || analysis.techStack?.server,
              detectedVersions: { ...analysis.techStack?.detectedVersions, ...auditData.techStack.detectedVersions }
          };
      }

      logAndSave("Report generated. Saving to local database.");
      
      updateBusiness(business.id, {
        status: BusinessStatus.ANALYZED,
        analysis: analysis,
        screenshot: primaryScreenshot, // Save the lighthouse screenshot!
        logs: logHistory,
        email: contactInfo?.email || business.email,
        contactInfo: contactInfo || undefined
      });
      
    } catch (e: any) {
      console.error(e);
      logAndSave(`CRITICAL FAIL: ${e.message}`);
      updateBusiness(business.id, { logs: logHistory });
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
        <p className="text-slate-500 mt-1">Full-stack introspection and security auditing</p>
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
                      {business.contactInfo?.email && (
                          <div className="flex items-center gap-1 mt-1">
                             <span className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 border border-slate-200">{business.contactInfo.email}</span>
                             {business.contactInfo.verified && (
                               <span title="Verified">
                                 <CheckCircle2 size={12} className="text-green-500" />
                               </span>
                             )}
                          </div>
                      )}
                    </div>
                  </div>

                  {analyzingId === business.id ? (
                     renderLogs(logs)
                  ) : !business.analysis ? (
                    <button onClick={() => handleAnalyze(business)} className="bg-slate-900 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-slate-800 flex items-center gap-2 shadow-lg shadow-slate-200/50">
                      <Play size={16} /> Full Audit
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

                {business.analysis && !business.analysis.interventionRequired && (
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
