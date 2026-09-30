// =====================================================================
// SafeWatch City Intelligence — SIH26127 Centralised Data Store
// Aligned strictly with SIH-26127 Problem Statement:
// AI-Powered Multi-Camera ANPR, Vehicle Trajectory & Traffic Intelligence
// =====================================================================

export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type IncidentStatus = 'open' | 'acknowledged' | 'escalated' | 'resolved';
export type SourceStatus = 'online' | 'offline' | 'degraded' | 'maintenance';

// ─── Vehicle Alerts & Traffic Incidents ───────────────────────────────
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
  zone: string; // Traffic Sector / Roadway
}

export const MOCK_INCIDENTS: Incident[] = [
  {
    id: 'INC-1042',
    title: 'Stolen Vehicle Hotlist Hit: MH12DE1433',
    severity: 'critical',
    source: 'Camera 02 — Ring Road Flyover (Eastbound)',
    rule: 'Stolen Vehicle Hotlist Match',
    detectedAt: new Date(Date.now() - 15_000).toISOString(),
    status: 'open',
    assignedTo: null,
    trackId: '#TRK-4402',
    duration: '18 sec',
    description: 'Vehicle with plate MH12DE1433 flagged as STOLEN matched with 96.4% OCR consensus confidence.',
    evidenceId: 'EVD-0031',
    zone: 'Ring Road Corridor',
  },
  {
    id: 'INC-1041',
    title: 'Impossible Travel Time Anomaly: DL01CA9999',
    severity: 'high',
    source: 'Camera 03 — Outer Expressway Toll Plaza',
    rule: 'Velocity & Plausibility Violation',
    detectedAt: new Date(Date.now() - 75_000).toISOString(),
    status: 'acknowledged',
    assignedTo: 'Jordan Chen',
    trackId: '#TRK-8819',
    duration: '2 min 10 sec',
    description: 'Plate DL01CA9999 observed traversing 8.4 km between Cam-01 and Cam-03 in 18s (expected >180s). Possible cloned plate or extreme speed.',
    evidenceId: 'EVD-0030',
    zone: 'Expressway Outer Sector',
  },
  {
    id: 'INC-1040',
    title: 'Severe Traffic Bottleneck & Density Spike',
    severity: 'medium',
    source: 'Camera 01 — MG Road Junction (Northbound)',
    rule: 'Congestion Threshold Exceeded (>85%)',
    detectedAt: new Date(Date.now() - 190_000).toISOString(),
    status: 'open',
    assignedTo: null,
    trackId: '#DENSITY-FLOW',
    duration: '5 min',
    description: 'Vehicle density reached 92% with average flow speed collapsing below 8 km/h on Northbound approach.',
    evidenceId: 'EVD-0029',
    zone: 'MG Road Junction',
  },
  {
    id: 'INC-1039',
    title: 'Blacklisted Commercial Vehicle: KA05MH7890',
    severity: 'high',
    source: 'Camera 04 — Downtown Terminal Crossing',
    rule: 'Heavy Vehicle Night-Only Restriction',
    detectedAt: new Date(Date.now() - 650_000).toISOString(),
    status: 'resolved',
    assignedTo: 'Sam Patel',
    trackId: '#TRK-3108',
    duration: '8 min',
    description: 'Restricted commercial multi-axle freight vehicle entered restricted urban zone during daytime prohibited hours.',
    evidenceId: 'EVD-0028',
    zone: 'Downtown Urban Core',
  },
  {
    id: 'INC-1038',
    title: 'Excessive Speed Violation (122 km/h in 60 km/h Zone)',
    severity: 'critical',
    source: 'Camera 03 — Outer Expressway Toll Plaza',
    rule: 'Speed Radar Optical Verification',
    detectedAt: new Date(Date.now() - 1_300_000).toISOString(),
    status: 'resolved',
    assignedTo: 'Alex Mercer',
    trackId: '#TRK-9002',
    duration: '45 sec',
    description: 'High-speed reckless transit captured across radar calibration markers. Plate HR26DQ5555 identified.',
    evidenceId: 'EVD-0027',
    zone: 'Expressway Outer Sector',
  },
  {
    id: 'INC-1037',
    title: 'Counterflow / Wrong-Way Driving Detected',
    severity: 'high',
    source: 'Camera 06 — Airport Flyover Approach',
    rule: 'One-Way Flow Trajectory Reversal',
    detectedAt: new Date(Date.now() - 3_700_000).toISOString(),
    status: 'escalated',
    assignedTo: 'Jordan Chen',
    trackId: '#TRK-1144',
    duration: '35 sec',
    description: 'Vehicle detected traveling opposite to designated one-way ramp vector on airport inbound flyover.',
    evidenceId: 'EVD-0026',
    zone: 'Airport Gateway Corridor',
  },
];

// ─── Traffic & ANPR Cameras ───────────────────────────────────────────
export interface Source {
  id: string;
  name: string;
  type: 'Junction ANPR Camera' | 'Overhead Gantry' | 'PTZ Traffic Dome' | 'Highway Speed Trap' | 'Toll Booth Sensor';
  location: string;
  status: SourceStatus;
  fps: number;
  latency: number; // ms
  lastSeen: string; // ISO
  aiModel: string;
  streamUrl: string;
}

export const MOCK_SOURCES: Source[] = [
  { id: 'cam-01', name: 'Camera 01 — MG Road Junction (Northbound)', type: 'Junction ANPR Camera', location: 'MG Road Junction', status: 'online', fps: 30, latency: 28, lastSeen: new Date().toISOString(), aiModel: 'ANPR Indian Plate OCR Engine v2.4', streamUrl: 'rtsp://city-traffic.net/stream/cam-01' },
  { id: 'cam-02', name: 'Camera 02 — Ring Road Flyover (Eastbound)', type: 'Overhead Gantry', location: 'Ring Road Flyover', status: 'online', fps: 30, latency: 32, lastSeen: new Date().toISOString(), aiModel: 'ANPR Indian Plate OCR Engine v2.4', streamUrl: 'rtsp://city-traffic.net/stream/cam-02' },
  { id: 'cam-03', name: 'Camera 03 — Outer Expressway Toll Plaza', type: 'Highway Speed Trap', location: 'Outer Expressway Gate', status: 'online', fps: 60, latency: 22, lastSeen: new Date().toISOString(), aiModel: 'High-Speed Highway ANPR v3.1', streamUrl: 'rtsp://city-traffic.net/stream/cam-03' },
  { id: 'cam-04', name: 'Camera 04 — Downtown Terminal Crossing', type: 'PTZ Traffic Dome', location: 'Downtown Terminal', status: 'online', fps: 25, latency: 45, lastSeen: new Date().toISOString(), aiModel: 'Vehicle Flow & ANPR Tracker v2.0', streamUrl: 'rtsp://city-traffic.net/stream/cam-04' },
  { id: 'cam-05', name: 'Camera 05 — Industrial Corridor Gate', type: 'Toll Booth Sensor', location: 'Industrial Corridor', status: 'degraded', fps: 15, latency: 120, lastSeen: new Date(Date.now() - 30_000).toISOString(), aiModel: 'Heavy Vehicle Classifier v2.1', streamUrl: 'rtsp://city-traffic.net/stream/cam-05' },
  { id: 'cam-06', name: 'Camera 06 — Airport Flyover Approach', type: 'Overhead Gantry', location: 'Airport Inbound Approach', status: 'online', fps: 30, latency: 30, lastSeen: new Date().toISOString(), aiModel: 'ANPR Indian Plate OCR Engine v2.4', streamUrl: 'rtsp://city-traffic.net/stream/cam-06' },
  { id: 'cam-07', name: 'Camera 07 — South Bypass Junction', type: 'Junction ANPR Camera', location: 'South Bypass Gate', status: 'offline', fps: 0, latency: 0, lastSeen: new Date(Date.now() - 1_800_000).toISOString(), aiModel: 'ANPR Indian Plate OCR Engine v2.4', streamUrl: 'rtsp://city-traffic.net/stream/cam-07' },
  { id: 'cam-08', name: 'Camera 08 — Central Railway Overbridge', type: 'Overhead Gantry', location: 'Railway Overbridge', status: 'online', fps: 30, latency: 25, lastSeen: new Date().toISOString(), aiModel: 'ANPR Indian Plate OCR Engine v2.4', streamUrl: 'rtsp://city-traffic.net/stream/cam-08' },
];

// ─── ANPR & Vehicle Sighting Evidence ─────────────────────────────────
export interface Evidence {
  id: string;
  incidentId: string;
  source: string;
  timestamp: string;
  type: 'Video Clip' | 'Screenshot' | 'Thumbnail';
  retentionStatus: 'Permanent' | 'Standard' | 'Flagged';
  thumbnailColor: string;
  plateText?: string;
  vehicleType?: string;
  confidence?: number;
}

export const MOCK_EVIDENCE: Evidence[] = [
  { id: 'EVD-0031', incidentId: 'INC-1042', source: 'Camera 02 — Ring Road', timestamp: new Date(Date.now() - 15_000).toISOString(), type: 'Screenshot', retentionStatus: 'Permanent', thumbnailColor: '#1e3a5f', plateText: 'MH12DE1433', vehicleType: 'White SUV (Hyundai Creta)', confidence: 96.4 },
  { id: 'EVD-0030', incidentId: 'INC-1041', source: 'Camera 03 — Outer Expressway', timestamp: new Date(Date.now() - 75_000).toISOString(), type: 'Video Clip', retentionStatus: 'Permanent', thumbnailColor: '#3b1f5f', plateText: 'DL01CA9999', vehicleType: 'Silver Sedan (Honda City)', confidence: 94.8 },
  { id: 'EVD-0029', incidentId: 'INC-1040', source: 'Camera 01 — MG Road', timestamp: new Date(Date.now() - 190_000).toISOString(), type: 'Video Clip', retentionStatus: 'Standard', thumbnailColor: '#1f4f3b', plateText: 'FLOW-ANALYSIS', vehicleType: 'Congestion Cluster (42 veh)', confidence: 91.0 },
  { id: 'EVD-0028', incidentId: 'INC-1039', source: 'Camera 04 — Downtown Crossing', timestamp: new Date(Date.now() - 650_000).toISOString(), type: 'Thumbnail', retentionStatus: 'Flagged', thumbnailColor: '#5f3b1f', plateText: 'KA05MH7890', vehicleType: 'Heavy Commercial Multi-Axle', confidence: 98.1 },
  { id: 'EVD-0027', incidentId: 'INC-1038', source: 'Camera 03 — Outer Expressway', timestamp: new Date(Date.now() - 1_300_000).toISOString(), type: 'Screenshot', retentionStatus: 'Permanent', thumbnailColor: '#5f1f1f', plateText: 'HR26DQ5555', vehicleType: 'Black Luxury Sedan (BMW 3)', confidence: 95.7 },
  { id: 'EVD-0026', incidentId: 'INC-1037', source: 'Camera 06 — Airport Flyover', timestamp: new Date(Date.now() - 3_700_000).toISOString(), type: 'Video Clip', retentionStatus: 'Standard', thumbnailColor: '#1f3f5f', plateText: 'UP16AB2020', vehicleType: 'Red Hatchback (Maruti Swift)', confidence: 93.5 },
];

// ─── ANPR AI & Computer Vision Models ─────────────────────────────────
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
  { id: 'model-01', name: 'ANPR Indian Plate OCR Consensus', version: '2.4.1', framework: 'EasyOCR + Custom RegEx + MorphFilter', accuracy: 92.4, latency: 42, status: 'active', createdAt: '2026-08-10', description: 'Multi-frame character consensus OCR tuned for Indian HSRP and standard license plates.' },
  { id: 'model-02', name: 'Vehicle Detection & Tracking', version: '1.8.0', framework: 'YOLOv8x + ByteTrack', accuracy: 94.8, latency: 26, status: 'active', createdAt: '2026-07-22', description: 'Detects cars, motorcycles, auto-rickshaws, buses, and commercial trucks with spatial tracking.' },
  { id: 'model-03', name: 'Cross-Camera Vehicle Re-ID', version: '1.2.0', framework: 'ResNet50 Re-ID Metric Learning', accuracy: 88.6, latency: 68, status: 'active', createdAt: '2026-08-05', description: 'Generates 512-d appearance embeddings for vehicle association across disjoint cameras.' },
  { id: 'model-04', name: 'Urban Flow & Congestion Estimator', version: '2.1.0', framework: 'Spatial-Temporal GCN', accuracy: 91.2, latency: 35, status: 'active', createdAt: '2026-06-15', description: 'Origin-Destination matrix computation, bottleneck forecasting, and route density analytics.' },
];

// ─── Forensic & Query Audit Logs ──────────────────────────────────────
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
  { id: 'log-001', timestamp: new Date(Date.now() - 5_000).toISOString(), actor: 'Alex Mercer (Admin)', action: 'Queried Vehicle Trajectory', resource: 'Plate: MH12DE1433', ip: '192.168.1.10', result: 'success' },
  { id: 'log-002', timestamp: new Date(Date.now() - 32_000).toISOString(), actor: 'Jordan Chen (Ops)', action: 'Dispatched Watchlist Alert', resource: 'INC-1042 (MH12DE1433)', ip: '192.168.1.15', result: 'success' },
  { id: 'log-003', timestamp: new Date(Date.now() - 85_000).toISOString(), actor: 'System Auto-Engine', action: 'Route Anomaly Flagged', resource: 'Plate: DL01CA9999 (Velocity Violation)', ip: '127.0.0.1', result: 'warning' },
  { id: 'log-004', timestamp: new Date(Date.now() - 310_000).toISOString(), actor: 'Sam Patel (Ops)', action: 'Exported Plate Sighting Evidence', resource: 'EVD-0030 (DL01CA9999)', ip: '192.168.1.22', result: 'success' },
  { id: 'log-005', timestamp: new Date(Date.now() - 610_000).toISOString(), actor: 'Alex Mercer (Admin)', action: 'Added Hotlist Entry', resource: 'Plate: KA05MH7890 (Blacklist)', ip: '192.168.1.10', result: 'success' },
  { id: 'log-006', timestamp: new Date(Date.now() - 1_250_000).toISOString(), actor: 'Unknown Client', action: 'Failed Auth Attempt', resource: 'REST /api/watchlist', ip: '10.0.0.45', result: 'failure' },
  { id: 'log-007', timestamp: new Date(Date.now() - 1_850_000).toISOString(), actor: 'Alex Mercer (Admin)', action: 'Calibrated Camera Node', resource: 'cam-03 (Expressway Gate)', ip: '192.168.1.10', result: 'success' },
  { id: 'log-008', timestamp: new Date(Date.now() - 3_650_000).toISOString(), actor: 'Jordan Chen (Ops)', action: 'Exported OD Flow Analytics', resource: 'OD Matrix Report (Daily)', ip: '192.168.1.15', result: 'success' },
];

// ─── Problem Statement KPI Summary ────────────────────────────────────
export const KPI_DATA = {
  activeIncidents: 6,
  incidentsDelta: '+2 alerts today',
  activeSources: 7,
  totalSources: 8,
  aiDetectionRate: 92.4, // True measured benchmark
  avgResponseTime: 42,
  responseTimeDelta: 'Latency: 42ms/frame',
  systemHealth: 99.4,
};

// ─── Analytics Helpers ────────────────────────────────────────────────
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
