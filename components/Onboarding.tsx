import React, { useState } from 'react';
import { Sparkles, ArrowRight, CheckCircle2, Loader2, Rocket } from 'lucide-react';
import { generateProfileFromInput } from '../services/geminiService';
import { saveUserProfile, getSettings } from '../services/storage';
import { UserProfile } from '../types';

interface Props {
  onComplete: () => void;
}

export const Onboarding: React.FC<Props> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedProfile, setGeneratedProfile] = useState<Partial<UserProfile> | null>(null);

  const handleGenerate = async () => {
    if (!input.trim()) return;
    if (!getSettings().geminiApiKey) {
      alert("Please go to settings and set your Gemini API key first, then reload.");
      return;
    }
    
    setLoading(true);
    try {
      const result = await generateProfileFromInput(input);
      setGeneratedProfile(result);
      setStep(2);
    } catch (e) {
      alert("Failed to generate profile. Check API Key.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (generatedProfile) {
      saveUserProfile({
        name: 'Agency Owner',
        businessName: generatedProfile.businessName || '',
        bio: generatedProfile.bio || '',
        onboardingCompleted: true,
        portfolioText: input
      });
      onComplete();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        <div className="p-8">
          <div className="w-12 h-12 bg-brand-500 rounded-xl flex items-center justify-center mb-6">
            <Rocket className="text-white" size={24} />
          </div>
          
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Welcome to ColdReach</h2>
          <p className="text-slate-500 mb-6">Let's set up your agency profile so AI can work for you.</p>

          {step === 1 ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Paste your Resume, Portfolio Summary, or Skills
                </label>
                <textarea
                  className="w-full h-32 p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none resize-none"
                  placeholder="e.g. I am a React developer specializing in high-converting landing pages. I have 5 years experience..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                />
              </div>
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full bg-brand-600 text-white py-3 rounded-xl font-bold hover:bg-brand-700 transition-colors flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />}
                Generate My Agency Profile
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-brand-50 p-4 rounded-xl border border-brand-100">
                <h3 className="font-bold text-brand-900 text-sm uppercase mb-2">AI Suggestion</h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-xs text-brand-600 font-bold block">Business Name</span>
                    <input 
                      value={generatedProfile?.businessName} 
                      onChange={(e) => setGeneratedProfile(prev => ({ ...prev, businessName: e.target.value }))}
                      className="w-full p-2 rounded border border-brand-200 text-brand-900 font-medium"
                    />
                  </div>
                  <div>
                    <span className="text-xs text-brand-600 font-bold block">Bio</span>
                    <textarea 
                      value={generatedProfile?.bio}
                      onChange={(e) => setGeneratedProfile(prev => ({ ...prev, bio: e.target.value }))}
                      className="w-full p-2 rounded border border-brand-200 text-brand-900 h-20 text-sm"
                    />
                  </div>
                </div>
              </div>
              <button
                onClick={handleSave}
                className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
              >
                Looks Good <ArrowRight size={18} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};