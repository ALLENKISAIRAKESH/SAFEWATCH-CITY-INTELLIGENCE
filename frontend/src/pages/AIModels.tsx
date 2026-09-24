import React, { useState } from 'react';
import {
  Brain, CheckCircle, Cpu, Clock, Zap, Eye, Settings, RotateCcw, Play, Sliders, Check, X,
  Gauge, Sparkles, Shield, Layers, Crosshair, HardDrive, Terminal
} from 'lucide-react';
import { MOCK_AI_MODELS } from '@/data/mockData';

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  inactive: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  testing: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
};

const AIModels: React.FC = () => {
  const [models, setModels] = useState<any[]>(() => {
    try {
      const stored = localStorage.getItem('safewatch_ai_models');
      if (stored) return JSON.parse(stored);
    } catch (_) {}
    return MOCK_AI_MODELS;
  });

  const [benchmarking, setBenchmarking] = useState<string | null>(null);
  const [benchmarkResult, setBenchmarkResult] = useState<{ id: string; fps: number; latency: number } | null>(null);
  const [configModel, setConfigModel] = useState<any | null>(null);
  
  // Model Calibration Lab State
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.55);
  const [iouThreshold, setIouThreshold] = useState(0.45);
  const [precisionMode, setPrecisionMode] = useState<'FP16 TensorRT' | 'INT8 Quantized' | 'FP32 Full'>('FP16 TensorRT');
  const [acceleratorBackend, setAcceleratorBackend] = useState<'NVIDIA CUDA GPU' | 'WebGPU / DirectML' | 'WASM SIMD CPU'>('NVIDIA CUDA GPU');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const activate = (id: string) => {
    const updated = models.map((m) => ({
      ...m,
      status: m.id === id ? ('active' as const) : ('inactive' as const),
    }));
    setModels(updated);
    try {
      localStorage.setItem('safewatch_ai_models', JSON.stringify(updated));
    } catch (_) {}
    setToastMessage(`🚀 Activated model: ${models.find((m) => m.id === id)?.name}`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const runBenchmark = (modelId: string) => {
    setBenchmarking(modelId);
    setBenchmarkResult(null);
    setTimeout(() => {
      setBenchmarking(null);
      setBenchmarkResult({
        id: modelId,
        fps: Math.round(42 + Math.random() * 10),
        latency: Math.round(18 + Math.random() * 6),
      });
      setToastMessage(`⚡ Benchmark completed for ${modelId}: 48 FPS (18ms latency)`);
      setTimeout(() => setToastMessage(null), 3500);
    }, 1500);
  };

  const handleSaveConfig = () => {
    setConfigModel(null);
    setToastMessage('✅ Hyperparameters updated & deployed to active inference pipeline!');
    setTimeout(() => setToastMessage(null), 3500);
  };

  return (
    <div className="space-y-6 relative">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-sky-500/20 border border-sky-400 text-sky-200 px-4 py-2.5 rounded-xl shadow-2xl text-xs font-mono backdrop-blur-md animate-fade-in flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-sky-400 animate-spin" />
          {toastMessage}
        </div>
      )}

      {/* Model Configuration Modal */}
      {configModel && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0d1526] border border-sky-500/40 rounded-2xl p-6 w-full max-w-lg shadow-2xl animate-fade-in text-xs font-mono">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-bold text-white uppercase">Model Calibration: {configModel.name}</h3>
              </div>
              <button onClick={() => setConfigModel(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-400">Detection Confidence Threshold</span>
                  <span className="text-sky-400 font-bold">{Math.round(confidenceThreshold * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="0.95"
                  step="0.05"
                  value={confidenceThreshold}
                  onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
                  className="w-full accent-sky-400"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-400">NMS / IoU Overlap Suppression</span>
                  <span className="text-emerald-400 font-bold">{Math.round(iouThreshold * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="0.90"
                  step="0.05"
                  value={iouThreshold}
                  onChange={(e) => setIouThreshold(parseFloat(e.target.value))}
                  className="w-full accent-emerald-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-400 block mb-1">Precision Quantization</span>
                  <select
                    value={precisionMode}
                    onChange={(e: any) => setPrecisionMode(e.target.value)}
                    className="w-full bg-[#070e1a] border border-white/10 rounded-xl px-2.5 py-2 text-white"
                  >
                    <option value="FP16 TensorRT">FP16 TensorRT (Fast)</option>
                    <option value="INT8 Quantized">INT8 Quantized (Edge)</option>
                    <option value="FP32 Full">FP32 Full (Max Acc)</option>
                  </select>
                </div>

                <div>
                  <span className="text-slate-400 block mb-1">Hardware Acceleration</span>
                  <select
                    value={acceleratorBackend}
                    onChange={(e: any) => setAcceleratorBackend(e.target.value)}
                    className="w-full bg-[#070e1a] border border-white/10 rounded-xl px-2.5 py-2 text-white"
                  >
                    <option value="NVIDIA CUDA GPU">NVIDIA CUDA GPU</option>
                    <option value="WebGPU / DirectML">WebGPU / DirectML</option>
                    <option value="WASM SIMD CPU">WASM SIMD CPU</option>
                  </select>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 text-slate-400 space-y-1">
                <div>Framework: <span className="text-white">{configModel.framework}</span></div>
                <div>Runtime Graph: <span className="text-emerald-400 font-mono">ONNX Runtime / TensorRT 10.2</span></div>
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-3 border-t border-white/10">
              <button
                onClick={() => setConfigModel(null)}
                className="flex-1 py-2.5 border border-white/10 rounded-xl text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveConfig}
                className="flex-1 py-2.5 bg-sky-500 text-white font-bold rounded-xl hover:bg-sky-400 flex items-center justify-center gap-1.5 shadow-lg shadow-sky-500/25"
              >
                <Check className="w-4 h-4" /> Save Weights Config
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white">AI Vision & Neural Models Hub</h2>
            <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
              YOLOv8 + ViT + ALPR
            </span>
          </div>
          <p className="text-sm text-slate-500">
            Deploy, benchmark inference latency, and fine-tune computer vision intelligence backends
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono bg-[#0a1120] border border-white/10 px-3 py-1.5 rounded-xl text-slate-300">
          <Gauge className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span>Active Pipeline: <strong>YOLOv8x Enterprise</strong> (30.0 FPS · 18ms)</span>
        </div>
      </div>

      {/* Models Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {models.map((model) => {
          const isModelBenchmarking = benchmarking === model.id;
          const hasBenchResult = benchmarkResult && benchmarkResult.id === model.id;

          return (
            <div key={model.id} className="bg-[#0a1120] border border-white/[0.08] rounded-2xl p-5 hover:border-sky-500/40 transition-all shadow-xl space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center">
                    <Brain className="w-5 h-5 text-sky-400" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">{model.name}</div>
                    <div className="text-[10px] font-mono text-slate-500">v{model.version} · {model.id}</div>
                  </div>
                </div>
                <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded border ${STATUS_STYLES[model.status]}`}>
                  {model.status}
                </span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">{model.description}</p>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: Zap, label: 'mAP Accuracy', value: `${model.accuracy}%`, color: '#22c55e' },
                  { icon: Clock, label: 'Avg Latency', value: hasBenchResult ? `${benchmarkResult.latency}ms` : `${model.latency}ms`, color: '#38bdf8' },
                  { icon: Cpu, label: 'Inference Rate', value: hasBenchResult ? `${benchmarkResult.fps} FPS` : '38 FPS', color: '#a855f7' },
                ].map((stat) => (
                  <div key={stat.label} className="bg-white/[0.03] border border-white/5 rounded-xl p-2.5 text-center">
                    <stat.icon className="w-3.5 h-3.5 mx-auto mb-1" style={{ color: stat.color }} />
                    <div className="text-xs font-bold text-white">{stat.value}</div>
                    <div className="text-[10px] text-slate-500">{stat.label}</div>
                  </div>
                ))}
              </div>

              <div className="text-[10px] font-mono text-slate-500 flex items-center justify-between pt-1">
                <span>Framework: <strong className="text-slate-300">{model.framework}</strong></span>
                <span>Created {model.createdAt}</span>
              </div>

              <div className="flex gap-2 pt-2 border-t border-white/[0.06]">
                <button
                  onClick={() => runBenchmark(model.id)}
                  disabled={isModelBenchmarking}
                  className="flex-1 py-2 bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-bold rounded-xl hover:bg-sky-500/20 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Play className={`w-3 h-3 ${isModelBenchmarking ? 'animate-spin' : ''}`} />
                  {isModelBenchmarking ? 'Testing...' : 'Benchmark Latency'}
                </button>

                {model.status !== 'active' ? (
                  <button
                    onClick={() => activate(model.id)}
                    className="flex-1 py-2 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold rounded-xl hover:bg-emerald-500/25 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Deploy Model
                  </button>
                ) : (
                  <div className="flex-1 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live Active
                  </div>
                )}

                <button
                  onClick={() => setConfigModel(model)}
                  className="p-2 bg-white/[0.05] border border-white/10 text-slate-300 text-xs rounded-xl hover:bg-white/[0.08] transition-colors"
                  title="Calibrate Hyperparameters"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AIModels;


