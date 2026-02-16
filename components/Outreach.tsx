import React, { useState } from 'react';
import { Mail, Send, CheckCircle2, Clock, X, ExternalLink, Gavel, Monitor, Loader2 } from 'lucide-react';
import { getBusinesses, updateBusiness, getSettings } from '../services/storage';
import { sendEmailViaResend } from '../services/api';
import { Business, BusinessStatus } from '../types';

export const Outreach: React.FC = () => {
  const [businesses, setBusinesses] = useState<Business[]>(
    getBusinesses().filter(b => b.status === BusinessStatus.GENERATED || b.status === BusinessStatus.CONTACTED)
  );
  const [selectedReview, setSelectedReview] = useState<Business | null>(null);
  const [editedBody, setEditedBody] = useState('');
  const [editedSubject, setEditedSubject] = useState('');
  const [sending, setSending] = useState(false);

  const openReview = (b: Business) => {
    setSelectedReview(b);
    setEditedSubject(b.assets?.emailSubject || '');
    setEditedBody(b.assets?.emailBody || '');
  };

  const handleSend = async () => {
    if (!selectedReview || !selectedReview.email) return;
    
    setSending(true);
    const settings = getSettings();
    const config = settings.emailConfig;

    try {
      if (config.provider === 'resend') {
        await sendEmailViaResend(
          selectedReview.email, 
          editedSubject, 
          editedBody.replace(/\n/g, '<br>'), 
          config
        );
        alert(`Email successfully sent via Resend to ${selectedReview.email}`);
      } else {
        const subject = encodeURIComponent(editedSubject);
        const body = encodeURIComponent(editedBody);
        window.open(`mailto:${selectedReview.email}?subject=${subject}&body=${body}`, '_blank');
      }

      updateBusiness(selectedReview.id, { 
        status: BusinessStatus.CONTACTED,
        outreach: {
          lastContactedAt: Date.now(),
          followUpCount: 0,
          status: 'sent'
        },
        assets: {
          ...selectedReview.assets,
          emailSubject: editedSubject,
          emailBody: editedBody
        }
      });

      setBusinesses(prev => prev.map(bus => 
        bus.id === selectedReview.id ? { 
          ...bus, 
          status: BusinessStatus.CONTACTED,
          outreach: { ...bus.outreach, status: 'sent', lastContactedAt: Date.now(), followUpCount: 0 }
        } : bus
      ));

      setSelectedReview(null);
    } catch (e: any) {
      alert(`Failed to send: ${e.message}`);
    } finally {
      setSending(false);
    }
  };

  const ReviewModal = () => {
    if (!selectedReview) return null;
    const score = selectedReview.assets?.pitchScore || 0;
    const settings = getSettings();
    
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-slate-900 w-full max-w-6xl h-[90vh] rounded-2xl flex flex-col shadow-2xl overflow-hidden border border-slate-800">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
            <div>
              <h2 className="text-xl font-bold text-white">Campaign Approval</h2>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">
                Channel: <span className="text-blue-400">{settings.emailConfig.provider}</span>
              </p>
            </div>
            <button onClick={() => setSelectedReview(null)} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
              <X size={24} className="text-slate-500 hover:text-white" />
            </button>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* Left Col: Context */}
            <div className="w-1/4 bg-slate-950 p-6 border-r border-slate-800 overflow-y-auto hidden lg:block">
              <div className="mb-6">
                <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">Target Profile</h3>
                <div className="space-y-1 text-sm">
                  <p className="font-bold text-slate-200 text-lg">{selectedReview.name}</p>
                  <p className="text-slate-400 font-mono text-xs">{selectedReview.email}</p>
                  <a href={selectedReview.website} target="_blank" className="text-blue-400 hover:text-blue-300 flex items-center gap-1 mt-2 text-xs font-medium">
                    Visit Website <ExternalLink size={10}/>
                  </a>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">Analysis Summary</h3>
                <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold mb-3 border ${selectedReview.analysis?.overallScore! < 50 ? 'bg-red-950/50 text-red-400 border-red-900' : 'bg-yellow-950/50 text-yellow-400 border-yellow-900'}`}>
                  Score: {selectedReview.analysis?.overallScore}/100
                </div>
                <ul className="text-xs list-disc pl-4 text-slate-400 space-y-2">
                   {selectedReview.analysis?.criticalIssues.slice(0,3).map((issue,i) => <li key={i}>{issue}</li>)}
                </ul>
              </div>
            </div>

            {/* Middle Col: Mockup */}
            <div className="w-1/3 border-r border-slate-800 flex flex-col hidden lg:flex bg-slate-900">
              <div className="p-3 bg-slate-950 border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2">
                <Monitor size={12} /> Asset Preview
              </div>
              <div className="flex-1 relative bg-white">
                {selectedReview.assets?.mockupHtml ? (
                  <iframe 
                    srcDoc={selectedReview.assets.mockupHtml}
                    className="w-full h-full border-0"
                    title="Mockup"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-400 bg-slate-900">No Visual Asset</div>
                )}
              </div>
            </div>

            {/* Right Col: Editor */}
            <div className="flex-1 flex flex-col bg-slate-900">
              <div className="p-4 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
                 <div className="flex items-center gap-2">
                   <Mail size={16} className="text-blue-400"/>
                   <span className="font-bold text-slate-200 text-sm">Review Message</span>
                 </div>
                 <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${score >= 8 ? 'bg-green-950 text-green-400 border-green-900' : 'bg-yellow-950 text-yellow-400 border-yellow-900'}`}>
                   <Gavel size={10}/> Quality: {score}/10
                 </div>
              </div>

              <div className="flex-1 p-6 overflow-y-auto space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Subject Line</label>
                  <input 
                    type="text" 
                    value={editedSubject}
                    onChange={(e) => setEditedSubject(e.target.value)}
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg focus:border-blue-500 outline-none font-medium text-slate-200 text-sm"
                  />
                </div>
                <div className="h-full">
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Message Body</label>
                  <textarea 
                    value={editedBody}
                    onChange={(e) => setEditedBody(e.target.value)}
                    className="w-full h-80 p-4 bg-slate-950 border border-slate-800 rounded-lg focus:border-blue-500 outline-none text-slate-300 text-sm leading-relaxed resize-none font-sans"
                  />
                </div>
              </div>

              <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end gap-3">
                <button 
                  onClick={() => setSelectedReview(null)}
                  className="px-4 py-2 text-slate-400 font-bold text-xs uppercase hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSend}
                  disabled={sending}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-blue-900/20 disabled:opacity-50 text-sm"
                >
                  {sending ? <Loader2 className="animate-spin" size={16}/> : <Send size={16} />}
                  {settings.emailConfig.provider === 'resend' ? 'Send via API' : 'Launch Mail Client'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <ReviewModal />
      
      <div>
        <h2 className="text-3xl font-black text-white">Campaign Management</h2>
        <p className="text-slate-400 mt-1">Deploy outreach to approved targets</p>
      </div>

      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-xl">
        <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wider font-bold">
                <th className="px-6 py-4">Target Entity</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Asset Quality</th>
                <th className="px-6 py-4 text-right">Command</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {businesses.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    No active campaigns. Generate assets in the Agent Lab first.
                  </td>
                </tr>
              ) : (
                businesses.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-200">{b.name}</p>
                      <p className="text-xs text-slate-500 font-mono">{b.category}</p>
                    </td>
                    <td className="px-6 py-4">
                      {b.status === BusinessStatus.CONTACTED ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-950/50 text-green-400 border border-green-900">
                          <CheckCircle2 size={12} /> SENT
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-950/50 text-blue-400 border border-blue-900">
                          <Clock size={12} /> READY
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                       <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold border ${b.assets?.pitchScore && b.assets.pitchScore >= 8 ? 'text-green-400 bg-green-950/30 border-green-900' : 'text-yellow-400 bg-yellow-950/30 border-yellow-900'}`}>
                         <Gavel size={12}/> {b.assets?.pitchScore || 0}/10
                       </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {b.status !== BusinessStatus.CONTACTED && (
                        <button 
                          onClick={() => openReview(b)}
                          className="bg-slate-100 hover:bg-white text-slate-900 px-4 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105 inline-flex items-center gap-1"
                        >
                          Review & Launch
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
        </table>
      </div>
    </div>
  );
};