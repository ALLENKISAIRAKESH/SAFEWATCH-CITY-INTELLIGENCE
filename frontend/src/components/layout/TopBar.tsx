import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, Search, ChevronRight, Check, LogOut, User as UserIcon, Keyboard, Sparkles, Car } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLiveData } from '@/contexts/LiveDataContext';
import AudioVoiceAnnouncer from '@/components/AudioVoiceAnnouncer';
import PitchDemoControllerModal from '@/components/PitchDemoControllerModal';
import GlobalHotkeysModal from '@/components/GlobalHotkeysModal';

const PAGE_TITLES: Record<string, { title: string; crumbs: string[] }> = {
  '/': { title: 'SafeWatch — City Intelligence Mission Control', crumbs: ['City Intelligence', 'Mission Control'] },
  '/vehicle-intelligence': { title: 'SafeWatch — City Intelligence Mission Control', crumbs: ['City Intelligence', 'Overview'] },
  '/live-anpr': { title: 'Live ANPR & Multi-Camera Detection Stream', crumbs: ['Live Surveillance', 'ANPR Feeds'] },
  '/search': { title: 'Vehicle Search & Trajectory Reconstruction', crumbs: ['Forensic Search', 'Trajectory'] },
  '/vehicle-search': { title: 'Vehicle Search & Trajectory Reconstruction', crumbs: ['Forensic Search', 'Trajectory'] },
  '/associations': { title: 'Cross-Camera Association & Vehicle Re-ID', crumbs: ['Vehicle Re-ID', 'Identity Graph'] },
  '/cross-camera': { title: 'Cross-Camera Association & Vehicle Re-ID', crumbs: ['Vehicle Re-ID', 'Identity Graph'] },
  '/watchlists': { title: 'Vehicle Watchlists & Stolen Hotlist Alerts', crumbs: ['Law Enforcement', 'Hotlist Alerts'] },
  '/traffic': { title: 'Urban Traffic Flow Analytics, Density & OD Matrix', crumbs: ['Urban Analytics', 'OD Matrix'] },
  '/traffic-analytics': { title: 'Urban Traffic Flow Analytics, Density & OD Matrix', crumbs: ['Urban Analytics', 'OD Matrix'] },
  '/anomalies': { title: 'Route Plausibility & Impossible Transition Alerts', crumbs: ['Threat Detection', 'Route Anomalies'] },
  '/anomaly-alerts': { title: 'Route Plausibility & Impossible Transition Alerts', crumbs: ['Threat Detection', 'Route Anomalies'] },
  '/evaluation': { title: 'ANPR Pipeline Benchmark & Accuracy Metrics (CER, FPS)', crumbs: ['AI Pipeline', 'Model Benchmarks'] },
  '/anpr-evaluation': { title: 'ANPR Pipeline Benchmark & Accuracy Metrics (CER, FPS)', crumbs: ['AI Pipeline', 'Model Benchmarks'] },
  '/cameras': { title: 'City Traffic Camera Network & Topology', crumbs: ['Infrastructure', 'Camera Network'] },
  '/sources': { title: 'City Traffic Camera Network & Topology', crumbs: ['Infrastructure', 'Camera Network'] },
  '/evidence': { title: 'Vehicle Sighting Evidence & Plate Snapshot Vault', crumbs: ['Evidence Vault', 'Plate Archive'] },
  '/audit-logs': { title: 'ANPR Query & Law Enforcement Audit Trail', crumbs: ['Compliance', 'Audit Trail'] },
  '/settings': { title: 'ANPR Pipeline & System Configuration', crumbs: ['System', 'Settings'] },
};

const TopBar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { incidents } = useLiveData();
  const [time, setTime] = useState(new Date());
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [hotkeysModalOpen, setHotkeysModalOpen] = useState(false);
  const [unreadList, setUnreadList] = useState<any[]>([]);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    setUnreadList(incidents.slice(0, 5));
  }, [incidents]);

  const pageKey = Object.keys(PAGE_TITLES).find(
    (k) => k !== '/' && location.pathname.startsWith(k)
  ) ?? (location.pathname === '/' ? '/' : '/');

  const pageInfo = PAGE_TITLES[pageKey] ?? { title: 'SafeWatch City Intelligence', crumbs: ['SafeWatch', 'City Intelligence'] };

  const formattedTime = time.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const formattedDate = time.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate('/search?q=' + encodeURIComponent(searchQuery.trim()));
    }
  };

  return (
    <header className="h-14 bg-[#080e1a]/95 border-b border-white/[0.07] flex items-center px-4 gap-3 backdrop-blur-md relative z-40 justify-between">
      {/* Left — Title & Breadcrumb */}
      <div className="flex flex-col justify-center min-w-0 max-w-sm flex-shrink">
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono truncate">
          <span className="text-sky-400 font-bold">SafeWatch</span>
          {pageInfo.crumbs.map((c, i) => (
            <React.Fragment key={i}>
              <ChevronRight className="w-3 h-3 text-slate-600 flex-shrink-0" />
              <span className={i === pageInfo.crumbs.length - 1 ? 'text-sky-300 font-semibold' : ''}>{c}</span>
            </React.Fragment>
          ))}
        </div>
        <h1 className="text-sm font-bold text-white truncate leading-tight">{pageInfo.title}</h1>
      </div>

      {/* Center — Search */}
      <div className="flex-1 max-w-md mx-2 hidden sm:flex justify-center">
        <form onSubmit={handleSearchSubmit} className="w-full relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            id="topbar-search"
            type="text"
            value={searchQuery}
            onFocus={() => setSearchOpen(true)}
            onBlur={() => setSearchOpen(false)}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search plate (e.g. MH12, DL01), camera, vehicle…"
            className="w-full bg-white/[0.05] border border-white/10 rounded-lg py-1.5 pl-8 pr-3 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-sky-500/40 focus:bg-sky-500/5 transition-all font-mono"
          />
        </form>
      </div>

      {/* Right — Status + Audio + Notifications + Time + Avatar */}
      <div className="flex items-center gap-2.5 flex-shrink-0">
        {/* Audio Announcer */}
        <AudioVoiceAnnouncer />

        {/* Problem Statement Badge */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs font-mono text-sky-400 bg-sky-500/10 border border-sky-500/30 px-2.5 py-1 rounded-lg">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
          <span className="font-bold">SIH-26127</span>
        </div>

        {/* Real-time ANPR Pipeline Badge */}
        <div className="hidden md:flex items-center gap-1.5 text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Pipeline Online</span>
        </div>

        {/* Hotkeys HUD Button */}
        <button
          onClick={() => setHotkeysModalOpen(true)}
          title="Keyboard Hotkeys HUD (? / Ctrl+K)"
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors"
        >
          <Keyboard className="w-4 h-4" />
        </button>

        {/* Hackathon Pitch / Demo Mode Button */}
        <button
          onClick={() => setDemoModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 hover:border-amber-400 text-amber-300 text-xs font-mono font-bold rounded-lg transition-all shadow-md shadow-amber-500/10"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" style={{ animationDuration: '4s' }} />
          <span className="hidden md:inline">Pitch Simulator</span>
        </button>

        {/* Notifications Tray */}
        <div className="relative">
          <button
            id="topbar-notifications"
            onClick={() => {
              setNotifOpen(!notifOpen);
              setUserMenuOpen(false);
            }}
            className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors"
          >
            <Bell className="w-4 h-4" />
            {unreadList.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center animate-pulse">
                {unreadList.length}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-[#0d1526] border border-white/15 rounded-2xl shadow-2xl p-4 animate-fade-in z-50">
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-white/10">
                <span className="text-xs font-bold text-white uppercase tracking-wider">Active Vehicle Alerts</span>
                <button
                  onClick={() => setUnreadList([])}
                  className="text-[10px] text-sky-400 hover:text-sky-300 flex items-center gap-1"
                >
                  <Check className="w-3 h-3" /> Mark read
                </button>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {unreadList.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-500">All vehicle alerts cleared</div>
                ) : (
                  unreadList.map((inc) => (
                    <div
                      key={inc.id}
                      onClick={() => {
                        setNotifOpen(false);
                        navigate('/watchlists');
                      }}
                      className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-mono text-slate-400">{inc.id}</span>
                        <span className="text-[9px] font-bold uppercase text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">
                          {inc.severity}
                        </span>
                      </div>
                      <div className="text-xs font-medium text-white truncate">{inc.title}</div>
                      <div className="text-[10px] text-slate-500 truncate">{inc.zone} · {inc.source}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Clock */}
        <div className="hidden md:flex flex-col items-end">
          <span className="text-xs font-mono text-white font-semibold leading-tight">{formattedTime}</span>
          <span className="text-[10px] font-mono text-slate-500 leading-tight">{formattedDate}</span>
        </div>

        {/* User Profile Menu */}
        <div className="relative">
          <button
            onClick={() => {
              setUserMenuOpen(!userMenuOpen);
              setNotifOpen(false);
            }}
            className="flex items-center gap-2 p-1 rounded-xl hover:bg-white/[0.05] transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 text-[11px] font-bold">
              {user?.avatar || 'AD'}
            </div>
            <div className="hidden lg:block text-left">
              <div className="text-xs font-medium text-white leading-tight">{user?.name || 'Administrator'}</div>
              <div className="text-[10px] font-mono text-slate-500 leading-tight capitalize">{user?.role || 'Admin'}</div>
            </div>
          </button>

          {/* User Menu Dropdown */}
          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-[#0d1526] border border-white/15 rounded-xl shadow-2xl p-2 animate-fade-in z-50">
              <button
                onClick={() => {
                  setUserMenuOpen(false);
                  navigate('/settings');
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors"
              >
                <UserIcon className="w-3.5 h-3.5" /> Operator Profile
              </button>
              <button
                onClick={() => {
                  setUserMenuOpen(false);
                  logout();
                  navigate('/login');
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition-colors border-t border-white/10 mt-1 pt-2"
              >
                <LogOut className="w-3.5 h-3.5" /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Global Keyboard Shortcuts HUD Modal */}
      <GlobalHotkeysModal
        isOpen={hotkeysModalOpen}
        onClose={() => setHotkeysModalOpen(false)}
        onOpenDemo={() => setDemoModalOpen(true)}
      />

      {/* Hackathon Pitch / Live Demo Controller Modal */}
      <PitchDemoControllerModal
        isOpen={demoModalOpen}
        onClose={() => setDemoModalOpen(false)}
      />
    </header>
  );
};

export default TopBar;
