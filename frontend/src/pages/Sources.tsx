import React, { useState, useEffect } from 'react';
import { Plus, Eye, Settings, Power, Camera, Wifi, Clock, Zap, Trash2, Check, X, RefreshCw, Scan, MapPin } from 'lucide-react';
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
    type: 'Junction ANPR Camera',
    location: '',
    url: '',
    aiModel: 'ANPR Indian Plate OCR Engine v2.4',
    fps: 30,
    latency: 28,
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
      type: 'Junction ANPR Camera',
      location: '',
      url: '',
      aiModel: 'ANPR Indian Plate OCR Engine v2.4',
      fps: 30,
      latency: 28,
    });
    setShowModal(true);
  };

  const handleOpenEdit = (src: any) => {
    setEditingSource(src);
    setForm({
      name: src.name,
      type: src.type,
      location: src.location,
      url: src.url || 'rtsp://city-traffic.net/stream/cam-01',
      aiModel: src.aiModel,
      fps: src.fps || 30,
      latency: src.latency || 30,
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
    setTestResult('Connecting to traffic camera node and initializing ANPR pipeline...');
    setTimeout(() => {
      setTestResult(`Connection Established! Latency: ${src.latency || 28}ms · 1080p @ ${src.fps || 30} FPS · Multi-Frame Consensus OCR Ready`);
    }, 1000);
  };

  return (
    <div className="space-y-5">
      {/* Stream Test Modal */}
      {testingStream && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0d1526] border border-white/15 rounded-2xl p-6 w-full max-w-lg shadow-2xl animate-fade-in font-mono">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Wifi className="w-4 h-4 text-emerald-400" />
                <h3 className="font-semibold text-white text-sm">Traffic Camera Stream Diagnostic: {testingStream.name}</h3>
              </div>
              <button onClick={() => { setTestingStream(null); setTestResult(null); }} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="aspect-video bg-black rounded-xl relative overflow-hidden flex items-center justify-center border border-white/10 mb-4 p-4 text-center">
              <div>
                <RefreshCw className="w-8 h-8 text-sky-400 mx-auto mb-2 animate-spin" />
                <span className="text-xs text-slate-300">{testResult}</span>
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

      {/* AI OCR Scanner Modal */}
      <AIOCRScannerModal isOpen={showOcrModal} onClose={() => setShowOcrModal(false)} />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white">City Traffic Camera Network & Topology</h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/20 border border-sky-500/30 text-sky-300 font-bold">
              SIH26127
            </span>
          </div>
          <p className="text-sm text-slate-500">Manage city-wide ANPR sensor nodes, RTSP junction streams, and geometric camera calibration</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowOcrModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-sky-500/15 border border-sky-500/30 text-sky-400 text-sm font-semibold rounded-lg hover:bg-sky-500/25 transition-colors shadow-lg shadow-sky-500/10"
          >
            <Scan className="w-4 h-4" /> Test Plate OCR
          </button>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white text-sm font-semibold rounded-lg transition-colors shadow-lg shadow-sky-500/25"
          >
            <Plus className="w-4 h-4" /> Add Camera Node
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
              <div className="text-xs text-slate-400 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span>{src.type}</span>
                <span>·</span>
                <span className="text-slate-400 font-mono">{src.location}</span>
              </div>
              
              <div className="grid grid-cols-3 gap-2 mt-3">
                {[
                  { icon: Zap, label: `${src.fps || 30} FPS` },
                  { icon: Wifi, label: `${src.latency || 28}ms` },
                  { icon: Clock, label: src.status === 'online' ? 'Active' : 'Offline' },
                ].map((stat, i) => (
                  <div key={i} className="bg-white/[0.04] rounded-lg p-2 text-center">
                    <div className="text-[10px] font-mono text-slate-300">{stat.label}</div>
                    <stat.icon className="w-3 h-3 text-slate-500 mx-auto mt-0.5" />
                  </div>
                ))}
              </div>
              <div className="text-[10px] font-mono text-sky-400/80 mt-2 truncate bg-sky-950/30 px-2 py-1 rounded border border-sky-500/10">
                {src.aiModel}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => runStreamTest(src)}
                className="flex-1 py-1.5 bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs rounded-lg hover:bg-sky-500/20 transition-colors flex items-center justify-center gap-1 font-mono"
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
                title={src.status === 'online' ? 'Disable Camera' : 'Enable Camera'}
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
              <h3 className="text-lg font-bold text-white">{editingSource ? 'Configure Camera Node' : 'Add Traffic Camera Node'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSource} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1 uppercase">Camera / Junction Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Camera 05 — South Bypass Gate"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-sky-500/40"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1 uppercase">Roadway / Intersection Location</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ring Road Junction (Northbound)"
                  value={form.location}
                  onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                  className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-sky-500/40"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1 uppercase">RTSP / HLS Stream URL</label>
                <input
                  type="text"
                  placeholder="rtsp://city-traffic.net/stream/cam-05"
                  value={form.url}
                  onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))}
                  className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-sky-500/40 font-mono text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1 uppercase">Sensor Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
                    className="w-full bg-[#0a1120] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500/40"
                  >
                    {[
                      'Junction ANPR Camera',
                      'Overhead Gantry',
                      'PTZ Traffic Dome',
                      'Highway Speed Trap',
                      'Toll Booth Sensor'
                    ].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1 uppercase">AI Vision Pipeline</label>
                  <select
                    value={form.aiModel}
                    onChange={(e) => setForm((p) => ({ ...p, aiModel: e.target.value }))}
                    className="w-full bg-[#0a1120] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500/40 truncate"
                  >
                    {[
                      'ANPR Indian Plate OCR Engine v2.4',
                      'Vehicle Flow & ANPR Tracker v2.0',
                      'High-Speed Highway ANPR v3.1',
                      'Heavy Vehicle Classifier v2.1'
                    ].map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
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
                  <Check className="w-4 h-4" /> {editingSource ? 'Save Changes' : 'Add Camera Node'}
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
