
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

const TerminalLogs = ({ logs, modelUsed }: { logs: string[], modelUsed?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [logs]);
  return (
    <div className="bg-slate-950 rounded-lg border border-slate-800 overflow-hidden">
      <div className="bg-slate-900 px-3 py-2 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal size={12} className="text-green-400" />
          <span className="text-xs font-mono text-slate-400">Agent Logs</span>
        </div>
        {modelUsed && <ModelBadge model={modelUsed} />}
      </div>
      <div ref={ref} className="p-3 h-48 overflow-y-auto font-mono text-xs text-green-400 space-y-0.5">
        {logs.length === 0 ? <div className="text-slate-600 italic">Waiting...</div> : logs.map((log, i) => (
          <div key={i}><span className="text-slate-600">›</span> {log}</div>
        ))}
        <div className="animate-pulse">▋</div>
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
        // Handle updates if needed
        onUpdate();
      }
    } catch (e: any) {
      setMessages(p => [...p, { role: 'agent', content: `Error: ${e.message}` }]);
    } finally {
      setIsThinking(false);
    }
  };
  
  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-lg overflow-hidden">
      <div className="bg-slate-900 px-3 py-2 border-b border-slate-800 flex items-center gap-2">
        <MessageSquare size={14} className="text-blue-400" />
        <span className="text-xs font-bold text-slate-300">Chat with Agent</span>
        <span className="ml-auto text-[10px] text-slate-500">Hybrid AI: Gemini + DeepSeek</span>
      </div>
      <div ref={ref} className="h-48 overflow-y-auto p-3 space-y-2">
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

const AnalysisDisplay = ({ analysis, screenshot }: { analysis: any, screenshot?: string }) => {
  if (!analysis.professionalAssessment) return null;
  const verdictColors: Record<string, string> = {
    'CRITICAL_REDESIGN_NEEDED': 'from-red-900/40 to-red-950/40 border-red-700/50',
    'SIGNIFICANT_IMPROVEMENTS_NEEDED': 'from-orange-900/40 to-orange-950/40 border-orange-700/50',
    'MINOR_TWEAKS': 'from-yellow-900/40 to-yellow-950/40 border-yellow-700/50',
    'ACTUALLY_PRETTY_GOOD': 'from-green-900/40 to-green-950/40 border-green-700/50'
  };
  const vc = verdictColors[analysis.verdict] || verdictColors.MINOR_TWEAKS;
  return (
    <div className="space-y-3">
      <div className={`bg-gradient-to-br ${vc} rounded-lg border p-4`}>
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="text-4xl font-black text-slate-100">{analysis.overallScore}<span className="text-xl opacity-50">/100</span></div>
            <div className="text-xs opacity-80 uppercase tracking-wider font-bold text-slate-200 mt-1">{analysis.verdict?.replace(/_/g, ' ')}</div>
          </div>
          {screenshot && <img src={screenshot} alt="Site" className="w-24 h-16 object-cover rounded border border-white/20" />}
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
  const [logs, setLogs] = useState<string[]>([]);
  const [currentModel, setCurrentModel] = useState<string>('');
  const [usage, setUsage] = useState({ gemini: { used: 0, limit: 1500, remaining: 1500 }, deepseek: { used: 0, limit: 999999, remaining: 999999 } });
  
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
        // Legacy fields for compatibility
        strategy: {
            focus: 'DESIGN', // Inferred default
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
        agentAnalysis: result as any // Store full result
      });
      setStatus('complete');
    } catch (e: any) {
      log(`❌ FAILED: ${e.message}`);
      updateBusiness(business.id, { 
        status: BusinessStatus.DISCOVERED, // Reset to discovered on failure so we can try again
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
      <div className="max-w-6xl mx-auto p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">Hybrid AI Agent Lab</h1>
            <p className="text-xs text-slate-400">Gemini + DeepSeek Tag Team</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right text-[10px]">
              <div className="text-blue-400 font-bold">Gemini: {usage.gemini.used} used</div>
              <div className="text-purple-400 font-bold">DeepSeek: {usage.deepseek.used} used</div>
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
              
              {analyzingId === business.id && (
                <div className="p-4">
                  <TerminalLogs logs={logs} modelUsed={currentModel} />
                </div>
              )}
              
              {business.analysis && analyzingId !== business.id && (
                <div className="p-4 space-y-4">
                  <AnalysisDisplay analysis={business.analysis} screenshot={business.screenshot} />
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
