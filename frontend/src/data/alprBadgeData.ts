// src/data/alprBadgeData.ts

export interface LicensePlateRecord {
  id: string;
  plateNumber: string;
  state: string;
  vehicleType: string;
  driverName: string;
  accessStatus: 'authorized' | 'contractor' | 'flagged' | 'denied';
  clearanceLevel: string;
  lastSeenLocation: string;
  timestamp: string;
  confidence: number;
}

export interface EmployeeBadgeRecord {
  badgeId: string;
  employeeName: string;
  department: string;
  role: string;
  clearanceLevel: 'Level 1 (General)' | 'Level 2 (Operations)' | 'Level 3 (High Voltage)' | 'Level 4 (Server Core)';
  ppeCompliance: 'Compliant (Vest + Helmet)' | 'Warning (Missing Helmet)' | 'Unverified';
  accessStatus: 'granted' | 'revoked' | 'visitor';
  lastScannedGate: string;
  timestamp: string;
  confidence: number;
}

export const MOCK_ALPR_LOGS: LicensePlateRecord[] = [
  {
    id: 'ALPR-901',
    plateNumber: 'TX-792-KLR',
    state: 'Texas',
    vehicleType: 'Ford F-150 / White Utility',
    driverName: 'Marcus Vance',
    accessStatus: 'authorized',
    clearanceLevel: 'Sector 01-04 Full Access',
    lastSeenLocation: 'Gate 01 — Main Entrance',
    timestamp: 'Just now',
    confidence: 98.6,
  },
  {
    id: 'ALPR-902',
    plateNumber: 'CA-884-M91',
    state: 'California',
    vehicleType: 'Freightliner Logistics Semi',
    driverName: 'Global Freight Logistics',
    accessStatus: 'contractor',
    clearanceLevel: 'Loading Bay 02 Only',
    lastSeenLocation: 'Bay 02 — Logistics Inbound',
    timestamp: '2 mins ago',
    confidence: 96.2,
  },
  {
    id: 'ALPR-903',
    plateNumber: 'NV-109-XYZ',
    state: 'Nevada',
    vehicleType: 'Black Dodge Charger (Unregistered)',
    driverName: 'Unknown Driver',
    accessStatus: 'flagged',
    clearanceLevel: 'RESTRICTED / BOLO ALERT',
    lastSeenLocation: 'Sector 06 — North Perimeter Fence',
    timestamp: '5 mins ago',
    confidence: 94.8,
  },
  {
    id: 'ALPR-904',
    plateNumber: 'TX-331-BBA',
    state: 'Texas',
    vehicleType: 'Toyota Tacoma / Silver',
    driverName: 'Sarah Jenkins (EHS Lead)',
    accessStatus: 'authorized',
    clearanceLevel: 'Executive All Zones',
    lastSeenLocation: 'Gate 01 — Main Entrance',
    timestamp: '12 mins ago',
    confidence: 99.1,
  },
];

export const MOCK_BADGE_LOGS: EmployeeBadgeRecord[] = [
  {
    badgeId: 'EMP-88214',
    employeeName: 'Marcus Vance',
    department: 'Electrical Engineering',
    role: 'Lead Field Engineer',
    clearanceLevel: 'Level 4 (Server Core)',
    ppeCompliance: 'Compliant (Vest + Helmet)',
    accessStatus: 'granted',
    lastScannedGate: 'Turnstile A — Vault Entrance',
    timestamp: 'Just now',
    confidence: 99.4,
  },
  {
    badgeId: 'EMP-55102',
    employeeName: 'David Chen',
    department: 'Logistics Operations',
    role: 'Forklift Operator',
    clearanceLevel: 'Level 2 (Operations)',
    ppeCompliance: 'Compliant (Vest + Helmet)',
    accessStatus: 'granted',
    lastScannedGate: 'Dock Gate 02',
    timestamp: '3 mins ago',
    confidence: 97.8,
  },
  {
    badgeId: 'VIS-00492',
    employeeName: 'Contractor Technician #4',
    department: 'External HVAC Maintenance',
    role: 'Vendor Contractor',
    clearanceLevel: 'Level 1 (General)',
    ppeCompliance: 'Warning (Missing Helmet)',
    accessStatus: 'visitor',
    lastScannedGate: 'Main Lobby Access',
    timestamp: '8 mins ago',
    confidence: 92.1,
  },
];
