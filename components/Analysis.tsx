
import React, { useState, useEffect, useRef } from 'react';
import { Play, Bot, Brain, MessageSquare, RefreshCw, Terminal, AlertCircle, CheckCircle2, Activity, Database, Globe, Zap, TrendingUp, Clock, Cpu, ChevronDown, ChevronRight, Eye, FileCode, X } from 'lucide-react';
import { getBusinesses, updateBusiness } from '../services/storage';
import { analyzeAsAutonomousAgent } from '../services/autonomousAgent';
import { chatWithAgent } from '../services/agentChat';
import { getAPIUsageStatus } from '../services/hybridAI';
import { Business, BusinessStatus, ChatMessage, CollectedData } from '../types';

const AgentStatus = ({ status }: { status: string }) => {
  const configs: Record<string, any> = {
    idle: { color: 'text-slate-400', bg: 'bg-slate-900/50', icon: Bot, text: 'Ready' },
    thinking: { color: 'text-blue-400', bg: 'bg-blue-900/20', icon: Brain, text: 'Planning', pulse: true },
    analyzing: { color: 'text-purple-400', bg: 'bg-purple-900/20', icon: Activity, text: 'Analyzing', pulse: true },
    complete: { color: 'text-green-400', bg: 'bg-green-900/20', icon: CheckCircle2, text: 'Complete' },
    error: { color: 'text-red-400', bg: 'bg-red-900/20', icon: AlertCircle, text: 'Failed' }
  };
  const c = configs[status] || configs.idle;
  const Icon = c.icon;
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${c.bg} border border-slate-700`}>
      <Icon size={16} className={`${c.color} ${c.pulse ? 'animate-pulse' : ''}`} />
      <span className={`text-xs font-bold ${c.color}`}>{c.text}</span>
    </div>
  );
};

const ModelBadge = ({ model }: { model: string }) => {
  const isDeepSeek = model.toLowerCase().includes('deepseek');
  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold uppercase ${
      isDeepSeek 
        ? 'bg-purple-900/30 text-purple-300 border border-purple-700/50' 
        : 'bg-blue-900/30 text-blue-300 border border-blue-700/50'
    }`}>
      <Cpu size={10} />
      {model}
    </div>
  );
};

const TerminalLogs = ({ logs, modelUsed, collapsed = false }: { logs: string[], modelUsed?: string, collapsed?: boolean }) => {
  const [isOpen, setIsOpen] = useState(!collapsed);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { 
    if (isOpen && ref.current) ref.current.scrollTop = ref.current.scrollHeight; 
  }, [logs, isOpen]);

  // If logs update and we are in "live" mode (not collapsed initially), auto scroll
  useEffect(() => {
     if(!collapsed && ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [logs, collapsed]);

  if (logs.length === 0) return null;

  return (
    <div className="bg-slate-950 rounded-lg border border-slate-800 overflow-hidden mb-4">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="bg-slate-900 px-3 py-2 border-b border-slate-800 flex items-center justify-between cursor-pointer hover:bg-slate-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Terminal size={12} className="text-green-400" />
          <span className="text-xs font-mono text-slate-400">System Logs ({logs.length})</span>
          {isOpen ? <ChevronDown size={12} className="text-slate-500" /> : <ChevronRight size={12} className="text-slate-500" />}
        </div>
        {modelUsed && <ModelBadge model={modelUsed} />}
      </div>
      
      {isOpen && (
        <div ref={ref} className="p-3 h-48 overflow-y-auto font-mono text-xs text-green-400 space-y-0.5 scrollbar-thin scrollbar-thumb-slate-700">
          {logs.map((log, i) => (
            <div key={i} className="break-all whitespace-pre-wrap border-l-2 border-slate-800 pl-2 mb-1">
               <span className="opacity-50 select-none">›</span> {log}
            </div>
          ))}
          <div className="animate-pulse">_</div>
        </div>
      )}
    </div>
  );
};

const DataInspector = ({ data, onClose }: { data: CollectedData, onClose: () => void }) => {
  const [selectedUrl, setSelectedUrl] = useState(Object.keys(data)[0]);
  const currentData = data[selectedUrl];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 w-full max-w-5xl h-[85vh] rounded-xl border border-slate-800 flex flex-col shadow-2xl animate-in fade-in slide-in-from-bottom-4">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950 rounded-t-xl">
           <h3 className="font-bold text-white flex items-center gap-2">
             <Database size={16} className="text-blue-400" /> Raw Intelligence Data
           </h3>
           <button onClick={onClose}><X size={20} className="text-slate-500 hover:text-white" /></button>
        </div>
        <div className="flex-1 flex overflow-hidden">
           {/* Sidebar URLs */}
           <div className="w-64 bg-slate-950 border-r border-slate-800 p-2 overflow-y-auto">
              {Object.keys(data).map(url => (
                <button 
                  key={url}
                  onClick={() => setSelectedUrl(url)}
                  className={`w-full text-left p-3 rounded-lg text-xs font-mono break-all mb-1 transition-colors ${selectedUrl === url ? 'bg-blue-900/30 text-blue-300 border border-blue-800' : 'text-slate-500 hover:bg-slate-900'}`}
                >
                  {url}
                </button>
              ))}
           </div>
           {/* Content */}
           <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-900">
              {!currentData ? (
                <div className="text-center text-slate-500 mt-20">Select a source to view data</div>
              ) : (
                <>
                  {/* Screenshot */}
                  {currentData.screenshot && (
                    <div className="space-y-2">
                       <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2"><Eye size={12}/> Visual Capture</h4>
                       <img src={currentData.screenshot} className="w-full rounded border border-slate-700 shadow-lg" alt="Capture" />
                    </div>
                  )}
                  
                  {/* Extracted Info */}
                  <div className="grid grid-cols-2 gap-4">
                     <div className="bg-slate-950 p-4 rounded border border-slate-800">
                        <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Emails Found</h4>
                        {currentData.emails && currentData.emails.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {currentData.emails.map((e:string, i:number) => <span key={i} className="text-xs bg-slate-900 text-slate-300 px-2 py-1 rounded border border-slate-700">{e}</span>)}
                          </div>
                        ) : <span className="text-xs text-slate-600">None detected</span>}
                     </div>
                     <div className="bg-slate-950 p-4 rounded border border-slate-800">
                        <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Tech Stack</h4>
                        {currentData.techStack && currentData.techStack.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {currentData.techStack.map((t:string, i:number) => <span key={i} className="text-xs bg-slate-900 text-slate-300 px-2 py-1 rounded border border-slate-700">{t}</span>)}
                          </div>
                        ) : <span className="text-xs text-slate-600">Unknown</span>}
                     </div>
                  </div>

                  {/* HTML Viewer */}
                  <div className="space-y-2">
                     <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center justify-between">
                       <span className="flex items-center gap-2"><FileCode size={12}/> HTML Content</span>
                       <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400">{currentData.html?.length || 0} chars</span>
                     </h4>
                     <div className="h-64 bg-slate-950 rounded border border-slate-800 p-3 overflow-auto relative group">
                        {currentData.html ? (
                            <pre className="text-[10px] font-mono text-slate-400 whitespace-pre-wrap break-all">
                                {currentData.html}
                            </pre>
                        ) : (
                            <div className="text-slate-600 text-xs italic">No HTML content captured</div>
                        )}
                     </div>
                  </div>
                </>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

const AgentChat = ({ business, onUpdate }: { business: Business, onUpdate: () => void }) => {
  const [messages, setMessages] = useState<ChatMessage[]>(business.chatHistory || []);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => { 
    setMessages(business.chatHistory || []);
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; 
  }, [business.id, business.chatHistory]);
  
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [messages]);
  
  const send = async () => {
    if (!input.trim() || isThinking) return;
    const msg = input.trim();
    setInput('');
    
    const newUserMsg: ChatMessage = { role: 'user', content: msg, timestamp: Date.now() };
    const newHistory = [...messages, newUserMsg];
    setMessages(newHistory);
    updateBusiness(business.id, { chatHistory: newHistory });
    setIsThinking(true);
    
    try {
      const res = await chatWithAgent(business, msg, newHistory);
      const newAgentMsg: ChatMessage = { 
        role: 'agent', 
        content: res.message, 
        model: res.modelUsed, 
        timestamp: Date.now() 
      };
      
      const finalHistory = [...newHistory, newAgentMsg];
      setMessages(finalHistory);
      updateBusiness(business.id, { chatHistory: finalHistory });
      
      if (res.updatedAnalysis) {
        onUpdate();
      }
    } catch (e: any) {
      const errorMsg: ChatMessage = { role: 'agent', content: `Error: ${e.message}`, timestamp: Date.now() };
      const errorHistory = [...newHistory, errorMsg];
      setMessages(errorHistory);
      updateBusiness(business.id, { chatHistory: errorHistory });
    } finally {
      setIsThinking(false);
    }
  };
  
  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-lg overflow-hidden">
      <div className="bg-slate-900 px-3 py-2 border-b border-slate-800 flex items-center gap-2">
        <MessageSquare size={14} className="text-blue-400" />
        <span className="text-xs font-bold text-slate-300">Chat with Agent</span>
        <span className="ml-auto text-[10px] text-slate-500">Hybrid AI</span>
      </div>
      <div ref={ref} className="h-48 overflow-y-auto p-3 space-y-2 scrollbar-thin scrollbar-thumb-slate-700">
        {messages.length === 0 && (
          <div className="text-center text-slate-500 text-xs py-4">
            <Bot size={24} className="mx-auto mb-2 opacity-30" />
            <p>Ask: "Can you check mobile?" or "Re-analyze with screenshots"</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'flex-col'}`}>
            <div className={`max-w-[85%] rounded-lg p-2 text-xs ${m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-200'}`}>
              {m.content}
            </div>
            {m.model && <ModelBadge model={m.model} />}
          </div>
        ))}
        {isThinking && (
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" />
            <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        )}
      </div>
      <div className="border-t border-slate-800 p-2 flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && send()}
          placeholder="Ask agent..."
          className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-blue-500 transition-colors"
          disabled={isThinking}
        />
        <button onClick={send} disabled={isThinking || !input.trim()} className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white px-3 py-1.5 rounded text-xs font-medium">
          Send
        </button>
      </div>
    </div>
  );
};

const AnalysisDisplay = ({ analysis, business, onInspect }: { analysis: any, business: Business, onInspect: () => void }) => {
  if (!analysis.professionalAssessment) return null;
  const verdictColors: Record<string, string> = {
    'CRITICAL_REDESIGN_NEEDED': 'from-red-900/40 to-red-950/40 border-red-700/50',
    'SIGNIFICANT_IMPROVEMENTS_NEEDED': 'from-orange-900/40 to-orange-950/40 border-orange-700/50',
    'MINOR_TWEAKS': 'from-yellow-900/40 to-yellow-950/40 border-yellow-700/50',
    'ACTUALLY_PRETTY_GOOD': 'from-green-900/40 to-green-950/40 border-green-700/50'
  };
  
  // Visual Fallback Logic
  const visualContent = () => {
    if (business.screenshot) {
      return (
        <img 
          src={business.screenshot} 
          alt="Site" 
          className="w-32 h-20 object-cover rounded border border-white/20 hover:scale-150 transition-transform origin-top-right shadow-xl" 
        />
      );
    }
    
    // Check for HTML as fallback
    const hasHtml = Object.values(business.agentAnalysis?.collectedData || {}).some((d: any) => d.html && d.html.length > 500);
    
    if (hasHtml) {
      const htmlData = Object.values(business.agentAnalysis?.collectedData || {}).find((d: any) => d.html)?.html;
      return (
        <div className="w-32 h-20 rounded border border-white/20 overflow-hidden bg-white relative group">
          <div className="absolute inset-0 bg-transparent z-10 group-hover:hidden"></div>
          <iframe 
             srcDoc={htmlData} 
             title="Preview"
             className="w-[400%] h-[400%] transform scale-25 origin-top-left pointer-events-none"
             sandbox=""
          />
          <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[8px] p-0.5 text-center font-bold">
            Live HTML Preview
          </div>
        </div>
      );
    }

    return (
      <div className="w-32 h-20 rounded border border-slate-700 bg-slate-900 flex flex-col items-center justify-center text-slate-500">
        <Eye size={16} />
        <span className="text-[10px] mt-1">No Visuals</span>
      </div>
    );
  };

  const vc = verdictColors[analysis.verdict] || verdictColors.MINOR_TWEAKS;
  
  return (
    <div className="space-y-3">
      <div className={`bg-gradient-to-br ${vc} rounded-lg border p-4`}>
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 pr-4">
            <div className="flex items-center gap-3">
                <div className="text-4xl font-black text-slate-100">{analysis.overallScore}<span className="text-xl opacity-50">/100</span></div>
                {business.agentAnalysis && (
                  <button 
                    onClick={onInspect}
                    className="flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded text-[10px] font-bold border border-white/10 transition-colors"
                  >
                    <Database size={10} /> Inspect Data
                  </button>
                )}
            </div>
            <div className="text-xs opacity-80 uppercase tracking-wider font-bold text-slate-200 mt-1">{analysis.verdict?.replace(/_/g, ' ')}</div>
          </div>
          {visualContent()}
        </div>
        <p className="text-xs text-slate-200 opacity-90">{analysis.professionalAssessment.what_i_see}</p>
      </div>
      
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="bg-slate-900/50 border border-red-800/30 rounded p-2">
          <div className="flex items-center gap-1 mb-1"><AlertCircle size={12} className="text-red-400" /><span className="font-bold text-red-300 uppercase text-[10px]">Problem</span></div>
          <p className="text-slate-300">{analysis.professionalAssessment.biggest_problem}</p>
        </div>
        <div className="bg-slate-900/50 border border-orange-800/30 rounded p-2">
          <div className="flex items-center gap-1 mb-1"><TrendingUp size={12} className="text-orange-400" /><span className="font-bold text-orange-300 uppercase text-[10px]">Impact</span></div>
          <p className="text-slate-300">{analysis.professionalAssessment.why_it_matters}</p>
        </div>
        <div className="bg-slate-900/50 border border-yellow-800/30 rounded p-2">
          <div className="flex items-center gap-1 mb-1"><Clock size={12} className="text-yellow-400" /><span className="font-bold text-yellow-300 uppercase text-[10px]">Cost</span></div>
          <p className="text-slate-300">{analysis.professionalAssessment.opportunity_cost}</p>
        </div>
      </div>
      
      {analysis.recommendedStrategy && (
        <div className="bg-blue-950/30 border border-blue-800/30 rounded p-3">
          <div className="flex items-center gap-1 mb-2"><Zap size={14} className="text-blue-400" /><span className="text-xs font-bold text-blue-300">Strategy</span></div>
          <p className="text-xs text-slate-300 mb-2">{analysis.recommendedStrategy.reasoning}</p>
          <div className="grid grid-cols-3 gap-2 text-[10px]">
            <div><span className="text-slate-500 uppercase">Investment</span><p className="text-slate-200 font-medium">{analysis.recommendedStrategy.estimated_investment}</p></div>
            <div><span className="text-slate-500 uppercase">Timeline</span><p className="text-slate-200 font-medium">{analysis.recommendedStrategy.timeline}</p></div>
            <div><span className="text-slate-500 uppercase">ROI</span><p className="text-slate-200 font-medium">{analysis.recommendedStrategy.expected_roi}</p></div>
          </div>
        </div>
      )}
    </div>
  );
};

export const Analysis: React.FC = () => {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('idle');
  const [liveLogs, setLiveLogs] = useState<string[]>([]);
  const [currentModel, setCurrentModel] = useState<string>('');
  const [inspectingData, setInspectingData] = useState<CollectedData | null>(null);
  const [usage, setUsage] = useState({ 
    gemini: { used: 0, limit: 1500, remaining: 1500 }, 
    deepseek: { used: 0, limit: 999999, remaining: 999999 },
    openrouter: { used: 0, limit: 50, remaining: 50 }
  });
  
  useEffect(() => { 
    setBusinesses(getBusinesses()); 
    setUsage(getAPIUsageStatus()); 
  }, [analyzingId]);
  
  const analyze = async (business: Business) => {
    setAnalyzingId(business.id);
    setLiveLogs([]);
    setStatus('thinking');
    const logHistory: string[] = [];
    
    const log = (msg: string) => {
      const full = `[${new Date().toLocaleTimeString()}] ${msg}`;
      logHistory.push(full);
      setLiveLogs(p => [...p, full]);
      if (msg.includes('Phase 3')) setStatus('analyzing');
    };
    
    try {
      const result = await analyzeAsAutonomousAgent(business, log);
      
      const analysisResult: any = {
        overallScore: result.analysis.overall_score,
        criticalIssues: result.analysis.critical_issues?.map((i: any) => i.issue) || [],
        quickWins: result.analysis.quick_wins?.map((w: any) => w.action) || [],
        reasoning: result.analysis.executive_summary,
        professionalAssessment: result.analysis.professional_assessment,
        verdict: result.analysis.verdict,
        recommendedStrategy: result.analysis.recommended_strategy,
        pitchAngle: result.analysis.pitch_angle,
        strategy: {
            focus: 'DESIGN',
            suggestedPrice: result.analysis.recommended_strategy.estimated_investment,
            rationale: result.strategy.reasoning,
            roadmap: result.analysis.recommended_strategy.approach.split('_'),
            country: 'US',
            currency: 'USD',
            localTrends: ''
        }
      };
      
      const screenshot = Object.values(result.collectedData).find((d: any) => d.screenshot)?.screenshot;
      const email = Object.values(result.collectedData).flatMap((d: any) => d.emails || []).find(e => e) || business.email;
      
      updateBusiness(business.id, {
        status: BusinessStatus.ANALYZED,
        analysis: analysisResult,
        screenshot,
        email,
        logs: logHistory, // Persist logs here
        agentAnalysis: result as any
      });
      setStatus('complete');
    } catch (e: any) {
      log(`❌ FAILED: ${e.message}`);
      updateBusiness(business.id, { 
        status: BusinessStatus.DISCOVERED,
        logs: logHistory 
      });
      setStatus('error');
    } finally {
      setTimeout(() => { 
        setAnalyzingId(null); 
        setStatus('idle'); 
        setUsage(getAPIUsageStatus()); 
      }, 2000);
    }
  };
  
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 rounded-xl overflow-hidden">
      {inspectingData && (
        <DataInspector 
          data={inspectingData} 
          onClose={() => setInspectingData(null)} 
        />
      )}
      
      <div className="max-w-6xl mx-auto p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">Hybrid AI Agent Lab</h1>
            <p className="text-xs text-slate-400">Gemini + DeepSeek Tag Team</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right text-[10px]">
              <div className="text-blue-400 font-bold">Gemini: {usage.gemini.used} used</div>
              <div className="text-purple-400 font-bold">DeepSeek (GCP): {usage.deepseek.used} used</div>
              {usage.openrouter.used > 0 && (
                <div className="text-orange-400 font-bold">DeepSeek (OpenRouter): {usage.openrouter.used}/50</div>
              )}
            </div>
            <AgentStatus status={status} />
          </div>
        </div>
        
        {businesses.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-8 text-center">
            <Database size={32} className="mx-auto mb-2 text-slate-700" />
            <p className="text-slate-500 text-sm">No businesses found. Add in Discovery.</p>
          </div>
        ) : (
          businesses.map((business) => (
            <div key={business.id} className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden mb-4">
              <div className="p-4 border-b border-slate-800 flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-100">{business.name}</h3>
                  <a href={business.website} target="_blank" className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1">
                    <Globe size={12} /> {business.website}
                  </a>
                </div>
                {analyzingId === business.id ? (
                  <AgentStatus status={status} />
                ) : !business.analysis ? (
                  <button onClick={() => analyze(business)} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all">
                    <Play size={14} /> Launch Agent
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="text-2xl font-black text-slate-100">{business.analysis.overallScore}</div>
                    <button onClick={() => analyze(business)} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded text-xs flex items-center gap-1 border border-slate-700 transition-all">
                      <RefreshCw size={12} /> Re-analyze
                    </button>
                  </div>
                )}
              </div>
              
              {/* Logs Section */}
              <div className="px-4 pt-2">
                {(analyzingId === business.id || (business.logs && business.logs.length > 0)) && (
                   <TerminalLogs 
                      logs={analyzingId === business.id ? liveLogs : (business.logs || [])} 
                      modelUsed={analyzingId === business.id ? currentModel : undefined}
                      collapsed={analyzingId !== business.id} // Collapse by default if not running
                   />
                )}
              </div>
              
              {business.analysis && analyzingId !== business.id && (
                <div className="p-4 pt-0 space-y-4">
                  <AnalysisDisplay 
                    analysis={business.analysis} 
                    business={business} 
                    onInspect={() => setInspectingData(business.agentAnalysis?.collectedData || null)}
                  />
                  <AgentChat business={business} onUpdate={() => setBusinesses(getBusinesses())} />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
