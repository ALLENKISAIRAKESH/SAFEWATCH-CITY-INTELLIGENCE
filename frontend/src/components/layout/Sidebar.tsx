import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Shield,
  LayoutDashboard,
  Video,
  AlertTriangle,
  Camera,
  Map,
  BookOpen,
  FileImage,
  BarChart3,
  Brain,
  ClipboardList,
  Settings,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Workflow,
  Crosshair,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  adminOnly?: boolean;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Overview', path: '/', icon: LayoutDashboard },
  { label: 'Live Monitoring', path: '/monitoring', icon: Video },
  { label: 'Suspect Re-ID', path: '/tracking', icon: Crosshair, badge: 'AI' },
  { label: 'Incidents', path: '/incidents', icon: AlertTriangle, badge: '7' },
  { label: 'Sources', path: '/sources', icon: Camera },
  { label: 'Zones', path: '/zones', icon: Map },
  { label: 'Rules', path: '/rules', icon: BookOpen },
  { label: 'Evidence', path: '/evidence', icon: FileImage },
  { label: 'Analytics', path: '/analytics', icon: BarChart3 },
  { label: 'RocketRide .pipe', path: '/rocketride', icon: Workflow, badge: 'AI', adminOnly: true },
  { label: 'AI Models', path: '/ai-models', icon: Brain, adminOnly: true },
  { label: 'Audit Logs', path: '/audit-logs', icon: ClipboardList, adminOnly: true },
  { label: 'Settings', path: '/settings', icon: Settings, adminOnly: true },
];




interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.adminOnly || user?.role === 'admin'
  );

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
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
          <Shield className="w-5 h-5 text-sky-400" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <div className="text-white font-bold text-base leading-tight whitespace-nowrap">SafeWatch</div>
            <div className="text-sky-400/60 text-[10px] font-mono whitespace-nowrap">AI Safety Operations</div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 space-y-0.5 px-2">
        {visibleItems.map((item) => {
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
                    <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
              {collapsed && item.badge && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* System Status */}
      <div className={`px-3 py-3 border-t border-white/[0.07] flex-shrink-0 ${collapsed ? 'flex justify-center' : ''}`}>
        {collapsed ? (
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" title="All Systems Operational" />
        ) : (
          <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <div className="overflow-hidden">
              <div className="text-[10px] font-mono text-emerald-400 leading-tight whitespace-nowrap">All Systems Operational</div>
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
