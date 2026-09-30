// src/data/alprBadgeData.ts
// Pure ANPR License Plate Verification Store (SIH26127 Indian Plate Standard)

export interface LicensePlateRecord {
  id: string;
  plateNumber: string;
  state: string;
  vehicleType: string;
  vehicleCategory: 'Car' | 'SUV' | 'Commercial Truck' | 'Bus' | 'Two-Wheeler' | 'Auto-Rickshaw';
  accessStatus: 'clear' | 'monitored' | 'hotlist_stolen' | 'denied_commercial';
  watchlistStatus: string;
  lastSeenLocation: string;
  timestamp: string;
  confidence: number;
}

export const MOCK_ALPR_LOGS: LicensePlateRecord[] = [
  {
    id: 'ANPR-101',
    plateNumber: 'MH12DE1433',
    state: 'Maharashtra',
    vehicleType: 'White Hyundai Creta',
    vehicleCategory: 'SUV',
    accessStatus: 'hotlist_stolen',
    watchlistStatus: 'POLICE BOLO / STOLEN REPORTED',
    lastSeenLocation: 'Camera 02 — Ring Road Flyover (Eastbound)',
    timestamp: 'Just now',
    confidence: 96.4,
  },
  {
    id: 'ANPR-102',
    plateNumber: 'DL01CA9999',
    state: 'Delhi NCR',
    vehicleType: 'Silver Honda City',
    vehicleCategory: 'Car',
    accessStatus: 'monitored',
    watchlistStatus: 'FLAGGED / IMPOSSIBLE SPEED ANOMALY',
    lastSeenLocation: 'Camera 03 — Outer Expressway Toll Plaza',
    timestamp: '1 min ago',
    confidence: 94.8,
  },
  {
    id: 'ANPR-103',
    plateNumber: 'KA05MH7890',
    state: 'Karnataka',
    vehicleType: 'Tata Prima Multi-Axle Freight',
    vehicleCategory: 'Commercial Truck',
    accessStatus: 'denied_commercial',
    watchlistStatus: 'PROHIBITED DAYTIME TRANSIT',
    lastSeenLocation: 'Camera 04 — Downtown Terminal Crossing',
    timestamp: '5 mins ago',
    confidence: 98.1,
  },
  {
    id: 'ANPR-104',
    plateNumber: 'HR26DQ5555',
    state: 'Haryana',
    vehicleType: 'Black BMW 330i',
    vehicleCategory: 'Car',
    accessStatus: 'monitored',
    watchlistStatus: 'SPEEDING INFRACTION RECORDED',
    lastSeenLocation: 'Camera 03 — Outer Expressway Toll Plaza',
    timestamp: '12 mins ago',
    confidence: 97.5,
  },
  {
    id: 'ANPR-105',
    plateNumber: 'UP16AB2020',
    state: 'Uttar Pradesh',
    vehicleType: 'Red Maruti Suzuki Swift',
    vehicleCategory: 'Car',
    accessStatus: 'clear',
    watchlistStatus: 'VERIFIED TRANSIT — CLEAR',
    lastSeenLocation: 'Camera 06 — Airport Flyover Approach',
    timestamp: '18 mins ago',
    confidence: 99.2,
  },
  {
    id: 'ANPR-106',
    plateNumber: 'TN09AZ4321',
    state: 'Tamil Nadu',
    vehicleType: 'Bajaj RE Compact 4S',
    vehicleCategory: 'Auto-Rickshaw',
    accessStatus: 'clear',
    watchlistStatus: 'REGISTERED TAXI TRANSIT',
    lastSeenLocation: 'Camera 01 — MG Road Junction',
    timestamp: '25 mins ago',
    confidence: 93.6,
  },
];
