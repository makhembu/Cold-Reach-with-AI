import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, Search, AlertCircle, Mail, ArrowRight } from 'lucide-react';
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
    { name: 'Discovered', value: stats.total },
    { name: 'Analyzed', value: stats.analyzed },
    { name: 'Needs Fix', value: stats.lowScore },
    { name: 'Contacted', value: stats.contacted },
  ];

  const StatCard = ({ title, value, icon: Icon, color, onClick }: any) => (
    <div 
      onClick={onClick}
      className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${color} bg-opacity-10`}>
          <Icon className={color.replace('bg-', 'text-')} size={24} />
        </div>
        <span className="text-slate-400 text-sm font-medium">Last 30 days</span>
      </div>
      <h3 className="text-3xl font-bold text-slate-900">{value}</h3>
      <p className="text-slate-500 font-medium text-sm mt-1">{title}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Dashboard Overview</h2>
          <p className="text-slate-500 mt-1">Track your cold outreach automation pipeline</p>
        </div>
        <button 
          onClick={() => onChangePage(Page.DISCOVERY)}
          className="bg-brand-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-brand-700 transition-colors flex items-center gap-2"
        >
          <Search size={18} />
          Find New Businesses
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Businesses" 
          value={stats.total} 
          icon={Users} 
          color="text-blue-600 bg-blue-600"
          onClick={() => onChangePage(Page.DISCOVERY)}
        />
        <StatCard 
          title="Analyzed Sites" 
          value={stats.analyzed} 
          icon={Search} 
          color="text-purple-600 bg-purple-600"
          onClick={() => onChangePage(Page.ANALYSIS)}
        />
        <StatCard 
          title="Opportunities (<50)" 
          value={stats.lowScore} 
          icon={AlertCircle} 
          color="text-orange-600 bg-orange-600"
          onClick={() => onChangePage(Page.GENERATION)}
        />
        <StatCard 
          title="Emails Sent" 
          value={stats.contacted} 
          icon={Mail} 
          color="text-green-600 bg-green-600"
          onClick={() => onChangePage(Page.OUTREACH)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Pipeline Performance</h3>
          <div className="h-64 w-full" style={{ minHeight: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                <Tooltip 
                  cursor={{fill: '#f1f5f9'}}
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                />
                <Bar dataKey="value" fill="#0ea5e9" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {stats.total === 0 ? (
               <div className="text-center py-10 text-slate-400">
                 <p>No activity yet.</p>
                 <button onClick={() => onChangePage(Page.DISCOVERY)} className="text-brand-600 text-sm font-medium mt-2 hover:underline">Start Discovery</button>
               </div>
            ) : (
              getBusinesses().slice(-5).reverse().map((b, i) => (
                <div key={i} className="flex items-start gap-3 pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                  <div className={`w-2 h-2 mt-2 rounded-full ${
                    b.status === BusinessStatus.CONTACTED ? 'bg-green-500' :
                    b.status === BusinessStatus.ANALYZED ? 'bg-purple-500' : 'bg-blue-500'
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-slate-800">{b.name}</p>
                    <p className="text-xs text-slate-500">
                      {b.status === BusinessStatus.CONTACTED ? 'Email sent' : 
                       b.status === BusinessStatus.ANALYZED ? `Analyzed (Score: ${b.analysis?.overallScore})` : 'Discovered'}
                    </p>
                  </div>
                  <span className="ml-auto text-xs text-slate-400">Just now</span>
                </div>
              ))
            )}
          </div>
          <button 
            onClick={() => onChangePage(Page.ANALYSIS)}
            className="w-full mt-6 py-2 text-sm text-slate-600 font-medium hover:text-brand-600 flex items-center justify-center gap-1 transition-colors"
          >
            View All Activity <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};