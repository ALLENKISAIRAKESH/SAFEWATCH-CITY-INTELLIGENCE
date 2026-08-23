// src/pages/RocketRidePipelines.tsx
import React, { useState } from 'react';
import {
  Workflow, Play, CheckCircle2, AlertTriangle, Shield, Cpu, Download,
  Layers, UserCheck, DollarSign, Clock, FileCode, Check, RefreshCw, Sparkles, Terminal
} from 'lucide-react';

const PIPELINE_NODES = [
  { id: 'webhook_in', name: 'Webhook Ingest', type: 'webhook', lane: 'data', desc: 'Ingests live video feeds, camera RTSP, and operator sensor events.' },
  { id: 'vision_preprocessor', name: 'Vision Preprocessor', type: 'data_transform', lane: 'data', desc: 'Filters persons, vehicles, boundary intrusions, and missing PPE.' },
  { id: 'llm_ehs_auditor', name: 'EHS Regulatory Agent', type: 'llm_openai', lane: 'text', desc: 'Evaluates violation severity against OSHA 1910 and ISO 45001 standards.' },
  { id: 'human_approval_gate', name: 'Human-in-the-Loop Gate', type: 'human_gate', lane: 'decision', desc: 'Requires SOC Operator or EHS Supervisor authorization before escalation.' },
  { id: 'dispatch_actuator', name: 'Tactical Actuator', type: 'action_dispatch', lane: 'action', desc: 'Triggers Web Audio sirens, speech synthesis, and guard interception.' },
  { id: 'response_out', name: 'Audit & DB Store', type: 'response', lane: 'audit', desc: 'Commits complete forensic records to MongoDB cluster.' },
];

export const RocketRidePipelines: React.FC = () => {
  const [running, setRunning] = useState(false);
  const [activeStep, setActiveStep] = useState<number>(-1);
  const [executionResult, setExecutionResult] = useState<any | null>(null);
  const [humanApproved, setHumanApproved] = useState<boolean | null>(null);
  const [showHumanModal, setShowHumanModal] = useState(false);

  const handleRunPipeline = () => {
    setRunning(true);
    setActiveStep(0);
    setExecutionResult(null);
    setHumanApproved(null);

    // Step 0 -> 1 -> 2 -> Human Gate
    setTimeout(() => setActiveStep(1), 700);
    setTimeout(() => setActiveStep(2), 1400);
    setTimeout(() => {
      setActiveStep(3);
      setShowHumanModal(true);
    }, 2100);
  };

  const handleHumanDecision = (approved: boolean) => {
    setHumanApproved(approved);
    setShowHumanModal(false);

    if (approved) {
      setTimeout(() => setActiveStep(4), 500);
      setTimeout(() => {
        setActiveStep(5);
        setRunning(false);
        setExecutionResult({
          status: 'COMPLETED_SUCCESS',
          latencyMs: 184,
          tokenUsage: { prompt: 412, completion: 86, total: 498 },
          costUsd: 0.00041,
          violationsFound: ['OSHA 1910.132: Restricted Zone Breach Without Required PPE'],
          actionTaken: 'Tactical Unit Alpha-1 Dispatched & Forensic Snapshot Archived to MongoDB',
        });
      }, 1200);
    } else {
      setRunning(false);
      setActiveStep(-1);
      setExecutionResult({
        status: 'ESCALATION_BLOCKED_BY_OPERATOR',
        latencyMs: 120,
        tokenUsage: { prompt: 412, completion: 30, total: 442 },
        costUsd: 0.00035,
        violationsFound: [],
        actionTaken: 'False positive dismissed by SOC Operator.',
      });
    }
  };

  const handleDownloadPipe = () => {
    const pipeData = {
      name: "SafeWatch EHS Safety & Threat Detection Pipeline",
      version: "1.0.0",
      description: "Load-bearing multi-agent pipeline for automated safety hazard classification, OSHA regulatory reporting, and human-in-the-loop dispatch gate.",
      components: [
        { id: "webhook_in", provider: "webhook", config: { path: "/api/v1/safewatch/events", method: "POST" } },
        { id: "vision_preprocessor", provider: "data_transform", config: { filter: "person, restricted_zone, ppe", threshold: 0.65 }, input: [{ lane: "data", from: "webhook_in" }] },
        { id: "llm_ehs_auditor", provider: "llm_openai", config: { model: "gpt-4o-mini", systemPrompt: "Classify severity against OSHA standards." }, input: [{ lane: "text", from: "vision_preprocessor" }] },
        { id: "human_approval_gate", provider: "human_gate", config: { requiredRole: "EHS Lead / SOC Supervisor", timeoutSeconds: 300 }, input: [{ lane: "decision", from: "llm_ehs_auditor" }] },
        { id: "dispatch_actuator", provider: "action_dispatch", config: { target: "Tactical Guard Intercept", notificationChannel: "WebAudio Siren + SpeechSynthesis" }, input: [{ lane: "approved_action", from: "human_approval_gate" }] },
        { id: "response_out", provider: "response", config: { laneName: "audit_record" }, input: [{ lane: "audit_record", from: "dispatch_actuator" }] }
      ]
    };

    const blob = new Blob([JSON.stringify(pipeData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'safewatch_safety_pipeline.pipe';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 relative">
      {/* Human Approval Modal Gate */}
      {showHumanModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0d1526] border border-amber-500/40 rounded-2xl p-6 w-full max-w-lg shadow-2xl animate-fade-in text-xs font-mono">
            <div className="flex items-center gap-2 text-amber-400 font-bold mb-3 pb-2 border-b border-white/10 text-sm">
              <UserCheck className="w-5 h-5" />
              <span>RocketRide Human-in-the-Loop Gate (HITL)</span>
            </div>

            <p className="text-slate-300 mb-3">
              The <strong>EHS Regulatory Agent</strong> has flagged a high-severity hazard:
            </p>

            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl mb-4 text-red-300">
              <div className="font-bold text-red-200 mb-1">🚨 CRITICAL VIOLATION IDENTIFIED:</div>
              <div>OSHA 1910.132 — Unidentified Personnel in Sector 04 High-Voltage Zone without mandatory hardhat/PPE.</div>
              <div className="text-[10px] text-slate-400 mt-1">Recommended Action: Dispatch Tactical Intercept & Trigger Audio Siren.</div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleHumanDecision(false)}
                className="flex-1 py-2.5 bg-white/[0.05] hover:bg-white/10 border border-white/10 text-slate-300 rounded-xl transition-colors"
              >
                Dismiss (False Positive)
              </button>
              <button
                onClick={() => handleHumanDecision(true)}
                className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" /> Authorize & Dispatch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white">RocketRide Pipeline Engine & Agentic Workflows</h2>
            <span className="bg-sky-500/15 border border-sky-500/30 text-sky-400 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
              RocketRide Buildathon Compliant (.pipe)
            </span>
          </div>
          <p className="text-sm text-slate-500">
            Multi-agent EHS compliance auditor, continuous stream ingest, and deterministic token cost tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadPipe}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/[0.05] border border-white/10 text-slate-300 text-xs font-mono rounded-xl hover:bg-white/10 transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Download .pipe File
          </button>
          <button
            onClick={handleRunPipeline}
            disabled={running}
            className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold font-mono rounded-xl transition-all shadow-lg shadow-sky-500/25 disabled:opacity-50"
          >
            {running ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            {running ? 'Executing Trace…' : 'Execute RocketRide Pipeline'}
          </button>
        </div>
      </div>

      {/* Million Dollar App Value Proposition Banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-[#0a1120] border border-white/10 rounded-2xl p-4 text-xs font-mono">
        <div>
          <span className="text-slate-500 block text-[10px] uppercase">Target Buyer</span>
          <span className="text-white font-bold">EHS Industrial & SOC Directors</span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px] uppercase">Problem Solved</span>
          <span className="text-emerald-400 font-bold">$161k OSHA Violation Penalty Risk</span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px] uppercase">Revenue Model</span>
          <span className="text-sky-400 font-bold">$1,200/mo per Facility Site</span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px] uppercase">Compute Unit Cost</span>
          <span className="text-purple-400 font-bold">$0.00041 / Execution Run</span>
        </div>
      </div>

      {/* Visual Pipeline Flow Nodes */}
      <div className="bg-[#070d18] border border-white/10 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Workflow className="w-4 h-4 text-sky-400" />
            <span>Interactive .pipe Architecture (Data Lanes & Control Nodes)</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            Pipeline: <code className="text-sky-300">safewatch_safety_pipeline.pipe</code>
          </span>
        </div>

        {/* Nodes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3 relative">
          {PIPELINE_NODES.map((node, idx) => {
            const isCurrent = activeStep === idx;
            const isDone = activeStep > idx;

            return (
              <div
                key={node.id}
                className={`p-4 rounded-2xl border transition-all relative flex flex-col justify-between ${
                  isCurrent
                    ? 'bg-sky-500/20 border-sky-400 shadow-lg shadow-sky-500/30 scale-105'
                    : isDone
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : 'bg-[#0b1424] border-white/10'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/[0.06] text-slate-400">
                      Step 0{idx + 1}
                    </span>
                    {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                    {isCurrent && <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />}
                  </div>
                  <div className="font-bold text-white text-xs mb-1 truncate">{node.name}</div>
                  <div className="text-[10px] font-mono text-sky-400 mb-2">provider: {node.type}</div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">{node.desc}</p>
                </div>

                <div className="mt-3 pt-2 border-t border-white/[0.05] text-[9px] font-mono text-slate-500">
                  lane: <span className="text-slate-300">{node.lane}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Execution Trace Log */}
      {executionResult && (
        <div className="bg-[#0a1120] border border-white/10 rounded-2xl p-5 shadow-2xl text-xs font-mono animate-fade-in">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <Terminal className="w-4 h-4" />
              <span>RocketRide Live Execution Trace Output</span>
            </div>
            <div className="flex items-center gap-4 text-slate-400">
              <span>Latency: <strong className="text-white">{executionResult.latencyMs}ms</strong></span>
              <span>Tokens: <strong className="text-white">{executionResult.tokenUsage.total}</strong></span>
              <span>Est. Cost: <strong className="text-emerald-400">${executionResult.costUsd}</strong></span>
            </div>
          </div>

          <div className="space-y-2 text-slate-300">
            <div><strong>Status:</strong> <span className="text-emerald-400 font-bold">{executionResult.status}</span></div>
            {executionResult.violationsFound.length > 0 && (
              <div>
                <strong>OSHA Violations Detected:</strong>
                <ul className="list-disc list-inside text-red-400 ml-2 mt-1">
                  {executionResult.violationsFound.map((v: string, i: number) => (
                    <li key={i}>{v}</li>
                  ))}
                </ul>
              </div>
            )}
            <div><strong>Action Executed:</strong> <span className="text-sky-300">{executionResult.actionTaken}</span></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RocketRidePipelines;
