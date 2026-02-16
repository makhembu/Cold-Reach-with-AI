import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, Search, AlertTriangle, Mail, ArrowRight, Activity, Globe, Zap, Target } from 'lucide-react';
import { getBusinesses } from '../services/storage';
import { Business, BusinessStatus, Page } from '../types';

interface Props {
  onChangePage: (page: Page) => void;
}

export const Dashboard: React.FC<Props> = ({ onChangePage }) => {
  const [stats, setStats] = useState({
    total: 0,
    analyzed: 0,
    lowScore: 0,
    contacted: 0
  });

  useEffect(() => {
    const businesses = getBusinesses();
    setStats({
      total: businesses.length,
      analyzed: businesses.filter(b => b.status !== BusinessStatus.DISCOVERED).length,
      lowScore: businesses.filter(b => b.analysis && b.analysis.overallScore < 50).length,
      contacted: businesses.filter(b => b.status === BusinessStatus.CONTACTED).length
    });
  }, []);

  const data = [
    { name: 'Discovered', value: stats.total, fill: '#3b82f6' },
    { name: 'Analyzed', value: stats.analyzed, fill: '#8b5cf6' },
    { name: 'Targets', value: stats.lowScore, fill: '#f59e0b' },
    { name: 'Contacted', value: stats.contacted, fill: '#10b981' },
  ];

  const StatCard = ({ title, value, icon: Icon, color, gradient, onClick }: any) => (
    <div 
      onClick={onClick}
      className="group relative bg-slate-900 border border-slate-800 rounded-xl p-6 cursor-pointer overflow-hidden transition-all duration-300 hover:border-slate-700 hover:shadow-lg hover:shadow-blue-900/10"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />
      <div className="relative z-10 flex justify-between items-start">
        <div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">{title}</p>
          <h3 className="text-3xl font-black text-slate-100 tracking-tight">{value}</h3>
        </div>
        <div className={`p-3 rounded-lg bg-slate-950 border border-slate-800 ${color} group-hover:scale-110 transition-transform duration-300`}>
          <Icon size={20} />
        </div>
      </div>
      <div className="mt-4 flex items-center text-xs font-medium text-slate-500 group-hover:text-slate-400 transition-colors">
        <span>View Details</span>
        <ArrowRight size={12} className="ml-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end border-b border-slate-800 pb-6">
        <div>
          <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-100 to-slate-500">Mission Control</h2>
          <p className="text-slate-400 mt-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"></span>
            System Operational
          </p>
        </div>
        <button 
          onClick={() => onChangePage(Page.DISCOVERY)}
          className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white px-5 py-2.5 rounded-lg font-bold shadow-lg shadow-blue-900/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
        >
          <Search size={18} />
          Initialize Recon
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Assets" 
          value={stats.total} 
          icon={Globe} 
          color="text-blue-400"
          gradient="from-blue-600 to-cyan-600"
          onClick={() => onChangePage(Page.DISCOVERY)}
        />
        <StatCard 
          title="Intel Gathered" 
          value={stats.analyzed} 
          icon={Activity} 
          color="text-purple-400"
          gradient="from-purple-600 to-pink-600"
          onClick={() => onChangePage(Page.ANALYSIS)}
        />
        <StatCard 
          title="High Value Targets" 
          value={stats.lowScore} 
          icon={Target} 
          color="text-amber-400"
          gradient="from-amber-600 to-orange-600"
          onClick={() => onChangePage(Page.GENERATION)}
        />
        <StatCard 
          title="Campaigns Active" 
          value={stats.contacted} 
          icon={Zap} 
          color="text-green-400"
          gradient="from-green-600 to-emerald-600"
          onClick={() => onChangePage(Page.OUTREACH)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900 rounded-xl border border-slate-800 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
              <Activity size={18} className="text-blue-500" />
              Pipeline Velocity
            </h3>
            <select className="bg-slate-950 border border-slate-800 text-slate-400 text-xs rounded-md px-2 py-1 outline-none focus:border-blue-500">
              <option>Last 30 Days</option>
              <option>Last 7 Days</option>
            </select>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#64748b', fontSize: 12}} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#64748b', fontSize: 12}} 
                />
                <Tooltip 
                  cursor={{fill: '#1e293b', opacity: 0.4}}
                  contentStyle={{
                    backgroundColor: '#0f172a', 
                    borderRadius: '8px', 
                    border: '1px solid #1e293b',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                  }}
                  itemStyle={{color: '#e2e8f0'}}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} animationDuration={1500} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 flex flex-col shadow-sm">
          <h3 className="text-lg font-bold text-slate-200 mb-4">Live Feed</h3>
          <div className="flex-1 overflow-y-auto pr-2 space-y-4 max-h-[300px] scrollbar-thin scrollbar-thumb-slate-700">
            {stats.total === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 py-8">
                 <Globe size={32} className="mb-2 opacity-20" />
                 <p className="text-sm">No signals detected.</p>
                 <button onClick={() => onChangePage(Page.DISCOVERY)} className="text-blue-400 text-xs font-bold mt-2 hover:underline">Start Scanning</button>
               </div>
            ) : (
              getBusinesses().slice(-6).reverse().map((b, i) => (
                <div key={i} className="group flex items-start gap-3 pb-3 border-b border-slate-800/50 last:border-0 last:pb-0">
                  <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                    b.status === BusinessStatus.CONTACTED ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' :
                    b.status === BusinessStatus.ANALYZED ? 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.4)]' : 'bg-blue-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <p className="text-sm font-bold text-slate-300 truncate group-hover:text-blue-400 transition-colors">{b.name}</p>
                      <span className="text-[10px] text-slate-600 font-mono">Now</span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">
                      {b.status === BusinessStatus.CONTACTED ? 'Outreach sequence initiated' : 
                       b.status === BusinessStatus.ANALYZED ? `Agent Score: ${b.analysis?.overallScore}/100` : 'New target acquired'}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
          <button 
            onClick={() => onChangePage(Page.ANALYSIS)}
            className="w-full mt-4 py-3 bg-slate-950 border border-slate-800 rounded-lg text-xs font-bold text-slate-400 hover:text-white hover:border-slate-700 hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
          >
            View Full Log <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};