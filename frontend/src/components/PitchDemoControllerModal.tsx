import React, { useState } from 'react';
import {
  Sparkles, AlertTriangle, ShieldAlert, Car, Route, Gauge,
  Volume2, CheckCircle2, X, Zap, Radio
} from 'lucide-react';
import { useLiveData } from '@/contexts/LiveDataContext';
import { audioAnnouncer } from '@/utils/audioAnnouncer';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const PitchDemoControllerModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { createManualIncident } = useLiveData();
  const [activeToast, setActiveToast] = useState<string | null>(null);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setActiveToast(msg);
    setTimeout(() => setActiveToast(null), 3500);
  };

  const handleTriggerStolenHit = () => {
    createManualIncident(
      'Stolen Vehicle Hotlist Sighting: MH12DE1433',
      'critical',
      'Camera 02 — Ring Road Flyover (Eastbound)',
      'Vehicle with license plate MH12DE1433 matched against National Police Stolen Vehicle Hotlist with 96.4% OCR multi-frame consensus.'
    );
    audioAnnouncer.speakVoiceAlert('Warning: Critical Hotlist Alert! Stolen vehicle plate MH12DE1433 detected at Ring Road Flyover.', true);
    showToast('Triggered Stolen Vehicle Hotlist Match with Voice Warning!');
  };

  const handleTriggerRouteAnomaly = () => {
    createManualIncident(
      'Impossible Velocity & Route Anomaly: DL01CA9999',
      'high',
      'Camera 03 — Outer Expressway Toll Plaza',
      'Plate DL01CA9999 detected traversing 8.4 km from Cam-01 to Cam-03 in 18s (expected minimum: 180s). Possible cloned plate or extreme speed.'
    );
    audioAnnouncer.speakVoiceAlert('Alert: Route anomaly detected. Impossible travel time transition recorded between Camera 01 and Camera 03.', false);
    showToast('Triggered Impossible Travel Time Anomaly Alert!');
  };

  const handleTriggerCongestion = () => {
    createManualIncident(
      'Urban Bottleneck Congestion Spike: MG Road Junction',
      'medium',
      'Camera 01 — MG Road Junction (Northbound)',
      'Vehicle density reached 92% with average vehicular flow collapsing to 8 km/h across 4 detected traffic lanes.'
    );
    audioAnnouncer.speakVoiceAlert('Notice: Heavy traffic congestion spike detected at MG Road Junction.', false);
    showToast('Triggered Traffic Bottleneck & Congestion Spike!');
  };

  const handleTriggerSpeeding = () => {
    createManualIncident(
      'Excessive Speed Violation: HR26DQ5555 (122 km/h)',
      'critical',
      'Camera 03 — Outer Expressway Toll Plaza',
      'Radar-optical sensor detected plate HR26DQ5555 operating at 122 km/h in designated 60 km/h municipal perimeter zone.'
    );
    audioAnnouncer.speakVoiceAlert('Emergency warning: High speed reckless driving violation recorded on Outer Expressway.', true);
    showToast('Triggered High Speed Optical Violation!');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0a1120] border border-sky-500/30 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl shadow-sky-500/10 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-gradient-to-r from-sky-500/10 via-transparent to-transparent">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-sky-500/20 border border-sky-500/40 text-sky-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white leading-tight">SIH26127 Live Pitch Simulator</h2>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-sky-500/20 border border-sky-500/30 text-sky-300 font-bold">
                  EVAL DEMO
                </span>
              </div>
              <p className="text-[11px] text-slate-400">1-Click Live Vehicle Intelligence & Traffic Scenario Triggers</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3">
          <p className="text-xs text-slate-300">
            Click any scenario below to trigger real-time AI ANPR consensus, audio voice announcements, and live telemetry across all modules:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {/* Scenario 1: Stolen Hit */}
            <button
              onClick={handleTriggerStolenHit}
              className="flex items-start gap-3 p-3.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-left transition-all group"
            >
              <div className="p-2 rounded-lg bg-red-500/20 text-red-400 group-hover:scale-110 transition-transform shrink-0">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white group-hover:text-red-300 transition-colors">Stolen Plate Hit</div>
                <div className="text-[10px] text-slate-400 mt-0.5">MH12DE1433 BOLO alert with voice siren</div>
              </div>
            </button>

            {/* Scenario 2: Route Anomaly */}
            <button
              onClick={handleTriggerRouteAnomaly}
              className="flex items-start gap-3 p-3.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-left transition-all group"
            >
              <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400 group-hover:scale-110 transition-transform shrink-0">
                <Route className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors">Route Anomaly</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Impossible travel time / Cloned plate</div>
              </div>
            </button>

            {/* Scenario 3: Congestion Spike */}
            <button
              onClick={handleTriggerCongestion}
              className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-left transition-all group"
            >
              <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 group-hover:scale-110 transition-transform shrink-0">
                <Gauge className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">Traffic Bottleneck</div>
                <div className="text-[10px] text-slate-400 mt-0.5">92% density surge at MG Road</div>
              </div>
            </button>

            {/* Scenario 4: Speed Violation */}
            <button
              onClick={handleTriggerSpeeding}
              className="flex items-start gap-3 p-3.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-left transition-all group"
            >
              <div className="p-2 rounded-lg bg-sky-500/20 text-sky-400 group-hover:scale-110 transition-transform shrink-0">
                <Car className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white group-hover:text-sky-300 transition-colors">Speed Violation</div>
                <div className="text-[10px] text-slate-400 mt-0.5">122 km/h optical speed radar violation</div>
              </div>
            </button>
          </div>

          {activeToast && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-mono animate-fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{activeToast}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/10 bg-black/40 flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <span>Problem Statement: SIH26127</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};

export default PitchDemoControllerModal;
