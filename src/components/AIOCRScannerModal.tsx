// src/components/AIOCRScannerModal.tsx
import React, { useState } from 'react';
import {
  Scan, Car, UserCheck, ShieldAlert, CheckCircle, X,
  Search, ShieldCheck, Zap, Lock, Unlock, AlertTriangle, RefreshCw, Eye, Sparkles
} from 'lucide-react';
import {
  LicensePlateRecord, EmployeeBadgeRecord,
  MOCK_ALPR_LOGS, MOCK_BADGE_LOGS
} from '@/data/alprBadgeData';

interface AIOCRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AIOCRScannerModal: React.FC<AIOCRScannerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'alpr' | 'badge'>('alpr');
  const [alprLogs, setAlprLogs] = useState<LicensePlateRecord[]>(MOCK_ALPR_LOGS);
  const [badgeLogs, setBadgeLogs] = useState<EmployeeBadgeRecord[]>(MOCK_BADGE_LOGS);
  const [searchQuery, setSearchQuery] = useState('');
  const [scanning, setScanning] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [gateOpen, setGateOpen] = useState(false);
  const [gateMessage, setGateMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSimulateScan = () => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      if (activeTab === 'alpr') {
        const plates = ['TX-994-ARM', 'FL-402-K9X', 'WA-771-V88'];
        const randomPlate = plates[Math.floor(Math.random() * plates.length)];
        const newRecord: LicensePlateRecord = {
          id: `ALPR-${Math.floor(100 + Math.random() * 900)}`,
          plateNumber: randomPlate,
          state: 'Texas',
          vehicleType: 'Executive Fleet / EV Sedan',
          driverName: 'Verified Contractor Unit',
          accessStatus: 'authorized',
          clearanceLevel: 'Gate 01 & Parking Structure',
          lastSeenLocation: 'Gate 01 — Optical Scanner',
          timestamp: 'Just now',
          confidence: 99.2,
        };
        setAlprLogs([newRecord, ...alprLogs]);
      } else {
        const newBadge: EmployeeBadgeRecord = {
          badgeId: `EMP-${Math.floor(10000 + Math.random() * 90000)}`,
          employeeName: 'Elena Rostova',
          department: 'Cyber Physical Security',
          role: 'SOC Incident Specialist',
          clearanceLevel: 'Level 4 (Server Core)',
          ppeCompliance: 'Compliant (Vest + Helmet)',
          accessStatus: 'granted',
          lastScannedGate: 'Main Lobby Turnstile',
          timestamp: 'Just now',
          confidence: 98.9,
        };
        setBadgeLogs([newBadge, ...badgeLogs]);
      }
    }, 900);
  };

  const handleToggleGate = () => {
    setGateOpen(!gateOpen);
    setGateMessage(!gateOpen ? 'Access Barrier 01 Opened Successfully' : 'Access Barrier 01 Secured & Locked');
    setTimeout(() => setGateMessage(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#0b1322] border border-sky-500/40 rounded-2xl w-full max-w-5xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden animate-fade-in text-xs font-mono">
        {/* Top Header */}
        <div className="p-4 border-b border-white/10 bg-black/40 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Scan className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  AI Optical OCR & Automated License Plate Recognition (ALPR)
                </h3>
                <span className="bg-sky-500/15 text-sky-400 border border-sky-500/30 text-[9px] px-2 py-0.5 rounded-full font-bold">
                  99.4% OCR Confidence
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Real-time vehicle license plate parsing, BOLO threat flagging, and employee chest badge credentialing.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleGate}
              className={`px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                gateOpen
                  ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                  : 'bg-white/[0.05] hover:bg-white/10 border border-white/10 text-slate-300'
              }`}
            >
              {gateOpen ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              {gateOpen ? 'Barrier 01: OPEN' : 'Actuate Barrier Gate'}
            </button>
            <button
              onClick={handleSimulateScan}
              disabled={scanning}
              className="px-3.5 py-1.5 bg-sky-500 hover:bg-sky-400 text-white font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-lg shadow-sky-500/25"
            >
              {scanning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              {scanning ? 'Targeting OCR…' : 'Trigger Live OCR Scan'}
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {gateMessage && (
          <div className="bg-emerald-500/20 border-b border-emerald-500/40 text-emerald-300 px-4 py-2 text-center font-bold flex items-center justify-center gap-2">
            <CheckCircle className="w-4 h-4" />
            <span>{gateMessage}</span>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="px-5 pt-3 border-b border-white/10 bg-[#070e1a] flex gap-4">
          <button
            onClick={() => setActiveTab('alpr')}
            className={`pb-2.5 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'alpr'
                ? 'border-sky-400 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Car className="w-3.5 h-3.5" /> Automatic License Plate Recognition (ALPR)
          </button>
          <button
            onClick={() => setActiveTab('badge')}
            className={`pb-2.5 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'badge'
                ? 'border-sky-400 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" /> Personnel ID Badge & PPE Clearance
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5 bg-[#09111e]">
          {/* TAB 1: ALPR */}
          {activeTab === 'alpr' && (
            <div className="space-y-4">
              {/* ALPR Video Optical Target HUD Simulation */}
              <div className="bg-[#050b14] border border-sky-500/30 rounded-2xl p-4 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="relative w-full md:w-72 h-36 bg-black/60 rounded-xl border border-sky-500/40 flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-sky-500/10 to-transparent pointer-events-none" />
                  {/* Laser scan line */}
                  <div className="absolute left-0 right-0 h-0.5 bg-sky-400 shadow-[0_0_12px_#38bdf8] animate-bounce pointer-events-none" />
                  
                  {/* Bounding box */}
                  <div className="border-2 border-emerald-400 bg-emerald-500/10 px-4 py-2 rounded text-center">
                    <span className="text-[9px] text-emerald-400 block uppercase font-mono font-bold">PLATE LOCK [99.2%]</span>
                    <span className="text-xl font-bold text-white tracking-widest font-mono">TX-792-KLR</span>
                  </div>
                </div>

                <div className="flex-1 space-y-2 text-[11px]">
                  <div className="flex items-center gap-2 text-white font-bold">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span>Active Camera 01 (Gate Entrance) — ALPR Optical Telemetry</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    AI model continuously parses character glyphs, state issuing identifiers, and vehicle make/color signatures. Automatically cross-references security whitelist and active BOLO alerts.
                  </p>
                  <div className="flex items-center gap-4 text-slate-300 pt-1 font-mono text-[10px]">
                    <span>Plate Standard: <strong className="text-sky-300">USA (50 States)</strong></span>
                    <span>Frame Rate: <strong className="text-white">60 FPS</strong></span>
                    <span>Status: <strong className="text-emerald-400">BARRIER AUTO-ACTUATION ARMED</strong></span>
                  </div>
                </div>
              </div>

              {/* Log Table */}
              <div className="border border-white/10 rounded-xl overflow-hidden bg-[#070d18]">
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="bg-black/60 border-b border-white/10 text-slate-400 text-[10px] uppercase">
                      <th className="p-2.5">Plate Number</th>
                      <th className="p-2.5">Vehicle Type</th>
                      <th className="p-2.5">Registered To</th>
                      <th className="p-2.5">Clearance / Status</th>
                      <th className="p-2.5">Location</th>
                      <th className="p-2.5">Confidence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05]">
                    {alprLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-2.5 font-bold text-sky-400 font-mono tracking-wider">{log.plateNumber}</td>
                        <td className="p-2.5 text-white">{log.vehicleType}</td>
                        <td className="p-2.5 text-slate-300">{log.driverName}</td>
                        <td className="p-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                              log.accessStatus === 'authorized'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : log.accessStatus === 'flagged'
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse'
                                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            }`}
                          >
                            {log.accessStatus === 'flagged' ? '🚨 BOLO ALERT' : log.accessStatus}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-400">{log.lastSeenLocation}</td>
                        <td className="p-2.5 text-emerald-400 font-mono font-bold">{log.confidence}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: Personnel Badge */}
          {activeTab === 'badge' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {badgeLogs.map((badge) => (
                  <div
                    key={badge.badgeId}
                    className="p-4 bg-[#0c1626] border border-white/10 rounded-2xl space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sky-400 text-xs font-mono">{badge.badgeId}</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold text-[9px]">
                        {badge.accessStatus.toUpperCase()}
                      </span>
                    </div>

                    <div>
                      <div className="text-white font-bold text-sm">{badge.employeeName}</div>
                      <div className="text-slate-400 text-[10px]">{badge.role} · {badge.department}</div>
                    </div>

                    <div className="pt-2 border-t border-white/[0.05] space-y-1 text-[10px] text-slate-300">
                      <div>Clearance: <span className="text-sky-300 font-bold">{badge.clearanceLevel}</span></div>
                      <div>PPE Check: <span className="text-emerald-400 font-bold">{badge.ppeCompliance}</span></div>
                      <div className="text-slate-500">{badge.lastScannedGate} · {badge.timestamp}</div>
                    </div>
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

export default AIOCRScannerModal;
