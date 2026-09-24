// src/components/AudioVoiceAnnouncer.tsx
import React, { useState } from 'react';
import { Volume2, VolumeX, Mic, Bell, Radio, Sparkles, Siren, Play } from 'lucide-react';
import { audioAnnouncer } from '@/utils/audioAnnouncer';

export const AudioVoiceAnnouncer: React.FC = () => {
  const [muted, setMuted] = useState(() => audioAnnouncer.getMuted());
  const [voiceOn, setVoiceOn] = useState(() => audioAnnouncer.getVoiceEnabled());
  const [sirenOn, setSirenOn] = useState(() => audioAnnouncer.getSirenEnabled());
  const [volume, setVolume] = useState(() => audioAnnouncer.getVolume());
  const [isOpen, setIsOpen] = useState(false);
  const [isPlayingTest, setIsPlayingTest] = useState(false);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    audioAnnouncer.setMuted(next);
    if (!next) {
      audioAnnouncer.unlockAudio();
      audioAnnouncer.playAlertTone('chime');
    }
  };

  const toggleVoice = () => {
    const next = !voiceOn;
    setVoiceOn(next);
    audioAnnouncer.setVoiceEnabled(next);
    if (next) {
      audioAnnouncer.unlockAudio();
    }
  };

  const toggleSiren = () => {
    const next = !sirenOn;
    setSirenOn(next);
    audioAnnouncer.setSirenEnabled(next);
    if (next) {
      audioAnnouncer.unlockAudio();
      audioAnnouncer.playAlertTone('warning');
    }
  };

  const handleVolumeChange = (v: number) => {
    setVolume(v);
    audioAnnouncer.setVolume(v);
  };

  const handleTestBroadcast = () => {
    if (muted) {
      setMuted(false);
      audioAnnouncer.setMuted(false);
    }
    audioAnnouncer.unlockAudio();
    setIsPlayingTest(true);
    audioAnnouncer.testBroadcast();
    setTimeout(() => setIsPlayingTest(false), 4500);
  };

  const handleTestSirenOnly = () => {
    if (muted) {
      setMuted(false);
      audioAnnouncer.setMuted(false);
    }
    audioAnnouncer.unlockAudio();
    audioAnnouncer.playAlertTone('breach');
  };

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => {
          audioAnnouncer.unlockAudio();
          setIsOpen(!isOpen);
        }}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-all ${
          muted
            ? 'bg-red-500/10 border-red-500/30 text-red-400'
            : voiceOn
            ? 'bg-sky-500/15 border-sky-500/40 text-sky-300 hover:border-sky-400 shadow-sm'
            : 'bg-white/[0.05] border-white/10 text-slate-300'
        }`}
        title="AI Voice Announcer & Siren Controller (Click to open audio panel)"
      >
        {muted ? (
          <VolumeX className="w-3.5 h-3.5" />
        ) : (
          <Volume2 className={`w-3.5 h-3.5 ${isPlayingTest ? 'animate-bounce text-emerald-400' : ''}`} />
        )}
        <span className="hidden sm:inline">
          {muted ? 'Audio Muted' : voiceOn ? 'AI Voice Active' : 'Siren Only'}
        </span>
        {/* Animated Sound Wave Indicator */}
        {!muted && (
          <span className="flex items-center gap-0.5 ml-1">
            <span className="w-0.5 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="w-0.5 h-3 bg-emerald-400 rounded-full animate-pulse delay-75" />
            <span className="w-0.5 h-1.5 bg-emerald-400 rounded-full animate-pulse delay-150" />
          </span>
        )}
      </button>

      {/* Popover Settings Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-11 z-50 w-80 bg-[#0c1626] border border-sky-500/30 rounded-2xl p-4 shadow-2xl backdrop-blur-xl animate-fade-in text-xs font-mono">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
            <div className="flex items-center gap-2 text-white font-bold">
              <Radio className="w-4 h-4 text-sky-400 animate-pulse" />
              <span>Voice & Siren Announcer</span>
            </div>
            <button
              onClick={toggleMute}
              className={`p-1.5 rounded-lg border text-[10px] flex items-center gap-1 font-bold ${
                muted ? 'bg-red-500/20 border-red-500/40 text-red-400' : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
              }`}
            >
              {muted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
              {muted ? 'Muted' : 'Unmuted'}
            </button>
          </div>

          <div className="space-y-3">
            {/* Master Volume Slider */}
            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Master Volume</span>
                <span className="text-white font-bold">{Math.round(volume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-sky-400"
              />
            </div>

            {/* Toggle AI Text-to-Speech Voice */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] border border-white/[0.07]">
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4 text-sky-400" />
                <div>
                  <div className="text-white font-bold text-[11px]">AI Speech Announcer</div>
                  <div className="text-[9px] text-slate-500">Auto-speaks breach locations</div>
                </div>
              </div>
              <button
                onClick={toggleVoice}
                className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${voiceOn ? 'bg-sky-500' : 'bg-slate-700'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${voiceOn ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* Toggle Tactical Siren */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] border border-white/[0.07]">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-400" />
                <div>
                  <div className="text-white font-bold text-[11px]">Tactical Siren Warble</div>
                  <div className="text-[9px] text-slate-500">960Hz synthesized alarm tone</div>
                </div>
              </div>
              <button
                onClick={toggleSiren}
                className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${sirenOn ? 'bg-amber-500' : 'bg-slate-700'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${sirenOn ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* Dual Test Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={handleTestSirenOnly}
                className="py-2 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 rounded-xl transition-colors flex items-center justify-center gap-1 font-bold text-[10px]"
              >
                <Siren className="w-3 h-3" /> Test Siren
              </button>
              <button
                onClick={handleTestBroadcast}
                className="py-2 bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-300 rounded-xl transition-colors flex items-center justify-center gap-1 font-bold text-[10px]"
              >
                <Sparkles className="w-3 h-3 text-sky-400" /> Test AI Voice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AudioVoiceAnnouncer;
