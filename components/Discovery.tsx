import React, { useState, useEffect } from 'react';
import { Search, MapPin, Loader2, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';
import { addBusiness, getUserProfile, getSettings } from '../services/storage';
import { getDiscoverySuggestions, searchBusinessesWithGemini } from '../services/geminiService';
import { Business } from '../types';

export const Discovery: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Business[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSuggestions();
  }, []);

  const loadSuggestions = async () => {
    try {
      const profile = getUserProfile();
      if (profile.businessName && getSettings().geminiApiKey) {
        const suggs = await getDiscoverySuggestions(profile);
        setSuggestions(suggs);
      }
    } catch (e) {
      console.log("Failed to load suggestions", e);
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
        setError("No businesses found matching criteria.");
      } else {
        businesses.forEach(b => addBusiness(b));
        setResults(businesses);
      }
    } catch (err: any) {
      setError(err.message || "Search failed. Ensure Gemini API Key is set.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Discovery</h2>
        <p className="text-slate-500 mt-1">AI-powered business finding with Google Search Grounding</p>
      </div>

      {/* Search Section */}
      <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
        <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="e.g. 'Plumbers in Austin with bad websites' or 'Local bakeries'"
              className="w-full pl-12 pr-4 py-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-lg shadow-sm"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            <button
              type="submit"
              disabled={loading}
              className="absolute right-2 top-2 bottom-2 bg-brand-600 text-white px-6 rounded-lg font-medium hover:bg-brand-700 transition-colors disabled:opacity-70"
            >
              {loading ? <Loader2 className="animate-spin" /> : 'Search'}
            </button>
          </div>
          
          {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 text-sm">
              <AlertCircle size={16} /> {error}
            </div>
          )}
        </form>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="max-w-2xl mx-auto mt-6">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Sparkles size={14} className="text-purple-500" /> AI Suggestions for you
            </h3>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setQuery(s)}
                  className="px-3 py-1.5 bg-purple-50 text-purple-700 text-sm rounded-full hover:bg-purple-100 border border-purple-100 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <h3 className="font-bold text-slate-800">Found {results.length} Businesses</h3>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Saved to Database</span>
          </div>
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 font-medium">Business Name</th>
                <th className="px-6 py-3 font-medium">Website</th>
                <th className="px-6 py-3 font-medium">Location</th>
                <th className="px-6 py-3 font-medium">Category</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {results.map(b => (
                <tr key={b.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">{b.name}</td>
                  <td className="px-6 py-4">
                    <a href={b.website} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline text-sm flex items-center gap-1">
                       {b.website} <ArrowRight size={12} className="-rotate-45" />
                    </a>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{b.location}</td>
                  <td className="px-6 py-4 text-slate-600">
                    <span className="inline-block px-2 py-1 bg-slate-100 rounded text-xs">
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