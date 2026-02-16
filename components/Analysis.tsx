import React, { useState, useEffect, useRef } from 'react';
import { Play, Bot, Brain, MessageSquare, RefreshCw, Terminal, AlertCircle, CheckCircle2, Activity, Database, Globe, Zap, Shield, TrendingUp, Clock, Cpu } from 'lucide-react';
import { getBusinesses, updateBusiness } from '../services/storage';
import { analyzeAsAutonomousAgent } from '../services/autonomousAgent';
import { chatWithAgent } from '../services/agentChat';
import { getAPIUsageStatus } from '../services/hybridAI';
import { Business, BusinessStatus } from '../types';

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
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${c.bg} border border-slate-700 shadow-sm`}>
      <Icon size={16} className={`${c.color} ${c.pulse ? 'animate-pulse' : ''}`} />
      <span className={`text-xs font-bold ${c.color} uppercase tracking-wider`}>{c.text}</span>
    </div>
  );
};

const ModelBadge = ({ model }: { model: string }) => {
  const isDeepSeek = model.toLowerCase().includes('deepseek');
  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
      isDeepSeek 
        ? 'bg-purple-950 text-purple-300 border border-purple-800' 
        : 'bg-blue-950 text-blue-300 border border-blue-800'
    }`}>
      <Cpu size={10} />
      {model}
    </div>
  );
};

const TerminalLogs = ({ logs }: { logs: string[] }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [logs]);
  return (
    <div className="bg-black rounded-lg border border-slate-800 overflow-hidden font-mono shadow-inner">
      <div className="bg-slate-900 px-3 py-2 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50"></div>
          </div>
          <span className="text-[10px] font-bold text-slate-500 ml-2 uppercase">Agent.log</span>
        </div>
      </div>
      <div ref={ref} className="p-4 h-48 overflow-y-auto text-xs space-y-1">
        {logs.length === 0 ? <div className="text-slate-700 italic">Waiting for process initiation...</div> : logs.map((log, i) => (
          <div key={i} className="flex gap-2 text-slate-300">
            <span className="text-slate-600 shrink-0 select-none">›</span> 
            <span className={log.includes('Phase') ? 'text-blue-400 font-bold' : log.includes('✓') ? 'text-green-400' : log.includes('❌') ? 'text-red-400' : ''}>
              {log.replace(/\[.*?\] /, '')}
            </span>
          </div>
        ))}
        <div className="animate-pulse text-blue-500 font-bold">▋</div>
      </div>
    </div>
  );
};

const AnalysisDisplay = ({ analysis, screenshot }: { analysis: any, screenshot?: string }) => {
  if (!analysis.professionalAssessment) return null;
  const verdictColors: Record<string, string> = {
    'CRITICAL_REDESIGN_NEEDED': 'from-red-950 to-slate-900 border-red-900/50 text-red-400',
    'SIGNIFICANT_IMPROVEMENTS_NEEDED': 'from-orange-950 to-slate-900 border-orange-900/50 text-orange-400',
    'MINOR_TWEAKS': 'from-yellow-950 to-slate-900 border-yellow-900/50 text-yellow-400',
    'ACTUALLY_PRETTY_GOOD': 'from-green-950 to-slate-900 border-green-900/50 text-green-400'
  };
  const vc = verdictColors[analysis.verdict] || verdictColors.MINOR_TWEAKS;
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className={`lg:col-span-2 bg-gradient-to-br ${vc} rounded-xl border p-6 relative overflow-hidden group`}>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10"></div>
        <div className="relative z-10 flex flex-col md:flex-row gap-6">
            <div className="shrink-0">
               <div className="text-6xl font-black tracking-tighter text-white mb-2">{analysis.overallScore}<span className="text-2xl text-slate-500 font-normal">/100</span></div>
               <div className="inline-block px-3 py-1 rounded-full bg-black/30 backdrop-blur border border-white/10 text-xs font-bold uppercase tracking-wider">
                 {analysis.verdict?.replace(/_/g, ' ')}
               </div>
            </div>
            <div className="flex-1 border-l border-white/10 pl-6 flex flex-col justify-center">
               <h4 className="text-sm font-bold text-white mb-2 opacity-90">Executive Summary</h4>
               <p className="text-sm text-slate-300 leading-relaxed">{analysis.professionalAssessment.what_i_see}</p>
            </div>
        </div>
      </div>

      <div className="space-y-4">
         {screenshot && (
           <div className="aspect-video rounded-xl border border-slate-700 overflow-hidden bg-slate-900 relative group">
             <img src={screenshot} alt="Screenshot" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
             <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur px-2 py-1 rounded text-[10px] text-white font-mono">CAPTURED</div>
           </div>
         )}
         
         <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Impact Assessment</h4>
            <div className="space-y-3">
               <div>
                  <div className="flex items-center gap-2 text-red-400 text-xs font-bold mb-1">
                    <AlertCircle size={12} /> BIGGEST PROBLEM
                  </div>
                  <p className="text-xs text-slate-300">{analysis.professionalAssessment.biggest_problem}</p>
               </div>
               <div>
                  <div className="flex items-center gap-2 text-yellow-400 text-xs font-bold mb-1">
                    <Clock size={12} /> OPPORTUNITY COST
                  </div>
                  <p className="text-xs text-slate-300">{analysis.professionalAssessment.opportunity_cost}</p>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};

const AgentChat = ({ business, onUpdate }: { business: Business, onUpdate: () => void }) => {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'agent', content: string, model?: string }>>([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [messages]);
  
  const send = async () => {
    if (!input.trim() || isThinking) return;
    const msg = input.trim();
    setInput('');
    setMessages(p => [...p, { role: 'user', content: msg }]);
    setIsThinking(true);
    
    try {
      const res = await chatWithAgent(business, msg, messages);
      setMessages(p => [...p, { role: 'agent', content: res.message, model: res.modelUsed }]);
      if (res.updatedAnalysis) {
        onUpdate();
      }
    } catch (e: any) {
      setMessages(p => [...p, { role: 'agent', content: `Error: ${e.message}` }]);
    } finally {
      setIsThinking(false);
    }
  };
  
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg mt-4">
      <div className="bg-slate-950/50 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
           <div className="p-1.5 bg-blue-900/20 rounded-lg">
             <MessageSquare size={14} className="text-blue-400" />
           </div>
           <div>
             <h4 className="text-xs font-bold text-slate-200">Consult Agent</h4>
             <p className="text-[10px] text-slate-500">Ask questions about the analysis or strategy</p>
           </div>
        </div>
      </div>
      <div ref={ref} className="h-64 overflow-y-auto p-4 space-y-4 bg-slate-950/30">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50">
             <Bot size={32} className="mb-2" />
             <p className="text-xs">Agent ready. Try "Why is the score low?"</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'flex-col items-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
              m.role === 'user' 
                ? 'bg-blue-600 text-white rounded-br-none' 
                : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700'
            }`}>
              {m.content}
            </div>
            {m.model && <div className="mt-1 ml-1"><ModelBadge model={m.model} /></div>}
          </div>
        ))}
        {isThinking && (
          <div className="flex items-center gap-2 text-xs text-slate-500 ml-2">
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" />
              <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            Thinking...
          </div>
        )}
      </div>
      <div className="p-3 border-t border-slate-800 bg-slate-900 flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && send()}
          placeholder="Ask a follow-up question..."
          className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-blue-500 transition-colors"
          disabled={isThinking}
        />
        <button 
          onClick={send} 
          disabled={isThinking || !input.trim()} 
          className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export const Analysis: React.FC = () => {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('idle');
  const [logs, setLogs] = useState<string[]>([]);
  const [usage, setUsage] = useState({ gemini: { used: 0, limit: 1500 }, deepseek: { used: 0, limit: 999999 } });
  
  useEffect(() => { 
    setBusinesses(getBusinesses()); 
    setUsage(getAPIUsageStatus()); 
  }, [analyzingId]);
  
  const analyze = async (business: Business) => {
    setAnalyzingId(business.id);
    setLogs([]);
    setStatus('thinking');
    const logHistory: string[] = [];
    
    const log = (msg: string) => {
      const full = `[${new Date().toLocaleTimeString()}] ${msg}`;
      logHistory.push(full);
      setLogs(p => [...p, full]);
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
        logs: logHistory,
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
    <div className="space-y-6">
      <div className="flex justify-between items-end">
         <div>
           <h2 className="text-3xl font-black text-white">Hybrid Agent Lab</h2>
           <p className="text-slate-400 mt-1">Autonomous multi-model analysis (Gemini + DeepSeek)</p>
         </div>
         <div className="flex gap-4 text-xs font-mono bg-slate-900 border border-slate-800 p-2 rounded-lg">
           <div className="text-blue-400">Gemini: {usage.gemini.used} calls</div>
           <div className="w-px bg-slate-800"></div>
           <div className="text-purple-400">DeepSeek: {usage.deepseek.used} calls</div>
         </div>
      </div>
        
      {businesses.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
          <Database size={48} className="mx-auto mb-4 text-slate-700" />
          <h3 className="text-lg font-bold text-slate-300">No Assets in Queue</h3>
          <p className="text-slate-500 text-sm mt-1">Add businesses via Discovery to begin analysis.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {businesses.map((business) => (
            <div key={business.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg hover:border-slate-700 transition-colors">
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/30 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-100">{business.name}</h3>
                  <a href={business.website} target="_blank" className="text-slate-500 hover:text-blue-400 text-xs flex items-center gap-1 transition-colors">
                    <Globe size={12} /> {business.website}
                  </a>
                </div>
                
                {analyzingId === business.id ? (
                  <AgentStatus status={status} />
                ) : !business.analysis ? (
                  <button 
                    onClick={() => analyze(business)} 
                    className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-900/20 transition-all hover:scale-105 active:scale-95"
                  >
                    <Play size={14} /> Launch Agent
                  </button>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                       <div className="text-2xl font-black leading-none text-white">{business.analysis.overallScore}</div>
                       <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Score</div>
                    </div>
                    <button 
                      onClick={() => analyze(business)} 
                      className="bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white px-3 py-2 rounded-lg text-xs flex items-center gap-2 border border-slate-700 transition-colors"
                    >
                      <RefreshCw size={14} />
                    </button>
                  </div>
                )}
              </div>
              
              {/* Active Terminal */}
              {analyzingId === business.id && (
                <div className="p-6 bg-slate-950">
                  <TerminalLogs logs={logs} />
                </div>
              )}
              
              {/* Results */}
              {business.analysis && analyzingId !== business.id && (
                <div className="p-6 space-y-6">
                  <AnalysisDisplay analysis={business.analysis} screenshot={business.screenshot} />
                  <AgentChat business={business} onUpdate={() => setBusinesses(getBusinesses())} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};