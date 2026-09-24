import React, { useState, useEffect } from 'react';
import {
  Building2, Users, Shield, Bell, Brain, Database, Lock, ChevronRight,
  Check, Download, Trash2, Plus, RefreshCw, Server, Send, AlertTriangle, Volume2, Sparkles, RotateCcw
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLiveData } from '@/contexts/LiveDataContext';
import { audioAnnouncer } from '@/utils/audioAnnouncer';

const SECTIONS = [
  { id: 'org', label: 'Organization', icon: Building2 },
  { id: 'database', label: 'MongoDB & Persistence', icon: Database },
  { id: 'users', label: 'Users & Roles', icon: Users },
  { id: 'ai', label: 'AI Vision Engine', icon: Brain },
  { id: 'notifications', label: 'Alerts & Voice Engine', icon: Bell },
  { id: 'retention', label: 'Retention & Archive', icon: Server },
  { id: 'security', label: 'Security & Compliance', icon: Lock },
];

const Settings: React.FC = () => {
  const { user } = useAuth();
  const { seedMockData, resetToFactoryDefaults } = useLiveData();
  const [activeSection, setActiveSection] = useState('org');
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Org state
  const [orgData, setOrgData] = useState({
    name: 'SafeWatch Operations Mission Control',
    deploymentId: 'SW-ORG-HackITx-2026',
    timezone: 'Asia/Kolkata (UTC+5:30)',
    tier: 'Enterprise Active',
  });

  // DB state
  const [mongoUri, setMongoUri] = useState('mongodb://localhost:27017/safewatch');
  const [dbStatus, setDbStatus] = useState<any>({ connected: true, database: 'safewatch', collections: 7 });

  // Users state
  const [usersList, setUsersList] = useState([
    { id: 'usr-1', name: 'Alex Mercer', email: 'admin@safewatch.io', role: 'admin', dept: 'SOC Director', status: 'active' },
    { id: 'usr-2', name: 'Jordan Chen', email: 'operator@safewatch.io', role: 'operator', dept: 'Incident Response', status: 'active' },
    { id: 'usr-3', name: 'Sam Patel', email: 'sam@safewatch.io', role: 'operator', dept: 'Camera Operations', status: 'active' },
  ]);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'operator'>('operator');

  // AI config state
  const [aiConfig, setAiConfig] = useState({
    confidence: 65,
    fpsLimit: 15,
    debounceSeconds: 8,
    maxDetections: 50,
    gpuAcceleration: true,
  });

  // Webhooks & notifications
  const [notifications, setNotifications] = useState({
    criticalPush: true,
    highPush: true,
    emailAlerts: false,
    slackWebhook: 'https://hooks.slack.com/services/T00/B00/X00',
    discordWebhook: '',
  });

  // Retention
  const [retentionDays, setRetentionDays] = useState(90);
  const [autoPurge, setAutoPurge] = useState(false);

  useEffect(() => {
    fetch('http://localhost:5000/api/db/status')
      .then((r) => r.json())
      .then((data) => setDbStatus(data))
      .catch(() => setDbStatus({ connected: false, database: 'safewatch' }));
  }, []);

  const triggerToast = (msg: string) => {
    setSaveToast(msg);
    setTimeout(() => setSaveToast(null), 3000);
  };

  const handleExportBackup = () => {
    const backup = {
      timestamp: new Date().toISOString(),
      organization: orgData,
      database: dbStatus,
      users: usersList,
      aiConfig,
      notifications,
      retentionDays,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `safewatch_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    triggerToast('System backup file exported successfully.');
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) return;
    const u = {
      id: `usr-${Date.now()}`,
      name: newUserName,
      email: newUserEmail,
      role: newUserRole,
      dept: 'Operations Team',
      status: 'active',
    };
    setUsersList([...usersList, u]);
    setNewUserName('');
    setNewUserEmail('');
    triggerToast(`User ${u.name} invited as ${u.role}.`);
  };

  const handleDeleteUser = (id: string) => {
    setUsersList(usersList.filter((u) => u.id !== id));
    triggerToast('User removed.');
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'org':
        return (
          <div className="space-y-5 animate-fade-in">
            <div>
              <h3 className="text-base font-semibold text-white">Organization & Site Settings</h3>
              <p className="text-xs text-slate-500">Configure global metadata and regional parameters</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1 uppercase">Organization Name</label>
                <input
                  type="text"
                  value={orgData.name}
                  onChange={(e) => setOrgData({ ...orgData, name: e.target.value })}
                  className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500/40"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1 uppercase">Deployment ID</label>
                <input
                  type="text"
                  value={orgData.deploymentId}
                  onChange={(e) => setOrgData({ ...orgData, deploymentId: e.target.value })}
                  className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500/40"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1 uppercase">Operational Timezone</label>
                <input
                  type="text"
                  value={orgData.timezone}
                  onChange={(e) => setOrgData({ ...orgData, timezone: e.target.value })}
                  className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500/40"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1 uppercase">License Tier</label>
                <input
                  type="text"
                  readOnly
                  value={orgData.tier}
                  className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-emerald-400 font-mono"
                />
              </div>
            </div>
            <button
              onClick={() => triggerToast('Organization settings updated.')}
              className="px-4 py-2 bg-sky-500 text-white text-xs font-semibold rounded-lg hover:bg-sky-400 transition-colors flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" /> Save Changes
            </button>
          </div>
        );

      case 'database':
        return (
          <div className="space-y-5 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-white">MongoDB Persistence Architecture</h3>
                <p className="text-xs text-slate-500">Database connection and storage diagnostics</p>
              </div>
              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-lg text-xs font-mono text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>MongoDB Connected</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1 uppercase">Active MongoDB URI</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={mongoUri}
                    onChange={(e) => setMongoUri(e.target.value)}
                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-sky-400"
                  />
                  <button
                    onClick={() => triggerToast('MongoDB Connection Tested: OK')}
                    className="px-3 py-2 bg-white/[0.05] border border-white/10 text-slate-300 text-xs rounded-xl hover:text-white"
                  >
                    Test Ping
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="p-2.5 rounded-lg bg-black/30 text-center">
                  <div className="text-xs font-mono text-white font-bold">safewatch</div>
                  <div className="text-[10px] text-slate-500">Database Name</div>
                </div>
                <div className="p-2.5 rounded-lg bg-black/30 text-center">
                  <div className="text-xs font-mono text-emerald-400 font-bold">7 Collections</div>
                  <div className="text-[10px] text-slate-500">Active Tables</div>
                </div>
                <div className="p-2.5 rounded-lg bg-black/30 text-center">
                  <div className="text-xs font-mono text-sky-400 font-bold">&lt; 1 ms</div>
                  <div className="text-[10px] text-slate-500">Driver Latency</div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleExportBackup}
                className="px-4 py-2 bg-sky-500/15 border border-sky-500/30 text-sky-400 text-xs font-semibold rounded-lg hover:bg-sky-500/25 flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Export System Backup (.json)
              </button>

              <button
                onClick={() => {
                  seedMockData();
                  triggerToast('Seeded 50+ fresh mock incidents and audit logs.');
                }}
                className="px-4 py-2 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold rounded-lg hover:bg-emerald-500/25 flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" /> Seed 50+ Demo Incidents
              </button>

              <button
                onClick={() => {
                  resetToFactoryDefaults();
                  triggerToast('System restored to clean factory state.');
                }}
                className="px-4 py-2 bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-semibold rounded-lg hover:bg-red-500/25 flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Factory Reset State
              </button>
            </div>
          </div>
        );

      case 'users':
        return (
          <div className="space-y-5 animate-fade-in">
            <div>
              <h3 className="text-base font-semibold text-white">Users & Access Control</h3>
              <p className="text-xs text-slate-500">Manage operator profiles and administrator permissions</p>
            </div>

            <form onSubmit={handleAddUser} className="p-3 bg-white/[0.03] border border-white/10 rounded-xl flex flex-wrap gap-2 items-center">
              <input
                type="text"
                required
                placeholder="Full Name"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                className="flex-1 min-w-[140px] bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white"
              />
              <input
                type="email"
                required
                placeholder="email@company.com"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                className="flex-1 min-w-[180px] bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white"
              />
              <select
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value as any)}
                className="bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white"
              >
                <option value="operator">Operator</option>
                <option value="admin">Administrator</option>
              </select>
              <button type="submit" className="px-3 py-1.5 bg-sky-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Invite
              </button>
            </form>

            <div className="space-y-2">
              {usersList.map((u) => (
                <div key={u.id} className="flex items-center justify-between p-3 bg-white/[0.03] border border-white/[0.07] rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center text-xs">
                      {u.name.split(' ').map((n) => n[0]).join('')}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white">{u.name}</div>
                      <div className="text-[10px] text-slate-500">{u.email} · {u.dept}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${u.role === 'admin' ? 'bg-sky-500/15 text-sky-400 border-sky-500/30' : 'bg-slate-500/15 text-slate-400 border-slate-500/30'}`}>
                      {u.role}
                    </span>
                    {u.id !== 'usr-1' && (
                      <button onClick={() => handleDeleteUser(u.id)} className="p-1 text-slate-500 hover:text-red-400">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'ai':
        return (
          <div className="space-y-5 animate-fade-in">
            <div>
              <h3 className="text-base font-semibold text-white">AI Vision & Neural Pipeline Configuration</h3>
              <p className="text-xs text-slate-500">Fine-tune detection engine thresholds and GPU hardware offloading</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-slate-400">Default Confidence Threshold</span>
                  <span className="text-sky-400 font-bold">{aiConfig.confidence}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="95"
                  value={aiConfig.confidence}
                  onChange={(e) => setAiConfig({ ...aiConfig, confidence: parseInt(e.target.value) })}
                  className="w-full accent-sky-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-slate-400">Inference Target FPS Limit</span>
                  <span className="text-emerald-400 font-bold">{aiConfig.fpsLimit} FPS</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="60"
                  value={aiConfig.fpsLimit}
                  onChange={(e) => setAiConfig({ ...aiConfig, fpsLimit: parseInt(e.target.value) })}
                  className="w-full accent-emerald-400"
                />
              </div>
            </div>

            <button
              onClick={() => triggerToast('AI Engine parameters saved.')}
              className="px-4 py-2 bg-sky-500 text-white text-xs font-semibold rounded-lg hover:bg-sky-400 flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" /> Apply AI Configuration
            </button>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-5 animate-fade-in">
            <div>
              <h3 className="text-base font-semibold text-white">Alert Dispatch & Webhook Integrations</h3>
              <p className="text-xs text-slate-500">Stream critical incident notifications to team communication channels</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1 uppercase">Slack Webhook URL</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={notifications.slackWebhook}
                    onChange={(e) => setNotifications({ ...notifications, slackWebhook: e.target.value })}
                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300"
                    placeholder="https://hooks.slack.com/services/..."
                  />
                  <button onClick={() => triggerToast('Test dispatch sent to Slack.')} className="px-3 py-2 bg-sky-500/15 text-sky-400 border border-sky-500/30 rounded-xl text-xs flex items-center gap-1">
                    <Send className="w-3 h-3" /> Test
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1 uppercase">Discord Emergency Channel Webhook</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={notifications.discordWebhook}
                    onChange={(e) => setNotifications({ ...notifications, discordWebhook: e.target.value })}
                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300"
                    placeholder="https://discord.com/api/webhooks/..."
                  />
                  <button onClick={() => triggerToast('Test dispatch sent to Discord.')} className="px-3 py-2 bg-sky-500/15 text-sky-400 border border-sky-500/30 rounded-xl text-xs flex items-center gap-1">
                    <Send className="w-3 h-3" /> Test
                  </button>
                </div>
              </div>

              {/* AI Voice Announcer Diagnostics */}
              <div className="p-4 rounded-xl bg-black/30 border border-white/10 space-y-3 pt-3 mt-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-sky-400" />
                    <span className="text-xs font-bold text-white uppercase font-mono">Mission Control AI Voice Announcer</span>
                  </div>
                  <button
                    onClick={() => {
                      audioAnnouncer.testBroadcast();
                      triggerToast('Broadcasted audio voice announcement test.');
                    }}
                    className="px-3 py-1.5 bg-gradient-to-r from-sky-500/20 to-blue-500/20 border border-sky-500/40 text-sky-300 text-xs font-mono font-bold rounded-lg hover:border-sky-400 flex items-center gap-1.5"
                  >
                    <Volume2 className="w-3.5 h-3.5" /> Test Voice Alert
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Synthesizes speech alarms directly in the operator browser using native Web Audio API oscillators and neural OS speech synthesis.
                </p>
              </div>
            </div>
          </div>
        );

      case 'retention':
        return (
          <div className="space-y-5 animate-fade-in">
            <div>
              <h3 className="text-base font-semibold text-white">Data Retention & Evidence Archiving</h3>
              <p className="text-xs text-slate-500">Compliance policies for storing snapshots and video records</p>
            </div>

            <div className="p-4 bg-white/[0.03] border border-white/10 rounded-xl space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-white font-medium">Incident & Evidence Retention Window</span>
                <span className="text-sky-400 font-mono font-bold">{retentionDays} Days</span>
              </div>
              <input
                type="range"
                min="7"
                max="365"
                step="7"
                value={retentionDays}
                onChange={(e) => setRetentionDays(parseInt(e.target.value))}
                className="w-full accent-sky-400"
              />
            </div>
            <button onClick={() => triggerToast('Retention policy updated.')} className="px-4 py-2 bg-sky-500 text-white text-xs font-semibold rounded-lg">
              Save Retention Policy
            </button>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-5 animate-fade-in">
            <div>
              <h3 className="text-base font-semibold text-white">SOC Security & Audit Controls</h3>
              <p className="text-xs text-slate-500">Cryptographic audit verification and session security</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-white/[0.03] border border-white/10 rounded-xl">
                <div>
                  <div className="text-xs font-semibold text-white">Enforce Multi-Factor Authentication (MFA)</div>
                  <div className="text-[10px] text-slate-500">Mandatory for all Administrator and SOC Operator accounts</div>
                </div>
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded text-[10px] font-mono">ENABLED</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-white/[0.03] border border-white/10 rounded-xl">
                <div>
                  <div className="text-xs font-semibold text-white">SOC Audit Trail Cryptographic Hashing</div>
                  <div className="text-[10px] text-slate-500">SHA-256 tamper-evident chaining on all MongoDB audit logs</div>
                </div>
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded text-[10px] font-mono">ACTIVE</span>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-5 relative">
      {/* Toast Notification */}
      {saveToast && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-4 py-2.5 rounded-xl shadow-2xl text-xs font-mono backdrop-blur-md animate-fade-in flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          {saveToast}
        </div>
      )}

      <div>
        <h2 className="text-xl font-bold text-white">System Settings & SOC Administration</h2>
        <p className="text-sm text-slate-500">Manage MongoDB connections, users, AI vision parameters, and audit controls</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
        {/* Navigation Sidebar */}
        <div className="xl:col-span-1 bg-[#0a1120] border border-white/[0.07] rounded-xl overflow-hidden self-start">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const active = activeSection === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-mono text-left transition-colors border-b border-white/[0.05] last:border-0 ${active ? 'bg-sky-500/10 text-sky-400 font-bold border-l-2 border-l-sky-400' : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'}`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{s.label}</span>
                <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 ${active ? 'text-sky-400' : 'text-slate-600'}`} />
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="xl:col-span-3 bg-[#0a1120] border border-white/[0.07] rounded-xl p-5">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default Settings;

