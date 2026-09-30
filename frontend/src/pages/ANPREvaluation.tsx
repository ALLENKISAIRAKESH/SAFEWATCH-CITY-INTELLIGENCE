import React, { useState, useEffect, useCallback } from 'react';
import {
  Gauge, RefreshCw, Play, Activity, Target, Timer,
  Zap, BarChart3, FileText, AlertTriangle
} from 'lucide-react';

const BACKEND_URL = 'http://localhost:5000';

interface EvaluationRun {
  id: string;
  started_at: string;
  completed_at: string;
  status: string;
  total_frames: number;
  total_plates_detected: number;
  true_positives: number;
  false_positives: number;
  false_negatives: number;
  precision: number | null;
  recall: number | null;
  f1_score: number | null;
  avg_cer: number | null;
  avg_fps: number | null;
  avg_latency_ms: number | null;
  ocr_engine: string;
  model_version: string;
  dataset_name: string;
  notes: string;
}

interface LiveMetrics {
  status: string;
  note: string;
  total_frames_processed: number;
  avg_latency_ms: number | string;
  avg_fps: number | string;
  avg_cer: number | string;
  cer_samples: number;
  evaluation_runs: number;
  timestamp: string;
}

function MetricCard({ label, value, unit, color }: {
  label: string; value: string | number; unit?: string; color: string;
}) {
  const isNotBenchmarked = value === 'NOT YET BENCHMARKED';
  return (
    <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3">
      <div className="text-[9px] font-mono text-slate-600 mb-1">{label}</div>
      {isNotBenchmarked ? (
        <div className="text-xs font-mono text-slate-600 italic">NOT YET BENCHMARKED</div>
      ) : (
        <div className={`text-xl font-bold ${color}`}>
          {typeof value === 'number' ? value.toFixed(2) : value}
          {unit && <span className="text-xs text-slate-500 ml-1">{unit}</span>}
        </div>
      )}
    </div>
  );
}

export default function ANPREvaluation() {
  const [runs, setRuns] = useState<EvaluationRun[]>([]);
  const [liveMetrics, setLiveMetrics] = useState<LiveMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/anpr/evaluation`);
      const data = await res.json();
      setRuns(data.runs || []);
      setLiveMetrics(data.live_metrics || null);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function startRun() {
    setStarting(true);
    try {
      await fetch(`${BACKEND_URL}/api/anpr/evaluation/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataset: 'live', notes: 'Manual evaluation run' }),
      });
      fetchData();
    } catch {}
    setStarting(false);
  }

  const latestRun = runs.length > 0 ? runs[runs.length - 1] : null;

  return (
    <div className="min-h-screen bg-[#070d1a] text-white p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
            <Gauge className="w-4 h-4 text-emerald-400" />
          </div>
          <h1 className="text-xl font-bold">ANPR Evaluation</h1>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={startRun}
              disabled={starting}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg text-sm font-semibold transition-all"
            >
              <Play className="w-3.5 h-3.5" /> {starting ? 'Starting...' : 'New Benchmark'}
            </button>
            <button
              onClick={fetchData}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/[0.10] bg-white/[0.04] text-slate-400 hover:text-white text-sm transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <p className="text-sm text-slate-500">Pipeline benchmarks — precision, recall, CER, FPS, and latency</p>
      </div>

      {/* Important note */}
      <div className="flex items-start gap-2 mb-6 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm text-amber-400">
        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <div>
          <strong>No fabricated accuracy.</strong> All metrics shown trace to actual detection events
          or are explicitly labeled "NOT YET BENCHMARKED".
        </div>
      </div>

      {/* Live telemetry */}
      {liveMetrics && (
        <>
          <div className="text-[10px] font-mono text-slate-600 mb-2 flex items-center gap-2">
            <Activity className="w-3 h-3" />
            LIVE PIPELINE TELEMETRY
            <span className="text-slate-700">— {liveMetrics.note}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            <MetricCard label="AVG LATENCY" value={liveMetrics.avg_latency_ms} unit="ms" color="text-sky-400" />
            <MetricCard label="AVG FPS" value={liveMetrics.avg_fps} unit="fps" color="text-emerald-400" />
            <MetricCard label="AVG CER" value={liveMetrics.avg_cer} color="text-amber-400" />
            <MetricCard label="FRAMES PROCESSED" value={liveMetrics.total_frames_processed} color="text-violet-400" />
          </div>
        </>
      )}

      {/* Evaluation runs */}
      <div className="text-[10px] font-mono text-slate-600 mb-2 flex items-center gap-2">
        <FileText className="w-3 h-3" />
        BENCHMARK RUNS ({runs.length})
      </div>

      {runs.length === 0 && !loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-3">
            <Gauge className="w-6 h-6 text-slate-600" />
          </div>
          <div className="text-slate-500 text-sm mb-1">No evaluation runs yet</div>
          <div className="text-slate-700 text-xs font-mono">Click "New Benchmark" to start an evaluation.</div>
        </div>
      ) : (
        <div className="space-y-4">
          {runs.map(run => (
            <div key={run.id} className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-slate-300">{run.id}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                    run.status === 'complete'
                      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                      : run.status === 'running'
                      ? 'text-sky-400 bg-sky-500/10 border-sky-500/20 animate-pulse'
                      : 'text-red-400 bg-red-500/10 border-red-500/20'
                  }`}>
                    {run.status.toUpperCase()}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-600">
                  {run.started_at ? new Date(run.started_at).toLocaleString() : '—'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs font-mono">
                <div>
                  <div className="text-slate-600 text-[9px] mb-0.5">PRECISION</div>
                  <div className={run.precision !== null ? 'text-emerald-400 font-bold' : 'text-slate-600 italic'}>
                    {run.precision !== null ? `${(run.precision * 100).toFixed(1)}%` : 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-slate-600 text-[9px] mb-0.5">RECALL</div>
                  <div className={run.recall !== null ? 'text-sky-400 font-bold' : 'text-slate-600 italic'}>
                    {run.recall !== null ? `${(run.recall * 100).toFixed(1)}%` : 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-slate-600 text-[9px] mb-0.5">F1 SCORE</div>
                  <div className={run.f1_score !== null ? 'text-violet-400 font-bold' : 'text-slate-600 italic'}>
                    {run.f1_score !== null ? `${(run.f1_score * 100).toFixed(1)}%` : 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-slate-600 text-[9px] mb-0.5">CER</div>
                  <div className={run.avg_cer !== null ? 'text-amber-400 font-bold' : 'text-slate-600 italic'}>
                    {run.avg_cer !== null ? run.avg_cer.toFixed(4) : 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-slate-600 text-[9px] mb-0.5">AVG FPS</div>
                  <div className="text-slate-300">
                    {run.avg_fps !== null ? run.avg_fps.toFixed(1) : 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-slate-600 text-[9px] mb-0.5">PLATES DETECTED</div>
                  <div className="text-slate-300">{run.total_plates_detected}</div>
                </div>
              </div>

              {run.notes && (
                <div className="mt-3 pt-3 border-t border-white/[0.05] text-[10px] text-slate-600 font-mono">
                  {run.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
