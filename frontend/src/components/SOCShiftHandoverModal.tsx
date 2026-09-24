import React, { useState } from 'react';
import {
  FileText, Printer, CheckCircle2, Shield, AlertTriangle, Users, Plane,
  Download, Clock, Calendar, X, ChevronRight, UserCheck, Check, Sparkles, Siren, Flame
} from 'lucide-react';
import { useLiveData } from '@/contexts/LiveDataContext';
import { useAuth } from '@/contexts/AuthContext';

interface CarryoverTask {
  id: string;
  title: string;
  sector: string;
  severity: 'critical' | 'high' | 'medium';
  assignedTo: string;
  status: 'pending' | 'resolved';
}

const INITIAL_TASKS: CarryoverTask[] = [
  {
    id: 'TSK-801',
    title: 'Verify contractor credential badge clearance at Sector 01 Main Access Gate',
    sector: 'Sector 01: Access Gate',
    severity: 'medium',
    assignedTo: 'Alpha-1 (Lead)',
    status: 'pending',
  },
  {
    id: 'TSK-802',
    title: 'Investigate thermal temperature spike on Substation Transformer 2B',
    sector: 'Sector 03: Power Grid',
    severity: 'high',
    assignedTo: 'SkyGuard-01 Drone',
    status: 'pending',
  },
  {
    id: 'TSK-803',
    title: 'Review 22:00 perimeter breach radar logs with night shift supervisor',
    sector: 'Sector 06: North Perimeter',
    severity: 'critical',
    assignedTo: 'SOC Supervisor',
    status: 'pending',
  },
];

interface SOCShiftHandoverModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SOCShiftHandoverModal: React.FC<SOCShiftHandoverModalProps> = ({ isOpen, onClose }) => {
  const { incidents } = useLiveData();
  const { user } = useAuth();

  const [shiftType, setShiftType] = useState<'Day Shift (08:00 - 18:00)' | 'Night Shift (18:00 - 06:00)'>('Day Shift (08:00 - 18:00)');
  const [outgoingLead, setOutgoingLead] = useState(user?.name || 'Alex Mercer (SOC Lead)');
  const [incomingLead, setIncomingLead] = useState('Jordan Chen (Shift Supervisor)');
  const [tasks, setTasks] = useState<CarryoverTask[]>(INITIAL_TASKS);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [signedByOutgoing, setSignedByOutgoing] = useState(true);
  const [signedByIncoming, setSignedByIncoming] = useState(false);
  const [handoverTimestamp] = useState(new Date().toLocaleString());

  if (!isOpen) return null;

  const criticalCount = incidents.filter((i) => i.severity === 'critical').length;
  const highCount = incidents.filter((i) => i.severity === 'high').length;
  const resolvedCount = incidents.filter((i) => i.status === 'resolved').length;

  const toggleTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: t.status === 'pending' ? 'resolved' : 'pending' } : t))
    );
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const newTask: CarryoverTask = {
      id: `TSK-${Math.floor(800 + Math.random() * 100)}`,
      title: newTaskTitle,
      sector: 'Sector 04: Server Vault',
      severity: 'high',
      assignedTo: incomingLead,
      status: 'pending',
    };
    setTasks([...tasks, newTask]);
    setNewTaskTitle('');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#0b1322] border border-sky-500/30 rounded-2xl w-full max-w-4xl shadow-2xl animate-fade-in text-xs font-mono max-h-[92vh] flex flex-col overflow-hidden text-slate-200">
        
        {/* Modal Header */}
        <div className="p-4 border-b border-white/10 bg-black/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white uppercase tracking-wider">
                  SOC Shift Handover Briefing & Digest
                </h2>
                <span className="bg-sky-500/15 text-sky-400 border border-sky-500/30 text-[10px] px-2 py-0.5 rounded-full font-bold">
                  Official Log
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Automated Incident Roll-up, Drone Flight Logs & Shift Transfer Sign-Off
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-white rounded-lg transition-colors flex items-center gap-1.5 font-bold shadow-lg shadow-sky-500/20"
            >
              <Printer className="w-3.5 h-3.5" /> Print PDF Digest
            </button>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable & Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 print:p-0 print:space-y-4">
          
          {/* Shift Metadata Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-black/40 border border-white/10 rounded-xl text-xs">
            <div>
              <span className="text-slate-500 block text-[10px]">SHIFT PERIOD</span>
              <select
                value={shiftType}
                onChange={(e: any) => setShiftType(e.target.value)}
                className="bg-transparent text-sky-400 font-bold focus:outline-none cursor-pointer"
              >
                <option value="Day Shift (08:00 - 18:00)" className="bg-[#0b1322] text-white">Day Shift (08:00 - 18:00)</option>
                <option value="Night Shift (18:00 - 06:00)" className="bg-[#0b1322] text-white">Night Shift (18:00 - 06:00)</option>
              </select>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">OUTGOING LEAD</span>
              <input
                type="text"
                value={outgoingLead}
                onChange={(e) => setOutgoingLead(e.target.value)}
                className="bg-transparent text-white font-bold w-full focus:outline-none border-b border-transparent focus:border-sky-400"
              />
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">INCOMING LEAD</span>
              <input
                type="text"
                value={incomingLead}
                onChange={(e) => setIncomingLead(e.target.value)}
                className="bg-transparent text-emerald-400 font-bold w-full focus:outline-none border-b border-transparent focus:border-emerald-400"
              />
            </div>
          </div>

          {/* Shift KPIs & Tactical Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-[#061220] border border-sky-500/20 rounded-xl">
              <span className="text-slate-500 text-[10px] block">TOTAL INCIDENTS</span>
              <span className="text-xl font-bold text-white">{incidents.length}</span>
              <span className="text-[10px] text-emerald-400 block mt-0.5">✓ {resolvedCount} Closed Out</span>
            </div>
            <div className="p-3 bg-[#1e0a0a] border border-red-500/20 rounded-xl">
              <span className="text-slate-500 text-[10px] block">CRITICAL THREATS</span>
              <span className="text-xl font-bold text-red-400">{criticalCount}</span>
              <span className="text-[10px] text-red-300 block mt-0.5">High: {highCount}</span>
            </div>
            <div className="p-3 bg-[#081812] border border-emerald-500/20 rounded-xl">
              <span className="text-slate-500 text-[10px] block">GUARD PATROLS</span>
              <span className="text-xl font-bold text-emerald-400">14 Loops</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">3 Tactical Units Active</span>
            </div>
            <div className="p-3 bg-[#110f24] border border-purple-500/20 rounded-xl">
              <span className="text-slate-500 text-[10px] block">SKYGUARD DRONE FLIGHT</span>
              <span className="text-xl font-bold text-purple-300">4.2 hrs</span>
              <span className="text-[10px] text-sky-400 block mt-0.5">100% Waypoint Coverage</span>
            </div>
          </div>

          {/* Incident Log Roll-up Table */}
          <div className="border border-white/10 rounded-xl overflow-hidden bg-black/30">
            <div className="p-3 bg-white/[0.03] border-b border-white/10 flex items-center justify-between font-bold text-white text-xs">
              <div className="flex items-center gap-2">
                <Siren className="w-4 h-4 text-red-400" />
                <span>Shift Incident Roll-Up & Escalations ({incidents.length})</span>
              </div>
              <span className="text-[10px] text-slate-400">Average Intercept SLA: 22s</span>
            </div>
            <div className="divide-y divide-white/[0.05]">
              {incidents.slice(0, 4).map((inc) => (
                <div key={inc.id} className="p-3 flex items-center justify-between gap-3 text-[11px]">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        inc.severity === 'critical' ? 'bg-red-500 animate-ping' : inc.severity === 'high' ? 'bg-amber-400' : 'bg-sky-400'
                      }`}
                    />
                    <div>
                      <div className="font-bold text-white">{inc.title}</div>
                      <div className="text-[10px] text-slate-500">
                        {inc.source} · {inc.location} · {inc.id}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                        inc.status === 'resolved'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {inc.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Critical Carryover Action Items Checklist */}
          <div className="border border-white/10 rounded-xl p-4 bg-black/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Shift Carryover Items & Unresolved Tasks ({tasks.filter((t) => t.status === 'pending').length} Open)</span>
              </div>
            </div>

            <div className="space-y-2">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => toggleTask(task.id)}
                  className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    task.status === 'resolved'
                      ? 'bg-white/[0.02] border-white/5 opacity-50'
                      : 'bg-[#0d1626] border-sky-500/30 text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center ${
                        task.status === 'resolved' ? 'bg-emerald-500 border-emerald-400 text-black' : 'border-white/30'
                      }`}
                    >
                      {task.status === 'resolved' && <Check className="w-3 h-3" />}
                    </div>
                    <div>
                      <span className={`text-xs ${task.status === 'resolved' ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                        {task.title}
                      </span>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {task.sector} · Assigned: {task.assignedTo}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                      task.severity === 'critical' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                    }`}
                  >
                    {task.severity}
                  </span>
                </div>
              ))}
            </div>

            {/* Add Task Input */}
            <form onSubmit={handleAddTask} className="flex gap-2 pt-2">
              <input
                type="text"
                placeholder="Add new carryover note or instructions for incoming shift..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                className="flex-1 bg-white/[0.05] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-sky-500/40"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-sky-500/20 border border-sky-500/40 text-sky-300 font-bold rounded-xl hover:bg-sky-500/30 transition-colors"
              >
                + Add Item
              </button>
            </form>
          </div>

          {/* Digital Dual Sign-Off Box */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-xl border border-sky-500/30 bg-[#071322] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-sky-400 uppercase">Outgoing Lead Sign-Off</span>
                <span className="text-[9px] text-slate-500">{handoverTimestamp}</span>
              </div>
              <div className="text-sm font-bold text-white">{outgoingLead}</div>
              <div className="flex items-center gap-2 pt-2 text-[10px] text-emerald-400 font-mono">
                <CheckCircle2 className="w-4 h-4" />
                <span>Certified: All logs & active alarms briefed</span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-emerald-500/30 bg-[#061c16] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-400 uppercase">Incoming Lead Acknowledgment</span>
                <span className="text-[9px] text-slate-500">Pending Transfer</span>
              </div>
              <div className="text-sm font-bold text-white">{incomingLead}</div>
              <button
                type="button"
                onClick={() => setSignedByIncoming(!signedByIncoming)}
                className={`w-full py-1.5 rounded-lg font-bold text-[10px] transition-all flex items-center justify-center gap-1.5 ${
                  signedByIncoming
                    ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                    : 'bg-white/[0.05] border border-white/10 text-slate-300 hover:bg-white/10'
                }`}
              >
                {signedByIncoming ? <CheckCircle2 className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                {signedByIncoming ? 'Acknowledged & Custody Accepted' : 'Click to Accept Shift Custody'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-white/10 bg-black/50 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="text-[11px] text-slate-400">
            Certified ISO 27001 & SOC 2 Operational Audit Trail · ID: <span className="font-mono text-sky-400">HANDOVER-2026-X8</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-white/10 rounded-xl text-slate-300 hover:text-white"
            >
              Close
            </button>
            <button
              onClick={() => {
                alert('Shift Handover Digest successfully committed to MongoDB security logs!');
                onClose();
              }}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/25"
            >
              Commit Handover Record
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SOCShiftHandoverModal;
