import React, { useState, useEffect } from 'react';
import {
  Plus, ToggleLeft, ToggleRight, Trash2, Edit2, ShieldAlert, Check, X,
  Workflow, Zap, Play, Sparkles, AlertTriangle, Layers, Bell, Volume2, Plane, FileText, CheckCircle2, Shield, Eye
} from 'lucide-react';
import { MOCK_RULES, formatRelativeTime, SEVERITY_COLORS, Severity } from '@/data/mockData';

export interface VisualAutomationRule {
  id: string;
  name: string;
  enabled: boolean;
  severity: Severity;
  triggerEvent: string;
  conditionSector: string;
  conditionTime: string;
  conditionDwell: string;
  actions: string[];
  lastTriggered?: string;
  triggerCount: number;
}

const DEFAULT_AUTOMATION_RULES: VisualAutomationRule[] = [
  {
    id: 'rule-aut-101',
    name: 'Restricted Server Core Laser Tripwire Alarm',
    enabled: true,
    severity: 'critical',
    triggerEvent: 'Person Boundary Intrusion',
    conditionSector: 'Sector 04: Server Core Vault',
    conditionTime: '24/7 Continuous Enforcement',
    conditionDwell: 'Immediate (0s)',
    actions: ['Sound 960Hz Tactical Siren', 'Dispatch Nearest Guard Unit', 'Broadcast AI Vocal Warning', 'Log OSHA Class A Breach'],
    lastTriggered: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
    triggerCount: 8,
  },
  {
    id: 'rule-aut-102',
    name: 'OSHA 1910.132 Mandatory Hardhat PPE Compliance',
    enabled: true,
    severity: 'high',
    triggerEvent: 'Missing Mandatory PPE (Hardhat / Vest)',
    conditionSector: 'Sector 03: Power Grid Substation',
    conditionTime: 'Daytime Shift (08:00 - 18:00)',
    conditionDwell: 'Dwell > 3s',
    actions: ['Broadcast AI Vocal Warning', 'Log OSHA Class A Breach', 'Send Webhook / SMS Alert'],
    lastTriggered: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
    triggerCount: 14,
  },
  {
    id: 'rule-aut-103',
    name: 'Nighttime Outer Perimeter Fence Motion Overwatch',
    enabled: true,
    severity: 'high',
    triggerEvent: 'Nighttime Perimeter Motion',
    conditionSector: 'Sector 06: North Perimeter Radar',
    conditionTime: 'Night Shift Only (22:00 - 06:00)',
    conditionDwell: 'Dwell > 5s',
    actions: ['Dispatch SkyGuard-01 Aerial Drone', 'Sound 960Hz Tactical Siren', 'Send Webhook / SMS Alert'],
    lastTriggered: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    triggerCount: 5,
  },
  {
    id: 'rule-aut-104',
    name: 'BOLO Flagged Vehicle Gate Lockdown',
    enabled: true,
    severity: 'critical',
    triggerEvent: 'Vehicle License Plate BOLO Flagged',
    conditionSector: 'Sector 01: Main Access Gate',
    conditionTime: '24/7 Continuous Enforcement',
    conditionDwell: 'Immediate (0s)',
    actions: ['Sound 960Hz Tactical Siren', 'Dispatch Nearest Guard Unit', 'Send Webhook / SMS Alert'],
    lastTriggered: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
    triggerCount: 2,
  },
];

const TRIGGER_OPTIONS = [
  'Person Boundary Intrusion',
  'Missing Mandatory PPE (Hardhat / Vest)',
  'Nighttime Perimeter Motion',
  'Vehicle License Plate BOLO Flagged',
  'Crowd Surge Density > 5 Persons',
  'Unattended Suspicious Baggage / Package',
];

const SECTOR_OPTIONS = [
  'All Facility Zones',
  'Sector 01: Main Access Gate',
  'Sector 02: Logistics Loading Bay',
  'Sector 03: Power Grid Substation',
  'Sector 04: Server Core Vault',
  'Sector 05: Primary Assembly Floor',
  'Sector 06: North Perimeter Radar',
];

const TIME_OPTIONS = [
  '24/7 Continuous Enforcement',
  'Night Shift Only (22:00 - 06:00)',
  'Daytime Shift (08:00 - 18:00)',
  'Weekend Facility Lockdown',
];

const ACTION_OPTIONS = [
  'Sound 960Hz Tactical Siren',
  'Broadcast AI Vocal Warning',
  'Dispatch SkyGuard-01 Aerial Drone',
  'Dispatch Nearest Guard Unit',
  'Log OSHA Class A Breach',
  'Send Webhook / SMS Alert',
];

const Rules: React.FC = () => {
  const [rules, setRules] = useState<VisualAutomationRule[]>(() => {
    try {
      const stored = localStorage.getItem('safewatch_automation_rules');
      if (stored) return JSON.parse(stored);
    } catch (_) {}
    return DEFAULT_AUTOMATION_RULES;
  });

  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState<VisualAutomationRule | null>(null);
  const [testToast, setTestToast] = useState<string | null>(null);

  // Form State for Visual Block Builder
  const [ruleName, setRuleName] = useState('');
  const [ruleSeverity, setRuleSeverity] = useState<Severity>('high');
  const [selectedTrigger, setSelectedTrigger] = useState(TRIGGER_OPTIONS[0]);
  const [selectedSector, setSelectedSector] = useState(SECTOR_OPTIONS[0]);
  const [selectedTime, setSelectedTime] = useState(TIME_OPTIONS[0]);
  const [selectedDwell, setSelectedDwell] = useState('Immediate (0s)');
  const [selectedActions, setSelectedActions] = useState<string[]>([ACTION_OPTIONS[0], ACTION_OPTIONS[1]]);

  useEffect(() => {
    try {
      localStorage.setItem('safewatch_automation_rules', JSON.stringify(rules));
    } catch (_) {}
  }, [rules]);

  const toggle = (id: string) =>
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));

  const handleDelete = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  const handleOpenCreate = () => {
    setEditingRule(null);
    setRuleName('');
    setRuleSeverity('high');
    setSelectedTrigger(TRIGGER_OPTIONS[0]);
    setSelectedSector(SECTOR_OPTIONS[0]);
    setSelectedTime(TIME_OPTIONS[0]);
    setSelectedDwell('Immediate (0s)');
    setSelectedActions([ACTION_OPTIONS[0], ACTION_OPTIONS[1]]);
    setShowModal(true);
  };

  const handleOpenEdit = (rule: VisualAutomationRule) => {
    setEditingRule(rule);
    setRuleName(rule.name);
    setRuleSeverity(rule.severity);
    setSelectedTrigger(rule.triggerEvent);
    setSelectedSector(rule.conditionSector);
    setSelectedTime(rule.conditionTime);
    setSelectedDwell(rule.conditionDwell);
    setSelectedActions(rule.actions);
    setShowModal(true);
  };

  const toggleActionSelection = (action: string) => {
    if (selectedActions.includes(action)) {
      if (selectedActions.length > 1) {
        setSelectedActions(selectedActions.filter((a) => a !== action));
      }
    } else {
      setSelectedActions([...selectedActions, action]);
    }
  };

  const handleSaveRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName.trim()) return;

    if (editingRule) {
      setRules((prev) =>
        prev.map((r) =>
          r.id === editingRule.id
            ? {
                ...r,
                name: ruleName,
                severity: ruleSeverity,
                triggerEvent: selectedTrigger,
                conditionSector: selectedSector,
                conditionTime: selectedTime,
                conditionDwell: selectedDwell,
                actions: selectedActions,
              }
            : r
        )
      );
    } else {
      const newRule: VisualAutomationRule = {
        id: `rule-aut-${Math.floor(100 + Math.random() * 900)}`,
        name: ruleName,
        enabled: true,
        severity: ruleSeverity,
        triggerEvent: selectedTrigger,
        conditionSector: selectedSector,
        conditionTime: selectedTime,
        conditionDwell: selectedDwell,
        actions: selectedActions,
        lastTriggered: 'Just now',
        triggerCount: 0,
      };
      setRules([newRule, ...rules]);
    }
    setShowModal(false);
  };

  const handleTestFireRule = (rule: VisualAutomationRule) => {
    setTestToast(`⚡ TEST FIRE EXECUTED: [${rule.name}] triggered (${rule.actions.length} Actions Armed)!`);

    // Voice announcement
    try {
      import('@/utils/audioAnnouncer').then(({ audioAnnouncer }) => {
        audioAnnouncer.speakVoiceAlert(`Test Rule Execution: ${rule.name}. Actions triggered: ${rule.actions.join(', ')}`, true);
      });
    } catch (_) {}

    setTimeout(() => setTestToast(null), 4500);
  };

  return (
    <div className="space-y-6 relative">
      {/* Test Fire Toast */}
      {testToast && (
        <div className="fixed top-5 right-5 z-50 bg-sky-500/20 border border-sky-400 text-sky-200 px-4 py-2.5 rounded-xl shadow-2xl text-xs font-mono backdrop-blur-md animate-fade-in flex items-center gap-2">
          <Zap className="w-4 h-4 text-sky-400 animate-bounce" />
          {testToast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white">Visual Logic Block Rule Automation Builder</h2>
            <span className="bg-sky-500/15 border border-sky-500/30 text-sky-400 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
              IF-THIS-THEN-THAT Engine
            </span>
          </div>
          <p className="text-sm text-slate-500">
            Design multi-condition sensor triggers, automated perimeter sirens, drone dispatches, and OSHA compliance actions.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-sky-500/25"
        >
          <Plus className="w-4 h-4" /> Build Automation Rule
        </button>
      </div>

      {/* Rule Cards Grid with Visual Flow Blocks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className={`bg-[#0a1120] border rounded-2xl p-5 transition-all space-y-4 shadow-xl ${
              rule.enabled ? 'border-white/[0.08] hover:border-sky-500/40' : 'border-white/[0.04] opacity-55'
            }`}
          >
            {/* Top Bar */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  <Workflow className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">{rule.name}</h3>
                  <span className="text-[10px] font-mono text-slate-500">{rule.id}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border ${
                    SEVERITY_COLORS[rule.severity] ?? 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                  }`}
                >
                  {rule.severity}
                </span>
                <button onClick={() => toggle(rule.id)}>
                  {rule.enabled ? <ToggleRight className="w-6 h-6 text-sky-400" /> : <ToggleLeft className="w-6 h-6 text-slate-600" />}
                </button>
              </div>
            </div>

            {/* Visual Logic Block Flow (IF -> AND -> THEN) */}
            <div className="space-y-2 text-xs font-mono">
              {/* IF Block */}
              <div className="p-2.5 bg-[#050c18] border border-sky-500/30 rounded-xl flex items-center gap-2.5 text-slate-300">
                <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 font-bold text-[10px]">IF TRIGGER</span>
                <span className="text-white font-bold truncate">{rule.triggerEvent}</span>
              </div>

              {/* AND Block */}
              <div className="p-2.5 bg-[#050c18] border border-purple-500/30 rounded-xl flex items-center gap-2.5 text-slate-300">
                <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 font-bold text-[10px]">AND FILTER</span>
                <span className="text-slate-300 truncate">
                  {rule.conditionSector} · {rule.conditionTime}
                </span>
              </div>

              {/* THEN Actions Block */}
              <div className="p-2.5 bg-[#050c18] border border-emerald-500/30 rounded-xl text-slate-300 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">THEN ACTUATE</span>
                  <span className="text-slate-400 text-[10px]">({rule.actions.length} Linked Actions)</span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {rule.actions.map((act, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[10px]"
                    >
                      ✓ {act}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono">
              <div className="text-[10px] text-slate-500">
                Triggered: <strong className="text-slate-300">{rule.triggerCount}x</strong> · Last:{' '}
                <span className="text-slate-400">{rule.lastTriggered ? formatRelativeTime(rule.lastTriggered) : 'Never'}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleTestFireRule(rule)}
                  className="px-2.5 py-1 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-400 rounded-lg transition-colors flex items-center gap-1 text-[10px] font-bold"
                >
                  <Play className="w-3 h-3" /> Test Fire
                </button>
                <button
                  onClick={() => handleOpenEdit(rule)}
                  className="p-1.5 bg-white/[0.05] border border-white/10 text-slate-400 hover:text-white rounded-lg transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(rule.id)}
                  className="p-1.5 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Visual Logic Block Rule Builder Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0b1322] border border-sky-500/40 rounded-2xl p-6 w-full max-w-2xl shadow-2xl animate-fade-in text-xs font-mono max-h-[92vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Workflow className="w-4 h-4 text-sky-400" />
                <span>{editingRule ? 'Edit Visual Automation Rule' : 'Visual Logic Block Rule Builder'}</span>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRule} className="space-y-4 overflow-y-auto flex-1 pr-1">
              <div>
                <label className="block text-slate-400 mb-1 uppercase font-bold text-[10px]">Rule Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Substation PPE Hardhat Violation Alert"
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-sky-500/40"
                />
              </div>

              {/* BLOCK 1: IF TRIGGER */}
              <div className="p-4 bg-[#070e1a] border border-sky-500/30 rounded-xl space-y-2">
                <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 font-bold text-[10px]">
                  STEP 1: IF TRIGGER OCCURS
                </span>
                <select
                  value={selectedTrigger}
                  onChange={(e) => setSelectedTrigger(e.target.value)}
                  className="w-full bg-[#0d1626] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500/40"
                >
                  {TRIGGER_OPTIONS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* BLOCK 2: AND CONDITION FILTERS */}
              <div className="p-4 bg-[#070e1a] border border-purple-500/30 rounded-xl space-y-3">
                <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 font-bold text-[10px]">
                  STEP 2: AND MATCHING CONDITIONS
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-500 mb-1 text-[10px]">Target Sector / Zone</label>
                    <select
                      value={selectedSector}
                      onChange={(e) => setSelectedSector(e.target.value)}
                      className="w-full bg-[#0d1626] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500/40"
                    >
                      {SECTOR_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-500 mb-1 text-[10px]">Time Schedule Window</label>
                    <select
                      value={selectedTime}
                      onChange={(e) => setSelectedTime(e.target.value)}
                      className="w-full bg-[#0d1626] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500/40"
                    >
                      {TIME_OPTIONS.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* BLOCK 3: THEN MULTI-ACTION ACTUATORS */}
              <div className="p-4 bg-[#070e1a] border border-emerald-500/30 rounded-xl space-y-2">
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">
                  STEP 3: THEN TRIGGER ACTUATORS (Select All That Apply)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {ACTION_OPTIONS.map((action) => {
                    const isSelected = selectedActions.includes(action);
                    return (
                      <button
                        type="button"
                        key={action}
                        onClick={() => toggleActionSelection(action)}
                        className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                          isSelected
                            ? 'bg-emerald-500/15 border-emerald-400 text-emerald-300 font-bold'
                            : 'bg-white/[0.02] border-white/10 text-slate-400 hover:bg-white/[0.05]'
                        }`}
                      >
                        <span className="text-[11px] truncate">{action}</span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border border-white/10 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-sky-500 text-white font-bold rounded-xl hover:bg-sky-400 transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-sky-500/25"
                >
                  <Check className="w-4 h-4" /> {editingRule ? 'Update Automation Rule' : 'Save Automation Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Rules;


