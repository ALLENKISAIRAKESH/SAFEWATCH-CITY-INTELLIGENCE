// src/components/OSHAComplianceReportModal.tsx
import React, { useState } from 'react';
import {
  FileText, Download, Printer, CheckCircle, ShieldAlert, X,
  Building, Calendar, UserCheck, AlertTriangle, ShieldCheck, Award, FileSpreadsheet
} from 'lucide-react';
import { useLiveData } from '@/contexts/LiveDataContext';

interface OSHAComplianceReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OSHAComplianceReportModal: React.FC<OSHAComplianceReportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { incidents } = useLiveData();
  const [activeTab, setActiveTab] = useState<'osha300' | 'executive' | 'corrective'>('osha300');
  const [isSigned, setIsSigned] = useState(false);
  const [signName, setSignName] = useState('Sarah Jenkins (Certified EHS Lead #4829)');

  if (!isOpen) return null;

  const total = incidents.length;
  const critical = incidents.filter((i) => i.severity === 'critical').length;
  const resolved = incidents.filter((i) => i.status === 'resolved').length;
  const trirScore = (critical * 0.42).toFixed(2);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadCSV = () => {
    const headers = ['Case No', 'Date', 'Time', 'Location/Zone', 'Incident Description', 'Severity', 'Status', 'OSHA Recordable'];
    const rows = incidents.map((inc, i) => [
      inc.id,
      new Date().toLocaleDateString(),
      new Date().toLocaleTimeString(),
      `"${inc.zone} (${inc.source})"`,
      `"${inc.title}"`,
      inc.severity.toUpperCase(),
      inc.status.toUpperCase(),
      inc.severity === 'critical' ? 'YES (Class A)' : 'NO (Near Miss)'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `OSHA_Form_300_Log_${new Date().getFullYear()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#0b1322] border border-sky-500/40 rounded-2xl w-full max-w-5xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden animate-fade-in text-xs font-mono">
        {/* Top Header Bar */}
        <div className="p-4 border-b border-white/10 bg-black/40 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  OSHA Form 300 & EHS Safety Compliance Audit Log
                </h3>
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] px-2 py-0.5 rounded-full font-bold">
                  OSHA 1904.29 Compliant
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Official Regulatory Log of Work-Related Injuries, Illnesses & Critical Safety Intrusions
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadCSV}
              className="px-3 py-1.5 bg-white/[0.05] hover:bg-white/10 border border-white/10 text-slate-300 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" /> Export CSV
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-white font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-lg shadow-sky-500/25"
            >
              <Printer className="w-3.5 h-3.5" /> Print / Save PDF
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="px-5 pt-3 border-b border-white/10 bg-[#070e1a] flex gap-4">
          <button
            onClick={() => setActiveTab('osha300')}
            className={`pb-2.5 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'osha300'
                ? 'border-sky-400 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building className="w-3.5 h-3.5" /> OSHA Form 300 Log
          </button>
          <button
            onClick={() => setActiveTab('executive')}
            className={`pb-2.5 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'executive'
                ? 'border-sky-400 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Award className="w-3.5 h-3.5" /> Executive EHS Audit Summary
          </button>
          <button
            onClick={() => setActiveTab('corrective')}
            className={`pb-2.5 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'corrective'
                ? 'border-sky-400 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" /> Legal Risk & Corrective Actions
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5 bg-[#09111e]">
          {/* TAB 1: OSHA Form 300 Standard Table */}
          {activeTab === 'osha300' && (
            <div className="space-y-4">
              {/* Establishment Details Banner */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 bg-black/40 border border-white/10 rounded-xl text-[11px]">
                <div>
                  <span className="text-slate-500 block">Establishment Name:</span>
                  <span className="text-white font-bold">SafeWatch HQ Industrial Campus</span>
                </div>
                <div>
                  <span className="text-slate-500 block">City / State:</span>
                  <span className="text-white">Austin, TX (SIC: 7382 / NAICS: 561621)</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Calendar Year:</span>
                  <span className="text-sky-400 font-bold">{new Date().getFullYear()}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">TRIR Injury Rate:</span>
                  <span className="text-emerald-400 font-bold">{trirScore} (Industry Avg: 2.10)</span>
                </div>
              </div>

              {/* OSHA Log Table */}
              <div className="border border-white/10 rounded-xl overflow-hidden bg-[#070d18]">
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="bg-black/60 border-b border-white/10 text-slate-400 text-[10px] uppercase">
                      <th className="p-2.5">Case #</th>
                      <th className="p-2.5">Zone / Location</th>
                      <th className="p-2.5">Description of Event & Hazard</th>
                      <th className="p-2.5">Severity</th>
                      <th className="p-2.5">OSHA Class</th>
                      <th className="p-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05]">
                    {incidents.map((inc) => (
                      <tr key={inc.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-2.5 font-bold text-sky-400">{inc.id}</td>
                        <td className="p-2.5 text-white">{inc.zone} ({inc.source})</td>
                        <td className="p-2.5 text-slate-300 max-w-xs">{inc.title}</td>
                        <td className="p-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                              inc.severity === 'critical'
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                : inc.severity === 'high'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                            }`}
                          >
                            {inc.severity}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-400">
                          {inc.severity === 'critical' ? 'Recordable (Class A)' : 'Near-Miss Log'}
                        </td>
                        <td className="p-2.5">
                          <span className="text-emerald-400 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> {inc.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Certification & Signature Box */}
              <div className="p-4 bg-[#0c1626] border border-sky-500/30 rounded-xl flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-white font-bold text-xs mb-1">EHS Officer Certification:</div>
                  <p className="text-[10px] text-slate-400 max-w-md">
                    I certify that I have examined this log and that entries are true, accurate, and complete according to 29 CFR Part 1904.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {isSigned ? (
                    <div className="px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/40 rounded-lg text-emerald-300 font-bold flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      Digitally Certified: {signName}
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsSigned(true)}
                      className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-lg"
                    >
                      <UserCheck className="w-4 h-4" /> Sign & Certify OSHA Log
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Executive EHS Audit Summary */}
          {activeTab === 'executive' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-[#0c1626] border border-white/10 rounded-xl">
                  <span className="text-slate-500 block text-[10px] uppercase mb-1">Total Recordable Incidents</span>
                  <span className="text-2xl font-bold text-white">{critical}</span>
                  <span className="text-[10px] text-emerald-400 block mt-1">↓ 32% reduction vs prior quarter</span>
                </div>
                <div className="p-4 bg-[#0c1626] border border-white/10 rounded-xl">
                  <span className="text-slate-500 block text-[10px] uppercase mb-1">DART Case Rate</span>
                  <span className="text-2xl font-bold text-sky-400">0.00</span>
                  <span className="text-[10px] text-slate-400 block mt-1">Zero lost-workday incidents</span>
                </div>
                <div className="p-4 bg-[#0c1626] border border-white/10 rounded-xl">
                  <span className="text-slate-500 block text-[10px] uppercase mb-1">ISO 45001 Compliance</span>
                  <span className="text-2xl font-bold text-emerald-400">99.2%</span>
                  <span className="text-[10px] text-emerald-400 block mt-1">Fully Certified & Compliant</span>
                </div>
              </div>

              <div className="p-4 bg-[#0c1626] border border-white/10 rounded-xl space-y-2">
                <h4 className="text-xs font-bold text-white uppercase">Executive Safety Recommendation</h4>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  All high-voltage substation and server vault perimeters maintain active 24/7 laser polygon boundary enforcement. Automated Guard Dispatch SLAs averaged <strong>24.2 seconds</strong>, mitigating 100% of physical safety breaches before regulatory citation thresholds.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: Corrective Actions & Legal Risk */}
          {activeTab === 'corrective' && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                <div className="flex items-center gap-2 text-amber-300 font-bold mb-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Proactive Hazard Mitigation Plan (29 CFR 1910)</span>
                </div>
                <p className="text-slate-300 text-[11px]">
                  The following preventive actions have been assigned to site leads to prevent OSHA non-compliance penalties:
                </p>
              </div>

              <div className="space-y-2">
                {[
                  { id: 'CA-101', title: 'Recalibrate North Perimeter LiDAR FOV Sensor', owner: 'Marcus Vance (Lead)', due: '24h', priority: 'High' },
                  { id: 'CA-102', title: 'Replace Logistics Dock Warning Signage & Floor Markers', owner: 'Facilities Team', due: '48h', priority: 'Medium' },
                  { id: 'CA-103', title: 'Audit Mandatory PPE Hardhat Verification Rules', owner: 'Sarah Jenkins (EHS Lead)', due: 'Completed', priority: 'Low' },
                ].map((item) => (
                  <div key={item.id} className="p-3 bg-[#0c1626] border border-white/10 rounded-xl flex items-center justify-between text-[11px]">
                    <div>
                      <div className="font-bold text-white">{item.id}: {item.title}</div>
                      <div className="text-slate-500 mt-0.5">Assigned to: {item.owner} · Due: {item.due}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 font-bold text-[9px]">
                      {item.priority}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OSHAComplianceReportModal;
