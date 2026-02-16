import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Search, 
  ScanSearch, 
  Wand2, 
  Send, 
  Settings as SettingsIcon,
  Menu,
  X,
  Bot,
  Zap,
  Activity
} from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { Discovery } from './components/Discovery';
import { Analysis } from './components/Analysis';
import { Generation } from './components/Generation';
import { Outreach } from './components/Outreach';
import { SettingsPage } from './components/SettingsPage';
import { Onboarding } from './components/Onboarding';
import { initStorage, getUserProfile, getSettings } from './services/storage';
import { Page } from './types';

initStorage();

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>(() => {
    const saved = localStorage.getItem('coldreach_current_page');
    return (saved as Page) || Page.DASHBOARD;
  });
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) setIsSidebarOpen(false);
      else setIsSidebarOpen(true);
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    
    const profile = getUserProfile();
    const settings = getSettings();
    if (settings.geminiApiKey && !profile.onboardingCompleted) {
      setShowOnboarding(true);
    }

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    localStorage.setItem('coldreach_current_page', currentPage);
  }, [currentPage]);

  const renderPage = () => {
    switch (currentPage) {
      case Page.DASHBOARD: return <Dashboard onChangePage={setCurrentPage} />;
      case Page.DISCOVERY: return <Discovery />;
      case Page.ANALYSIS: return <Analysis />;
      case Page.GENERATION: return <Generation />;
      case Page.OUTREACH: return <Outreach />;
      case Page.SETTINGS: return <SettingsPage />;
      default: return <Dashboard onChangePage={setCurrentPage} />;
    }
  };

  const NavItem = ({ page, icon: Icon, label }: { page: Page; icon: any; label: string }) => (
    <button
      onClick={() => {
        setCurrentPage(page);
        if (isMobile) setIsSidebarOpen(false);
      }}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
        currentPage === page 
          ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20' 
          : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent'
      }`}
    >
      <Icon size={18} className={`transition-colors ${currentPage === page ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
      <span className="font-medium text-sm">{label}</span>
      {currentPage === page && (
        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]" />
      )}
    </button>
  );

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30 selection:text-blue-200">
      {showOnboarding && <Onboarding onComplete={() => setShowOnboarding(false)} />}

      {isMobile && isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-20"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-slate-900 border-r border-slate-800 transform transition-transform duration-200 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-0 lg:hidden'
        } ${!isMobile && isSidebarOpen ? 'lg:w-64' : ''}`}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-slate-800 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-900/20">
                <Bot size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold tracking-tight text-white leading-none">ColdReach</h1>
                <span className="text-[10px] text-blue-400 font-medium tracking-wide uppercase">Agent Control</span>
              </div>
            </div>
            {isMobile && (
              <button onClick={() => setIsSidebarOpen(false)}>
                <X size={20} className="text-slate-400" />
              </button>
            )}
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-600">Operations</div>
            <NavItem page={Page.DASHBOARD} icon={LayoutDashboard} label="Overview" />
            <NavItem page={Page.DISCOVERY} icon={Search} label="Reconnaissance" />
            <NavItem page={Page.ANALYSIS} icon={ScanSearch} label="Agent Lab" />
            
            <div className="px-4 py-2 mt-4 text-[10px] font-bold uppercase tracking-wider text-slate-600">Assets</div>
            <NavItem page={Page.GENERATION} icon={Wand2} label="Generation" />
            <NavItem page={Page.OUTREACH} icon={Send} label="Campaigns" />
            
            <div className="px-4 py-2 mt-4 text-[10px] font-bold uppercase tracking-wider text-slate-600">System</div>
            <NavItem page={Page.SETTINGS} icon={SettingsIcon} label="Configuration" />
          </nav>

          <div className="p-4 border-t border-slate-800 bg-slate-900/50">
             <div className="flex items-center gap-3 px-2">
               <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
               <div className="flex-1">
                 <div className="text-xs font-medium text-slate-300">System Online</div>
                 <div className="text-[10px] text-slate-500">Gemini 2.5 • DeepSeek R1</div>
               </div>
             </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative bg-slate-950">
        <header className="h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-4 lg:px-8 shrink-0 z-10">
          <div className="flex items-center gap-4">
            {!isSidebarOpen && (
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400"
              >
                <Menu size={20} />
              </button>
            )}
            <h2 className="text-sm font-medium text-slate-400 flex items-center gap-2">
              <span className="opacity-50">/</span> 
              <span className="text-slate-200">{currentPage.charAt(0) + currentPage.slice(1).toLowerCase()}</span>
            </h2>
          </div>
          <div className="flex items-center gap-4">
             <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-full border border-slate-700">
                <Zap size={14} className="text-yellow-500" />
                <span className="text-xs font-medium text-slate-300">Turbo Mode</span>
             </div>
             <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-700 to-slate-600 flex items-center justify-center border border-slate-500/30 shadow-inner">
               <span className="text-xs font-bold text-white">OP</span>
             </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 lg:p-8 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
          <div className="max-w-7xl mx-auto h-full animate-in fade-in duration-300 slide-in-from-bottom-2">
            {renderPage()}
          </div>
        </div>
      </main>
    </div>
  );
}