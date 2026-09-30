import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Shield,
  LayoutDashboard,
  AlertTriangle,
  Camera,
  FileImage,
  BarChart3,
  ClipboardList,
  Settings,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Car,
  Search,
  ScanLine,
  Gauge,
  GitBranch,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  adminOnly?: boolean;
  badge?: string;
}

const SIH_NAV_ITEMS: NavItem[] = [
  { label: 'Mission Control', path: '/', icon: LayoutDashboard, badge: 'PS' },
  { label: 'Live ANPR Stream', path: '/live-anpr', icon: ScanLine, badge: 'LIVE' },
  { label: 'Vehicle Search', path: '/search', icon: Search },
  { label: 'Associations & ReID', path: '/associations', icon: GitBranch, badge: 'ReID' },
  { label: 'Watchlists & Alerts', path: '/watchlists', icon: Shield, badge: 'HOT' },
  { label: 'Traffic Analytics', path: '/traffic', icon: BarChart3 },
  { label: 'Route Anomalies', path: '/anomalies', icon: AlertTriangle },
  { label: 'Model Benchmarks', path: '/evaluation', icon: Gauge, badge: 'EVAL' },
];

const SYSTEM_NAV_ITEMS: NavItem[] = [
  { label: 'Traffic Cameras', path: '/cameras', icon: Camera },
  { label: 'Evidence Vault', path: '/evidence', icon: FileImage },
  { label: 'Audit Trail', path: '/audit-logs', icon: ClipboardList },
  { label: 'Pipeline Settings', path: '/settings', icon: Settings, adminOnly: true },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const visibleSystemItems = SYSTEM_NAV_ITEMS.filter(
    (item) => !item.adminOnly || user?.role === 'admin'
  );

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/' || location.pathname === '/vehicle-intelligence';
    if (path === '/search') return location.pathname.includes('search');
    if (path === '/live-anpr') return location.pathname.includes('live-anpr');
    if (path === '/associations') return location.pathname.includes('associations') || location.pathname.includes('cross-camera');
    if (path === '/watchlists') return location.pathname.includes('watchlists');
    if (path === '/traffic') return location.pathname.includes('traffic');
    if (path === '/anomalies') return location.pathname.includes('anomalies');
    if (path === '/evaluation') return location.pathname.includes('evaluation');
    if (path === '/cameras') return location.pathname.includes('cameras') || location.pathname.includes('sources');
    if (path === '/evidence') return location.pathname.includes('evidence');
    if (path === '/audit-logs') return location.pathname.includes('audit-logs');
    if (path === '/settings') return location.pathname.includes('settings');
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <aside
      className={`fixed left-0 top-0 h-full z-40 flex flex-col transition-all duration-300 ease-in-out
        bg-[#0a1120] border-r border-white/[0.07] shadow-2xl
        ${collapsed ? 'w-16' : 'w-60'}`}
    >
      {/* Logo */}
      <div className={`flex items-center h-16 px-4 border-b border-white/[0.07] flex-shrink-0 ${collapsed ? 'justify-center' : 'gap-3'}`}>
        <div className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-sky-500/15 border border-sky-500/30">
          <Car className="w-5 h-5 text-sky-400" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <div className="flex items-center gap-1.5">
              <span className="text-white font-extrabold text-base leading-tight tracking-tight whitespace-nowrap">SIH-26127</span>
              <span className="bg-cyan-500/20 text-cyan-300 text-[9px] font-mono px-1.5 py-0.5 rounded border border-cyan-500/40 font-bold">2024</span>
            </div>
            <div className="text-cyan-400/80 text-[10px] font-mono font-medium whitespace-nowrap">Vehicle Intelligence</div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 space-y-0.5 px-2">
        {!collapsed && (
          <div className="px-2 pt-1 pb-1.5 text-[9px] font-mono font-bold tracking-wider text-slate-500 uppercase">
            Core PS Capabilities
          </div>
        )}
        {SIH_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              title={collapsed ? item.label : undefined}
              className={`group flex items-center rounded-lg transition-all duration-150 relative
                ${collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5'}
                ${active
                  ? 'bg-sky-500/15 text-sky-400 shadow-[inset_0_0_0_1px_rgba(56,189,248,0.2)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]'
                }`}
            >
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-sky-400 rounded-r-full" />
              )}
              <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-sky-400' : 'text-slate-400 group-hover:text-slate-300'}`} />
              {!collapsed && (
                <>
                  <span className="text-sm font-medium flex-1 truncate">{item.label}</span>
                  {item.badge && (
                    <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      item.badge === 'LIVE' ? 'bg-red-500 text-white animate-pulse' :
                      item.badge === 'PS' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' :
                      item.badge === 'HOT' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                      'bg-slate-800 text-slate-300 border border-white/10'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </>
              )}
              {collapsed && item.badge && (
                <span className={`absolute top-1 right-1 w-2 h-2 rounded-full ${
                  item.badge === 'LIVE' ? 'bg-red-500 animate-pulse' : 'bg-sky-400'
                }`} />
              )}
            </NavLink>
          );
        })}

        {/* ── Infrastructure & Forensics Section ── */}
        <div className={`pt-3 pb-1 ${collapsed ? 'px-0' : 'px-1'}`}>
          {!collapsed && (
            <div className="flex items-center gap-1.5 mb-1 px-1">
              <div className="flex-1 h-px bg-white/[0.06]" />
              <div className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">
                INFRASTRUCTURE & FORENSICS
              </div>
              <div className="flex-1 h-px bg-white/[0.06]" />
            </div>
          )}
          {collapsed && <div className="h-px bg-white/[0.06] mx-2 mb-1" />}
        </div>
        {visibleSystemItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              title={collapsed ? item.label : undefined}
              className={`group flex items-center rounded-lg transition-all duration-150 relative
                ${collapsed ? 'justify-center px-0 py-2' : 'gap-3 px-3 py-2'}
                ${active
                  ? 'bg-sky-500/15 text-sky-400 shadow-[inset_0_0_0_1px_rgba(56,189,248,0.2)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]'
                }`}
            >
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-sky-400 rounded-r-full" />
              )}
              <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-sky-400' : 'text-slate-400 group-hover:text-slate-300'}`} />
              {!collapsed && (
                <span className="text-xs font-medium flex-1 truncate">{item.label}</span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* System Status */}
      <div className={`px-3 py-3 border-t border-white/[0.07] flex-shrink-0 ${collapsed ? 'flex justify-center' : ''}`}>
        {collapsed ? (
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" title="ANPR Pipeline Operational" />
        ) : (
          <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <div className="overflow-hidden">
              <div className="text-[10px] font-mono text-emerald-400 leading-tight whitespace-nowrap">ANPR Pipeline Online</div>
            </div>
          </div>
        )}
      </div>

      {/* User Area */}
      <div className={`px-3 py-3 border-t border-white/[0.07] flex-shrink-0 ${collapsed ? 'flex flex-col items-center gap-2' : ''}`}>
        {collapsed ? (
          <>
            <div className="w-8 h-8 rounded-full bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 text-xs font-bold">
              {user?.avatar}
            </div>
            <button
              onClick={logout}
              title="Logout"
              className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 text-xs font-bold flex-shrink-0">
              {user?.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">{user?.name}</div>
              <div className="text-[10px] text-slate-500 font-mono truncate">{user?.department}</div>
            </div>
            <button
              onClick={logout}
              title="Logout"
              className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-[#0a1120] border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:border-white/20 transition-all shadow-md"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </aside>
  );
};

export default Sidebar;
