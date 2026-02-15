
import React, { useState } from 'react';
import { Wand2, RefreshCw, Eye, Code, Mail, Loader2, Image as ImageIcon, Gavel, MapPin, DollarSign, ShieldAlert, TrendingUp, ListChecks, FileText } from 'lucide-react';
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
    setGenerationStep('Initializing...');
    
    const profile = getUserProfile();
    const isSecurityFocus = selectedBusiness.analysis.strategy?.focus === 'SECURITY';

    try {
      // 1. Generate Asset (Mockup OR Report)
      let assetUpdates: any = {};
      
      if (isSecurityFocus) {
        setGenerationStep('Compiling Security Audit Report...');
        const report = await generateSecurityReportWithGemini(selectedBusiness, selectedBusiness.analysis);
        assetUpdates.securityReportMd = report;
      } else {
        setGenerationStep('Generating UI Mockup...');
        let mockupHtml = selectedBusiness.assets?.mockupHtml;
        if (!mockupHtml) {
          mockupHtml = await generateMockupWithGemini(selectedBusiness, selectedBusiness.analysis);
        }
        assetUpdates.mockupHtml = mockupHtml;
        assetUpdates.mockupTimestamp = Date.now();
      }
      
      // 2. Initial Pitch Generation
      setGenerationStep('Drafting Strategy Pitch...');
      let currentPitch = await generatePitchWithGemini(selectedBusiness, selectedBusiness.analysis, profile);
      
      // 3. AI Judge Loop
      let versions = 1;
      let score = 0;
      let critique = '';
      const MAX_RETRIES = 2;
      
      for (let i = 0; i <= MAX_RETRIES; i++) {
        setGenerationStep(i === 0 ? 'AI Judge Evaluating...' : `Refining Pitch (Attempt ${i})...`);
        const judgment = await judgePitchWithGemini(selectedBusiness, currentPitch, selectedBusiness.analysis.strategy);
        score = judgment.score;
        critique = judgment.critique;
        if (score >= 8) break;
        if (i < MAX_RETRIES) {
          currentPitch = await generateRefinedPitchWithGemini(selectedBusiness, currentPitch, critique);
          versions++;
        }
      }

      setGenerationStep('Finalizing...');
      
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
      alert("Error generating assets. Check API Keys.");
    } finally {
      setGenerating(false);
      setGenerationStep('');
    }
  };

  const JudgeBadge = ({ score }: { score?: number }) => {
    if (score === undefined) return null;
    let color = 'bg-red-100 text-red-700';
    if (score >= 8) color = 'bg-green-100 text-green-700';
    else if (score >= 6) color = 'bg-yellow-100 text-yellow-700';
    return (
      <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${color}`}>
        <Gavel size={14} />
        <span>AI Score: {score}/10</span>
      </div>
    );
  };

  const StrategyCard = ({ strategy }: { strategy: any }) => {
    if (!strategy) return null;
    const isSecurity = strategy.focus === 'SECURITY';
    return (
      <div className={`mb-6 p-5 rounded-xl border ${isSecurity ? 'bg-red-50 border-red-200' : 'bg-indigo-50 border-indigo-200'}`}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className={`font-bold text-lg ${isSecurity ? 'text-red-900' : 'text-indigo-900'} flex items-center gap-2`}>
              {isSecurity ? <ShieldAlert size={20}/> : <TrendingUp size={20}/>}
              Strategy: {strategy.focus}
            </h3>
            <p className="text-sm text-slate-600 mt-1">{strategy.rationale}</p>
          </div>
          <div className="text-right">
             <div className="flex items-center gap-1 text-sm font-bold text-slate-700 justify-end">
               <MapPin size={14}/> {strategy.country}
             </div>
             <div className="flex items-center gap-1 text-sm font-bold text-green-700 justify-end mt-1">
               <DollarSign size={14}/> {strategy.suggestedPrice} Quote
             </div>
          </div>
        </div>
        {isSecurity && strategy.vulnerabilityExplainer && (
          <div className="bg-white p-3 rounded-lg border border-red-100 mb-3 text-sm text-red-800">
             <span className="font-bold">Risk Explanation:</span> {strategy.vulnerabilityExplainer}
          </div>
        )}
        <div className="flex flex-col gap-2">
           <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
             <ListChecks size={14}/> Suggested Roadmap
           </h4>
           <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
             {strategy.roadmap?.map((step: string, i: number) => (
               <React.Fragment key={i}>
                 <span className="bg-white px-2 py-1 rounded shadow-sm border border-slate-200">{step}</span>
                 {i < strategy.roadmap.length - 1 && <span className="text-slate-400">→</span>}
               </React.Fragment>
             ))}
           </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-6">
      <div className="w-1/3 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <h3 className="font-bold text-slate-900">Opportunities</h3>
          <p className="text-xs text-slate-500">Businesses with low scores ({businesses.length})</p>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {businesses.map(b => (
            <div 
              key={b.id}
              onClick={() => {
                setSelectedBusiness(b);
                setPitch(b.assets?.emailSubject ? { subject: b.assets.emailSubject, body: b.assets.emailBody || '' } : null);
              }}
              className={`p-3 rounded-lg cursor-pointer transition-all ${
                selectedBusiness?.id === b.id 
                  ? 'bg-brand-50 border border-brand-200' 
                  : 'hover:bg-slate-50 border border-transparent'
              }`}
            >
              <div className="flex justify-between items-start">
                <h4 className="font-medium text-sm text-slate-900">{b.name}</h4>
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${b.analysis?.strategy?.focus === 'SECURITY' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                  {b.analysis?.strategy?.focus || b.analysis?.overallScore}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 truncate">{b.website}</p>
              {b.status === BusinessStatus.GENERATED && (
                <div className="flex items-center gap-1 mt-2 text-xs text-green-600 font-medium">
                  <Wand2 size={12} /> Assets Ready
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
        {!selectedBusiness ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <Wand2 size={48} className="mb-4 opacity-50" />
            <p>Select a business to generate strategic assets</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col h-full">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div>
                <h2 className="font-bold text-slate-900">{selectedBusiness.name}</h2>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                   <span>Score: {selectedBusiness.analysis?.overallScore}/100</span>
                </div>
              </div>
              <button
                onClick={handleGenerateAssets}
                disabled={generating}
                className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors flex items-center gap-2 disabled:opacity-50 min-w-[160px] justify-center"
              >
                {generating ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    {generationStep}
                  </>
                ) : (
                  <>
                    <Wand2 size={16} />
                    {selectedBusiness.assets?.emailSubject ? 'Regenerate' : 'Generate'}
                  </>
                )}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {selectedBusiness.analysis?.strategy && (
                <StrategyCard strategy={selectedBusiness.analysis.strategy} />
              )}

              <div className="space-y-8">
                <section>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <Mail size={16} /> Strategic Pitch
                    </h3>
                    <JudgeBadge score={selectedBusiness.assets?.pitchScore} />
                  </div>
                  
                  {selectedBusiness.assets?.pitchCritique && (
                     <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
                       <span className="font-bold text-slate-800">AI Judge Critique:</span> {selectedBusiness.assets.pitchCritique}
                     </div>
                  )}

                  {pitch ? (
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                        <p className="text-sm text-slate-500">Subject:</p>
                        <p className="font-medium text-slate-900">{pitch.subject}</p>
                      </div>
                      <div className="p-4 bg-white">
                        <textarea 
                          className="w-full h-32 resize-none outline-none text-slate-700 text-sm leading-relaxed"
                          value={pitch.body}
                          readOnly
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="h-32 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center text-slate-400 bg-slate-50">
                      <p>No pitch generated yet</p>
                    </div>
                  )}
                </section>

                {/* Conditional Asset Section */}
                {selectedBusiness.analysis?.strategy?.focus === 'SECURITY' ? (
                  <section className="flex-1 flex flex-col min-h-[400px]">
                    <h3 className="text-sm font-bold text-red-900 uppercase tracking-wider flex items-center gap-2 mb-3">
                      <FileText size={16} /> Security Audit Report
                    </h3>
                    {selectedBusiness.assets?.securityReportMd ? (
                       <div className="flex-1 p-6 border border-red-200 bg-white rounded-lg shadow-sm font-mono text-xs overflow-y-auto whitespace-pre-wrap text-slate-800">
                         {selectedBusiness.assets.securityReportMd}
                       </div>
                    ) : (
                      <div className="flex-1 border-2 border-dashed border-red-100 rounded-lg flex items-center justify-center text-red-300 bg-red-50">
                        <p>Generate report to view audit details</p>
                      </div>
                    )}
                  </section>
                ) : (
                  <section className="h-[500px] flex flex-col">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                        <Code size={16} /> Solution Mockup
                      </h3>
                      {selectedBusiness.assets?.mockupHtml && (
                        <button 
                          onClick={() => {
                            const blob = new Blob([selectedBusiness.assets?.mockupHtml || ''], { type: 'text/html' });
                            const url = URL.createObjectURL(blob);
                            window.open(url, '_blank');
                          }}
                          className="text-xs bg-slate-100 px-3 py-1 rounded hover:bg-slate-200"
                        >
                          Open in New Tab
                        </button>
                      )}
                    </div>
                    {selectedBusiness.assets?.mockupHtml ? (
                      <div className="flex-1 border border-slate-300 rounded-lg overflow-hidden shadow-sm bg-white">
                        <iframe 
                          srcDoc={selectedBusiness.assets.mockupHtml}
                          title="Mockup Preview"
                          className="w-full h-full"
                          sandbox="allow-scripts"
                        />
                      </div>
                    ) : (
                      <div className="flex-1 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center text-slate-400 bg-slate-50">
                        <p>No solution generated yet</p>
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
