import React, { useState } from 'react';
import { Mail, Send, CheckCircle2, Clock, X, ExternalLink, Gavel, AlertTriangle, Monitor, Loader2 } from 'lucide-react';
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
        // Use Resend API
        await sendEmailViaResend(
          selectedReview.email, 
          editedSubject, 
          editedBody.replace(/\n/g, '<br>'), 
          config
        );
        alert(`Email successfully sent via Resend to ${selectedReview.email}`);
      } else {
        // Default to Mailto for 'gmail' or 'smtp' (as client-side SMTP isn't real)
        const subject = encodeURIComponent(editedSubject);
        const body = encodeURIComponent(editedBody);
        window.open(`mailto:${selectedReview.email}?subject=${subject}&body=${body}`, '_blank');
      }

      // Update State
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
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-6xl h-[90vh] rounded-xl flex flex-col shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Approve Campaign</h2>
              <p className="text-sm text-slate-500">
                Sending via <span className="font-bold uppercase">{settings.emailConfig.provider}</span>
              </p>
            </div>
            <button onClick={() => setSelectedReview(null)} className="p-2 hover:bg-slate-200 rounded-full">
              <X size={24} className="text-slate-500" />
            </button>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* Left Col: Context */}
            <div className="w-1/4 bg-slate-50 p-6 border-r border-slate-200 overflow-y-auto hidden lg:block">
              <div className="mb-6">
                <h3 className="font-bold text-slate-900 mb-2">Target Business</h3>
                <div className="space-y-1 text-sm text-slate-600">
                  <p className="font-medium text-slate-900">{selectedReview.name}</p>
                  <p>{selectedReview.email}</p>
                  <a href={selectedReview.website} target="_blank" className="text-brand-600 hover:underline flex items-center gap-1 mt-1">
                    Visit Website <ExternalLink size={12}/>
                  </a>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-bold text-slate-900 mb-2">Analysis</h3>
                <div className={`inline-block px-3 py-1 rounded-full text-sm font-bold mb-3 ${selectedReview.analysis?.overallScore! < 50 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  Score: {selectedReview.analysis?.overallScore}/100
                </div>
                <ul className="text-xs list-disc pl-4 text-slate-600 space-y-1">
                   {selectedReview.analysis?.criticalIssues.slice(0,3).map((issue,i) => <li key={i}>{issue}</li>)}
                </ul>
              </div>
            </div>

            {/* Middle Col: Mockup */}
            <div className="w-1/3 border-r border-slate-200 flex flex-col hidden lg:flex">
              <div className="p-3 bg-slate-100 border-b border-slate-200 text-xs font-bold text-slate-600 flex items-center gap-2">
                <Monitor size={14} /> LANDING PAGE MOCKUP
              </div>
              <div className="flex-1 bg-white relative">
                {selectedReview.assets?.mockupHtml ? (
                  <iframe 
                    srcDoc={selectedReview.assets.mockupHtml}
                    className="w-full h-full border-0"
                    title="Mockup"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-400">No Mockup</div>
                )}
              </div>
            </div>

            {/* Right Col: Editor */}
            <div className="flex-1 flex flex-col bg-white">
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                 <div className="flex items-center gap-2">
                   <Mail size={16} className="text-brand-600"/>
                   <span className="font-bold text-slate-800">Review Pitch</span>
                 </div>
                 <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${score >= 8 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                   <Gavel size={12}/> AI Score: {score}/10
                 </div>
              </div>

              <div className="flex-1 p-6 overflow-y-auto space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Subject Line</label>
                  <input 
                    type="text" 
                    value={editedSubject}
                    onChange={(e) => setEditedSubject(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded focus:border-brand-500 outline-none font-medium text-slate-900"
                  />
                </div>
                <div className="h-full">
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Email Body</label>
                  <textarea 
                    value={editedBody}
                    onChange={(e) => setEditedBody(e.target.value)}
                    className="w-full h-64 p-3 border border-slate-300 rounded focus:border-brand-500 outline-none text-slate-700 text-sm leading-relaxed resize-none font-mono"
                  />
                </div>
              </div>

              <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
                <button 
                  onClick={() => setSelectedReview(null)}
                  className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSend}
                  disabled={sending}
                  className="px-6 py-2 bg-brand-600 text-white font-bold rounded-lg hover:bg-brand-700 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-70"
                >
                  {sending ? <Loader2 className="animate-spin" size={16}/> : <Send size={16} />}
                  {settings.emailConfig.provider === 'resend' ? 'Send via Resend' : 'Launch Mail Client'}
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
        <h2 className="text-2xl font-bold text-slate-900">Outreach Campaigns</h2>
        <p className="text-slate-500 mt-1">Review generated assets and launch campaigns</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm">
                <th className="px-6 py-4 font-medium">Business</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Judge Score</th>
                <th className="px-6 py-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {businesses.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                    No campaigns ready. Generate pitches first.
                  </td>
                </tr>
              ) : (
                businesses.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-900">{b.name}</p>
                      <p className="text-xs text-slate-500">{b.category}</p>
                    </td>
                    <td className="px-6 py-4">
                      {b.status === BusinessStatus.CONTACTED ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          <CheckCircle2 size={12} /> Sent
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          <Clock size={12} /> Pending
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                       <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${b.assets?.pitchScore && b.assets.pitchScore >= 8 ? 'text-green-700 bg-green-50' : 'text-yellow-700 bg-yellow-50'}`}>
                         <Gavel size={12}/> {b.assets?.pitchScore || 0}/10
                       </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {b.status !== BusinessStatus.CONTACTED && (
                        <button 
                          onClick={() => openReview(b)}
                          className="bg-slate-900 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-slate-800 transition-colors inline-flex items-center gap-1"
                        >
                          Review & Send
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