import React, { useState, useEffect } from 'react';
import {
  X, AlertOctagon, Siren, ShieldAlert, Lock, Unlock, Radio,
  Sparkles, CheckCircle2, PhoneCall, Volume2, Shield
} from 'lucide-react';
import { audioAnnouncer } from '@/utils/audioAnnouncer';
import { useLiveData } from '@/contexts/LiveDataContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const EmergencyLockdownModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { createManualIncident, appendAudit } = useLiveData();
  const [isLockdownActive, setIsLockdownActive] = useState(false);
  const [disarmCode, setDisarmCode] = useState('');
  const [disarmError, setDisarmError] = useState(false);
  const [sirenInterval, setSirenInterval] = useState<any>(null);

  useEffect(() => {
    return () => {
      if (sirenInterval) clearInterval(sirenInterval);
    };
  }, [sirenInterval]);

  if (!isOpen) return null;

  const triggerLockdown = () => {
    setIsLockdownActive(true);
    setDisarmError(false);

    // Audio sirens and voice alert
    audioAnnouncer.unlockAudio();
    audioAnnouncer.speakVoiceAlert(
      "EMERGENCY RED ALERT: Facility-wide security lockdown initiated. All perimeter gates sealed. Return to assembly points immediately.",
      true
    );

    // Auto-loop siren every 3.5s
    const timer = setInterval(() => {
      audioAnnouncer.playAlertTone('critical');
    }, 3500);
    setSirenInterval(timer);

    // Log incident & audit
    createManualIncident(
      'FACILITY-WIDE EMERGENCY RED ALERT LOCKDOWN ACTIVATED',
      'critical',
      'SOC Central Command',
      'Automated high-voltage gate sealing, perimeter drone patrol scramble, and siren broadcast actuated.'
    );
  };

  const handleDisarm = () => {
    if (disarmCode.trim() === '1234' || disarmCode.trim() === 'ADMIN' || disarmCode.trim() === '9999') {
      if (sirenInterval) {
        clearInterval(sirenInterval);
        setSirenInterval(null);
      }
      setIsLockdownActive(false);
      setDisarmCode('');
      setDisarmError(false);

      audioAnnouncer.speakVoiceAlert("Lockdown standing down. Normal facility security protocols restored.", true);
      appendAudit('Disarmed Emergency Lockdown', 'SOC Central Command');
      onClose();
    } else {
      setDisarmError(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-lg flex items-center justify-center p-4">
      <div
        className={`bg-[#0d1322] border rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-fade-in font-mono text-xs ${
          isLockdownActive ? 'border-red-500 shadow-red-600/30' : 'border-red-500/30'
        }`}
      >
        {/* Modal Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${isLockdownActive ? 'bg-red-950/80 border-red-500/50' : 'bg-[#090e1a] border-white/10'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isLockdownActive ? 'bg-red-600 text-white animate-bounce' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                {isLockdownActive ? '🚨 FACILITY LOCKDOWN ACTIVE 🚨' : 'Emergency Lockdown & Red Alert Protocol'}
              </h3>
              <p className="text-[11px] text-slate-400">Class-A Central Security Operations Command</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {isLockdownActive ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-red-600/20 border border-red-500/40 text-red-200 text-center space-y-2 animate-pulse">
                <Siren className="w-8 h-8 text-red-400 mx-auto animate-spin" />
                <div className="text-sm font-bold uppercase tracking-wider">Full Facility Lockdown Engaged</div>
                <div className="text-[11px] text-red-300">
                  960Hz Sirens Active · Electronic Turnstiles Sealed · Guard Patrol Units Dispatched · Incident INC-EMERGENCY Generated
                </div>
              </div>

              {/* Status Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-white/[0.03] border border-white/10 rounded-xl space-y-1">
                  <div className="text-[10px] text-slate-400">Perimeter Access Gates</div>
                  <div className="text-xs font-bold text-red-400 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5" /> SEALED & LOCKED
                  </div>
                </div>
                <div className="p-3 bg-white/[0.03] border border-white/10 rounded-xl space-y-1">
                  <div className="text-[10px] text-slate-400">PA & Megaphone Siren</div>
                  <div className="text-xs font-bold text-red-400 flex items-center gap-1">
                    <Volume2 className="w-3.5 h-3.5 animate-pulse" /> 960Hz EVACUATION
                  </div>
                </div>
              </div>

              {/* Disarm Section */}
              <div className="pt-3 border-t border-white/10 space-y-2">
                <label className="block text-[11px] text-slate-300 font-bold uppercase">Enter Security Disarm Code (PIN: 1234)</label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    maxLength={8}
                    placeholder="Enter PIN (1234)"
                    value={disarmCode}
                    onChange={(e) => setDisarmCode(e.target.value)}
                    className="flex-1 bg-[#060a14] border border-white/20 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-red-400"
                  />
                  <button
                    onClick={handleDisarm}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-lg shadow-emerald-600/30"
                  >
                    <Unlock className="w-4 h-4" /> Disarm Protocol
                  </button>
                </div>
                {disarmError && (
                  <p className="text-red-400 text-[10px] animate-fade-in font-bold">
                    ⚠️ Invalid authorization code. Enter 1234 or ADMIN.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-slate-300 leading-relaxed text-xs">
                Activating the <strong>Facility-Wide Emergency Lockdown</strong> will immediately initiate the following automated defense measures:
              </p>

              <div className="space-y-2.5">
                {[
                  { title: 'Electronic Barrier & Turnstile Lock', desc: 'Instantly lock North Gate, Logistics Bay, and Server Vault access doors.' },
                  { title: '960Hz Multi-Tone Warble Siren', desc: 'Broadcast continuous acoustic evacuation sirens through facility PA horns.' },
                  { title: 'AI Speech Evacuation Dispatch', desc: 'Stream synthesized emergency instructions across all connected monitors.' },
                  { title: 'Autonomous Aerial Drone Scramble', desc: 'Re-route SkyGuard-01 drone to perimeter intrusion vector.' },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                    <CheckCircle2 className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-white text-[11px]">{item.title}</div>
                      <div className="text-[10px] text-slate-400">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-3 border-t border-white/10">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 border border-white/10 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={triggerLockdown}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-red-600/40 animate-pulse text-xs tracking-wider"
                >
                  <AlertOctagon className="w-4 h-4" /> ACTUATE EMERGENCY LOCKDOWN
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmergencyLockdownModal;
