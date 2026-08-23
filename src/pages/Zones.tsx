import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Map, Shield, Check, X, AlertTriangle } from 'lucide-react';
import { MOCK_ZONES } from '@/data/mockData';

const TYPE_COLORS: Record<string, string> = {
  Restricted: 'bg-red-500/15 text-red-400 border-red-500/30',
  'High-Risk': 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  Entry: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  Assembly: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  General: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
};

const COLOR_OPTIONS = ['#ef4444', '#f59e0b', '#38bdf8', '#22c55e', '#a855f7', '#ec4899'];

const Zones: React.FC = () => {
  const [zones, setZones] = useState<any[]>(() => {
    try {
      const stored = localStorage.getItem('safewatch_zones');
      if (stored) return JSON.parse(stored);
    } catch (_) {}
    return MOCK_ZONES;
  });

  const [showModal, setShowModal] = useState(false);
  const [editingZone, setEditingZone] = useState<any | null>(null);
  const [activeHoverZone, setActiveHoverZone] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    source: 'Camera 01 — Main Entrance',
    type: 'Restricted',
    color: '#ef4444',
    ruleCount: 2,
    posX: 25,
    posY: 30,
    width: 25,
    height: 30,
  });

  useEffect(() => {
    try {
      localStorage.setItem('safewatch_zones', JSON.stringify(zones));
    } catch (_) {}
  }, [zones]);

  const handleOpenCreate = () => {
    setEditingZone(null);
    setFormData({
      name: '',
      source: 'Camera 01 — Main Entrance',
      type: 'Restricted',
      color: '#ef4444',
      ruleCount: 2,
      posX: 20 + Math.floor(Math.random() * 40),
      posY: 20 + Math.floor(Math.random() * 40),
      width: 25,
      height: 30,
    });
    setShowModal(true);
  };

  const handleOpenEdit = (zone: any) => {
    setEditingZone(zone);
    setFormData({
      name: zone.name,
      source: zone.source,
      type: zone.type,
      color: zone.color,
      ruleCount: zone.ruleCount || 1,
      posX: zone.posX || 30,
      posY: zone.posY || 30,
      width: zone.width || 25,
      height: zone.height || 30,
    });
    setShowModal(true);
  };

  const handleSaveZone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingZone) {
      setZones((prev) =>
        prev.map((z) =>
          z.id === editingZone.id
            ? { ...z, ...formData }
            : z
        )
      );
    } else {
      const newZone = {
        id: `zone-${Math.floor(100 + Math.random() * 900)}`,
        name: formData.name,
        source: formData.source,
        type: formData.type,
        color: formData.color,
        ruleCount: formData.ruleCount,
        status: 'active',
        posX: formData.posX,
        posY: formData.posY,
        width: formData.width,
        height: formData.height,
      };
      setZones((prev) => [newZone, ...prev]);
    }
    setShowModal(false);
  };

  const toggleZoneStatus = (id: string) => {
    setZones((prev) =>
      prev.map((z) =>
        z.id === id
          ? { ...z, status: z.status === 'active' ? 'disabled' : 'active' }
          : z
      )
    );
  };

  const handleDeleteZone = (id: string) => {
    setZones((prev) => prev.filter((z) => z.id !== id));
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Safety Zones Management</h2>
          <p className="text-sm text-slate-500">Configure spatial security perimeters and AI rule boundaries</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2 bg-sky-500/15 border border-sky-500/30 text-sky-400 text-sm font-semibold rounded-lg hover:bg-sky-500/25 transition-colors"
        >
          <Plus className="w-4 h-4" /> Create Zone
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Zone Cards */}
        <div className="xl:col-span-1 space-y-3">
          {zones.map((zone) => (
            <div
              key={zone.id}
              onMouseEnter={() => setActiveHoverZone(zone.id)}
              onMouseLeave={() => setActiveHoverZone(null)}
              className={`bg-[#0a1120] border rounded-xl p-4 transition-all ${activeHoverZone === zone.id ? 'border-sky-500/50 shadow-lg shadow-sky-500/10' : 'border-white/[0.07] hover:border-white/15'}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: zone.color }} />
                  <div>
                    <span className="text-sm font-semibold text-white block">{zone.name}</span>
                    <span className="text-[10px] font-mono text-slate-500">{zone.id}</span>
                  </div>
                </div>
                <button
                  onClick={() => toggleZoneStatus(zone.id)}
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border bg-white/[0.03] text-[10px] font-mono transition-colors"
                  style={{ borderColor: zone.status === 'active' ? 'rgba(34,197,94,0.3)' : 'rgba(100,116,139,0.3)' }}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${zone.status === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                  <span className={zone.status === 'active' ? 'text-emerald-400' : 'text-slate-500'}>
                    {zone.status === 'active' ? 'ACTIVE' : 'DISABLED'}
                  </span>
                </button>
              </div>

              <div className="space-y-1 mb-3">
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${TYPE_COLORS[zone.type] ?? 'bg-slate-500/15 text-slate-400 border-slate-500/30'}`}>
                  {zone.type}
                </span>
                <div className="text-xs text-slate-500 mt-2 truncate">Source: <span className="text-slate-300">{zone.source}</span></div>
                <div className="text-xs text-slate-500">Active Rules: <span className="text-slate-300">{zone.ruleCount || 2}</span></div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleOpenEdit(zone)}
                  className="flex-1 py-1.5 bg-white/[0.05] border border-white/10 text-slate-300 text-xs rounded-lg hover:bg-white/[0.08] flex items-center justify-center gap-1 transition-colors"
                >
                  <Edit2 className="w-3 h-3" /> Edit
                </button>
                <button
                  onClick={() => handleDeleteZone(zone.id)}
                  className="py-1.5 px-2.5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg hover:bg-red-500/20 flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Interactive Floor Plan Map */}
        <div className="xl:col-span-2 bg-[#0a1120] border border-white/[0.07] rounded-xl overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-white/[0.07] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Map className="w-4 h-4 text-sky-400" />
              <span className="text-sm font-semibold text-white">Facility Floor Plan & Spatial Zone Radar</span>
            </div>
            <span className="text-[10px] font-mono text-slate-500">{zones.filter((z) => z.status === 'active').length} Active Perimeters</span>
          </div>

          <div className="flex-1 relative p-4" style={{ minHeight: 380 }}>
            <div
              className="w-full h-full rounded-xl border border-white/[0.07] relative overflow-hidden bg-[#060c18]"
              style={{ background: 'radial-gradient(ellipse at 40% 50%, rgba(56,189,248,0.06) 0%, transparent 80%)' }}
            >
              {/* Floor Plan Radar Grid */}
              <div
                className="absolute inset-0 opacity-[0.08]"
                style={{
                  backgroundImage: 'linear-gradient(rgba(56,189,248,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.8) 1px, transparent 1px)',
                  backgroundSize: '36px 36px',
                }}
              />

              {/* Dynamic Zones on Floor Plan */}
              {zones.map((zone, i) => {
                const isHovered = activeHoverZone === zone.id;
                const leftPos = zone.posX || (10 + (i % 3) * 30);
                const topPos = zone.posY || (15 + Math.floor(i / 3) * 38);
                const widthVal = zone.width || 25;
                const heightVal = zone.height || 30;

                return (
                  <div
                    key={zone.id}
                    onMouseEnter={() => setActiveHoverZone(zone.id)}
                    onMouseLeave={() => setActiveHoverZone(null)}
                    onClick={() => handleOpenEdit(zone)}
                    className={`absolute rounded-xl border-2 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${isHovered ? 'scale-105 z-20 shadow-xl' : 'z-10'} ${zone.status === 'disabled' ? 'opacity-30 border-dashed' : ''}`}
                    style={{
                      borderColor: zone.color,
                      backgroundColor: `${zone.color}22`,
                      left: `${leftPos}%`,
                      top: `${topPos}%`,
                      width: `${widthVal}%`,
                      height: `${heightVal}%`,
                      boxShadow: isHovered ? `0 0 20px ${zone.color}66` : undefined,
                    }}
                  >
                    <Shield className="w-4 h-4 mb-1" style={{ color: zone.color }} />
                    <span className="text-[10px] font-bold text-center px-1 truncate max-w-full" style={{ color: zone.color }}>
                      {zone.name}
                    </span>
                    <span className="text-[8px] font-mono text-slate-400 uppercase tracking-wider">{zone.type}</span>
                  </div>
                );
              })}

              <div className="absolute bottom-3 right-3 text-[10px] font-mono text-slate-500 bg-black/60 px-2 py-1 rounded border border-white/10">
                Facility Floor Plan — Main Plant Level 1
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create / Edit Zone Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0d1526] border border-white/15 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
              <h3 className="text-lg font-bold text-white">{editingZone ? 'Edit Safety Zone' : 'Create Safety Zone'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveZone} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1 uppercase">Zone Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hazardous Machinery Zone"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-sky-500/40"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1 uppercase">Assigned Camera Source</label>
                <input
                  type="text"
                  placeholder="e.g. Camera 03 — Restricted Zone"
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-sky-500/40"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1 uppercase">Zone Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full bg-[#0a1120] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500/40"
                >
                  {['Restricted', 'High-Risk', 'Entry', 'Assembly', 'General'].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1 uppercase">Zone Color Accent</label>
                <div className="flex gap-2">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: c })}
                      className={`w-8 h-8 rounded-full border-2 transition-transform ${formData.color === c ? 'scale-110 border-white' : 'border-transparent opacity-60'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
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
                  <Check className="w-4 h-4" /> {editingZone ? 'Save Changes' : 'Create Zone'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Zones;

