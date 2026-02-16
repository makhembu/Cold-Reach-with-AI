import React, { useState } from 'react';
import { Wand2, RefreshCw, Eye, Code, Mail, Loader2, Image as ImageIcon, Gavel, MapPin, DollarSign, ShieldAlert, TrendingUp, ListChecks, FileText, ChevronRight } from 'lucide-react';
import { getBusinesses, updateBusiness, getUserProfile } from '../services/storage';
import { 
  generateMockupWithGemini, 
  generatePitchWithGemini, 
  judgePitchWithGemini, 
  generateRefinedPitchWithGemini,
  generateSecurityReportWithGemini
} from '../services/geminiService';
import { Business, BusinessStatus } from '../types';

export const Generation: React.FC = () => {
  const [businesses, setBusinesses] = useState<Business[]>(
    getBusinesses().filter(b => b.analysis && b.analysis.overallScore < 70)
  );
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [pitch, setPitch] = useState<{ subject: string, body: string } | null>(null);

  const handleGenerateAssets = async () => {
    if (!selectedBusiness || !selectedBusiness.analysis) return;
    
    setGenerating(true);
    setGenerationStep('Initializing specialized agent...');
    
    const profile = getUserProfile();
    const isSecurityFocus = selectedBusiness.analysis.strategy?.focus === 'SECURITY';

    try {
      let assetUpdates: any = {};
      
      if (isSecurityFocus) {
        setGenerationStep('Compiling penetration test report...');
        const report = await generateSecurityReportWithGemini(selectedBusiness, selectedBusiness.analysis);
        assetUpdates.securityReportMd = report;
      } else {
        setGenerationStep('Engineering UI solution...');
        let mockupHtml = selectedBusiness.assets?.mockupHtml;
        if (!mockupHtml) {
          mockupHtml = await generateMockupWithGemini(selectedBusiness, selectedBusiness.analysis);
        }
        assetUpdates.mockupHtml = mockupHtml;
        assetUpdates.mockupTimestamp = Date.now();
      }
      
      setGenerationStep('Drafting strategic outreach...');
      let currentPitch = await generatePitchWithGemini(selectedBusiness, selectedBusiness.analysis, profile);
      
      let versions = 1;
      let score = 0;
      let critique = '';
      const MAX_RETRIES = 2;
      
      for (let i = 0; i <= MAX_RETRIES; i++) {
        setGenerationStep(i === 0 ? 'AI Judge evaluating draft...' : `Refining (Iteration ${i})...`);
        const judgment = await judgePitchWithGemini(selectedBusiness, currentPitch, selectedBusiness.analysis.strategy);
        score = judgment.score;
        critique = judgment.critique;
        if (score >= 8) break;
        if (i < MAX_RETRIES) {
          currentPitch = await generateRefinedPitchWithGemini(selectedBusiness, currentPitch, critique);
          versions++;
        }
      }

      setGenerationStep('Finalizing assets...');
      
      const updates = {
        status: BusinessStatus.GENERATED,
        assets: {
          ...selectedBusiness.assets,
          ...assetUpdates,
          emailSubject: currentPitch.subject,
          emailBody: currentPitch.body,
          generatedAt: Date.now(),
          pitchScore: score,
          pitchCritique: critique,
          pitchVersionsCount: versions
        }
      };
      
      updateBusiness(selectedBusiness.id, updates);
      
      const updatedBusiness = { ...selectedBusiness, ...updates };
      setSelectedBusiness(updatedBusiness);
      setPitch(currentPitch);
      setBusinesses(prev => prev.map(b => b.id === updatedBusiness.id ? updatedBusiness : b));
      
    } catch (error) {
      console.error(error);
      alert("Asset generation failed. Check API configuration.");
    } finally {
      setGenerating(false);
      setGenerationStep('');
    }
  };

  const JudgeBadge = ({ score }: { score?: number }) => {
    if (score === undefined) return null;
    let color = 'bg-red-900/30 text-red-400 border-red-800';
    if (score >= 8) color = 'bg-green-900/30 text-green-400 border-green-800';
    else if (score >= 6) color = 'bg-yellow-900/30 text-yellow-400 border-yellow-800';
    return (
      <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${color}`}>
        <Gavel size={12} />
        <span>Quality Score: {score}/10</span>
      </div>
    );
  };

  const StrategyCard = ({ strategy }: { strategy: any }) => {
    if (!strategy) return null;
    const isSecurity = strategy.focus === 'SECURITY';
    return (
      <div className={`mb-6 p-6 rounded-xl border ${isSecurity ? 'bg-red-950/20 border-red-900/50' : 'bg-indigo-950/20 border-indigo-900/50'}`}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className={`font-bold text-lg ${isSecurity ? 'text-red-400' : 'text-indigo-400'} flex items-center gap-2 mb-2`}>
              {isSecurity ? <ShieldAlert size={20}/> : <TrendingUp size={20}/>}
              Strategy: {strategy.focus}
            </h3>
            <p className="text-sm text-slate-300">{strategy.rationale}</p>
          </div>
          <div className="text-right space-y-1">
             <div className="flex items-center gap-1 text-xs font-bold text-slate-400 justify-end">
               <MapPin size={12}/> {strategy.country}
             </div>
             <div className="flex items-center gap-1 text-sm font-bold text-green-400 justify-end">
               <DollarSign size={14}/> {strategy.suggestedPrice}
             </div>
          </div>
        </div>
        
        <div className="space-y-3">
           <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
             <ListChecks size={14}/> Execution Roadmap
           </h4>
           <div className="flex flex-wrap gap-2">
             {strategy.roadmap?.map((step: string, i: number) => (
               <div key={i} className="flex items-center text-sm font-medium text-slate-300">
                 <span className="bg-slate-900 px-3 py-1.5 rounded border border-slate-700">{step}</span>
                 {i < strategy.roadmap.length - 1 && <ChevronRight size={14} className="mx-1 text-slate-600" />}
               </div>
             ))}
           </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-6">
      <div className="w-1/3 bg-slate-900 rounded-xl border border-slate-800 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-800 bg-slate-950/50">
          <h3 className="font-bold text-white">Target List</h3>
          <p className="text-xs text-slate-500">Businesses needing intervention ({businesses.length})</p>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {businesses.map(b => (
            <div 
              key={b.id}
              onClick={() => {
                setSelectedBusiness(b);
                setPitch(b.assets?.emailSubject ? { subject: b.assets.emailSubject, body: b.assets.emailBody || '' } : null);
              }}
              className={`p-3 rounded-lg cursor-pointer transition-all border ${
                selectedBusiness?.id === b.id 
                  ? 'bg-blue-900/20 border-blue-800 text-blue-100' 
                  : 'bg-transparent border-transparent hover:bg-slate-800 hover:border-slate-700 text-slate-300'
              }`}
            >
              <div className="flex justify-between items-start">
                <h4 className="font-bold text-sm">{b.name}</h4>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${b.analysis?.strategy?.focus === 'SECURITY' ? 'bg-red-950 text-red-400 border border-red-900' : 'bg-slate-950 text-slate-500 border border-slate-800'}`}>
                  {b.analysis?.strategy?.focus || b.analysis?.overallScore}
                </span>
              </div>
              <p className="text-xs opacity-60 mt-1 truncate">{b.website}</p>
              {b.status === BusinessStatus.GENERATED && (
                <div className="flex items-center gap-1 mt-2 text-[10px] text-green-400 font-bold uppercase tracking-wide">
                  <Wand2 size={10} /> Ready
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 bg-slate-900 rounded-xl border border-slate-800 flex flex-col overflow-hidden">
        {!selectedBusiness ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
            <Wand2 size={48} className="mb-4 opacity-20" />
            <p>Select a target to begin asset generation</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col h-full">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
              <div>
                <h2 className="font-bold text-lg text-white">{selectedBusiness.name}</h2>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                   <span>Score: {selectedBusiness.analysis?.overallScore}/100</span>
                </div>
              </div>
              <button
                onClick={handleGenerateAssets}
                disabled={generating}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-5 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed min-w-[180px] flex justify-center items-center gap-2 shadow-lg shadow-purple-900/20"
              >
                {generating ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    {generationStep || 'Processing...'}
                  </>
                ) : (
                  <>
                    <Wand2 size={16} />
                    {selectedBusiness.assets?.emailSubject ? 'Regenerate Assets' : 'Generate Assets'}
                  </>
                )}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-700">
              {selectedBusiness.analysis?.strategy && (
                <StrategyCard strategy={selectedBusiness.analysis.strategy} />
              )}

              <div className="space-y-8">
                <section>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                      <Mail size={14} /> AI Drafted Pitch
                    </h3>
                    <JudgeBadge score={selectedBusiness.assets?.pitchScore} />
                  </div>
                  
                  {selectedBusiness.assets?.pitchCritique && (
                     <div className="mb-4 p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-400">
                       <span className="font-bold text-slate-300">Critique:</span> {selectedBusiness.assets.pitchCritique}
                     </div>
                  )}

                  {pitch ? (
                    <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950">
                      <div className="bg-slate-900 px-4 py-3 border-b border-slate-800">
                        <span className="text-xs font-bold text-slate-500 uppercase mr-2">Subject:</span>
                        <span className="font-medium text-slate-200 text-sm">{pitch.subject}</span>
                      </div>
                      <div className="p-4">
                        <textarea 
                          className="w-full h-40 bg-transparent resize-none outline-none text-slate-300 text-sm leading-relaxed font-sans"
                          value={pitch.body}
                          readOnly
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="h-40 border-2 border-dashed border-slate-800 rounded-lg flex items-center justify-center text-slate-600 bg-slate-950/50">
                      <p>Awaiting generation...</p>
                    </div>
                  )}
                </section>

                {/* Conditional Asset Section */}
                {selectedBusiness.analysis?.strategy?.focus === 'SECURITY' ? (
                  <section className="flex-1 flex flex-col min-h-[400px]">
                    <h3 className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-2 mb-3">
                      <FileText size={14} /> Security Audit Report
                    </h3>
                    {selectedBusiness.assets?.securityReportMd ? (
                       <div className="flex-1 p-6 border border-red-900/30 bg-slate-950 rounded-lg shadow-inner font-mono text-xs overflow-y-auto whitespace-pre-wrap text-slate-300">
                         {selectedBusiness.assets.securityReportMd}
                       </div>
                    ) : (
                      <div className="flex-1 border-2 border-dashed border-red-900/20 rounded-lg flex items-center justify-center text-red-900/40 bg-red-950/5">
                        <p>Generate report to view audit details</p>
                      </div>
                    )}
                  </section>
                ) : (
                  <section className="h-[500px] flex flex-col">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        <Code size={14} /> Solution Preview
                      </h3>
                      {selectedBusiness.assets?.mockupHtml && (
                        <button 
                          onClick={() => {
                            const blob = new Blob([selectedBusiness.assets?.mockupHtml || ''], { type: 'text/html' });
                            const url = URL.createObjectURL(blob);
                            window.open(url, '_blank');
                          }}
                          className="text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded transition-colors uppercase tracking-wide"
                        >
                          Open Fullscreen
                        </button>
                      )}
                    </div>
                    {selectedBusiness.assets?.mockupHtml ? (
                      <div className="flex-1 border border-slate-700 rounded-lg overflow-hidden shadow-lg bg-white relative">
                        <iframe 
                          srcDoc={selectedBusiness.assets.mockupHtml}
                          title="Mockup Preview"
                          className="w-full h-full"
                          sandbox="allow-scripts"
                        />
                      </div>
                    ) : (
                      <div className="flex-1 border-2 border-dashed border-slate-800 rounded-lg flex items-center justify-center text-slate-600 bg-slate-950/50">
                        <p>Awaiting generation...</p>
                      </div>
                    )}
                  </section>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};