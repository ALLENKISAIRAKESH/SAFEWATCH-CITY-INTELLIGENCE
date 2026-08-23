import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Keyboard, Sparkles, AlertOctagon, FileText, Video,
  LayoutDashboard, Crosshair, AlertTriangle, Shield,
  FileImage, BarChart3, Settings, X, Command
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onOpenDemo: () => void;
  onOpenLockdown: () => void;
  onOpenShift: () => void;
}

export const SHORTCUTS = [
  { key: 'D', label: 'Open Hackathon Demo Controller', icon: Sparkles, color: 'text-amber-400' },
  { key: 'L', label: 'Trigger Emergency Lockdown Red Alert', icon: AlertOctagon, color: 'text-red-400' },
  { key: 'S', label: 'Open SOC Shift Handover Modal', icon: FileText, color: 'text-sky-400' },
  { key: 'M', label: 'Navigate to Live Monitoring (Camera Wall)', icon: Video, color: 'text-emerald-400' },
  { key: 'O / C', label: 'Navigate to Command Center Overview', icon: LayoutDashboard, color: 'text-sky-400' },
  { key: 'T', label: 'Navigate to Suspect Re-ID Trajectory', icon: Crosshair, color: 'text-purple-400' },
  { key: 'I', label: 'Navigate to Incidents Triage Queue', icon: AlertTriangle, color: 'text-amber-400' },
  { key: 'E', label: 'Navigate to Forensic Evidence Vault', icon: FileImage, color: 'text-blue-400' },
  { key: 'A', label: 'Navigate to Safety Analytics & Reports', icon: BarChart3, color: 'text-cyan-400' },
  { key: '?', label: 'Toggle this Hotkeys HUD Guide', icon: Keyboard, color: 'text-slate-300' },
];

const GlobalHotkeysModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onOpenDemo,
  onOpenLockdown,
  onOpenShift,
}) => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when typing inside input fields, textareas, or selects
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      const key = e.key.toLowerCase();

      if (e.key === '?' || (e.ctrlKey && key === 'k')) {
        e.preventDefault();
        isOpen ? onClose() : onOpenDemo(); // or toggle
        return;
      }

      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (key === 'd') {
        e.preventDefault();
        onClose();
        onOpenDemo();
      } else if (key === 'l') {
        e.preventDefault();
        onClose();
        onOpenLockdown();
      } else if (key === 's') {
        e.preventDefault();
        onClose();
        onOpenShift();
      } else if (key === 'm') {
        navigate('/monitoring');
      } else if (key === 'o' || key === 'c') {
        navigate('/');
      } else if (key === 't') {
        navigate('/tracking');
      } else if (key === 'i') {
        navigate('/incidents');
      } else if (key === 'e') {
        navigate('/evidence');
      } else if (key === 'a') {
        navigate('/analytics');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onOpenDemo, onOpenLockdown, onOpenShift, navigate]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0a1120] border border-sky-500/30 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl animate-fade-in font-mono">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-gradient-to-r from-sky-500/10 via-transparent to-transparent">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-sky-500/20 border border-sky-500/40 text-sky-400">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">Mission Control Hotkeys HUD</h2>
              <p className="text-[11px] text-slate-400">Quick Keyboard Navigation & Simulation Triggers</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List of shortcuts */}
        <div className="p-5 divide-y divide-white/5 max-h-[420px] overflow-y-auto">
          {SHORTCUTS.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.key} className="py-2.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${s.color}`} />
                  <span className="text-xs text-slate-300 truncate">{s.label}</span>
                </div>
                <kbd className="px-2.5 py-1 bg-white/10 border border-white/20 text-white rounded text-[11px] font-bold shrink-0 shadow-inner">
                  {s.key}
                </kbd>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-black/40 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
          <span>Press any key to execute or <kbd className="text-white px-1 bg-white/10 rounded">Esc</kbd> to exit</span>
          <button
            onClick={onClose}
            className="px-3.5 py-1 bg-white/10 hover:bg-white/15 text-white font-medium rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default GlobalHotkeysModal;
