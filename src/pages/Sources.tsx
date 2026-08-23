import React, { useState, useEffect } from 'react';
import { Plus, Eye, Settings, Power, Camera, Wifi, Clock, Zap, Trash2, Check, X, Play, RefreshCw, Scan } from 'lucide-react';
import { MOCK_SOURCES, SOURCE_STATUS_COLORS, SourceStatus } from '@/data/mockData';
import AIOCRScannerModal from '@/components/AIOCRScannerModal';

const StatusDot: React.FC<{ status: SourceStatus }> = ({ status }) => {
  const colors: Record<SourceStatus, string> = {
    online: 'bg-emerald-400',
    offline: 'bg-red-400',
    degraded: 'bg-amber-400',
    maintenance: 'bg-blue-400',
  };
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-1.5 h-1.5 rounded-full ${colors[status]} ${status === 'online' ? 'animate-pulse' : ''}`} />
      <span className={`text-xs font-mono ${SOURCE_STATUS_COLORS[status]} capitalize`}>{status}</span>
    </div>
  );
};

const Sources: React.FC = () => {
  const [sources, setSources] = useState<any[]>(() => {
    try {
      const stored = localStorage.getItem('safewatch_sources');
      if (stored) return JSON.parse(stored);
    } catch (_) {}
    return MOCK_SOURCES;
  });

  const [showModal, setShowModal] = useState(false);
  const [showOcrModal, setShowOcrModal] = useState(false);
  const [editingSource, setEditingSource] = useState<any | null>(null);
  const [testingStream, setTestingStream] = useState<any | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);


  const [form, setForm] = useState({
    name: '',
    type: 'IP Camera',
    location: '',
    url: '',
    aiModel: 'Person Detection v1.0.3',
    fps: 30,
    latency: 35,
  });

  useEffect(() => {
    try {
      localStorage.setItem('safewatch_sources', JSON.stringify(sources));
    } catch (_) {}
  }, [sources]);

  const handleOpenCreate = () => {
    setEditingSource(null);
    setForm({
      name: '',
      type: 'IP Camera',
      location: '',
      url: '',
      aiModel: 'Person Detection v1.0.3',
      fps: 30,
      latency: 35,
    });
    setShowModal(true);
  };

  const handleOpenEdit = (src: any) => {
    setEditingSource(src);
    setForm({
      name: src.name,
      type: src.type,
      location: src.location,
      url: src.url || 'rtsp://192.168.1.100/stream',
      aiModel: src.aiModel,
      fps: src.fps || 30,
      latency: src.latency || 40,
    });
    setShowModal(true);
  };

  const handleSaveSource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    if (editingSource) {
      setSources((prev) =>
        prev.map((s) =>
          s.id === editingSource.id
            ? { ...s, ...form }
            : s
        )
      );
    } else {
      const newSource = {
        id: `cam-0${sources.length + 1}`,
        name: form.name,
        type: form.type,
        location: form.location,
        url: form.url,
        aiModel: form.aiModel,
        fps: form.fps,
        latency: form.latency,
        status: 'online' as SourceStatus,
      };
      setSources((prev) => [newSource, ...prev]);
    }
    setShowModal(false);
  };

  const toggleSourcePower = (id: string) => {
    setSources((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, status: s.status === 'online' ? 'offline' : 'online' }
          : s
      )
    );
  };

  const handleDeleteSource = (id: string) => {
    setSources((prev) => prev.filter((s) => s.id !== id));
  };

  const runStreamTest = (src: any) => {
    setTestingStream(src);
    setTestResult('Testing RTSP / HLS handshake...');
    setTimeout(() => {
      setTestResult(`Connection Established! Latency: ${src.latency || 42}ms · Resolution: 1920x1080 @ ${src.fps || 30} FPS · YOLOv8 Stream OK`);
    }, 1200);
  };

  return (
    <div className="space-y-5">
      {/* Stream Test Modal */}
      {testingStream && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0d1526] border border-white/15 rounded-2xl p-6 w-full max-w-lg shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Wifi className="w-4 h-4 text-emerald-400" />
                <h3 className="font-semibold text-white text-sm">Stream Diagnostic: {testingStream.name}</h3>
              </div>
              <button onClick={() => { setTestingStream(null); setTestResult(null); }} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="aspect-video bg-black rounded-xl relative overflow-hidden flex items-center justify-center border border-white/10 mb-4">
              <div className="text-center">
                <RefreshCw className="w-8 h-8 text-sky-400 mx-auto mb-2 animate-spin" />
                <span className="text-xs font-mono text-slate-400">{testResult}</span>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => { setTestingStream(null); setTestResult(null); }}
                className="px-4 py-2 bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 text-xs rounded-xl"
              >
                Close Diagnostic
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI OCR & ALPR Scanner Modal */}
      <AIOCRScannerModal isOpen={showOcrModal} onClose={() => setShowOcrModal(false)} />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Monitoring Sources & Sensors</h2>
          <p className="text-sm text-slate-500">Manage video feeds, RTSP streams, ALPR OCR sensors, and drone payloads</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowOcrModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-sky-500/15 border border-sky-500/30 text-sky-400 text-sm font-semibold rounded-lg hover:bg-sky-500/25 transition-colors shadow-lg shadow-sky-500/10"
          >
            <Scan className="w-4 h-4" /> AI OCR / ALPR
          </button>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white text-sm font-semibold rounded-lg transition-colors shadow-lg shadow-sky-500/25"
          >
            <Plus className="w-4 h-4" /> Add Source
          </button>
        </div>
      </div>


      {/* Source Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {sources.map((src) => (
          <div key={src.id} className="bg-[#0a1120] border border-white/[0.07] rounded-xl p-4 hover:border-white/15 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-sky-500/15 border border-sky-500/20 flex items-center justify-center">
                  <Camera className="w-4 h-4 text-sky-400" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{src.name}</div>
                  <div className="text-[10px] font-mono text-slate-500">{src.id}</div>
                </div>
              </div>
              <StatusDot status={src.status} />
            </div>

            <div className="space-y-1.5 mb-4">
              <div className="text-xs text-slate-400">{src.type} · <span className="text-slate-500">{src.location}</span></div>
              
              <div className="grid grid-cols-3 gap-2 mt-3">
                {[
                  { icon: Zap, label: `${src.fps || 30} FPS` },
                  { icon: Wifi, label: `${src.latency || 40}ms` },
                  { icon: Clock, label: src.status === 'online' ? 'Active' : 'Offline' },
                ].map((stat, i) => (
                  <div key={i} className="bg-white/[0.04] rounded-lg p-2 text-center">
                    <div className="text-[10px] font-mono text-slate-300">{stat.label}</div>
                    <stat.icon className="w-3 h-3 text-slate-500 mx-auto mt-0.5" />
                  </div>
                ))}
              </div>
              <div className="text-[10px] font-mono text-slate-500 mt-2 truncate">{src.aiModel}</div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => runStreamTest(src)}
                className="flex-1 py-1.5 bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs rounded-lg hover:bg-sky-500/20 transition-colors flex items-center justify-center gap-1"
              >
                <Eye className="w-3 h-3" /> Test Stream
              </button>
              <button
                onClick={() => handleOpenEdit(src)}
                className="py-1.5 px-2.5 bg-white/[0.05] border border-white/10 text-slate-300 text-xs rounded-lg hover:bg-white/[0.08] transition-colors flex items-center justify-center gap-1"
              >
                <Settings className="w-3 h-3" />
              </button>
              <button
                onClick={() => toggleSourcePower(src.id)}
                title={src.status === 'online' ? 'Disable Source' : 'Enable Source'}
                className={`py-1.5 px-2.5 border text-xs rounded-lg transition-colors flex items-center gap-1 ${src.status === 'online' ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'}`}
              >
                <Power className="w-3 h-3" />
              </button>
              <button
                onClick={() => handleDeleteSource(src.id)}
                className="py-1.5 px-2.5 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Source Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0d1526] border border-white/15 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
              <h3 className="text-lg font-bold text-white">{editingSource ? 'Configure Source' : 'Add Monitoring Source'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSource} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1 uppercase">Source Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Camera 05 — Warehouse Exit"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-sky-500/40"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1 uppercase">Location</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Warehouse Bay 2"
                  value={form.location}
                  onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                  className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-sky-500/40"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1 uppercase">RTSP / HLS Stream URL</label>
                <input
                  type="text"
                  placeholder="rtsp://192.168.1.120:554/live"
                  value={form.url}
                  onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))}
                  className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-sky-500/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1 uppercase">Source Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
                    className="w-full bg-[#0a1120] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500/40"
                  >
                    {['IP Camera', 'CCTV', 'PTZ Camera', 'Thermal', 'Drone', 'Webcam'].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1 uppercase">Target FPS</label>
                  <input
                    type="number"
                    value={form.fps}
                    onChange={(e) => setForm((p) => ({ ...p, fps: parseInt(e.target.value) || 30 }))}
                    className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500/40"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 border border-white/10 rounded-xl text-sm text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-sky-500 text-white text-sm font-semibold rounded-xl hover:bg-sky-400 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> {editingSource ? 'Save Changes' : 'Add Source'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sources;

