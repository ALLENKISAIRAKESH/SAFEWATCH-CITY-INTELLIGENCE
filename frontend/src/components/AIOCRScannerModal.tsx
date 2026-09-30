// src/components/AIOCRScannerModal.tsx
import React, { useState } from 'react';
import {
  Scan, Car, CheckCircle, X,
  Search, ShieldCheck, Zap, AlertTriangle, RefreshCw, Eye, Sparkles, Filter
} from 'lucide-react';
import {
  LicensePlateRecord,
  MOCK_ALPR_LOGS
} from '@/data/alprBadgeData';

interface AIOCRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AIOCRScannerModal: React.FC<AIOCRScannerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [alprLogs, setAlprLogs] = useState<LicensePlateRecord[]>(MOCK_ALPR_LOGS);
  const [searchQuery, setSearchQuery] = useState('');
  const [scanning, setScanning] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  if (!isOpen) return null;

  const handleSimulateScan = () => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      const indianPlates = [
        { plate: 'MH12DE1433', state: 'Maharashtra', type: 'White Hyundai Creta', cat: 'SUV', status: 'hotlist_stolen', desc: 'STOLEN VEHICLE BOLO' },
        { plate: 'DL01CA9999', state: 'Delhi NCR', type: 'Silver Honda City', cat: 'Car', status: 'monitored', desc: 'IMPOSSIBLE SPEED ANOMALY' },
        { plate: 'KA05MH7890', state: 'Karnataka', type: 'Tata Prima Multi-Axle', cat: 'Commercial Truck', status: 'denied_commercial', desc: 'RESTRICTED FREIGHT' },
        { plate: 'HR26DQ5555', state: 'Haryana', type: 'Black BMW 330i', cat: 'Car', status: 'monitored', desc: 'SPEED RADAR FLAGGED' },
        { plate: 'UP16AB2020', state: 'Uttar Pradesh', type: 'Red Maruti Swift', cat: 'Car', status: 'clear', desc: 'VERIFIED TRANSIT' },
        { plate: 'TN09AZ4321', state: 'Tamil Nadu', type: 'Bajaj RE Auto', cat: 'Auto-Rickshaw', status: 'clear', desc: 'AUTHORIZED TAXI' },
      ];
      const pick = indianPlates[Math.floor(Math.random() * indianPlates.length)];
      const newRecord: LicensePlateRecord = {
        id: `ANPR-${Math.floor(100 + Math.random() * 900)}`,
        plateNumber: pick.plate,
        state: pick.state,
        vehicleType: pick.type,
        vehicleCategory: pick.cat as any,
        accessStatus: pick.status as any,
        watchlistStatus: pick.desc,
        lastSeenLocation: 'Camera 01 — MG Road Optical ANPR Lane',
        timestamp: 'Just now',
        confidence: Number((93.5 + Math.random() * 6).toFixed(1)),
      };
      setAlprLogs([newRecord, ...alprLogs]);
    }, 600);
  };

  const handleManualLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    const cleanPlate = manualInput.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const statePrefix = cleanPlate.substring(0, 2);
    const stateMap: Record<string, string> = {
      MH: 'Maharashtra',
      DL: 'Delhi',
      KA: 'Karnataka',
      HR: 'Haryana',
      UP: 'Uttar Pradesh',
      TN: 'Tamil Nadu',
      GJ: 'Gujarat',
      WB: 'West Bengal',
      TS: 'Telangana',
      AP: 'Andhra Pradesh',
      KL: 'Kerala',
      RJ: 'Rajasthan',
    };
    const newRecord: LicensePlateRecord = {
      id: `ANPR-MAN-${Math.floor(100 + Math.random() * 900)}`,
      plateNumber: cleanPlate,
      state: stateMap[statePrefix] || 'Indian Union Territory / State',
      vehicleType: 'Manual Forensic Verification Query',
      vehicleCategory: 'Car',
      accessStatus: cleanPlate.includes('1433') ? 'hotlist_stolen' : 'clear',
      watchlistStatus: cleanPlate.includes('1433') ? 'HOTLIST HIT: STOLEN' : 'NO ACTIVE POLICE BOLO',
      lastSeenLocation: 'Forensic Operator Console',
      timestamp: 'Just now',
      confidence: 99.8,
    };
    setAlprLogs([newRecord, ...alprLogs]);
    setManualInput('');
  };

  const filteredLogs = alprLogs.filter((log) => {
    const matchSearch =
      log.plateNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.state.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.vehicleType.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCategory = activeCategory === 'all' || log.vehicleCategory === activeCategory;
    return matchSearch && matchCategory;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-[#09101d] border border-sky-500/30 rounded-2xl shadow-2xl shadow-sky-950/40 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-sky-950/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400">
              <Scan className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-wide">
                  Live ANPR Diagnostic & Optical OCR Verification
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/20 border border-sky-500/40 text-sky-300 font-bold">
                  SIH26127
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Indian Standard HSRP Plate Recognition Engine with Multi-Frame Consensus Gating
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Bar */}
        <div className="p-4 border-b border-white/[0.06] bg-white/[0.02] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleSimulateScan}
              disabled={scanning}
              className="px-3.5 py-1.5 rounded-lg bg-sky-500/20 border border-sky-500/40 hover:bg-sky-500/30 text-sky-300 text-xs font-mono font-medium flex items-center gap-2 transition-all shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
              {scanning ? 'Segmenting Plate OCR…' : 'Trigger Camera ANPR Ingestion'}
            </button>

            <form onSubmit={handleManualLookup} className="flex items-center gap-1.5">
              <input
                type="text"
                placeholder="Manual Plate (e.g. MH12DE1433)…"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                className="w-56 bg-white/[0.04] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50 uppercase"
              />
              <button
                type="submit"
                className="px-2.5 py-1.5 rounded-lg bg-white/[0.05] border border-white/10 hover:bg-white/[0.1] text-xs font-mono text-slate-300 transition-colors"
              >
                Verify
              </button>
            </form>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Filter results…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-40 bg-white/[0.04] border border-white/10 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50"
              />
            </div>
          </div>
        </div>

        {/* Results Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs font-mono">
              No matching ANPR observations recorded in this diagnostic session.
            </div>
          ) : (
            filteredLogs.map((log) => {
              const isHotlist = log.accessStatus === 'hotlist_stolen';
              const isCommercialDenied = log.accessStatus === 'denied_commercial';
              return (
                <div
                  key={log.id}
                  className={`p-3.5 rounded-xl border transition-all flex flex-wrap items-center justify-between gap-3 ${
                    isHotlist
                      ? 'bg-red-500/10 border-red-500/30'
                      : isCommercialDenied
                      ? 'bg-amber-500/10 border-amber-500/30'
                      : 'bg-white/[0.03] border-white/[0.07] hover:border-sky-500/30'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    {/* Simulated High-Contrast Indian Plate Display */}
                    <div className="px-3 py-1.5 rounded-md bg-amber-400/90 text-slate-950 font-mono font-black text-sm tracking-wider border-2 border-slate-900 shadow-sm flex items-center gap-2">
                      <span className="text-[9px] bg-slate-900 text-white px-1 py-0.5 rounded font-bold">IND</span>
                      <span>{log.plateNumber}</span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white">{log.vehicleType}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.06] text-slate-300">
                          {log.vehicleCategory}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">({log.state})</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400 font-mono">
                        <span>{log.lastSeenLocation}</span>
                        <span>•</span>
                        <span>{log.timestamp}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Confidence */}
                    <div className="text-right">
                      <div className="text-[10px] font-mono text-slate-400">OCR Consensus</div>
                      <div className={`text-xs font-mono font-bold ${log.confidence >= 90 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {log.confidence}%
                      </div>
                    </div>

                    {/* Status Pill */}
                    <div className="flex flex-col items-end">
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                          isHotlist
                            ? 'bg-red-500/20 text-red-300 border-red-500/40 animate-pulse'
                            : isCommercialDenied
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        }`}
                      >
                        {log.watchlistStatus}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/[0.08] bg-[#070c16] flex items-center justify-between text-[11px] font-mono text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>OCR Consensus Buffer: Ready • Indian State Regex Engine Active</span>
          </div>
          <div>Total Detections Logged: {filteredLogs.length}</div>
        </div>
      </div>
    </div>
  );
};

export default AIOCRScannerModal;
