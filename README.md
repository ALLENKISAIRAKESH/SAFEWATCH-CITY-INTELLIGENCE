# SafeWatch — Enterprise AI Security Operations Center

**Real-time AI vision surveillance platform with polygon safety zone intrusion detection, forensic evidence capture, and MongoDB persistence.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Online-brightgreen)](https://nextwave-x-openai-swf.onrender.com)
[![React](https://img.shields.io/badge/React-18.3-blue)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.11+-yellow)](https://python.org/)
[![License](https://img.shields.io/badge/License-MIT-lightgrey)](LICENSE)

---

## Live Demo

**Platform:** [https://nextwave-x-openai-swf.onrender.com](https://nextwave-x-openai-swf.onrender.com)

---

## Overview

SafeWatch is a full-stack Security Operations Center (SOC) platform designed for mission-critical environments — industrial facilities, corporate campuses, and perimeter security. It integrates browser-side TensorFlow.js inference (COCO-SSD) and server-side YOLOv8 computer vision into a single unified dashboard, with real-time WebSocket synchronization across all connected operators.

Key capabilities:
- **Dual AI inference** — Browser WASM (COCO-SSD) and Python backend (YOLOv8n) running in parallel
- **Polygon safety zones** — Draw custom multi-point zones on live feeds; ray-casting algorithm detects intrusions in real time
- **Multi-grid camera layouts** — Switch between 1×1, 2×2, and 3×3 camera grids without page reload
- **Forensic evidence capture** — One-click HD snapshots with JSON dossier export
- **SHA-256 audit ledger** — Cryptographically chained, tamper-evident SOC audit log (SOC-2 Type II aligned)
- **MongoDB persistence** — All incidents, zones, sources, and audit logs persisted; graceful in-memory fallback
- **Real-time WebSocket events** — Socket.IO pushes detections, incidents, and metrics to all connected clients

---

## System Architecture

```
Camera Feeds (Webcam / RTSP / CCTV)
        │
        ├──► Browser (TensorFlow.js / COCO-SSD)
        │           │
        └──► Python Backend (YOLOv8 / Flask / OpenCV)
                    │
              Socket.IO + REST API
                    │
              MongoDB (safewatch DB)
                    │
        ┌───────────┼───────────────────┐
   Command      Incidents         Evidence
   Center        Queue             Archive
   /monitoring  /analytics        /audit-logs
```

---

## Project Structure

```
SafeWatch/
├── src/
│   ├── components/               # Reusable UI components
│   │   ├── CameraFeed.tsx        # WebRTC + AI detection canvas overlay
│   │   ├── FacilityBlueprintMap.tsx
│   │   ├── AlertPanel.tsx
│   │   ├── AIOCRScannerModal.tsx
│   │   ├── EmergencyLockdownModal.tsx
│   │   ├── ForensicVideoPlayerModal.tsx
│   │   ├── SOCShiftHandoverModal.tsx
│   │   ├── PTZVirtualJoystick.tsx
│   │   ├── AudioVoiceAnnouncer.tsx
│   │   └── layout/               # AppShell, Sidebar, Header
│   ├── pages/                    # Route-level page components
│   │   ├── CommandCenter.tsx     # /
│   │   ├── LiveMonitoring.tsx    # /monitoring
│   │   ├── Incidents.tsx         # /incidents
│   │   ├── IncidentDetail.tsx    # /incidents/:id
│   │   ├── Evidence.tsx          # /evidence
│   │   ├── Zones.tsx             # /zones
│   │   ├── Rules.tsx             # /rules
│   │   ├── Sources.tsx           # /sources
│   │   ├── Analytics.tsx         # /analytics
│   │   ├── AIModels.tsx          # /ai-models
│   │   ├── AuditLogs.tsx         # /audit-logs
│   │   ├── SuspectTracking.tsx   # /tracking
│   │   └── Settings.tsx          # /settings
│   ├── contexts/
│   │   ├── LiveDataContext.tsx   # Global Socket.IO + AI state
│   │   └── AuthContext.tsx
│   ├── hooks/
│   ├── utils/
│   └── integrations/
├── database/
│   └── 001_mongodb_init.py       # Schema and index seeder
├── pipelines/                    # AI inference pipeline configs
├── docs/
├── backend.py                    # Flask + Socket.IO + YOLOv8 + MongoDB
├── backend_requirements.txt
├── render.yaml                   # Render.com deployment blueprint
├── vercel.json                   # Vercel SPA routing rules
├── .env.example
├── package.json
├── vite.config.ts
└── tailwind.config.ts
```

---

## Platform Modules

| Route | Module | Description |
|---|---|---|
| `/` | Command Center | Live camera feed, AI detection overlay, KPI widgets, alert queue, operator presence |
| `/monitoring` | Live Monitoring | Polygon zone drawing, multi-grid layout (1×1 / 2×2 / 3×3), evidence capture, audio siren |
| `/incidents` | Incidents Queue | Filterable incident table, manual dispatch, CSV export |
| `/incidents/:id` | Incident Dossier | Acknowledge / Escalate / Resolve workflow, investigation notes, PDF export |
| `/zones` | Safety Zones | 2D floor plan radar, zone creator, camera assignments |
| `/rules` | Alert Rules | Custom trigger builder, severity levels (Critical / High / Medium / Low) |
| `/sources` | Camera Sources | Camera lifecycle management, stream diagnostic, power toggles |
| `/evidence` | Evidence Archive | HD snapshot viewer, download, JSON dossier export |
| `/analytics` | Analytics | Time horizons (24h / 7d / 30d / 90d), resolution SLA, report export |
| `/ai-models` | AI Models | YOLO deployment switcher, benchmark, confidence/IoU threshold sliders |
| `/tracking` | Suspect Tracking | Person re-identification, cross-camera movement timeline |
| `/audit-logs` | Audit Logs | SHA-256 tamper-evident ledger, CSV export |
| `/settings` | Settings | MongoDB connection tester, system backup export, webhooks |

---

## Getting Started

### Prerequisites

- Node.js v18+
- Python 3.10+
- MongoDB (local at `mongodb://localhost:27017` or Atlas URI)

### 1. Clone

```bash
git clone https://github.com/ALLENKISAIRAKESH/SAFE_WATCH_.git
cd SAFE_WATCH_
```

### 2. Environment Setup

```bash
cp .env.example .env
```

Edit `.env`:

```env
MONGODB_URI=mongodb://localhost:27017/safewatch
VITE_API_URL=http://localhost:5000
OPENAI_API_KEY=           # Optional
```

### 3. Frontend

```bash
npm install
npm run dev
# Runs at http://localhost:8081
```

### 4. Backend

```bash
python -m venv .venv

# Windows
.\.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate

pip install -r backend_requirements.txt
python backend.py
# API at http://localhost:5000
```

### 5. Seed Database

```bash
python database/001_mongodb_init.py
```

### 6. Production Build

```bash
npm run build
npm run preview
```

---

## API Reference

**Base URL**
- Production: `https://nextwave-x-openai-swf.onrender.com`
- Local: `http://localhost:5000`

### REST Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Service heartbeat, AI status, DB status |
| `GET` | `/api/db/status` | MongoDB connection health and collections |
| `GET` | `/api/incidents` | List all incidents |
| `POST` | `/api/incidents` | Create a new incident |
| `PATCH` | `/api/incidents/:id` | Update incident status |
| `GET` | `/api/sources` | List camera sources |
| `GET` | `/api/audit-logs` | Retrieve audit ledger |
| `GET` | `/api/metrics` | Live KPI metrics |
| `GET` | `/stream?url=<RTSP>` | MJPEG proxy stream with YOLOv8 overlay |

### WebSocket Events (Socket.IO)

| Event | Direction | Description |
|---|---|---|
| `detection` | Server → Client | YOLOv8 bounding boxes and risk level per frame |
| `incident_created` | Server → Client | New incident broadcast |
| `incidents_list` | Server → Client | Full incident array sync |
| `metrics_update` | Server → Client | Live KPI update |
| `audit_log` | Server → Client | New audit entry |
| `client_detection` | Client → Server | Browser COCO-SSD detection data |
| `user_presence` | Client → Server | Operator session heartbeat |
| `action_acknowledge_incident` | Client → Server | Acknowledge an incident |
| `action_resolve_incident` | Client → Server | Resolve an incident |

---

## Technology Stack

### Frontend

| Technology | Role |
|---|---|
| React 18 + TypeScript | UI framework |
| Vite 5 | Build tooling |
| TailwindCSS + shadcn/ui | Design system |
| TensorFlow.js + COCO-SSD | In-browser AI detection |
| Socket.IO Client | Real-time WebSocket communication |
| React Router v6 | Client-side routing |
| Recharts | Data visualization |
| TanStack Query | Server state management |

### Backend

| Technology | Role |
|---|---|
| Python 3.11 | Server runtime |
| Flask + Flask-SocketIO | REST API and WebSocket server |
| Ultralytics YOLOv8n | Server-side computer vision |
| OpenCV | Video stream capture and processing |
| PyMongo | MongoDB driver |
| Flask-CORS | Cross-origin handling |

### Infrastructure

| Technology | Role |
|---|---|
| MongoDB | Primary database |
| Render.com | Full-stack cloud deployment |
| Vercel | Frontend CDN option |

---

## Deployment

### Render (Recommended)

The [`render.yaml`](render.yaml) blueprint deploys both frontend and backend in one step:

1. Fork this repository
2. Connect your GitHub account at [render.com](https://render.com)
3. Create a **New Blueprint** → select this repo
4. Render auto-detects `render.yaml` and provisions both services

### Vercel (Frontend Only)

```bash
npm i -g vercel
vercel --prod
```

The [`vercel.json`](vercel.json) includes SPA rewrite rules for React Router.

---

## Security

| Control | Implementation |
|---|---|
| SOC-2 Type II Alignment | SHA-256 cryptographic chaining on all audit records |
| RBAC | Separate `Admin` and `Operator` roles with enforced access |
| Edge Privacy | Video frames processed locally via WebAssembly — no unauthorized streaming |
| Encrypted Transport | All production traffic served over HTTPS / WSS |

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit using conventional commits: `git commit -m "feat: description"`
4. Push and open a Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full contribution guide.

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

*Built for HackITx MRDU Hackathon*
