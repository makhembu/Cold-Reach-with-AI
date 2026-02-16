
import React, { useState, useEffect } from 'react';
import { Save, Key, Mail, User, CheckCircle2, Shield, Globe, Database, Download, Upload, Trash2, AlertCircle } from 'lucide-react';
import { getSettings, saveSettings, getUserProfile, saveUserProfile, getBusinesses } from '../services/storage';
import { Settings, UserProfile } from '../types';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<Settings>(getSettings());
  const [profile, setProfile] = useState<UserProfile>(getUserProfile());
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'api' | 'email' | 'profile' | 'data'>('api');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveSettings(settings);
    saveUserProfile(profile);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleExport = () => {
    const data = {
      businesses: getBusinesses(),
      settings: getSettings(),
      profile: getUserProfile()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `coldreach-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.businesses) localStorage.setItem('coldreach_businesses', JSON.stringify(data.businesses));
        if (data.settings) localStorage.setItem('coldreach_settings', JSON.stringify(data.settings));
        if (data.profile) localStorage.setItem('coldreach_profile', JSON.stringify(data.profile));
        alert('Data imported successfully! The page will reload.');
        window.location.reload();
      } catch (err) {
        alert('Failed to parse backup file.');
      }
    };
    reader.readAsText(file);
  };

  const handleClear = () => {
      if(confirm("Are you sure? This will delete ALL businesses and campaign data.")) {
          localStorage.removeItem('coldreach_businesses');
          window.location.reload();
      }
  };

  const TabButton = ({ id, label, icon: Icon }: any) => (
    <button
      type="button"
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        activeTab === id 
          ? 'bg-brand-100 text-brand-700' 
          : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      <Icon size={16} />
      {label}
    </button>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Settings</h2>
          <p className="text-slate-500 mt-1">Manage your configuration and profile</p>
        </div>
        <button
          onClick={handleSave}
          className="bg-brand-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-brand-700 transition-colors flex items-center gap-2"
        >
          {saved ? <CheckCircle2 size={18} /> : <Save size={18} />}
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      <div className="flex gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <TabButton id="api" label="API Keys" icon={Key} />
        <TabButton id="email" label="Email Config" icon={Mail} />
        <TabButton id="profile" label="User Profile" icon={User} />
        <TabButton id="data" label="Data Management" icon={Database} />
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* API Tab */}
        {activeTab === 'api' && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6">
            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <Shield className="text-blue-600 shrink-0 mt-0.5" size={20} />
              <p className="text-sm text-blue-800">
                <strong>Gemini API Key Required:</strong> This app uses Google's Gemini AI for core functions.
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Gemini API Key</label>
              <input
                type="password"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                value={settings.geminiApiKey}
                onChange={e => setSettings({...settings, geminiApiKey: e.target.value})}
                placeholder="AIza..."
              />
            </div>

            <div className="border-t border-slate-200 pt-6">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Globe size={16} /> Advanced Agents (DeepSeek)
              </h3>
              
              <div className="space-y-4">
                 <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">GCP Project ID (for Vertex AI)</label>
                   <input
                     className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                     value={settings.gcpProjectId || ''}
                     onChange={e => setSettings({...settings, gcpProjectId: e.target.value})}
                     placeholder="my-project-123"
                   />
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">GCP Location</label>
                     <select
                       className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none bg-white"
                       value={settings.gcpLocation || 'us-central1'}
                       onChange={e => setSettings({...settings, gcpLocation: e.target.value})}
                     >
                       <option value="us-central1">us-central1</option>
                       <option value="global">global</option>
                     </select>
                   </div>
                   <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">GCP Access Token</label>
                     <input
                       type="password"
                       className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none"
                       value={settings.gcpAccessToken || ''}
                       onChange={e => setSettings({...settings, gcpAccessToken: e.target.value})}
                       placeholder="ya29..."
                     />
                   </div>
                 </div>
                 <p className="text-xs text-slate-500">
                    DeepSeek reasoning models are accessed via Google Vertex AI. 
                    Run <code>gcloud auth print-access-token</code> to get a token.
                 </p>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-6">
               <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                 <Globe size={16} /> Screenshot Services (Optional)
               </h3>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">ScreenshotAPI Token</label>
                    <input
                      type="password"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none"
                      value={settings.screenshotApiToken || ''}
                      onChange={e => setSettings({...settings, screenshotApiToken: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">ApiFlash Key</label>
                    <input
                      type="password"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none"
                      value={settings.apiflashKey || ''}
                      onChange={e => setSettings({...settings, apiflashKey: e.target.value})}
                    />
                  </div>
               </div>
            </div>
          </div>
        )}

        {/* Email Tab */}
        {activeTab === 'email' && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">From Name</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none"
                  value={settings.emailConfig.fromName}
                  onChange={e => setSettings({
                    ...settings, 
                    emailConfig: { ...settings.emailConfig, fromName: e.target.value }
                  })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">From Email</label>
                <input
                  type="email"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none"
                  value={settings.emailConfig.fromEmail}
                  onChange={e => setSettings({
                    ...settings, 
                    emailConfig: { ...settings.emailConfig, fromEmail: e.target.value }
                  })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Sending Method</label>
              <div className="grid grid-cols-3 gap-4">
                {['gmail', 'resend', 'custom_smtp'].map((provider) => (
                  <label 
                    key={provider}
                    className={`border rounded-lg p-3 cursor-pointer flex items-center justify-center gap-2 capitalize ${
                      settings.emailConfig.provider === provider 
                        ? 'bg-brand-50 border-brand-500 text-brand-700 font-medium' 
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input 
                      type="radio" 
                      name="provider" 
                      className="hidden"
                      checked={settings.emailConfig.provider === provider}
                      onChange={() => setSettings({
                        ...settings,
                        emailConfig: { ...settings.emailConfig, provider: provider as any }
                      })}
                    />
                    {provider.replace('_', ' ')}
                  </label>
                ))}
              </div>
            </div>

            {settings.emailConfig.provider === 'resend' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Resend API Key</label>
                <input
                  type="password"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none"
                  placeholder="re_123..."
                  value={settings.emailConfig.resendApiKey || ''}
                  onChange={e => setSettings({
                    ...settings, 
                    emailConfig: { ...settings.emailConfig, resendApiKey: e.target.value }
                  })}
                />
              </div>
            )}
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Your Name</label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none"
                value={profile.name}
                onChange={e => setProfile({...profile, name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Agency/Business Name</label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none"
                value={profile.businessName}
                onChange={e => setProfile({...profile, businessName: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Bio / Pitch Intro</label>
              <textarea
                className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none h-24"
                value={profile.bio}
                onChange={e => setProfile({...profile, bio: e.target.value})}
              />
            </div>
          </div>
        )}

        {/* Data Tab */}
        {activeTab === 'data' && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="p-6 border border-slate-200 rounded-lg hover:shadow-md transition-shadow">
                 <div className="flex items-center gap-3 mb-3">
                   <div className="p-2 bg-blue-100 rounded-lg">
                     <Download size={20} className="text-blue-600"/>
                   </div>
                   <h3 className="font-bold text-slate-900">Export Backup</h3>
                 </div>
                 <p className="text-sm text-slate-500 mb-4">
                   Download a JSON file containing all businesses, settings, and profile data.
                 </p>
                 <button
                   type="button"
                   onClick={handleExport}
                   className="w-full py-2 border border-blue-600 text-blue-600 font-medium rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                 >
                   <Download size={16}/> Download Data
                 </button>
               </div>

               <div className="p-6 border border-slate-200 rounded-lg hover:shadow-md transition-shadow">
                 <div className="flex items-center gap-3 mb-3">
                   <div className="p-2 bg-green-100 rounded-lg">
                     <Upload size={20} className="text-green-600"/>
                   </div>
                   <h3 className="font-bold text-slate-900">Import Backup</h3>
                 </div>
                 <p className="text-sm text-slate-500 mb-4">
                   Restore data from a previously exported JSON file.
                 </p>
                 <label className="w-full py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 cursor-pointer">
                   <Upload size={16}/> 
                   <span>Select File</span>
                   <input type="file" accept=".json" onChange={handleImport} className="hidden"/>
                 </label>
               </div>
            </div>

            <div className="pt-6 border-t border-slate-200">
               <div className="p-6 border border-red-200 bg-red-50 rounded-lg flex items-center justify-between">
                 <div className="flex items-start gap-3">
                    <AlertCircle className="text-red-600 mt-1" size={20}/>
                    <div>
                      <h3 className="font-bold text-red-900">Danger Zone</h3>
                      <p className="text-sm text-red-700 mt-1">
                        Permanently delete all business data.
                      </p>
                    </div>
                 </div>
                 <button
                   type="button"
                   onClick={handleClear}
                   className="px-4 py-2 bg-white border border-red-300 text-red-700 font-medium rounded-lg hover:bg-red-100 transition-colors flex items-center gap-2"
                 >
                   <Trash2 size={16}/> Clear Data
                 </button>
               </div>
            </div>
          </div>
        )}

      </form>
    </div>
  );
};
