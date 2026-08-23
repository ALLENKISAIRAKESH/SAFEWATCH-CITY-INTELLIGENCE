import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Clock, Video, Shield, User, AlertTriangle,
  CheckCircle, ArrowUpCircle, XCircle, FileImage, MessageSquare, Plus, Printer, Send
} from 'lucide-react';
import { useLiveData } from '@/contexts/LiveDataContext';
import { SEVERITY_COLORS, STATUS_COLORS, formatRelativeTime } from '@/data/mockData';

const TIMELINE_EVENTS = [
  { key: 'detected', label: 'Detection', desc: 'AI model triggered detection event', icon: AlertTriangle, color: 'text-red-400', done: true },
  { key: 'alert', label: 'Alert Created', desc: 'Incident record generated automatically', icon: Shield, color: 'text-amber-400', done: true },
  { key: 'notified', label: 'Operator Notified', desc: 'Notification sent to operations team', icon: User, color: 'text-sky-400', done: true },
  { key: 'acknowledged', label: 'Acknowledged', desc: 'Pending operator action', icon: CheckCircle, color: 'text-slate-500', done: false },
  { key: 'escalated', label: 'Escalated', desc: 'Pending escalation decision', icon: ArrowUpCircle, color: 'text-slate-500', done: false },
  { key: 'resolved', label: 'Resolved', desc: 'Pending resolution', icon: XCircle, color: 'text-slate-500', done: false },
];

const IncidentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { incidents, acknowledgeIncident, escalateIncident, resolveIncident } = useLiveData();
  const incident = incidents.find((i) => i.id === id) ?? incidents[0];

  const status = incident?.status || 'open';
  const [toast, setToast] = useState<string | null>(null);
  const [assignedOperator, setAssignedOperator] = useState(incident?.assignedTo || 'Unassigned');
  const [notes, setNotes] = useState<any[]>([
    {
      id: 'n-1',
      author: 'Jordan Chen (SOC Operator)',
      time: '10m ago',
      text: 'Verified camera feed. Alert matched boundary breach policy. Security dispatch team notified.',
    },
  ]);
  const [newNote, setNewNote] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleAcknowledge = () => {
    if (incident) {
      acknowledgeIncident(incident.id);
      showToast('Incident acknowledged.');
    }
  };

  const handleEscalate = () => {
    if (incident) {
      escalateIncident(incident.id);
      showToast('Incident escalated.');
    }
  };

  const handleResolve = () => {
    if (incident) {
      resolveIncident(incident.id);
      showToast('Incident resolved.');
    }
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    setNotes([
      ...notes,
      {
        id: `n-${Date.now()}`,
        author: 'Current Operator',
        time: 'Just now',
        text: newNote,
      },
    ]);
    setNewNote('');
    showToast('Investigation note logged.');
  };

  const handlePrintDossier = () => {
    window.print();
  };

  const sev = incident?.severity || 'high';
  const sevClass = SEVERITY_COLORS[sev];
  const statClass = STATUS_COLORS[status];

  const doneMap: Record<string, boolean> = {
    detected: true,
    alert: true,
    notified: true,
    acknowledged: status === 'acknowledged' || status === 'escalated' || status === 'resolved',
    escalated: status === 'escalated' || status === 'resolved',
    resolved: status === 'resolved',
  };

  if (!incident) {
    return (
      <div className="text-center py-20 text-slate-500">
        Incident not found.
        <button onClick={() => navigate('/incidents')} className="block mx-auto mt-2 text-sky-400">
          Back to queue
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 relative">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-sm px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-start gap-4">
        <button onClick={() => navigate('/incidents')} className="p-2 rounded-lg bg-white/[0.05] border border-white/10 text-slate-400 hover:text-white transition-colors mt-0.5">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-[240px]">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-xs font-mono text-slate-500">{incident.id}</span>
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${sevClass}`}>{sev}</span>
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${statClass}`}>{status}</span>
          </div>
          <h2 className="text-xl font-bold text-white">{incident.title}</h2>
          <p className="text-sm text-slate-500 mt-0.5">{incident.description}</p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handlePrintDossier}
            className="px-3 py-1.5 bg-white/[0.05] border border-white/10 text-slate-300 text-xs font-semibold rounded-lg hover:bg-white/[0.1] transition-colors flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" /> Print Dossier
          </button>
          {status === 'open' && (
            <button
              onClick={handleAcknowledge}
              className="px-3 py-1.5 bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-semibold rounded-lg hover:bg-amber-500/25 transition-colors flex items-center gap-1.5"
            >
              <CheckCircle className="w-3.5 h-3.5" /> Acknowledge
            </button>
          )}
          {(status === 'open' || status === 'acknowledged') && (
            <button
              onClick={handleEscalate}
              className="px-3 py-1.5 bg-purple-500/15 border border-purple-500/30 text-purple-400 text-xs font-semibold rounded-lg hover:bg-purple-500/25 transition-colors flex items-center gap-1.5"
            >
              <ArrowUpCircle className="w-3.5 h-3.5" /> Escalate
            </button>
          )}
          {status !== 'resolved' && (
            <button
              onClick={handleResolve}
              className="px-3 py-1.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold rounded-lg hover:bg-emerald-500/25 transition-colors flex items-center gap-1.5"
            >
              <XCircle className="w-3.5 h-3.5" /> Resolve
            </button>
          )}
        </div>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Evidence Preview & Timeline */}
        <div className="xl:col-span-2 space-y-4">
          <div className="bg-[#0a1120] border border-white/[0.07] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/[0.07] flex items-center gap-2">
              <FileImage className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-semibold text-white">Forensic Evidence Frame</span>
              <span className="text-[10px] font-mono text-slate-500 ml-auto">{incident.evidenceId || 'EV-IMG-001'}</span>
            </div>
            {/* Evidence frame preview */}
            <div className="relative aspect-video bg-[#060c18] flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #1a2a3a 0%, #060c18 100%)' }}>
              <div className="absolute inset-0 opacity-10"
                style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)' }} />
              <div className="absolute border-2 border-red-500 rounded-sm" style={{ top: '30%', left: '35%', width: '20%', height: '40%' }}>
                <div className="absolute -top-6 left-0 bg-red-500 text-white text-[10px] px-1.5 py-0.5 font-bold whitespace-nowrap rounded-t">
                  INTRUDER 96%
                </div>
              </div>
              <div className="absolute bottom-3 left-3 font-mono text-[10px] text-white/70 bg-black/50 px-2 py-1 rounded">
                {incident.source}
              </div>
              <div className="absolute top-3 right-3 font-mono text-[10px] text-white/70 bg-black/50 px-2 py-1 rounded">
                {new Date(incident.detectedAt).toLocaleTimeString('en-US', { hour12: false })}
              </div>
              <div className="absolute top-3 left-3 bg-red-500/80 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                EVIDENCE SNAPSHOT
              </div>
            </div>
          </div>

          {/* Investigation Notes */}
          <div className="bg-[#0a1120] border border-white/[0.07] rounded-xl overflow-hidden p-4 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-white/[0.07]">
              <MessageSquare className="w-4 h-4 text-sky-400" />
              <span className="text-sm font-semibold text-white">Operator Investigation Notes</span>
            </div>

            <div className="space-y-2">
              {notes.map((n) => (
                <div key={n.id} className="p-3 rounded-lg bg-white/[0.03] border border-white/5">
                  <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 mb-1">
                    <span className="text-sky-400 font-semibold">{n.author}</span>
                    <span>{n.time}</span>
                  </div>
                  <p className="text-xs text-slate-200">{n.text}</p>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddNote} className="flex gap-2 pt-2">
              <input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Log observation or action taken..."
                className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-sky-500/40"
              />
              <button type="submit" className="px-3 py-2 bg-sky-500 text-white text-xs font-semibold rounded-lg hover:bg-sky-400 flex items-center gap-1">
                <Send className="w-3 h-3" /> Post Note
              </button>
            </form>
          </div>

          {/* Timeline */}
          <div className="bg-[#0a1120] border border-white/[0.07] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/[0.07]">
              <span className="text-sm font-semibold text-white">Incident Timeline</span>
            </div>
            <div className="p-4">
              <div className="relative">
                {TIMELINE_EVENTS.map((ev, i) => {
                  const Icon = ev.icon;
                  const done = doneMap[ev.key];
                  return (
                    <div key={ev.key} className="flex gap-4 relative">
                      {i < TIMELINE_EVENTS.length - 1 && (
                        <div className={`absolute left-4 top-8 bottom-0 w-0.5 ${done ? 'bg-sky-500/40' : 'bg-white/[0.07]'}`} style={{ height: '100%' }} />
                      )}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 border ${done ? 'bg-sky-500/20 border-sky-500/40' : 'bg-white/[0.05] border-white/10'}`}>
                        <Icon className={`w-3.5 h-3.5 ${done ? 'text-sky-400' : 'text-slate-600'}`} />
                      </div>
                      <div className="flex-1 pb-5">
                        <div className={`text-sm font-semibold ${done ? 'text-white' : 'text-slate-600'}`}>{ev.label}</div>
                        <div className={`text-xs ${done ? 'text-slate-400' : 'text-slate-700'}`}>{ev.desc}</div>
                        {done && (
                          <div className="text-[10px] font-mono text-slate-600 mt-0.5">
                            {formatRelativeTime(new Date(new Date(incident.detectedAt).getTime() + i * 15_000).toISOString())}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Incident Info Panel & Assignment */}
        <div className="space-y-4 self-start">
          <div className="bg-[#0a1120] border border-white/[0.07] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/[0.07]">
              <span className="text-sm font-semibold text-white">Incident Details</span>
            </div>
            <div className="divide-y divide-white/[0.05]">
              {[
                { label: 'Severity', value: <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${sevClass}`}>{sev}</span> },
                { label: 'Source', value: incident.source },
                { label: 'Rule', value: incident.rule },
                { label: 'Detected', value: formatRelativeTime(incident.detectedAt) },
                { label: 'Track ID', value: incident.trackId || 'TRK-9801' },
                { label: 'Duration', value: incident.duration || '00:42' },
                { label: 'Zone', value: incident.zone },
                { label: 'Status', value: <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${STATUS_COLORS[status]}`}>{status}</span> },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between px-4 py-3">
                  <span className="text-xs text-slate-500">{row.label}</span>
                  <span className="text-xs text-slate-200 text-right">{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Assigned Operator Selector */}
          <div className="bg-[#0a1120] border border-white/[0.07] rounded-xl p-4 space-y-2">
            <label className="block text-xs font-mono text-slate-400 uppercase">Assigned Responder</label>
            <select
              value={assignedOperator}
              onChange={(e) => {
                setAssignedOperator(e.target.value);
                showToast(`Incident reassigned to ${e.target.value}`);
              }}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500/40"
            >
              <option value="Unassigned">Unassigned</option>
              <option value="Alex Mercer (Admin)">Alex Mercer (Admin)</option>
              <option value="Jordan Chen (SOC Lead)">Jordan Chen (SOC Lead)</option>
              <option value="Sam Patel (Security)">Sam Patel (Security)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncidentDetail;

