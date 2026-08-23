// =====================================================================
// SafeWatch Mock Data — centralised store
// Replace each section with API calls in BUILD 006
// =====================================================================

export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type IncidentStatus = 'open' | 'acknowledged' | 'escalated' | 'resolved';
export type SourceStatus = 'online' | 'offline' | 'degraded' | 'maintenance';

// ─── Incidents ────────────────────────────────────────────────────────
export interface Incident {
  id: string;
  title: string;
  severity: Severity;
  source: string;
  rule: string;
  detectedAt: string; // ISO
  status: IncidentStatus;
  assignedTo: string | null;
  trackId: string;
  duration: string;
  description: string;
  evidenceId: string;
  zone: string;
}

export const MOCK_INCIDENTS: Incident[] = [
  {
    id: 'INC-1042',
    title: 'Unauthorized Zone Entry',
    severity: 'critical',
    source: 'Camera 03 — Restricted Zone',
    rule: 'Restricted Zone Entry',
    detectedAt: new Date(Date.now() - 12_000).toISOString(),
    status: 'open',
    assignedTo: null,
    trackId: '#104',
    duration: '18 sec',
    description: 'Person detected entering restricted area without authorization.',
    evidenceId: 'EVD-0031',
    zone: 'Restricted Zone',
  },
  {
    id: 'INC-1041',
    title: 'Crowd Density Threshold Exceeded',
    severity: 'high',
    source: 'Camera 01 — Main Entrance',
    rule: 'Crowd Density',
    detectedAt: new Date(Date.now() - 60_000).toISOString(),
    status: 'acknowledged',
    assignedTo: 'Jordan Chen',
    trackId: '#Multiple',
    duration: '2 min 15 sec',
    description: 'Crowd density in main entrance exceeded configured threshold of 15 persons.',
    evidenceId: 'EVD-0030',
    zone: 'Entry Zone',
  },
  {
    id: 'INC-1040',
    title: 'Unusual Movement Detected',
    severity: 'medium',
    source: 'Camera 08 — North Corridor',
    rule: 'Loitering',
    detectedAt: new Date(Date.now() - 180_000).toISOString(),
    status: 'open',
    assignedTo: null,
    trackId: '#089',
    duration: '4 min',
    description: 'Individual detected loitering in north corridor for an extended period.',
    evidenceId: 'EVD-0029',
    zone: 'High-Risk Area',
  },
  {
    id: 'INC-1039',
    title: 'Vehicle in Restricted Area',
    severity: 'high',
    source: 'Camera 04 — Parking Area',
    rule: 'Unauthorized Access',
    detectedAt: new Date(Date.now() - 600_000).toISOString(),
    status: 'resolved',
    assignedTo: 'Sam Patel',
    trackId: '#V-012',
    duration: '8 min',
    description: 'Unregistered vehicle detected in restricted parking zone after hours.',
    evidenceId: 'EVD-0028',
    zone: 'Restricted Zone',
  },
  {
    id: 'INC-1038',
    title: 'Perimeter Breach Detected',
    severity: 'critical',
    source: 'Camera 02 — North Gate',
    rule: 'Perimeter Security',
    detectedAt: new Date(Date.now() - 1_200_000).toISOString(),
    status: 'resolved',
    assignedTo: 'Alex Mercer',
    trackId: '#103',
    duration: '1 min 22 sec',
    description: 'Perimeter breach detected at north gate. Security team deployed.',
    evidenceId: 'EVD-0027',
    zone: 'Entry Zone',
  },
  {
    id: 'INC-1037',
    title: 'Equipment Left Unattended',
    severity: 'low',
    source: 'Camera 05 — Lab Area',
    rule: 'Equipment Safety',
    detectedAt: new Date(Date.now() - 3_600_000).toISOString(),
    status: 'escalated',
    assignedTo: 'Jordan Chen',
    trackId: '#N/A',
    duration: '22 min',
    description: 'Critical equipment detected unattended in lab area beyond policy limits.',
    evidenceId: 'EVD-0026',
    zone: 'Assembly Area',
  },
  {
    id: 'INC-1036',
    title: 'Emergency Exit Blocked',
    severity: 'high',
    source: 'Camera 06 — East Wing',
    rule: 'Emergency Compliance',
    detectedAt: new Date(Date.now() - 7_200_000).toISOString(),
    status: 'resolved',
    assignedTo: 'Sam Patel',
    trackId: '#N/A',
    duration: '15 min',
    description: 'Object blocking designated emergency exit detected and reported.',
    evidenceId: 'EVD-0025',
    zone: 'Entry Zone',
  },
];

// ─── Sources ──────────────────────────────────────────────────────────
export interface Source {
  id: string;
  name: string;
  type: 'IP Camera' | 'CCTV' | 'PTZ Camera' | 'Thermal' | 'Drone';
  location: string;
  status: SourceStatus;
  fps: number;
  latency: number; // ms
  lastSeen: string; // ISO
  aiModel: string;
  streamUrl: string;
}

export const MOCK_SOURCES: Source[] = [
  { id: 'cam-01', name: 'Camera 01', type: 'IP Camera', location: 'Main Entrance', status: 'online', fps: 30, latency: 42, lastSeen: new Date().toISOString(), aiModel: 'Person Detection v1.0.3', streamUrl: 'rtsp://192.168.1.101/stream' },
  { id: 'cam-02', name: 'Camera 02', type: 'PTZ Camera', location: 'North Gate', status: 'online', fps: 25, latency: 38, lastSeen: new Date().toISOString(), aiModel: 'Person Detection v1.0.3', streamUrl: 'rtsp://192.168.1.102/stream' },
  { id: 'cam-03', name: 'Camera 03', type: 'IP Camera', location: 'Restricted Zone', status: 'online', fps: 30, latency: 55, lastSeen: new Date().toISOString(), aiModel: 'Person Detection v1.0.3', streamUrl: 'rtsp://192.168.1.103/stream' },
  { id: 'cam-04', name: 'Camera 04', type: 'CCTV', location: 'Parking Area', status: 'online', fps: 15, latency: 70, lastSeen: new Date().toISOString(), aiModel: 'Vehicle Detection v1.2.1', streamUrl: 'rtsp://192.168.1.104/stream' },
  { id: 'cam-05', name: 'Camera 05', type: 'IP Camera', location: 'Lab Area', status: 'degraded', fps: 10, latency: 210, lastSeen: new Date(Date.now() - 30_000).toISOString(), aiModel: 'Person Detection v1.0.3', streamUrl: 'rtsp://192.168.1.105/stream' },
  { id: 'cam-06', name: 'Camera 06', type: 'Thermal', location: 'East Wing', status: 'online', fps: 20, latency: 48, lastSeen: new Date().toISOString(), aiModel: 'Thermal Detection v2.0.0', streamUrl: 'rtsp://192.168.1.106/stream' },
  { id: 'cam-07', name: 'Camera 07', type: 'PTZ Camera', location: 'Rooftop', status: 'offline', fps: 0, latency: 0, lastSeen: new Date(Date.now() - 1_800_000).toISOString(), aiModel: 'Person Detection v1.0.3', streamUrl: 'rtsp://192.168.1.107/stream' },
  { id: 'cam-08', name: 'Camera 08', type: 'IP Camera', location: 'North Corridor', status: 'online', fps: 30, latency: 35, lastSeen: new Date().toISOString(), aiModel: 'Person Detection v1.0.3', streamUrl: 'rtsp://192.168.1.108/stream' },
];

// ─── Zones ────────────────────────────────────────────────────────────
export interface Zone {
  id: string;
  name: string;
  type: 'Restricted' | 'High-Risk' | 'Entry' | 'Assembly' | 'General';
  source: string;
  ruleCount: number;
  status: 'active' | 'inactive';
  color: string;
}

export const MOCK_ZONES: Zone[] = [
  { id: 'zone-01', name: 'Restricted Zone', type: 'Restricted', source: 'Camera 03', ruleCount: 3, status: 'active', color: '#ef4444' },
  { id: 'zone-02', name: 'High-Risk Area', type: 'High-Risk', source: 'Camera 02', ruleCount: 4, status: 'active', color: '#f59e0b' },
  { id: 'zone-03', name: 'Entry Zone', type: 'Entry', source: 'Camera 01', ruleCount: 2, status: 'active', color: '#3b82f6' },
  { id: 'zone-04', name: 'Assembly Area', type: 'Assembly', source: 'Camera 05', ruleCount: 1, status: 'inactive', color: '#22c55e' },
];

// ─── Rules ────────────────────────────────────────────────────────────
export interface Rule {
  id: string;
  name: string;
  trigger: string;
  severity: Severity;
  enabled: boolean;
  threshold: string;
  sourceCount: number;
  lastTriggered: string | null;
  description: string;
}

export const MOCK_RULES: Rule[] = [
  { id: 'rule-01', name: 'Restricted Zone Entry', trigger: 'Person enters restricted zone', severity: 'critical', enabled: true, threshold: '1 person', sourceCount: 2, lastTriggered: new Date(Date.now() - 12_000).toISOString(), description: 'Triggers when any person is detected entering a restricted zone.' },
  { id: 'rule-02', name: 'Crowd Density', trigger: 'People count exceeds threshold', severity: 'high', enabled: true, threshold: '15 persons', sourceCount: 4, lastTriggered: new Date(Date.now() - 60_000).toISOString(), description: 'Triggers when crowd density exceeds configured person count.' },
  { id: 'rule-03', name: 'Loitering', trigger: 'Person remains inside zone for X seconds', severity: 'medium', enabled: true, threshold: '120 seconds', sourceCount: 3, lastTriggered: new Date(Date.now() - 180_000).toISOString(), description: 'Triggers when a person remains stationary beyond time threshold.' },
  { id: 'rule-04', name: 'Unauthorized Access', trigger: 'Person detected in restricted area after hours', severity: 'critical', enabled: true, threshold: 'After 20:00', sourceCount: 2, lastTriggered: new Date(Date.now() - 600_000).toISOString(), description: 'After-hours detection in sensitive areas.' },
  { id: 'rule-05', name: 'Perimeter Security', trigger: 'Motion at perimeter after closing time', severity: 'high', enabled: true, threshold: 'Any motion', sourceCount: 2, lastTriggered: new Date(Date.now() - 1_200_000).toISOString(), description: 'Detects any motion near perimeter boundaries.' },
  { id: 'rule-06', name: 'Emergency Compliance', trigger: 'Emergency exit blocked for >5 minutes', severity: 'high', enabled: false, threshold: '5 minutes', sourceCount: 1, lastTriggered: null, description: 'Monitors emergency exit obstruction.' },
];

// ─── Evidence ─────────────────────────────────────────────────────────
export interface Evidence {
  id: string;
  incidentId: string;
  source: string;
  timestamp: string;
  type: 'Video Clip' | 'Screenshot' | 'Thumbnail';
  retentionStatus: 'Permanent' | 'Standard' | 'Flagged';
  thumbnailColor: string; // placeholder color
}

export const MOCK_EVIDENCE: Evidence[] = [
  { id: 'EVD-0031', incidentId: 'INC-1042', source: 'Camera 03', timestamp: new Date(Date.now() - 12_000).toISOString(), type: 'Video Clip', retentionStatus: 'Permanent', thumbnailColor: '#1e3a5f' },
  { id: 'EVD-0030', incidentId: 'INC-1041', source: 'Camera 01', timestamp: new Date(Date.now() - 60_000).toISOString(), type: 'Screenshot', retentionStatus: 'Standard', thumbnailColor: '#3b1f5f' },
  { id: 'EVD-0029', incidentId: 'INC-1040', source: 'Camera 08', timestamp: new Date(Date.now() - 180_000).toISOString(), type: 'Video Clip', retentionStatus: 'Standard', thumbnailColor: '#1f4f3b' },
  { id: 'EVD-0028', incidentId: 'INC-1039', source: 'Camera 04', timestamp: new Date(Date.now() - 600_000).toISOString(), type: 'Thumbnail', retentionStatus: 'Flagged', thumbnailColor: '#5f3b1f' },
  { id: 'EVD-0027', incidentId: 'INC-1038', source: 'Camera 02', timestamp: new Date(Date.now() - 1_200_000).toISOString(), type: 'Video Clip', retentionStatus: 'Permanent', thumbnailColor: '#5f1f1f' },
  { id: 'EVD-0026', incidentId: 'INC-1037', source: 'Camera 05', timestamp: new Date(Date.now() - 3_600_000).toISOString(), type: 'Screenshot', retentionStatus: 'Standard', thumbnailColor: '#1f3f5f' },
  { id: 'EVD-0025', incidentId: 'INC-1036', source: 'Camera 06', timestamp: new Date(Date.now() - 7_200_000).toISOString(), type: 'Video Clip', retentionStatus: 'Standard', thumbnailColor: '#2f1f5f' },
];

// ─── AI Models ────────────────────────────────────────────────────────
export interface AIModel {
  id: string;
  name: string;
  version: string;
  framework: string;
  accuracy: number;
  latency: number; // ms
  status: 'active' | 'inactive' | 'testing';
  createdAt: string;
  description: string;
}

export const MOCK_AI_MODELS: AIModel[] = [
  { id: 'model-01', name: 'Person Detection', version: '1.0.3', framework: 'TensorFlow / COCO-SSD', accuracy: 94.7, latency: 38, status: 'active', createdAt: '2026-07-15', description: 'Detects and tracks persons in video streams using COCO-SSD model.' },
  { id: 'model-02', name: 'Vehicle Detection', version: '1.2.1', framework: 'YOLOv8n', accuracy: 91.3, latency: 52, status: 'active', createdAt: '2026-06-20', description: 'Detects and classifies vehicles in surveillance footage.' },
  { id: 'model-03', name: 'Thermal Analysis', version: '0.9.0', framework: 'PyTorch', accuracy: 87.5, latency: 65, status: 'testing', createdAt: '2026-08-01', description: 'Analyzes thermal imaging for heat-signature anomaly detection.' },
  { id: 'model-04', name: 'Crowd Analytics', version: '2.0.0', framework: 'TensorFlow', accuracy: 89.2, latency: 48, status: 'inactive', createdAt: '2026-05-10', description: 'Density estimation and crowd flow analysis.' },
];

// ─── Audit Logs ───────────────────────────────────────────────────────
export interface AuditLog {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  resource: string;
  ip: string;
  result: 'success' | 'failure' | 'warning';
}

export const MOCK_AUDIT_LOGS: AuditLog[] = [
  { id: 'log-001', timestamp: new Date(Date.now() - 1_000).toISOString(), actor: 'Alex Mercer', action: 'Activated AI Model', resource: 'model-02 (Vehicle Detection)', ip: '192.168.1.10', result: 'success' },
  { id: 'log-002', timestamp: new Date(Date.now() - 30_000).toISOString(), actor: 'Jordan Chen', action: 'Acknowledged Incident', resource: 'INC-1041', ip: '192.168.1.15', result: 'success' },
  { id: 'log-003', timestamp: new Date(Date.now() - 90_000).toISOString(), actor: 'Alex Mercer', action: 'Changed Rule Threshold', resource: 'rule-02 (Crowd Density)', ip: '192.168.1.10', result: 'success' },
  { id: 'log-004', timestamp: new Date(Date.now() - 300_000).toISOString(), actor: 'Sam Patel', action: 'Exported Evidence', resource: 'EVD-0028', ip: '192.168.1.22', result: 'success' },
  { id: 'log-005', timestamp: new Date(Date.now() - 600_000).toISOString(), actor: 'Jordan Chen', action: 'Resolved Incident', resource: 'INC-1039', ip: '192.168.1.15', result: 'success' },
  { id: 'log-006', timestamp: new Date(Date.now() - 1_200_000).toISOString(), actor: 'Unknown', action: 'Login Attempt', resource: 'Authentication', ip: '10.0.0.45', result: 'failure' },
  { id: 'log-007', timestamp: new Date(Date.now() - 1_800_000).toISOString(), actor: 'Alex Mercer', action: 'Added Source', resource: 'cam-08 (Camera 08)', ip: '192.168.1.10', result: 'success' },
  { id: 'log-008', timestamp: new Date(Date.now() - 3_600_000).toISOString(), actor: 'Alex Mercer', action: 'User Role Changed', resource: 'usr-003 (Sam Patel)', ip: '192.168.1.10', result: 'success' },
];

// ─── KPI Summary ──────────────────────────────────────────────────────
export const KPI_DATA = {
  activeIncidents: 7,
  incidentsDelta: '+2 today',
  activeSources: 24,
  totalSources: 27,
  aiDetectionRate: 94.7,
  avgResponseTime: 38,
  responseTimeDelta: '-12%',
  systemHealth: 99.2,
};

// ─── Analytics (time-series) ──────────────────────────────────────────
export const ANALYTICS_INCIDENTS_OVER_TIME = [
  { day: 'Mon', incidents: 4 },
  { day: 'Tue', incidents: 7 },
  { day: 'Wed', incidents: 3 },
  { day: 'Thu', incidents: 9 },
  { day: 'Fri', incidents: 5 },
  { day: 'Sat', incidents: 2 },
  { day: 'Sun', incidents: 6 },
];

export const ANALYTICS_BY_SEVERITY = [
  { name: 'Critical', value: 8, color: '#ef4444' },
  { name: 'High', value: 14, color: '#f59e0b' },
  { name: 'Medium', value: 11, color: '#3b82f6' },
  { name: 'Low', value: 5, color: '#22c55e' },
];

export const ANALYTICS_BY_SOURCE = [
  { source: 'Cam 01', incidents: 12 },
  { source: 'Cam 02', incidents: 8 },
  { source: 'Cam 03', incidents: 15 },
  { source: 'Cam 04', incidents: 5 },
  { source: 'Cam 05', incidents: 3 },
  { source: 'Cam 06', incidents: 7 },
];

// ─── Helpers ──────────────────────────────────────────────────────────
export const formatRelativeTime = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
};

export const SEVERITY_COLORS: Record<Severity, string> = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/40',
  high: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
  medium: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
  low: 'bg-green-500/20 text-green-400 border-green-500/40',
};

export const STATUS_COLORS: Record<IncidentStatus, string> = {
  open: 'bg-red-500/20 text-red-400 border-red-500/40',
  acknowledged: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
  escalated: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
  resolved: 'bg-green-500/20 text-green-400 border-green-500/40',
};

export const SOURCE_STATUS_COLORS: Record<SourceStatus, string> = {
  online: 'text-green-400',
  offline: 'text-red-400',
  degraded: 'text-amber-400',
  maintenance: 'text-blue-400',
};
