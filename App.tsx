import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Search, 
  ScanSearch, 
  Wand2, 
  Send, 
  Settings as SettingsIcon,
  Menu,
  X
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
    
    // Check onboarding
    const profile = getUserProfile();
    const settings = getSettings();
    
    // Only show onboarding if API key is set but profile is incomplete
    // If API key is missing, user likely needs to go to settings first or we prompt them
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
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
        currentPage === page 
          ? 'bg-brand-600 text-white shadow-md' 
          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
      }`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen bg-slate-50">
      {showOnboarding && <Onboarding onComplete={() => setShowOnboarding(false)} />}

      {/* Mobile Sidebar Overlay */}
      {isMobile && isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-slate-900 text-white transform transition-transform duration-200 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-0 lg:hidden'
        } ${!isMobile && isSidebarOpen ? 'lg:w-64' : ''}`}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-slate-800 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
                <Wand2 size={18} className="text-white" />
              </div>
              <h1 className="text-xl font-bold tracking-tight">ColdReach</h1>
            </div>
            {isMobile && (
              <button onClick={() => setIsSidebarOpen(false)}>
                <X size={20} className="text-slate-400" />
              </button>
            )}
          </div>

          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <NavItem page={Page.DASHBOARD} icon={LayoutDashboard} label="Dashboard" />
            <NavItem page={Page.DISCOVERY} icon={Search} label="Discovery" />
            <NavItem page={Page.ANALYSIS} icon={ScanSearch} label="Analysis" />
            <NavItem page={Page.GENERATION} icon={Wand2} label="Mockup & Pitch" />
            <NavItem page={Page.OUTREACH} icon={Send} label="Outreach" />
            <NavItem page={Page.SETTINGS} icon={SettingsIcon} label="Settings" />
          </nav>

          <div className="p-4 border-t border-slate-800">
             <div className="text-xs text-slate-500 text-center">
                v1.1.0 • Powered by Gemini 2.0
             </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 shrink-0">
          <div className="flex items-center gap-4">
            {!isSidebarOpen && (
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <Menu size={20} className="text-slate-600" />
              </button>
            )}
            <h2 className="text-lg font-semibold text-slate-800">
              {currentPage.charAt(0) + currentPage.slice(1).toLowerCase()}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm font-medium border border-green-100">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              System Active
            </div>
            <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 font-medium">
              CR
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto bg-slate-50 p-4 lg:p-8">
          <div className="max-w-7xl mx-auto h-full">
            {renderPage()}
          </div>
        </div>
      </main>
    </div>
  );
}