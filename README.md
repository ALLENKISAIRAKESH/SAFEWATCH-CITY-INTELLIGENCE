# SIH 26127 — SafeWatch City Intelligence
## AI-Powered Multi-Camera ANPR, Vehicle Trajectory & Urban Traffic Platform

[![Smart India Hackathon](https://img.shields.io/badge/SIH-26127-orange)](https://www.sih.gov.in/)
[![React](https://img.shields.io/badge/React-18.3-blue)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.11+-yellow)](https://python.org/)
[![License](https://img.shields.io/badge/License-MIT-lightgrey)](LICENSE)

---

## 1. Problem Statement Overview (SIH26127)

Urban traffic management and law enforcement require automated, high-precision computer vision systems capable of extracting vehicle identities across distributed city camera networks. This platform delivers a production-grade solution solving:

1. **High-Accuracy ANPR/OCR**: Real-time vehicle detection, Indian HSRP plate segmentation, morphological enhancement, and multi-frame OCR consensus gating.
2. **Multi-Camera Vehicle Tracking & Re-ID**: Single-camera ByteTrack spatial-temporal tracking combined with 512-dimensional appearance feature extraction for disjoint camera re-identification.
3. **Spatial-Temporal Trajectory Reconstruction**: Chronological journey reconstruction mapping vehicle movements across cameras with travel durations, average speeds, and GIS map route rendering.
4. **City-Wide Traffic Analytics & OD Flow Matrix**: Real-time vehicle density heatmaps, congestion bottleneck alerts, camera-to-camera hourly flow rates, and Origin-Destination (OD) trip matrices.
5. **Real-Time Watchlist & Hotlist Alerts**: Live matching against Stolen, Wanted, Prohibited, and VIP vehicle registries with instant audible voice sirens and law enforcement dispatch.
6. **Route Plausibility & Anomaly Detection**: Graph topology velocity analysis detecting impossible travel times (teleportation/speeding) and cloned/spoofed license plates.
7. **Empirical Model Benchmarking**: Defensible ANPR performance metrics tracking Character Error Rate (CER), Word Error Rate (WER), inference latency (ms), and frame throughput (FPS) across models.

---

## 2. End-to-End Pipeline Architecture

```
City Camera Network (RTSP / CCTV / Video Streams)
                  │
                  ▼
         Vehicle Detection (YOLOv8)
                  │
                  ▼
     Vehicle Tracking (ByteTrack Single-Camera)
                  │
                  ▼
     License Plate Localization (ANPR Detector)
                  │
                  ▼
     Image Enhancement & Perspective Rectification
                  │
                  ▼
     Optical Character Recognition (EasyOCR / CRNN)
                  │
                  ▼
   Indian Plate Validation & State Code Normalization
                  │
                  ▼
       Multi-Frame OCR Consensus Buffer
                  │
                  ▼
     Cross-Camera Association & Appearance Re-ID
                  │
                  ▼
       Trajectory Reconstruction Engine
                  │
  ┌───────────────┼────────────────────────┐
  ▼               ▼                        ▼
GIS Route     Urban Traffic Flow       Law Enforcement
Playback      & OD Matrix Engine       Watchlists & Alerts
```

---

## 3. Core Problem Statement Modules

| Module | Route | Functionality |
| :--- | :--- | :--- |
| **Mission Control** | `/` | Real-time vehicle telemetry, active license plates, active hotlist alerts, network speed, and city camera map. |
| **Live ANPR Stream** | `/live-anpr` | Real-time vehicle bounding boxes, license plate detection, Indian plate OCR, multi-frame consensus status, and live sighting cards. |
| **Vehicle Search & Journey** | `/search` | Search by license plate (exact or fuzzy), camera/time filters, chronological sighting timeline, and GIS trajectory route playback. |
| **Cross-Camera Association** | `/associations` | Camera network topology graph, spatial-temporal transition probabilities, visual Re-ID similarity matrix, and identity graphs. |
| **Watchlists & Hotlist Alerts** | `/watchlists` | Management of stolen, wanted, expired, and blacklisted vehicles with instant audible alerts, evidence snapshots, and dispatch workflows. |
| **Urban Traffic Analytics** | `/traffic` | Density heatmaps, congestion bottleneck indicators, camera-to-camera flow volume, and Origin-Destination (OD) matrix. |
| **Route Anomaly Alerts** | `/anomalies` | Velocity violations, impossible travel times between cameras, unexpected detours, and cloned plate alerts. |
| **ANPR Evaluation & Benchmarks** | `/evaluation` | Measured Character Error Rate (CER), Word Error Rate (WER), OCR precision/recall, latency per frame (ms), and model comparisons. |
| **Traffic Camera Network** | `/cameras` | Node registry, RTSP stream URLs, GPS coordinates, road names, cardinal directions, and ANPR vision engine assignments. |
| **Evidence Vault** | `/evidence` | Forensic vehicle snapshots, plate crops, timestamped video clips, and SHA-256 tamper-evident metadata. |
| **Audit Trail** | `/audit-logs` | Immutable audit ledger of license plate searches, alert actions, and operator activities. |
| **Pipeline Settings** | `/settings` | OCR confidence thresholds, Indian state code regex rules, frame sampling rates, and data retention policies. |

---

## 4. Setup & Running Locally

### Backend Setup (Python 3.11+)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Or .venv\Scripts\activate on Windows
pip install -r requirements.txt
python backend.py
```

The backend server runs on `http://localhost:5000` with WebSocket support on port `5000`.

### Frontend Setup (Node.js 18+)

```bash
cd frontend
npm install
npm run dev
```

The frontend application runs on `http://localhost:8080` (or Vite assigned port).

### Running City Traffic Simulation

In a separate terminal while the backend is running:

```bash
python backend/demo_city_simulation.py --duration 120 --host http://localhost:5000
```

---

## 5. Indian License Plate Standard Alignment

The system strictly normalizes and validates Indian vehicle registration marks according to the Central Motor Vehicles Rules (CMVR):
- **Format**: `^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}$`
- **Supported State & UT Codes**: MH, DL, KA, HR, UP, TN, GJ, WB, TS, AP, KL, RJ, MP, PB, CH, and others.
- **Consensus Requirement**: Multi-frame consensus buffers require consistent character voting before a sighting is confirmed to achieve high recognition confidence without single-frame artifacts.
