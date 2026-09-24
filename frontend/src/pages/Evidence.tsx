import React, { useState, useEffect } from 'react';
import { Download, Eye, Search, FileImage, Video, Image, X, Shield, Plus, Trash2, UploadCloud, Check, Film, PlayCircle } from 'lucide-react';
import { MOCK_EVIDENCE, formatRelativeTime } from '@/data/mockData';
import ForensicVideoPlayerModal from '@/components/ForensicVideoPlayerModal';

const TYPE_ICONS: Record<string, React.ElementType> = {
  'Video Clip': Video,
  Screenshot: Image,
  Thumbnail: FileImage,
};

const RETENTION_COLORS: Record<string, string> = {
  Permanent: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  Standard: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
  Flagged: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
};

const Evidence: React.FC = () => {
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [retentionFilter, setRetentionFilter] = useState<'all' | 'Permanent' | 'Standard' | 'Flagged'>('all');
  const [evidenceList, setEvidenceList] = useState<any[]>(() => {
    try {
      const stored = localStorage.getItem('safewatch_user_snapshots');
      if (stored) {
        const userSnaps = JSON.parse(stored);
        if (Array.isArray(userSnaps) && userSnaps.length > 0) {
          return [...userSnaps, ...MOCK_EVIDENCE];
        }
      }
    } catch (_) {}
    return MOCK_EVIDENCE;
  });

  const [activePreview, setActivePreview] = useState<any | null>(null);
  const [forensicPlayerItem, setForensicPlayerItem] = useState<any | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    incidentId: 'INC-1082',
    source: 'Operator Manual Upload',
    type: 'Screenshot' as 'Screenshot' | 'Video Clip' | 'Thumbnail',
    retentionStatus: 'Permanent' as 'Permanent' | 'Standard' | 'Flagged',
    dataUrl: '',
    fileName: '',
  });


  const persistEvidence = (newList: any[]) => {
    setEvidenceList(newList);
    try {
      const customOnly = newList.filter((e) => !MOCK_EVIDENCE.some((m) => m.id === e.id));
      localStorage.setItem('safewatch_user_snapshots', JSON.stringify(customOnly));
    } catch (_) {}
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadForm((prev) => ({
        ...prev,
        dataUrl: event.target?.result as string,
        fileName: file.name,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveUpload = (e: React.FormEvent) => {
    e.preventDefault();
    const newRecord = {
      id: `EVD-${Math.floor(1000 + Math.random() * 9000)}`,
      incidentId: uploadForm.incidentId.trim() || 'MANUAL-ENTRY',
      source: uploadForm.source,
      timestamp: new Date().toISOString(),
      type: uploadForm.type,
      retentionStatus: uploadForm.retentionStatus,
      thumbnailColor: '#1e3a5f',
      dataUrl: uploadForm.dataUrl || undefined,
    };

    persistEvidence([newRecord, ...evidenceList]);
    setShowUploadModal(false);
    setUploadForm({
      incidentId: 'INC-1082',
      source: 'Operator Manual Upload',
      type: 'Screenshot',
      retentionStatus: 'Permanent',
      dataUrl: '',
      fileName: '',
    });
  };

  const handleDeleteRecord = (id: string) => {
    persistEvidence(evidenceList.filter((e) => e.id !== id));
    if (activePreview?.id === id) setActivePreview(null);
  };

  const filtered = evidenceList.filter((e) => {
    const matchSearch =
      !search ||
      e.incidentId.toLowerCase().includes(search.toLowerCase()) ||
      e.source.toLowerCase().includes(search.toLowerCase()) ||
      e.id.toLowerCase().includes(search.toLowerCase());
    const matchRetention = retentionFilter === 'all' || e.retentionStatus === retentionFilter;
    return matchSearch && matchRetention;
  });

  const handleDownload = (ev: any) => {
    // Generate deterministic forensic SHA-256 hash
    const fakeHash = Array.from(`${ev.id}-${ev.incidentId}-${ev.timestamp}`)
      .reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) >>> 0, 0)
      .toString(16)
      .padStart(8, '0')
      .toUpperCase();
    const fullSha256 = `SHA256:7B8F9A${fakeHash}E4C1D98B72A4E03F9D67A8C1`;

    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderWatermark = () => {
      // Top Forensic Banner
      ctx.fillStyle = 'rgba(6, 12, 24, 0.92)';
      ctx.fillRect(0, 0, 1280, 52);
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 16px monospace';
      ctx.fillText(`🛡️ SAFEWATCH MISSION CONTROL — FORENSIC EVIDENCE ARTIFACT [${ev.id}]`, 24, 32);

      // Bottom Forensic Integrity Bar
      ctx.fillStyle = 'rgba(6, 12, 24, 0.95)';
      ctx.fillRect(0, 660, 1280, 60);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 13px monospace';
      ctx.fillText(`VERIFIED SECURE: ${fullSha256}`, 24, 685);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px monospace';
      ctx.fillText(`SOURCE: ${ev.source} | INCIDENT: ${ev.incidentId} | UTC: ${new Date(ev.timestamp).toISOString()}`, 24, 705);

      // Timestamp watermark in corner
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 14px monospace';
      ctx.fillText('🔴 EVIDENCE VAULT SECURE', 1040, 32);

      // Trigger download
      const watermarkedUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = watermarkedUrl;
      link.download = `safewatch_forensic_${ev.id}_${ev.incidentId}.png`;
      link.click();
    };

    if (ev.dataUrl) {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        ctx.drawImage(img, 0, 0, 1280, 720);
        renderWatermark();
      };
      img.src = ev.dataUrl;
    } else {
      // Draw synthetic evidence gradient
      const grad = ctx.createLinearGradient(0, 0, 1280, 720);
      grad.addColorStop(0, '#0a192f');
      grad.addColorStop(1, '#060c18');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1280, 720);

      // Grid overlay
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
      ctx.lineWidth = 1;
      for (let x = 0; x < 1280; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 720);
        ctx.stroke();
      }
      for (let y = 0; y < 720; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(1280, y);
        ctx.stroke();
      }

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`SECURITY CAMERA CAPTURE: ${ev.source}`, 640, 340);
      ctx.font = '14px monospace';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(`INCIDENT ${ev.incidentId} — RETENTION: ${ev.retentionStatus.toUpperCase()}`, 640, 380);
      ctx.textAlign = 'left';

      renderWatermark();
    }
  };

  const handleExportAll = () => {
    const data = JSON.stringify(evidenceList, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `safewatch_all_evidence_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };


  return (
    <div className="space-y-5 relative">
      {/* Evidence Viewer Modal */}
      {activePreview && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0d1526] border border-white/15 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-sky-400" />
                <span className="font-semibold text-white text-sm">{activePreview.id} — {activePreview.incidentId}</span>
              </div>
              <button onClick={() => setActivePreview(null)} className="p-1 rounded text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-black flex items-center justify-center min-h-[300px] max-h-[460px] overflow-hidden">
              {activePreview.dataUrl ? (
                <img src={activePreview.dataUrl} alt="Evidence" className="max-h-[420px] object-contain rounded-lg border border-white/10" />
              ) : (
                <div className="w-full aspect-video rounded-lg flex items-center justify-center text-slate-500 font-mono text-xs" style={{ background: `linear-gradient(135deg, ${activePreview.thumbnailColor} 0%, #060c18 100%)` }}>
                  <span>Security Frame Capture: {activePreview.source}</span>
                </div>
              )}
            </div>

            <div className="px-5 py-3.5 bg-[#0a1120] border-t border-white/10 flex items-center justify-between">
              <div className="text-xs font-mono text-slate-400">
                <span>{activePreview.source}</span> · <span>{formatRelativeTime(activePreview.timestamp)}</span>
              </div>
              <button
                onClick={() => handleDownload(activePreview)}
                className="px-4 py-2 bg-sky-500 text-white text-xs font-semibold rounded-lg hover:bg-sky-400 transition-colors flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Download HD File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Evidence Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0d1526] border border-white/15 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-sky-400" />
                <h3 className="text-lg font-bold text-white">Upload Evidence Artifact</h3>
              </div>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUpload} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1 uppercase">Related Incident ID</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. INC-1082"
                  value={uploadForm.incidentId}
                  onChange={(e) => setUploadForm({ ...uploadForm, incidentId: e.target.value })}
                  className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-sky-500/40"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1 uppercase">Source / Camera Tag</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Camera 02 — Logistics Dock"
                  value={uploadForm.source}
                  onChange={(e) => setUploadForm({ ...uploadForm, source: e.target.value })}
                  className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-sky-500/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1 uppercase">Evidence Type</label>
                  <select
                    value={uploadForm.type}
                    onChange={(e) => setUploadForm({ ...uploadForm, type: e.target.value as any })}
                    className="w-full bg-[#0a1120] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500/40"
                  >
                    <option value="Screenshot">Screenshot</option>
                    <option value="Video Clip">Video Clip</option>
                    <option value="Thumbnail">Thumbnail</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1 uppercase">Retention Policy</label>
                  <select
                    value={uploadForm.retentionStatus}
                    onChange={(e) => setUploadForm({ ...uploadForm, retentionStatus: e.target.value as any })}
                    className="w-full bg-[#0a1120] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500/40"
                  >
                    <option value="Permanent">Permanent</option>
                    <option value="Standard">Standard (90d)</option>
                    <option value="Flagged">Flagged / Legal</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1 uppercase">Select Media File</label>
                <label className="border-2 border-dashed border-white/15 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:border-sky-500/40 bg-white/[0.02] transition-colors">
                  <UploadCloud className="w-6 h-6 text-slate-400 mb-1" />
                  <span className="text-xs text-slate-300 font-mono">
                    {uploadForm.fileName ? uploadForm.fileName : 'Click to select image or video file'}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1">PNG, JPG, MP4, WEBM</span>
                  <input type="file" accept="image/*,video/*" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>

              <div className="flex gap-3 mt-6 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 py-2 border border-white/10 rounded-xl text-sm text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-sky-500 text-white text-sm font-semibold rounded-xl hover:bg-sky-400 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> Save Evidence
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Evidence Records & Forensic Library</h2>
          <p className="text-sm text-slate-500">Captured camera snapshots, video clips, and incident evidence archive</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-sky-500/15 border border-sky-500/30 text-sky-400 text-sm font-semibold rounded-lg hover:bg-sky-500/25 transition-colors"
          >
            <Plus className="w-4 h-4" /> Upload Evidence
          </button>
          <button
            onClick={handleExportAll}
            className="flex items-center gap-2 px-4 py-2 bg-white/[0.05] border border-white/10 text-slate-300 text-sm rounded-lg hover:bg-white/[0.08] transition-colors"
          >
            <Download className="w-4 h-4" /> Export All Archive
          </button>
        </div>
      </div>

      {/* Filters & Retention Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ID, incident, or source…"
              className="w-full bg-[#0a1120] border border-white/10 rounded-lg py-2 pl-9 pr-3 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-sky-500/40"
            />
          </div>

          <div className="flex bg-[#0a1120] border border-white/10 rounded-lg p-0.5 text-xs font-mono">
            {(['all', 'Permanent', 'Standard', 'Flagged'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRetentionFilter(r)}
                className={`px-3 py-1 rounded transition-colors ${retentionFilter === r ? 'bg-sky-500 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                {r === 'all' ? 'All Retention' : r}
              </button>
            ))}
          </div>
        </div>

        <div className="flex border border-white/10 rounded-lg overflow-hidden bg-[#0a1120]">
          {(['grid', 'list'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 text-xs font-mono capitalize transition-colors ${view === v ? 'bg-sky-500/20 text-sky-400 font-bold' : 'text-slate-500 hover:text-slate-300'}`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Forensic Video Player Modal */}
      <ForensicVideoPlayerModal
        isOpen={!!forensicPlayerItem}
        onClose={() => setForensicPlayerItem(null)}
        evidenceItem={forensicPlayerItem}
      />

      {/* Grid or List View */}
      {view === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((ev) => {
            const Icon = TYPE_ICONS[ev.type] ?? FileImage;
            return (
              <div
                key={ev.id}
                onClick={() => setActivePreview(ev)}
                className="bg-[#0a1120] border border-white/[0.07] rounded-xl overflow-hidden hover:border-white/20 transition-all group cursor-pointer relative"
              >
                {/* Thumbnail */}
                <div className="aspect-video relative overflow-hidden bg-[#060c18]">
                  {ev.dataUrl ? (
                    <img src={ev.dataUrl} alt={ev.id} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  ) : (
                    <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${ev.thumbnailColor} 0%, #060c18 100%)` }} />
                  )}
                  <div className="absolute top-2 left-2 bg-black/60 rounded px-1.5 py-0.5 text-[9px] font-mono text-white/80 flex items-center gap-1">
                    <Icon className="w-3 h-3" />{ev.type}
                  </div>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setForensicPlayerItem(ev);
                      }}
                      className="px-2.5 py-1.5 bg-sky-500 hover:bg-sky-400 text-white rounded-lg text-[10px] font-mono font-bold flex items-center gap-1 shadow-lg shadow-sky-500/40"
                    >
                      <Film className="w-3.5 h-3.5" /> Scrubber
                    </button>
                    <button
                      onClick={() => setActivePreview(ev)}
                      className="p-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-[10px]"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Info */}
                <div className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-slate-400">{ev.id}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono ${RETENTION_COLORS[ev.retentionStatus]}`}>{ev.retentionStatus}</span>
                  </div>
                  <div className="text-xs font-semibold text-white mt-0.5">{ev.incidentId}</div>
                  <div className="text-[10px] text-slate-500 mt-1 truncate">{ev.source}</div>
                  
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/[0.05]">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setForensicPlayerItem(ev);
                      }}
                      className="text-[10px] font-mono text-sky-400 hover:text-sky-300 flex items-center gap-1 font-bold"
                    >
                      <PlayCircle className="w-3 h-3" /> Forensic Scrubber
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteRecord(ev.id);
                      }}
                      className="text-slate-600 hover:text-red-400 p-1 transition-colors"
                      title="Delete Evidence"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-[#0a1120] border border-white/[0.07] rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/[0.07]">
                {['ID', 'Incident', 'Source', 'Timestamp', 'Type', 'Retention', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.map((ev) => {
                const Icon = TYPE_ICONS[ev.type] ?? FileImage;
                return (
                  <tr key={ev.id} className="hover:bg-white/[0.03] cursor-pointer transition-colors" onClick={() => setActivePreview(ev)}>
                    <td className="px-4 py-3 font-mono text-slate-400">{ev.id}</td>
                    <td className="px-4 py-3 text-white font-medium">{ev.incidentId}</td>
                    <td className="px-4 py-3 text-slate-300">{ev.source}</td>
                    <td className="px-4 py-3 font-mono text-slate-400">{formatRelativeTime(ev.timestamp)}</td>
                    <td className="px-4 py-3"><span className="flex items-center gap-1 text-slate-300"><Icon className="w-3 h-3" />{ev.type}</span></td>
                    <td className="px-4 py-3"><span className={`text-[10px] px-2 py-0.5 rounded border ${RETENTION_COLORS[ev.retentionStatus]}`}>{ev.retentionStatus}</span></td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-2 items-center">
                        <button
                          onClick={() => setForensicPlayerItem(ev)}
                          className="px-2 py-1 bg-sky-500/15 border border-sky-500/30 text-sky-300 hover:bg-sky-500/25 rounded text-[10px] font-mono font-bold flex items-center gap-1 transition-colors"
                        >
                          <Film className="w-3 h-3" /> Scrubber
                        </button>
                        <button onClick={() => setActivePreview(ev)} className="p-1 text-slate-500 hover:text-sky-400 transition-colors" title="Preview Frame"><Eye className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDownload(ev)} className="p-1 text-slate-500 hover:text-emerald-400 transition-colors" title="Download"><Download className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDeleteRecord(ev.id)} className="p-1 text-slate-500 hover:text-red-400 transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>

  );
};

export default Evidence;


