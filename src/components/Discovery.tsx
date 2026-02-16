import React, { useState, useEffect } from 'react';
import { Search, MapPin, Loader2, Sparkles, AlertCircle, ArrowRight, Globe, Database, RefreshCw } from 'lucide-react';
import { addBusiness, getUserProfile, getSettings } from '../services/storage';
import { getDiscoverySuggestions, searchBusinessesWithGemini } from '../services/geminiService';
import { Business } from '../types';

export const Discovery: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Business[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [profile] = useState(getUserProfile());

  useEffect(() => {
    // Try load from cache first
    const cached = localStorage.getItem('coldreach_suggestions');
    if (cached) {
      setSuggestions(JSON.parse(cached));
    } else {
      loadSuggestions();
    }
  }, []);

  const loadSuggestions = async () => {
    if (!profile.businessName || !getSettings().geminiApiKey) return;
    
    setSuggestionsLoading(true);
    try {
      const suggs = await getDiscoverySuggestions(profile);
      setSuggestions(suggs);
      localStorage.setItem('coldreach_suggestions', JSON.stringify(suggs));
    } catch (e) {
      console.log("Failed to load suggestions", e);
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const businesses = await searchBusinessesWithGemini(query);
      if (businesses.length === 0) {
        setError("No signals found in this sector. Try a broader query.");
      } else {
        businesses.forEach(b => addBusiness(b));
        setResults(businesses);
      }
    } catch (err: any) {
      setError(err.message || "Scan failed. Verify API configuration.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="text-center py-8">
        <h2 className="text-4xl font-black text-white mb-2 tracking-tight">Target Reconnaissance</h2>
        <p className="text-slate-400">Deploy AI agents to identify high-value prospects via Google Grounding</p>
      </div>

      {/* Search Console */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl opacity-20 group-hover:opacity-40 blur transition duration-500"></div>
        <div className="relative bg-slate-900 p-8 rounded-xl border border-slate-800 shadow-2xl">
          <form onSubmit={handleSearch} className="max-w-3xl mx-auto">
            <div className="relative flex items-center">
              <Search className="absolute left-5 text-slate-500" size={24} />
              <input
                type="text"
                placeholder="Enter scan parameters (e.g. 'Dentists in Seattle')"
                className="w-full pl-14 pr-32 py-5 bg-slate-950 border border-slate-800 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-lg text-slate-100 placeholder-slate-600 shadow-inner transition-all"
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
              <button
                type="submit"
                disabled={loading}
                className="absolute right-2 top-2 bottom-2 bg-blue-600 hover:bg-blue-500 text-white px-6 rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : 'Scan Sector'}
              </button>
            </div>
            
            {error && (
              <div className="mt-4 p-3 bg-red-950/30 border border-red-900/50 text-red-400 rounded-lg flex items-center gap-2 text-sm">
                <AlertCircle size={16} /> {error}
              </div>
            )}
          </form>

          {/* Suggestions */}
          {(suggestions.length > 0 || suggestionsLoading) && (
            <div className="max-w-3xl mx-auto mt-6">
              <div className="flex justify-between items-center mb-3">
                 <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                   <Sparkles size={12} className="text-purple-400" /> 
                   Strategy for: <span className="text-slate-300">{profile.businessName || 'Agent'}</span>
                 </h3>
                 <button 
                   onClick={loadSuggestions} 
                   disabled={suggestionsLoading}
                   className="text-[10px] font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 disabled:opacity-50"
                 >
                   <RefreshCw size={10} className={suggestionsLoading ? "animate-spin" : ""} /> Regenerate
                 </button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {suggestionsLoading ? (
                  <div className="text-slate-500 text-xs flex items-center gap-2">
                    <Loader2 size={12} className="animate-spin" /> Analyzing market opportunities...
                  </div>
                ) : (
                  suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => setQuery(s)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-full border border-slate-700 hover:border-slate-600 transition-colors animate-in fade-in slide-in-from-bottom-2"
                      style={{ animationDelay: `${i * 100}ms` }}
                    >
                      {s}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
            <h3 className="font-bold text-slate-200 flex items-center gap-2">
              <Database size={16} className="text-green-500" /> 
              Targets Acquired: {results.length}
            </h3>
            <span className="text-xs font-mono text-green-400 bg-green-950/30 px-2 py-1 rounded border border-green-900/50">
              SAVED TO DATABASE
            </span>
          </div>
          <table className="w-full text-left">
            <thead className="bg-slate-950 text-slate-500 text-xs uppercase tracking-wider font-bold border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Business Entity</th>
                <th className="px-6 py-4">Digital Presence</th>
                <th className="px-6 py-4">Coordinates</th>
                <th className="px-6 py-4">Sector</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {results.map((b, i) => (
                <tr key={b.id} className="hover:bg-slate-800/50 transition-colors" style={{ animationDelay: `${i * 50}ms` }}>
                  <td className="px-6 py-4 font-bold text-slate-200">{b.name}</td>
                  <td className="px-6 py-4">
                    <a href={b.website} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1 group">
                       <Globe size={14} className="group-hover:animate-spin-slow" /> 
                       {b.website} 
                       <ArrowRight size={12} className="-rotate-45 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                    </a>
                  </td>
                  <td className="px-6 py-4 text-slate-400 text-sm flex items-center gap-2">
                    <MapPin size={14} className="text-slate-600" />
                    {b.location}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-block px-2 py-1 bg-slate-800 text-slate-300 rounded text-xs border border-slate-700">
                      {b.category}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};