import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, Search, Wifi, WifiOff, ChevronRight, Check, AlertTriangle, ExternalLink, LogOut, User as UserIcon, FileText } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLiveData } from '@/contexts/LiveDataContext';
import AudioVoiceAnnouncer from '@/components/AudioVoiceAnnouncer';
import SOCShiftHandoverModal from '@/components/SOCShiftHandoverModal';
import EmergencyLockdownModal from '@/components/EmergencyLockdownModal';
import PitchDemoControllerModal from '@/components/PitchDemoControllerModal';
import GlobalHotkeysModal from '@/components/GlobalHotkeysModal';
import { AlertOctagon, Sparkles, Keyboard } from 'lucide-react';

const PAGE_TITLES: Record<string, { title: string; crumbs: string[] }> = {
  '/': { title: 'Command Center', crumbs: ['Overview'] },
  '/monitoring': { title: 'Live Monitoring', crumbs: ['Operations', 'Live Monitoring'] },
  '/tracking': { title: 'Suspect Re-ID & Trajectory', crumbs: ['Intelligence', 'Suspect Tracking'] },
  '/incidents': { title: 'Incidents', crumbs: ['Operations', 'Incidents'] },
  '/sources': { title: 'Monitoring Sources', crumbs: ['Configuration', 'Sources'] },
  '/zones': { title: 'Safety Zones', crumbs: ['Configuration', 'Zones'] },
  '/rules': { title: 'Safety Rules', crumbs: ['Configuration', 'Rules'] },
  '/evidence': { title: 'Evidence', crumbs: ['Records', 'Evidence'] },
  '/analytics': { title: 'Safety Analytics', crumbs: ['Reports', 'Analytics'] },
  '/models': { title: 'AI Model Management', crumbs: ['System', 'AI Models'] },
  '/audit': { title: 'Audit Logs', crumbs: ['System', 'Audit Logs'] },
  '/settings': { title: 'Settings', crumbs: ['System', 'Settings'] },
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
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [lockdownModalOpen, setLockdownModalOpen] = useState(false);
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

  const pageInfo = PAGE_TITLES[pageKey] ?? { title: 'SafeWatch SOC', crumbs: ['Mission Control'] };

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
      navigate('/incidents');
    }
  };

  return (
    <header className="h-14 bg-[#080e1a]/95 border-b border-white/[0.07] flex items-center px-4 gap-4 backdrop-blur-md relative z-40">
      {/* Left — Title & Breadcrumb */}
      <div className="flex flex-col justify-center min-w-0">
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
          <span>SafeWatch SOC</span>
          {pageInfo.crumbs.map((c, i) => (
            <React.Fragment key={i}>
              <ChevronRight className="w-3 h-3 text-slate-600" />
              <span className={i === pageInfo.crumbs.length - 1 ? 'text-sky-400 font-semibold' : ''}>{c}</span>
            </React.Fragment>
          ))}
        </div>
        <h1 className="text-sm font-bold text-white truncate leading-tight">{pageInfo.title}</h1>
      </div>

      {/* Center — Search */}
      <div className="flex-1 flex justify-center">
        <form onSubmit={handleSearchSubmit} className={`relative transition-all duration-300 ${searchOpen ? 'w-80' : 'w-56'}`}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            id="topbar-search"
            type="text"
            value={searchQuery}
            onFocus={() => setSearchOpen(true)}
            onBlur={() => setSearchOpen(false)}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search incidents, cameras, zones…"
            className="w-full bg-white/[0.05] border border-white/10 rounded-lg py-1.5 pl-8 pr-3 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-sky-500/40 focus:bg-sky-500/5 transition-all"
          />
        </form>
      </div>

      {/* Right — Status + Audio + Notifications + Time + Avatar */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {/* Audio Announcer & Siren Controller */}
        <AudioVoiceAnnouncer />



        {/* MongoDB / Real-time Live Badge */}
        <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="hidden sm:inline">Live Engine</span>
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
          <span className="hidden md:inline">Demo Mode</span>
        </button>

        {/* SOC Shift Handover Modal Button */}
        <button
          onClick={() => setShiftModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1 bg-sky-500/15 border border-sky-500/30 hover:bg-sky-500/25 text-sky-400 text-xs font-mono font-bold rounded-lg transition-colors shadow-sm"
        >
          <FileText className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Shift Handover</span>
        </button>

        {/* Emergency Lockdown Red Alert Button */}
        <button
          onClick={() => setLockdownModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1 bg-red-600/20 border border-red-500/50 hover:bg-red-600/30 text-red-400 text-xs font-mono font-bold rounded-lg transition-all shadow-md shadow-red-500/20 animate-pulse"
        >
          <AlertOctagon className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Red Alert</span>
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
                <span className="text-xs font-bold text-white uppercase tracking-wider">Active SOC Alerts</span>
                <button
                  onClick={() => setUnreadList([])}
                  className="text-[10px] text-sky-400 hover:text-sky-300 flex items-center gap-1"
                >
                  <Check className="w-3 h-3" /> Mark read
                </button>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {unreadList.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-500">All alerts cleared</div>
                ) : (
                  unreadList.map((inc) => (
                    <div
                      key={inc.id}
                      onClick={() => {
                        setNotifOpen(false);
                        navigate(`/incidents/${inc.id}`);
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
                <UserIcon className="w-3.5 h-3.5" /> SOC Profile
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
        onOpenLockdown={() => setLockdownModalOpen(true)}
        onOpenShift={() => setShiftModalOpen(true)}
      />

      {/* Hackathon Pitch / Live Demo Controller Modal */}
      <PitchDemoControllerModal
        isOpen={demoModalOpen}
        onClose={() => setDemoModalOpen(false)}
      />

      {/* SOC Shift Handover Modal */}
      <SOCShiftHandoverModal
        isOpen={shiftModalOpen}
        onClose={() => setShiftModalOpen(false)}
      />

      {/* Emergency Lockdown Modal */}
      <EmergencyLockdownModal
        isOpen={lockdownModalOpen}
        onClose={() => setLockdownModalOpen(false)}
      />
    </header>
  );
};


export default TopBar;


