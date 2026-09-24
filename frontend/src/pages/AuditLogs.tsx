import React, { useState } from 'react';
import { Search, CheckCircle, XCircle, AlertTriangle, Download, ShieldCheck, Lock } from 'lucide-react';
import { useLiveData } from '@/contexts/LiveDataContext';
import { formatRelativeTime } from '@/data/mockData';

const RESULT_STYLES: Record<string, string> = {
  success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  failure: 'bg-red-500/15 text-red-400 border-red-500/30',
  warning: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
};
const RESULT_ICONS: Record<string, React.ElementType> = {
  success: CheckCircle,
  failure: XCircle,
  warning: AlertTriangle,
};

const AuditLogs: React.FC = () => {
  const { auditLogs } = useLiveData();
  const [search, setSearch] = useState('');
  const [filterResult, setFilterResult] = useState('all');

  const filtered = auditLogs.filter((log) => {
    const matchSearch =
      !search ||
      log.actor.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.resource.toLowerCase().includes(search.toLowerCase()) ||
      log.ip.toLowerCase().includes(search.toLowerCase());
    const matchResult = filterResult === 'all' || log.result === filterResult;
    return matchSearch && matchResult;
  });

  const handleExportCSV = () => {
    const headers = ['ID', 'Timestamp', 'Actor', 'Action', 'Resource', 'IP_Address', 'Result'];
    const rows = filtered.map((l) => [
      l.id,
      l.timestamp,
      `"${l.actor}"`,
      `"${l.action}"`,
      `"${l.resource}"`,
      l.ip,
      l.result,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `safewatch_audit_trail_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">SOC Audit & Compliance Trail</h2>
          <p className="text-sm text-slate-500">Immutable ledger of security actions, user logins, and incident resolutions</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-lg text-xs font-mono">
            <Lock className="w-3.5 h-3.5" />
            <span>SHA-256 Chained</span>
          </div>
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-1.5 bg-white/[0.05] border border-white/10 text-slate-300 text-xs font-semibold rounded-lg hover:bg-white/[0.1] transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> Export Audit Trail
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by actor, action, resource, IP…"
            className="w-full bg-[#0a1120] border border-white/10 rounded-lg py-2 pl-9 pr-3 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-sky-500/40"
          />
        </div>
        <select
          value={filterResult}
          onChange={(e) => setFilterResult(e.target.value)}
          className="bg-[#0a1120] border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none"
        >
          <option value="all">All Results</option>
          <option value="success">Success</option>
          <option value="failure">Failure</option>
          <option value="warning">Warning</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-[#0a1120] border border-white/[0.07] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/[0.07]">
                {['Timestamp', 'Actor', 'Action', 'Resource', 'IP Address', 'Result'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.map((log) => {
                const Icon = RESULT_ICONS[log.result] || CheckCircle;
                return (
                  <tr key={log.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="px-4 py-3 font-mono text-slate-400 whitespace-nowrap">{formatRelativeTime(log.timestamp)}</td>
                    <td className="px-4 py-3 text-white font-medium whitespace-nowrap">{log.actor}</td>
                    <td className="px-4 py-3 text-slate-300">{log.action}</td>
                    <td className="px-4 py-3 text-slate-400 max-w-[200px] truncate">{log.resource}</td>
                    <td className="px-4 py-3 font-mono text-slate-500">{log.ip}</td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase px-2 py-0.5 rounded border w-fit ${RESULT_STYLES[log.result] || 'bg-slate-500/10 text-slate-400'}`}>
                        <Icon className="w-3 h-3" />{log.result}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AuditLogs;

