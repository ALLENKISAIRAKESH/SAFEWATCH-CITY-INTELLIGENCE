// src/components/PTZVirtualJoystick.tsx
import React, { useState } from 'react';
import {
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight, RotateCcw,
  ZoomIn, ZoomOut, Target, Focus, Sun, Sparkles, X, Compass, Shield
} from 'lucide-react';

export interface PTZState {
  pan: number; // -180 to 180 deg
  tilt: number; // -90 to 90 deg
  zoom: number; // 1.0 to 30.0x
  autoFocus: boolean;
  iris: number; // 0 to 100
}

interface PTZPreset {
  id: number;
  name: string;
  pan: number;
  tilt: number;
  zoom: number;
}

const PRESETS: PTZPreset[] = [
  { id: 1, name: 'Main Access Gate', pan: -45, tilt: -12, zoom: 2.5 },
  { id: 2, name: 'Logistics Dock Bay', pan: 85, tilt: -15, zoom: 4.8 },
  { id: 3, name: 'Server Vault Lock', pan: 0, tilt: -5, zoom: 8.0 },
  { id: 4, name: 'North Fence Radar', pan: -120, tilt: 2, zoom: 18.5 },
];

interface PTZVirtualJoystickProps {
  cameraName?: string;
  ptzState: PTZState;
  onChange: (newState: PTZState) => void;
  onClose?: () => void;
}

export const PTZVirtualJoystick: React.FC<PTZVirtualJoystickProps> = ({
  cameraName = 'CAM-01 Optical PTZ',
  ptzState,
  onChange,
  onClose,
}) => {
  const [activePreset, setActivePreset] = useState<number | null>(null);

  const handlePanTilt = (dPan: number, dTilt: number) => {
    setActivePreset(null);
    onChange({
      ...ptzState,
      pan: Math.max(-180, Math.min(180, ptzState.pan + dPan)),
      tilt: Math.max(-90, Math.min(90, ptzState.tilt + dTilt)),
    });
  };

  const handleZoom = (dZoom: number) => {
    setActivePreset(null);
    onChange({
      ...ptzState,
      zoom: Math.max(1, Math.min(30, parseFloat((ptzState.zoom + dZoom).toFixed(1)))),
    });
  };

  const handleResetHome = () => {
    setActivePreset(null);
    onChange({
      ...ptzState,
      pan: 0,
      tilt: 0,
      zoom: 1.0,
    });
  };

  const handleApplyPreset = (preset: PTZPreset) => {
    setActivePreset(preset.id);
    onChange({
      ...ptzState,
      pan: preset.pan,
      tilt: preset.tilt,
      zoom: preset.zoom,
    });
  };

  return (
    <div className="bg-[#0b1424]/95 border border-sky-500/30 rounded-2xl p-4 shadow-2xl backdrop-blur-xl text-xs font-mono select-none w-72 text-slate-300">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/10">
        <div className="flex items-center gap-2 text-white font-bold">
          <Compass className="w-4 h-4 text-sky-400 animate-spin" style={{ animationDuration: '30s' }} />
          <span>PTZ Joystick Controller</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 rounded-md text-slate-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="text-[10px] text-slate-400 mb-2 truncate">
        Controlling: <span className="text-sky-400 font-bold">{cameraName}</span>
      </div>

      {/* Telemetry Display */}
      <div className="grid grid-cols-3 gap-1.5 bg-black/40 border border-white/10 rounded-xl p-2 mb-3 text-[10px] text-center">
        <div>
          <span className="text-slate-500 block">PAN</span>
          <span className="text-white font-bold">{ptzState.pan}°</span>
        </div>
        <div>
          <span className="text-slate-500 block">TILT</span>
          <span className="text-white font-bold">{ptzState.tilt}°</span>
        </div>
        <div>
          <span className="text-slate-500 block">ZOOM</span>
          <span className="text-emerald-400 font-bold">{ptzState.zoom.toFixed(1)}x</span>
        </div>
      </div>

      {/* 8-Way Virtual D-Pad Keypad */}
      <div className="flex flex-col items-center mb-3">
        {/* Row 1: Up */}
        <div className="flex gap-1 mb-1">
          <button
            onClick={() => handlePanTilt(-5, 5)}
            className="w-8 h-8 rounded-lg bg-white/[0.05] hover:bg-sky-500/20 hover:text-sky-300 border border-white/10 flex items-center justify-center transition-all active:scale-95 text-[10px]"
            title="Pan Left / Tilt Up"
          >
            ↖
          </button>
          <button
            onClick={() => handlePanTilt(0, 5)}
            className="w-10 h-8 rounded-lg bg-white/[0.05] hover:bg-sky-500/20 hover:text-sky-300 border border-white/10 flex items-center justify-center transition-all active:scale-95"
            title="Tilt Up"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            onClick={() => handlePanTilt(5, 5)}
            className="w-8 h-8 rounded-lg bg-white/[0.05] hover:bg-sky-500/20 hover:text-sky-300 border border-white/10 flex items-center justify-center transition-all active:scale-95 text-[10px]"
            title="Pan Right / Tilt Up"
          >
            ↗
          </button>
        </div>

        {/* Row 2: Left, Center Home, Right */}
        <div className="flex gap-1 mb-1">
          <button
            onClick={() => handlePanTilt(-5, 0)}
            className="w-8 h-10 rounded-lg bg-white/[0.05] hover:bg-sky-500/20 hover:text-sky-300 border border-white/10 flex items-center justify-center transition-all active:scale-95"
            title="Pan Left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetHome}
            className="w-10 h-10 rounded-xl bg-sky-500/20 hover:bg-sky-500/40 text-sky-400 border border-sky-500/40 flex items-center justify-center transition-all active:scale-90"
            title="Reset to Home (0°, 0°)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={() => handlePanTilt(5, 0)}
            className="w-8 h-10 rounded-lg bg-white/[0.05] hover:bg-sky-500/20 hover:text-sky-300 border border-white/10 flex items-center justify-center transition-all active:scale-95"
            title="Pan Right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Row 3: Down */}
        <div className="flex gap-1">
          <button
            onClick={() => handlePanTilt(-5, -5)}
            className="w-8 h-8 rounded-lg bg-white/[0.05] hover:bg-sky-500/20 hover:text-sky-300 border border-white/10 flex items-center justify-center transition-all active:scale-95 text-[10px]"
            title="Pan Left / Tilt Down"
          >
            ↙
          </button>
          <button
            onClick={() => handlePanTilt(0, -5)}
            className="w-10 h-8 rounded-lg bg-white/[0.05] hover:bg-sky-500/20 hover:text-sky-300 border border-white/10 flex items-center justify-center transition-all active:scale-95"
            title="Tilt Down"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
          <button
            onClick={() => handlePanTilt(5, -5)}
            className="w-8 h-8 rounded-lg bg-white/[0.05] hover:bg-sky-500/20 hover:text-sky-300 border border-white/10 flex items-center justify-center transition-all active:scale-95 text-[10px]"
            title="Pan Right / Tilt Down"
          >
            ↘
          </button>
        </div>
      </div>

      {/* Optical Zoom Slider */}
      <div className="mb-3 bg-white/[0.02] border border-white/[0.07] rounded-xl p-2.5">
        <div className="flex items-center justify-between text-[11px] mb-1.5">
          <span className="flex items-center gap-1 text-slate-400">
            <ZoomIn className="w-3.5 h-3.5 text-sky-400" /> Optical Zoom
          </span>
          <span className="text-emerald-400 font-bold">{ptzState.zoom.toFixed(1)}x</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleZoom(-0.5)}
            disabled={ptzState.zoom <= 1}
            className="p-1 rounded bg-white/[0.05] hover:bg-white/10 text-slate-400 hover:text-white disabled:opacity-30"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <input
            type="range"
            min="1"
            max="30"
            step="0.5"
            value={ptzState.zoom}
            onChange={(e) => onChange({ ...ptzState, zoom: parseFloat(e.target.value) })}
            className="flex-1 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-sky-400"
          />
          <button
            onClick={() => handleZoom(0.5)}
            disabled={ptzState.zoom >= 30}
            className="p-1 rounded bg-white/[0.05] hover:bg-white/10 text-slate-400 hover:text-white disabled:opacity-30"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Camera Presets Grid */}
      <div>
        <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
          <span>Camera Presets</span>
          <span className="text-sky-400">4 Saved</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleApplyPreset(preset)}
              className={`p-1.5 rounded-lg border text-[10px] text-left transition-all truncate ${
                activePreset === preset.id
                  ? 'bg-sky-500/20 border-sky-400 text-sky-300 font-bold'
                  : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white hover:border-white/20'
              }`}
              title={`${preset.name} (P:${preset.pan}°, T:${preset.tilt}°, Z:${preset.zoom}x)`}
            >
              <div className="font-bold truncate">P{preset.id}: {preset.name}</div>
              <div className="text-[8px] text-slate-500">{preset.zoom}x · {preset.pan}°</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PTZVirtualJoystick;
