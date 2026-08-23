import React, { useState } from 'react';
import {
  Sparkles, AlertTriangle, ShieldAlert, Flame, HardHat, Crosshair,
  Volume2, RotateCcw, CheckCircle2, X, Play, Zap, Radio
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

  const handleTriggerIntrusion = () => {
    createManualIncident(
      'Laser Tripwire & Zone Intrusion: Server Vault',
      'critical',
      'Camera 03 — Server Vault (Perimeter Drone)',
      'Unidentified individual crossed 3D restricted polygon boundary after hours without authorization badge.'
    );
    audioAnnouncer.speakVoiceAlert('Warning: Critical Security Intrusion detected in Server Vault! Initiating automated perimeter alert.', true);
    showToast('Triggered Critical Zone Intrusion Alert with Emergency Audio Announcement!');
  };

  const handleTriggerPPEViolation = () => {
    createManualIncident(
      'OSHA Safety Violation: Missing Hardhat & Safety Vest',
      'high',
      'Camera 02 — Logistics Dock',
      'Worker detected in heavy machinery zone without mandatory Class II high-visibility vest and hardhat.'
    );
    audioAnnouncer.speakVoiceAlert('Alert: Safety compliance violation. Worker without protective hardhat detected in Logistics Dock.', false);
    showToast('Triggered OSHA PPE Safety Compliance Violation with Voice Warning!');
  };

  const handleTriggerThermalFire = () => {
    createManualIncident(
      'Thermal Overheat & Smoke Anomaly Detected (89°C)',
      'critical',
      'Camera 04 — North Gate / Generator Room',
      'Drone thermal infrared radiometer flagged abnormal 89°C hotspot near primary backup transformer.'
    );
    audioAnnouncer.speakVoiceAlert('Emergency warning: High temperature thermal anomaly detected in Power Substation!', true);
    showToast('Triggered Thermal Anomaly & Emergency Fire Siren Alert!');
  };

  const handleTriggerCrowdSpike = () => {
    createManualIncident(
      'High Crowd Density & Stamped Risk Threshold Exceeded',
      'medium',
      'Camera 01 — Main Entrance',
      'AI crowd density monitor detected >25 persons per 10m² sector at main entry portal.'
    );
    audioAnnouncer.speakVoiceAlert('Notice: High density crowd accumulation detected at Main Entrance.', false);
    showToast('Triggered Crowd Density Alert!');
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
              <h2 className="text-base font-bold text-white leading-tight">Hackathon Pitch & Live Demo Controller</h2>
              <p className="text-[11px] text-slate-400">1-Click Live AI Safety Simulation Triggers</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3">
          <p className="text-xs text-slate-300">
            Click any scenario below to trigger live real-time AI detections, audio siren alerts, voice announcements, and synchronized dashboard telemetry:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {/* Scenario 1 */}
            <button
              onClick={handleTriggerIntrusion}
              className="flex items-start gap-3 p-3.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-left transition-all group"
            >
              <div className="p-2 rounded-lg bg-red-500/20 text-red-400 group-hover:scale-110 transition-transform shrink-0">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-red-300">Restricted Zone Intrusion</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Critical alert + voice siren + camera lock</div>
              </div>
            </button>

            {/* Scenario 2 */}
            <button
              onClick={handleTriggerPPEViolation}
              className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-left transition-all group"
            >
              <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 group-hover:scale-110 transition-transform shrink-0">
                <HardHat className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-amber-300">OSHA PPE Safety Violation</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Missing hardhat + safety vest audit log</div>
              </div>
            </button>

            {/* Scenario 3 */}
            <button
              onClick={handleTriggerThermalFire}
              className="flex items-start gap-3 p-3.5 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-left transition-all group"
            >
              <div className="p-2 rounded-lg bg-orange-500/20 text-orange-400 group-hover:scale-110 transition-transform shrink-0">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-orange-300">Thermal Hotspot & Fire (89°C)</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Radiometric thermal spike trigger</div>
              </div>
            </button>

            {/* Scenario 4 */}
            <button
              onClick={handleTriggerCrowdSpike}
              className="flex items-start gap-3 p-3.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-left transition-all group"
            >
              <div className="p-2 rounded-lg bg-sky-500/20 text-sky-400 group-hover:scale-110 transition-transform shrink-0">
                <Radio className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-sky-300">Crowd Density Threshold</div>
                <div className="text-[10px] text-slate-400 mt-0.5">High surge warning at main entry</div>
              </div>
            </button>
          </div>

          {/* Toast */}
          {activeToast && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{activeToast}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-black/40 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
          <span>SafeWatch Pitch Mode Active</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white/10 hover:bg-white/15 text-white font-medium rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PitchDemoControllerModal;
