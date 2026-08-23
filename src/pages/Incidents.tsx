import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, ChevronRight, AlertTriangle, Plus, Download, Printer, Check, X } from 'lucide-react';
import { useLiveData } from '@/contexts/LiveDataContext';
import {
  formatRelativeTime,
  SEVERITY_COLORS, STATUS_COLORS, Severity, IncidentStatus
} from '@/data/mockData';

import OSHAComplianceReportModal from '@/components/OSHAComplianceReportModal';
import SOCShiftHandoverModal from '@/components/SOCShiftHandoverModal';

const SeverityBadge: React.FC<{ s: Severity }> = ({ s }) => (
  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${SEVERITY_COLORS[s]}`}>{s}</span>
);
const StatusBadge: React.FC<{ s: IncidentStatus }> = ({ s }) => (
  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${STATUS_COLORS[s]}`}>{s}</span>
);

const Incidents: React.FC = () => {
  const navigate = useNavigate();
  const { incidents, createManualIncident } = useLiveData();
  const [search, setSearch] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [showOshaModal, setShowOshaModal] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSev, setNewSev] = useState<Severity>('high');
  const [newSource, setNewSource] = useState('Camera 01 — Main Entrance');
  const [newDesc, setNewDesc] = useState('');


  const counts = {
    open: incidents.filter((i) => i.status === 'open').length,
    acknowledged: incidents.filter((i) => i.status === 'acknowledged').length,
    escalated: incidents.filter((i) => i.status === 'escalated').length,
    resolved: incidents.filter((i) => i.status === 'resolved').length,
  };

  const filtered = incidents.filter((i) => {
    const matchSearch = !search || i.title.toLowerCase().includes(search.toLowerCase()) || i.id.toLowerCase().includes(search.toLowerCase());
    const matchSev = filterSeverity === 'all' || i.severity === filterSeverity;
    const matchStat = filterStatus === 'all' || i.status === filterStatus;
    return matchSearch && matchSev && matchStat;
  });

  const STAT_CARDS = [
    { label: 'Open', value: counts.open, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
    { label: 'Acknowledged', value: counts.acknowledged, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
    { label: 'Escalated', value: counts.escalated, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
    { label: 'Resolved', value: counts.resolved, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  ];

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    createManualIncident({
      title: newTitle,
      severity: newSev,
      source: newSource,
      description: newDesc || 'Manual incident reported by security operator.',
      rule: 'Operator Manual Dispatch',
      zone: 'Facility Defense Perimeter',
    });
    setNewTitle('');
    setNewDesc('');
    setShowModal(false);
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Title', 'Severity', 'Source', 'Rule', 'Status', 'DetectedAt', 'AssignedTo', 'Description'];
    const rows = filtered.map((i) => [
      i.id,
      `"${i.title.replace(/"/g, '""')}"`,
      i.severity,
      `"${i.source}"`,
      `"${i.rule}"`,
      i.status,
      i.detectedAt,
      i.assignedTo || 'Unassigned',
      `"${(i.description || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `safewatch_incidents_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5">
      {/* Create Incident Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0d1526] border border-white/15 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <h3 className="text-lg font-bold text-white">Report Security Incident</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1 uppercase">Incident Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Unidentified Perimeter Breach"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-sky-500/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1 uppercase">Severity Level</label>
                  <select
                    value={newSev}
                    onChange={(e) => setNewSev(e.target.value as Severity)}
                    className="w-full bg-[#0a1120] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500/40"
                  >
                    {['critical', 'high', 'medium', 'low', 'info'].map((s) => (
                      <option key={s} value={s}>{s.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1 uppercase">Camera Source</label>
                  <input
                    type="text"
                    value={newSource}
                    onChange={(e) => setNewSource(e.target.value)}
                    className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500/40"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1 uppercase">Incident Description</label>
                <textarea
                  rows={3}
                  placeholder="Provide context on observed breach..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-sky-500/40"
                />
              </div>

              <div className="flex gap-3 mt-6 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 border border-white/10 rounded-xl text-sm text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-red-500 text-white text-sm font-semibold rounded-xl hover:bg-red-400 flex items-center justify-center gap-1.5"
                >
                  <AlertTriangle className="w-4 h-4" /> Dispatch Alert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OSHA Form 300 Compliance Report Modal */}
      <OSHAComplianceReportModal isOpen={showOshaModal} onClose={() => setShowOshaModal(false)} />

      {/* SOC Shift Handover Briefing Modal */}
      <SOCShiftHandoverModal isOpen={showShiftModal} onClose={() => setShowShiftModal(false)} />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Incidents & Regulatory Safety Log</h2>
          <p className="text-sm text-slate-500">Real-time audit queue, OSHA recordable incidents & forensic investigation</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowShiftModal(true)}
            className="px-3.5 py-2 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold rounded-lg hover:bg-emerald-500/25 transition-colors flex items-center gap-1.5 shadow-lg shadow-emerald-500/10"
          >
            <Printer className="w-3.5 h-3.5" /> Shift Handover Digest
          </button>
          <button
            onClick={() => setShowOshaModal(true)}
            className="px-3.5 py-2 bg-sky-500/15 border border-sky-500/30 text-sky-400 text-xs font-bold rounded-lg hover:bg-sky-500/25 transition-colors flex items-center gap-1.5 shadow-lg shadow-sky-500/10"
          >
            <Printer className="w-3.5 h-3.5" /> OSHA 300 Audit Report
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 bg-white/[0.05] border border-white/10 text-slate-300 text-xs font-semibold rounded-lg hover:bg-white/[0.1] transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-red-500/15 border border-red-500/30 text-red-400 text-sm font-semibold rounded-lg hover:bg-red-500/25 transition-colors flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4" /> Report Incident
          </button>
        </div>
      </div>



      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {STAT_CARDS.map((s) => (
          <div key={s.label} className={`rounded-xl border p-4 ${s.bg}`}>
            <div className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</div>
            <div className="text-xs text-slate-400 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search incidents by title, ID, or zone…"
            className="w-full bg-[#0a1120] border border-white/10 rounded-lg py-2 pl-9 pr-3 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-sky-500/40"
          />
        </div>
        <select
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value)}
          className="bg-[#0a1120] border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-sky-500/40"
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-[#0a1120] border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-sky-500/40"
        >
          <option value="all">All Statuses</option>
          <option value="open">Open</option>
          <option value="acknowledged">Acknowledged</option>
          <option value="escalated">Escalated</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-[#0a1120] border border-white/[0.07] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/[0.07]">
                {['ID', 'Incident', 'Severity', 'Source', 'Rule', 'Detected', 'Status', 'Assigned', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-500">No incidents found matching your filters.</td>
                </tr>
              ) : filtered.map((inc) => (
                <tr key={inc.id} className="hover:bg-white/[0.03] cursor-pointer transition-colors" onClick={() => navigate(`/incidents/${inc.id}`)}>
                  <td className="px-4 py-3 font-mono text-slate-400 whitespace-nowrap">{inc.id}</td>
                  <td className="px-4 py-3">
                    <div className="text-white font-medium truncate max-w-[200px]">{inc.title}</div>
                    <div className="text-slate-600 text-[10px] truncate max-w-[200px]">{inc.zone}</div>
                  </td>
                  <td className="px-4 py-3"><SeverityBadge s={inc.severity} /></td>
                  <td className="px-4 py-3 text-slate-300 truncate max-w-[120px]">{inc.source.split('—')[0].trim()}</td>
                  <td className="px-4 py-3 text-slate-400 truncate max-w-[130px]">{inc.rule}</td>
                  <td className="px-4 py-3 font-mono text-slate-400 whitespace-nowrap">{formatRelativeTime(inc.detectedAt)}</td>
                  <td className="px-4 py-3"><StatusBadge s={inc.status} /></td>
                  <td className="px-4 py-3 text-slate-400">{inc.assignedTo ?? <span className="text-slate-600 italic">Unassigned</span>}</td>
                  <td className="px-4 py-3">
                    <ChevronRight className="w-4 h-4 text-slate-600" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Incidents;

