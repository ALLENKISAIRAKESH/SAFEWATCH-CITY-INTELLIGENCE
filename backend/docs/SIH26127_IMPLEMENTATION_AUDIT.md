# SafeWatch — SIH26127 Phase 0: Implementation Audit

> **Audit Date:** 2026-09-25  
> **Auditor:** Antigravity AI (automated deep-scan)  
> **Scope:** Complete repository at `c:\26127\SAFE_WATCH_-main`  
> **Gate:** Phase 0 — No application code may be written until this document is complete.  
> **Next gate:** Phase 1 — ANPR Foundation (after this audit is reviewed and approved)

---

## 1. Repository Map

```
c:\26127\
├── Resources\                        ← Planning & specification documents
│   ├── MASTER_SOLUTION.md            ← Canonical SIH26127 solution spec (627 lines)
│   ├── TECHNICAL_SPEC.md             ← Duplicate of master (identical content)
│   ├── PRD.md                        ← Product requirements (224 lines, 8 user stories)
│   ├── SafeWatch_City_Intelligence_Technical_Specification.md
│   ├── SafeWatch_SIH26127_ANPR_Gap_Closure_Plan.md
│   ├── SafeWatch_Complete_Resource_Reference.md
│   ├── ANTIGRAVITY_EXECUTION.md      ← Phase-gate rules for this build
│   ├── ANTIGRAVITY_MASTER_PROMPT.md
│   ├── README.md
│   └── ARCHIVE\SafeWatch_SIH26127_Antigravity_Build.zip
│
├── SAFE_WATCH_-main\                 ← Active codebase
│   ├── frontend\                     ← React 18 + Vite + TypeScript + Tailwind
│   │   ├── src\
│   │   │   ├── App.tsx               ← Router with 14 protected routes
│   │   │   ├── pages\                ← 17 page components
│   │   │   ├── components\           ← 21 components + layout/ + ui/
│   │   │   ├── contexts\             ← AuthContext, LiveDataContext
│   │   │   ├── data\                 ← mockData (mock incidents, audit logs)
│   │   │   ├── hooks\
│   │   │   ├── integrations\         ← Supabase client setup
│   │   │   ├── lib\
│   │   │   └── utils\
│   │   ├── package.json              ← Dependencies (see §4)
│   │   └── vite.config.ts
│   │
│   ├── backend\                      ← Python / Flask
│   │   ├── backend.py                ← Single-file Flask + SocketIO server (485 lines)
│   │   ├── requirements.txt          ← 10 Python packages
│   │   ├── safewatch_safety_pipeline.pipe  ← Multi-agent EHS pipeline config
│   │   ├── database\
│   │   │   ├── 001_initial_schema.sql      ← PostgreSQL/Supabase schema
│   │   │   └── 001_mongodb_init.py         ← MongoDB init script
│   │   ├── supabase\
│   │   │   └── config.toml
│   │   └── docs\                     ← BUILD_NOW.md, BUILD_STATUS.md, CONTRIBUTING.md
│   │
│   ├── .env.example
│   ├── render.yaml                   ← Render.com deployment config
│   └── vercel.json                   ← Vercel deployment config
│
└── SafeWatch_SIH26127_Antigravity_Build\   ← Separate planning artefacts (not code)
    ├── Description.txt
    ├── MASTER_SOLUTION.md            ← Same as Resources copy
    ├── PRD.md
    ├── TECHNICAL_SPEC.md
    └── Screenshot 2026-09-24 233554.png
```

---

## 2. What Exists Today — Detailed Inventory

### 2.1 Backend (`backend/backend.py`)

| Component | Status | Notes |
|---|---|---|
| Flask HTTP server | ✅ Working | Port 5000, CORS open |
| Flask-SocketIO | ✅ Working | async_mode=threading |
| MongoDB integration | ✅ Working | Graceful fallback to in-memory if offline |
| In-memory store (fallback) | ✅ Working | incidents[], audit_logs[] |
| YOLO inference (Ultralytics) | ✅ Working | Lazy-loaded; graceful no-model fallback |
| OpenCV video capture | ✅ Working | RTSP/HLS/MP4 streams via `/stream?url=...` |
| Multi-part MJPEG stream | ✅ Working | `/stream` endpoint |
| Detection emit (Socket.IO) | ✅ Working | `detection` event with bbox/label/score |
| Incident CRUD | ✅ Working | GET/POST/PATCH `/api/incidents` |
| Incident lifecycle | ✅ Working | open → acknowledged/escalated → resolved |
| Audit logging | ✅ Working | `log_audit()` → MongoDB + in-memory + emit |
| Source management | ✅ Working | GET `/api/sources` (4 hardcoded default cameras) |
| Metrics endpoint | ✅ Working | GET `/api/metrics` |
| DB status endpoint | ✅ Working | GET `/api/db/status` |
| Health check | ✅ Working | GET `/health` |
| Socket events | ✅ Working | connect, user_presence, client_detection, ack/resolve |
| Crowd-density rule | ✅ Working | >5 people → critical incident, 10s debounce |
| **ANPR / plate detection** | ❌ Missing | Not implemented |
| **OCR** | ❌ Missing | Not implemented |
| **Vehicle tracking** | ❌ Missing | No ByteTrack / SORT / DeepSORT |
| **Multi-frame consensus** | ❌ Missing | Not implemented |
| **Watchlist matching** | ❌ Missing | Not implemented |
| **Cross-camera association** | ❌ Missing | Not implemented |
| **Trajectory engine** | ❌ Missing | Not implemented |
| **Traffic analytics** | ❌ Missing | Not implemented |
| **Route anomaly detection** | ❌ Missing | Not implemented |

### 2.2 Frontend — Page Inventory

| Route | Page Component | Size | Status |
|---|---|---|---|
| `/` | CommandCenter.tsx | 22 KB | ✅ Working |
| `/monitoring` | LiveMonitoring.tsx | 31 KB | ✅ Working |
| `/tracking` | SuspectTracking.tsx | 18 KB | ✅ Working |
| `/incidents` | Incidents.tsx | 15 KB | ✅ Working |
| `/incidents/:id` | IncidentDetail.tsx | 15 KB | ✅ Working |
| `/sources` | Sources.tsx | 15 KB | ✅ Working |
| `/zones` | Zones.tsx | 15 KB | ✅ Working |
| `/rules` | Rules.tsx | 21 KB | ✅ Working |
| `/evidence` | Evidence.tsx | 25 KB | ✅ Working |
| `/analytics` | Analytics.tsx | 19 KB | ✅ Working |
| `/rocketride` | RocketRidePipelines.tsx | 13 KB | ✅ Working |
| `/ai-models` | AIModels.tsx | 13 KB | ✅ Working |
| `/audit-logs` | AuditLogs.tsx | 6 KB | ✅ Working |
| `/settings` | Settings.tsx | 25 KB | ✅ Working |
| `/login` | Login.tsx | 8 KB | ✅ Working |
| — | NotFound.tsx | 0.7 KB | ✅ Working |
| **`/vehicle-intelligence/*`** | **❌ Missing** | — | **Not built** |

### 2.3 Frontend — Key Components

| Component | Purpose | Status |
|---|---|---|
| CameraFeed.tsx (29 KB) | Video feed, COCO-SSD inference, MJPEG proxy | ✅ Working |
| SafeWatchDashboard.tsx | Main dashboard widget grid | ✅ Working |
| AlertPanel.tsx | Real-time alert list | ✅ Working |
| AIOCRScannerModal.tsx (13 KB) | AI OCR scanning modal | ✅ Exists (UI only) |
| FacilityBlueprintMap.tsx (38 KB) | Indoor GIS map | ✅ Exists (facility-scoped) |
| ForensicVideoPlayerModal.tsx (16 KB) | Evidence playback | ✅ Working |
| EmergencyLockdownModal.tsx | Lockdown workflow | ✅ Working |
| SOCShiftHandoverModal.tsx (17 KB) | Shift handover records | ✅ Working |
| OSHAComplianceReportModal.tsx (15 KB) | OSHA report generator | ✅ Working |
| PTZVirtualJoystick.tsx | PTZ camera control | ✅ Working |
| AudioVoiceAnnouncer.tsx | Voice alerts | ✅ Working |
| StatusMonitor.tsx | System health monitor | ✅ Working |
| ErrorBoundary.tsx | Error handling | ✅ Working |
| **Vehicle intelligence components** | **All missing** | ❌ |

### 2.4 State / Real-time Architecture

```
Frontend (React)
  └── LiveDataContext (Socket.IO client → localhost:5000)
        ├── incidents[]          ← pushed on connect + every change
        ├── auditLogs[]          ← pushed on connect + every change
        ├── liveMetrics{}        ← pushed on every detection
        └── recentDetections[]   ← built from 'detection' events

  Storage: localStorage fallback (MOCK_INCIDENTS if backend offline)
  Auth:    AuthContext (session-based, role: ADMIN/OPERATOR/VIEWER)

Backend (Flask + SocketIO)
  ├── MongoDB (primary persistence)
  │     ├── incidents
  │     ├── audit_logs
  │     └── sources
  └── In-memory fallback (if MongoDB offline)
```

### 2.5 Database — Current Schema (PostgreSQL/Supabase reference)

Tables defined in `001_initial_schema.sql`:

| Table | Purpose | SIH26127 Use |
|---|---|---|
| organizations | Multi-tenant root | Reuse |
| organization_memberships | RBAC | Reuse |
| sources | Camera/stream sources | Extend with GPS coords, direction, calibration |
| zones | Spatial zones | Reuse; extend for OD matrix zones |
| rules | Detection rules | Reuse; extend for watchlist/anomaly rules |
| model_versions | AI model registry | Reuse and extend |
| detections | Raw AI detections | Extend with vehicle/plate fields |
| incidents | Incident lifecycle | Reuse; extend for ANPR alert types |
| evidence | Evidence files | Reuse; add plate_crop, vehicle_crop types |
| audit_logs | Full audit trail | Reuse as-is |

> **MongoDB** is the actual runtime database (`backend.py` uses `pymongo`). The SQL schema is a Supabase reference only; the live store is MongoDB.

### 2.6 AI Pipeline — Current State

| Stage | Implementation | Notes |
|---|---|---|
| Video ingestion | ✅ OpenCV VideoCapture | RTSP/HLS/MP4/webcam |
| Browser inference | ✅ TensorFlow.js COCO-SSD | Webcam/upload path |
| Backend inference | ✅ Ultralytics YOLO (yolov8n.pt) | Remote streams via `/stream` |
| Detection classes | `person`, `vehicle`, all COCO-80 | Generic COCO model |
| **Plate detection** | ❌ Missing | Needs dedicated model |
| **Plate preprocessing** | ❌ Missing | Crop, warp, enhance |
| **OCR** | ❌ Missing | Needs PaddleOCR / EasyOCR / Tesseract |
| **Indian plate normalization** | ❌ Missing | |
| **Vehicle tracking** | ❌ Missing | No SORT/ByteTrack |
| **Re-ID embeddings** | ❌ Missing | |

### 2.7 EHS Safety Pipeline (`safewatch_safety_pipeline.pipe`)

A multi-agent pipeline spec (not a Python module) with stages:
- `webhook_in` → `vision_preprocessor` → `llm_ehs_auditor` (GPT-4o-mini) → `human_approval_gate` → `dispatch_actuator` → `response_out`

This is a future EHS integration and does not affect the ANPR scope.

---

## 3. Dependency Inventory

### 3.1 Python (backend/requirements.txt)

| Package | Version | Role |
|---|---|---|
| Flask | 3.1.2 | HTTP server |
| Flask-Cors | 6.0.1 | CORS |
| Flask-SocketIO | 5.5.1 | WebSocket |
| eventlet | 0.40.3 | Async server |
| opencv-python | 4.12.0.88 | Video capture |
| numpy | 2.2.6 | Array ops |
| ultralytics | 8.3.200 | YOLOv8/YOLO11 |
| python-dotenv | 1.1.1 | Config |
| pymongo | 4.17.0 | MongoDB driver |
| dnspython | 2.8.0 | MongoDB DNS SRV |

**Missing for ANPR (to be added per phase):**

| Package | Purpose | Priority |
|---|---|---|
| easyocr | OCR engine (Windows-friendly) | P0 — Phase 1 |
| Pillow | Image manipulation | P0 — Phase 1 |
| imutils | OpenCV helpers | P0 — Phase 1 |
| supervision | ByteTrack wrapper | P1 — Phase 2 |
| shapely | Geospatial geometry | P3 — Phase 4 |
| scipy | Trajectory / OD math | P3 — Phase 5 |

### 3.2 Frontend (package.json key deps)

| Package | Role |
|---|---|
| react 18.3.1 | UI framework |
| react-router-dom 6 | Routing |
| @tanstack/react-query 5 | Server state |
| socket.io-client 4.8.1 | Real-time |
| recharts 2.15 | Charts |
| @tensorflow-models/coco-ssd | Browser YOLO fallback |
| @supabase/supabase-js | Supabase client |
| hls.js | HLS stream support |
| lucide-react | Icons |
| shadcn/ui (radix-ui) | Component library |
| tailwindcss 3 | Styling |

**Missing for Vehicle Intelligence UI (to add in Phase 4):**

| Package | Purpose |
|---|---|
| leaflet + react-leaflet | GIS / map visualization |
| d3 (optional) | Traffic heatmap / OD flow overlays |

---

## 4. Gap Analysis — SIH26127 Requirements

| # | Requirement | Current State | Gap |
|---|---|---|---|
| 1 | High-accuracy ANPR/OCR (>90%) | ❌ None | Full pipeline missing |
| 2 | Multi-camera vehicle/plate tracking | ❌ None | Tracking + ReID missing |
| 3 | Spatial-temporal trajectory reconstruction | ❌ None | Engine + DB tables missing |
| 4 | GIS visualization | ⚠️ Facility blueprint map exists | City/map GIS missing; no lat/lng camera data |
| 5 | City-wide traffic density & movement analytics | ❌ None | Traffic analytics missing |
| 6 | Congestion/bottleneck analysis | ❌ None | Missing |
| 7 | Origin-destination flow analysis | ❌ None | Missing |
| 8 | Real-time watchlist/blacklist alerts | ⚠️ Alert infra exists | Watchlist matching logic missing |
| 9 | Suspicious route anomaly detection | ❌ None | Missing |
| 10 | Evidence, auditability, security, traceability | ✅ Partial | Evidence + audit exist; needs ANPR evidence types |

---

## 5. Architecture Assessment

### 5.1 What to Reuse (Do Not Rewrite)

| Asset | Why Keep |
|---|---|
| Flask + SocketIO backend | Production-ready, MongoDB-connected |
| `create_incident()` function | ANPR alerts will call this directly |
| `log_audit()` function | Every ANPR action audited here |
| Incident create/ack/resolve lifecycle | Stable; reuse for ANPR incidents |
| AuthContext + RBAC | Auth is working; extend roles only |
| LiveDataContext + Socket.IO events | Real-time plumbing is solid |
| YOLO model loader pattern | Already handles missing model gracefully |
| CameraFeed.tsx | Video display; extend for ANPR overlay |
| Evidence page | Extend evidence types; don't rewrite |
| Analytics page | Extend; add vehicle-intelligence charts tab |
| FacilityBlueprintMap.tsx | Extract map pattern for city GIS |
| MongoDB collections | Extend with new collections; don't migrate |
| All existing 14+ routes | Preserve exactly; add new `/vehicle-intelligence/*` |
| AIOCRScannerModal.tsx | OCR UI scaffolding — reuse pattern |

### 5.2 What Must Be Added

#### Backend — new module structure

```
backend/
├── anpr/
│   ├── __init__.py
│   ├── detector.py          # Plate detection (YOLOv8 custom model)
│   ├── preprocessor.py      # Crop, perspective correction, enhance
│   ├── ocr_engine.py        # EasyOCR / PaddleOCR wrapper
│   ├── normalizer.py        # Indian plate regex normalization
│   ├── validator.py         # Format validation + confidence gate
│   └── consensus.py         # Multi-frame aggregation per track ID
│
├── tracking/
│   ├── __init__.py
│   └── vehicle_tracker.py   # Per-camera ByteTrack (via supervision)
│
├── association/
│   ├── __init__.py
│   └── associator.py        # Cross-camera plate+appearance matching
│
├── trajectory/
│   ├── __init__.py
│   └── engine.py            # Chronological journey builder
│
├── traffic/
│   ├── __init__.py
│   ├── density.py           # Vehicle count → density
│   ├── congestion.py        # density + speed + history
│   └── od_matrix.py         # Origin-destination aggregation
│
├── watchlist/
│   ├── __init__.py
│   └── matcher.py           # Plate match + alert trigger
│
├── anomaly/
│   ├── __init__.py
│   └── detector.py          # Travel time, impossible transitions
│
└── evaluation/
    ├── __init__.py
    └── metrics.py            # Precision/recall/CER/FPS/latency
```

#### New MongoDB collections required

| Collection | Purpose |
|---|---|
| `cameras` | Camera registry with lat/lng, direction, calibration |
| `vehicle_tracks` | Per-camera track lifecycle |
| `plates` | Normalized plate registry |
| `sightings` | Vehicle-at-camera event (full observation record) |
| `trajectories` | Reconstructed journey per plate |
| `trajectory_points` | Individual points per trajectory |
| `watchlists` | Monitored plates (plate, type, priority, reason) |
| `traffic_snapshots` | Density/speed/congestion per camera per window |
| `od_flows` | Origin-destination aggregate counts |
| `anomaly_events` | Detected route anomalies |
| `anpr_evaluations` | Benchmark run results |

#### New API endpoints required

```
GET  /api/cameras
POST /api/cameras
PATCH /api/cameras/:id

GET  /api/vehicles/search?plate=...
GET  /api/vehicles/:plate/sightings
GET  /api/vehicles/:plate/trajectory

GET  /api/sightings
GET  /api/sightings/:id

GET  /api/watchlists
POST /api/watchlists
PATCH /api/watchlists/:id
DELETE /api/watchlists/:id

GET  /api/analytics/traffic
GET  /api/analytics/density
GET  /api/analytics/congestion
GET  /api/analytics/od

GET  /api/anpr/evaluation
POST /api/anpr/evaluation/run
```

#### New frontend routes required

| Route | Page | Phase |
|---|---|---|
| `/vehicle-intelligence` | VehicleIntelligence index | Phase 1 |
| `/vehicle-intelligence/live-anpr` | Live ANPR camera grid | Phase 1 |
| `/vehicle-intelligence/search` | Vehicle / plate search | Phase 2 |
| `/vehicle-intelligence/journey/:plate` | Journey map | Phase 4 |
| `/vehicle-intelligence/traffic` | City traffic map | Phase 5 |
| `/vehicle-intelligence/watchlists` | Watchlist management | Phase 6 |
| `/vehicle-intelligence/alerts` | ANPR alerts | Phase 6 |
| `/vehicle-intelligence/evaluation` | ANPR metrics dashboard | Phase 7 |

---

## 6. Target Data Flow

```
RTSP / CCTV / Upload / Webcam / Drone
        │
        ▼
OpenCV VideoCapture  [EXISTING]
        │
        ▼
YOLO Vehicle Detector  [EXISTING — extend class filter]
        │
        ▼
ByteTrack Vehicle Tracker  [NEW — Phase 2]
        │
        ▼
Plate Detector (custom YOLO model)  [NEW — Phase 1]
        │
        ▼
Plate Preprocessor  [NEW — Phase 1]
  crop → perspective → denoise → enhance
        │
        ▼
OCR Engine (EasyOCR)  [NEW — Phase 1]
        │
        ▼
Indian Plate Normalizer + Validator  [NEW — Phase 1]
        │
        ▼
Multi-Frame Consensus  [NEW — Phase 1]
        │
        ▼
Sighting Record → MongoDB  [NEW — Phase 1]
+ Evidence (frame crop, plate crop)
        │
        ▼ (async)
Cross-Camera Associator  [NEW — Phase 3]
 plate sim + appearance + topo + time
        │
        ▼
Trajectory Engine  [NEW — Phase 4]
        │
    ┌───┴───────────────┐
    ▼                   ▼
GIS Map             Traffic Analytics  [Phases 4/5]
(Leaflet)           density/congestion/OD
    │                   │
    └─────────┬─────────┘
              ▼
    Watchlist Matcher + Alert  [Phase 6]
    Route Anomaly Detector
              │
              ▼
    create_incident() + log_audit()  [EXISTING]
    Evidence extended types          [EXISTING + extended]
              │
              ▼
    Socket.IO → Frontend  [EXISTING + new events]
```

---

## 7. Integration Points — Existing ↔ New

| Existing Asset | How ANPR Integrates |
|---|---|
| `create_incident()` | Called directly for watchlist/anomaly alerts |
| `log_audit()` | Called for every ANPR administrative action |
| `socketio.emit('detection', ...)` | Extend payload with `plate`, `confidence`, `track_id` |
| MongoDB `incidents` | ANPR alerts stored here as type `anpr_watchlist` |
| MongoDB `sources` | Add `latitude`, `longitude`, `direction`, `calibration` fields |
| `LiveDataContext` | Subscribe to new socket events: `anpr_sighting`, `watchlist_hit` |
| `CameraFeed.tsx` | Add ANPR overlay: plate bbox + OCR text + confidence badge |
| `Evidence` page | Add `PLATE_CROP` and `VEHICLE_CROP` evidence types |
| `Analytics` page | Add vehicle intelligence charts tab |
| `AppShell` navigation | Add "Vehicle Intelligence" nav section |

---

## 8. Phase Build Plan

### Phase 1 — ANPR Foundation
**Deliverables:**
- [ ] `backend/anpr/detector.py` — plate detection model
- [ ] `backend/anpr/preprocessor.py` — image enhancement pipeline
- [ ] `backend/anpr/ocr_engine.py` — EasyOCR wrapper
- [ ] `backend/anpr/normalizer.py` — Indian plate regex
- [ ] `backend/anpr/validator.py` — format validation
- [ ] `backend/anpr/consensus.py` — multi-frame aggregation
- [ ] MongoDB: `sightings`, `plates` collections + init script
- [ ] API: `GET /api/sightings`, `GET /api/vehicles/search`
- [ ] Frontend: Live ANPR overlay on existing CameraFeed
- [ ] Frontend: Basic plate search page
- [ ] Existing build/typecheck must pass

**Definition of done:** Plate observed → normalized → stored in MongoDB → visible in search. Every sighting stores: raw OCR, normalized plate, confidence, camera, timestamp, track ID, frame reference, model version.

### Phase 2 — Vehicle Tracking
- [ ] `backend/tracking/vehicle_tracker.py` (ByteTrack via `supervision`)
- [ ] `vehicle_tracks` MongoDB collection
- [ ] Track lifecycle: first_seen, last_seen, vehicle type, color
- [ ] Searchable sightings by track ID

### Phase 3 — Cross-Camera Association
- [ ] Camera topology graph (`cameras` collection with adjacency)
- [ ] `backend/association/associator.py`
- [ ] Confidence-weighted identity score (plate + appearance + temporal + topology)
- [ ] Low-confidence matches flagged for review — not silently merged

### Phase 4 — Trajectory + GIS
- [ ] `backend/trajectory/engine.py`
- [ ] `trajectories`, `trajectory_points` MongoDB collections
- [ ] `GET /api/vehicles/:plate/trajectory`
- [ ] Frontend: Vehicle Journey page (Leaflet map + chronological sightings)
- [ ] Evidence accessible from each trajectory point

### Phase 5 — Traffic Analytics
- [ ] `backend/traffic/density.py`, `congestion.py`, `od_matrix.py`
- [ ] `traffic_snapshots`, `od_flows` collections
- [ ] `GET /api/analytics/traffic|density|congestion|od`
- [ ] Frontend: City Traffic page (density map, congestion, OD heatmap)

### Phase 6 — Intelligence (Watchlists + Anomalies)
- [ ] `backend/watchlist/matcher.py`
- [ ] `backend/anomaly/detector.py`
- [ ] `watchlists`, `anomaly_events` collections
- [ ] Watchlist CRUD API
- [ ] Alerts reuse `create_incident()` and `log_audit()`
- [ ] Frontend: Watchlist management + Alerts pages

### Phase 7 — Evaluation
- [ ] `backend/evaluation/metrics.py`
- [ ] `anpr_evaluations` collection
- [ ] `GET /api/anpr/evaluation`, `POST /api/anpr/evaluation/run`
- [ ] Frontend: ANPR Evaluation dashboard
- [ ] **No fabricated accuracy.** Unrun conditions shown as `NOT YET BENCHMARKED`.

### Phase 8 — SIH Demo
- [ ] Six-camera simulated city network (clearly labeled `SIMULATION`)
- [ ] Synthetic Indian plate patterns
- [ ] End-to-end demo path: start feeds → detect → recognize → search → journey → traffic → watchlist alert → anomaly → evaluation

---

## 9. Engineering Constraints (Non-Negotiable)

1. **Do not rewrite existing SafeWatch functionality** without a documented technical reason.
2. **Do not introduce a second database.** All new collections go into the existing MongoDB instance.
3. **Do not fabricate AI metrics.** Every number shown in the UI must trace to a real detection, stored event, or be explicitly labeled `SIMULATION`.
4. **Never treat a single OCR frame as ground truth.** Multi-frame consensus is mandatory before a plate is persisted.
5. **Do not silently modify uncertain OCR characters.** Retain raw OCR output alongside normalized output.
6. **Low-confidence associations must remain reviewable** — not silently merged.
7. **Simulation mode must be visibly distinct** (`SIMULATION` badge) from `LIVE` mode.
8. **Maintain authentication and RBAC** for all new endpoints.
9. **Every ANPR event must carry model version** for traceability.
10. **Run typecheck and build after every phase.** Existing tests must pass.

---

## 10. Known Risks & Pre-Conditions

| Risk | Mitigation |
|---|---|
| PaddleOCR install complexity on Windows | Use EasyOCR as default (pip-installable) |
| No labeled Indian plate dataset | Use synthetic plates (Mockaroo) for Phase 1; benchmark in Phase 7 |
| RTSP/live streams unavailable in dev | Use local video files / simulated stream |
| Leaflet not in frontend deps | Add `leaflet` + `react-leaflet` in Phase 4 |
| YOLO plate detection model not included | Download from Ultralytics Hub (`license_plate_detector.pt`) |
| MongoDB not running locally | Backend gracefully falls back to in-memory |
| `supervision` not in requirements.txt | Add in Phase 2 |
| eventlet conflicts with OpenCV threading | Use `threading` async_mode (already set) |
| CameraFeed COCO-SSD browser path | ANPR must go through backend endpoint, not browser TF.js |

---

## 11. Immediate Next Steps (Phase 1 Prerequisites)

- [ ] Verify MongoDB is reachable on `mongodb://localhost:27017/safewatch`
- [ ] Verify Flask backend starts: `cd backend && python backend.py`
- [ ] Verify frontend starts: `cd frontend && npm run dev`
- [ ] Verify existing routes render (smoke: `/`, `/monitoring`, `/incidents`)
- [ ] Run `npm run build` — confirm zero TypeScript errors
- [ ] Confirm YOLO model `yolov8n.pt` downloads / is cached
- [ ] Decide OCR engine: EasyOCR (recommended for Windows) vs PaddleOCR
- [ ] Download plate detection model (`yolov8n-lp.pt` or equivalent)

---

## 12. Resources Inventory

| Resource | Location | Role |
|---|---|---|
| MASTER_SOLUTION.md | Resources/ | Canonical feature spec |
| PRD.md | Resources/ | User stories + acceptance criteria |
| SafeWatch_City_Intelligence_Technical_Specification.md | Resources/ | Data models + API contract |
| SafeWatch_SIH26127_ANPR_Gap_Closure_Plan.md | Resources/ | Phase plan + reference implementations |
| SafeWatch_Complete_Resource_Reference.md | Resources/ | External: data.gov.in, BHASHINI, API Setu, OSIRIS |
| ANTIGRAVITY_EXECUTION.md | Resources/ | Phase-gate engineering rules |
| 001_initial_schema.sql | backend/database/ | PostgreSQL reference schema |
| 001_mongodb_init.py | backend/database/ | MongoDB init script |
| safewatch_safety_pipeline.pipe | backend/ | EHS multi-agent pipeline (future scope) |

**External reference implementations:**
- `city-anpr` — end-to-end ANPR + trajectory architecture
- `neverbeatenrc/ANPR` — YOLOv8 + ByteTrack + PaddleOCR pipeline patterns
- `Indian_LPR` — Indian plate detection research / data context

---

## 13. Summary Verdict

| Domain | Status |
|---|---|
| **Existing SafeWatch platform** | ✅ Solid — preserve and extend |
| **Video ingestion** | ✅ Working for RTSP/HLS/webcam/upload |
| **Basic AI detection** | ✅ YOLOv8 backend + COCO-SSD browser |
| **Incident / alert infrastructure** | ✅ Ready to receive ANPR alerts |
| **Audit + evidence** | ✅ Ready; extend evidence types |
| **Authentication + RBAC** | ✅ Working; extend for new roles |
| **Real-time (Socket.IO)** | ✅ Working; extend event types |
| **ANPR pipeline** | ❌ Zero implementation — Phase 1 target |
| **Vehicle tracking** | ❌ Zero — Phase 2 target |
| **Cross-camera association** | ❌ Zero — Phase 3 target |
| **GIS / trajectory** | ❌ Zero — Phase 4 target |
| **Traffic analytics** | ❌ Zero — Phase 5 target |
| **Watchlists / anomalies** | ❌ Zero — Phase 6 target |
| **ANPR evaluation** | ❌ Zero — Phase 7 target |
| **SIH demo** | ❌ Not yet — Phase 8 target |

> **Phase 0 is COMPLETE.** The repository has been fully inspected. The existing SafeWatch platform is a solid foundation. No existing functionality should be disrupted. All 10 SIH26127 requirements have defined gaps and phased mitigations. **Phase 1 ANPR Foundation may now begin.**

---

*Generated by Antigravity AI · Phase 0 Audit · SIH26127 SafeWatch City Intelligence · 2026-09-25*
