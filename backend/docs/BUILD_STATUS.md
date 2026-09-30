# SafeWatch — SIH26127 Build Sprint Status

## MVP scope
Webcam/upload → detection → rule → incident → alert → evidence → dashboard.

## Existing SafeWatch assets (preserved)
- React/Vite dashboard (all 17+ routes)
- Browser COCO-SSD inference for webcam/upload
- Flask + Socket.IO + OpenCV + YOLO backend for remote streams
- Alert acknowledgement UI
- Incident lifecycle, audit logs, evidence capture
- Authentication + RBAC

## SIH26127 Vehicle Intelligence — Phase Completion

| Phase | Feature | Backend | Frontend | Status |
|-------|---------|---------|----------|--------|
| 0 | Repository Audit | docs/SIH26127_IMPLEMENTATION_AUDIT.md | — | ✅ COMPLETE |
| 1 | ANPR Foundation | anpr/{detector,preprocessor,ocr_engine,normalizer,validator,consensus}.py | LiveANPR.tsx | ✅ COMPLETE |
| 1 | Vehicle Search | /api/vehicles/search, /api/sightings | VehicleSearch.tsx | ✅ COMPLETE |
| 2 | Vehicle Tracking | tracking/vehicle_tracker.py (ByteTrack + IoU fallback) | — (integrated in stream) | ✅ COMPLETE |
| 3 | Cross-Camera Association | association/associator.py | CrossCameraAssociation.tsx | ✅ COMPLETE |
| 4 | Trajectory Engine | trajectory/engine.py | VehicleSearch.tsx (timeline) | ✅ COMPLETE |
| 5 | Traffic Analytics | traffic/{density,congestion,od_matrix}.py | TrafficAnalytics.tsx | ✅ COMPLETE |
| 6 | Watchlist Matching | watchlist/matcher.py | Watchlists.tsx | ✅ COMPLETE |
| 6 | Anomaly Detection | anomaly/detector.py | AnomalyAlerts.tsx | ✅ COMPLETE |
| 7 | ANPR Evaluation | evaluation/metrics.py | ANPREvaluation.tsx | ✅ COMPLETE |
| 8 | SIH Demo Simulation | demo_city_simulation.py (6-cam city) | VehicleIntelligence.tsx (hub) | ✅ COMPLETE |

## Key Backend Endpoints

### ANPR (Phase 1)
- `GET  /api/anpr/status` — pipeline health + model version
- `GET  /api/sightings` — recent confirmed sightings (filterable)
- `GET  /api/vehicles/search?plate=MH12` — plate prefix search
- `GET  /api/vehicles/<plate>/sightings` — all sightings for a plate
- `POST /api/anpr/simulate` — inject a synthetic sighting (demo/test)

### Tracking (Phase 2)
- `GET  /api/tracking/status` — active tracks per camera

### Association (Phase 3)
- `GET  /api/associations` — association log (filterable by decision/plate)
- `GET  /api/associations/stats` — decision counts + avg identity score
- `GET  /api/cameras` — camera registry + topology
- `POST /api/cameras` — register a camera node
- `POST /api/cameras/<id>/edges` — add topology edge

### Trajectory (Phase 4)
- `GET  /api/vehicles/<plate>/trajectory` — chronological journey

### Traffic Analytics (Phase 5)
- `GET  /api/analytics/traffic` — full snapshot (density + OD)
- `GET  /api/analytics/density` — per-camera vehicle counts
- `GET  /api/analytics/congestion` — congestion scores + bottlenecks
- `GET  /api/analytics/od` — origin-destination flow matrix
- `GET  /api/analytics/bottlenecks` — congested camera list

### Watchlists + Anomalies (Phase 6)
- `GET/POST /api/watchlists` — list / add entries
- `PATCH    /api/watchlists/<id>` — update entry
- `DELETE   /api/watchlists/<id>` — remove entry
- `GET  /api/anomalies` — route anomaly events (filterable)
- `GET  /api/anomalies/stats` — summary statistics
- `PATCH    /api/anomalies/<id>` — resolve anomaly

### Evaluation (Phase 7)
- `GET  /api/anpr/evaluation` — runs + live metrics
- `POST /api/anpr/evaluation/run` — start a benchmark run

### Capabilities
- `GET  /api/capabilities` — which modules are loaded/available

## Start — Full Stack

```bash
# Backend
cd backend
pip install -r requirements.txt
python backend.py

# Frontend (separate terminal)
cd frontend
npm install
npm run dev

# Phase 8 Demo Simulation (separate terminal, while backend is running)
cd backend
python demo_city_simulation.py --duration 120
```

## Phase 8 Demo Path (SIH Presentation)

1. Start backend: `python backend.py`
2. Start frontend: `npm run dev`
3. Open browser → http://localhost:5173
4. Navigate to **Vehicle Intelligence** in sidebar
5. Run: `python demo_city_simulation.py --duration 180`
6. Demo sequence:
   - **Live ANPR** → watch sightings feed in real time
   - **Vehicle Search** → search `MH12` → view trajectory timeline
   - **Cross-Camera Associations** → view graph decisions (confirmed/review)
   - **Watchlists** → see stolen vehicle alerts auto-created as incidents
   - **Anomaly Alerts** → impossible transition anomaly fires after ~2 min
   - **Traffic Analytics** → density, congestion, OD flow matrix
   - **ANPR Evaluation** → start a benchmark run (shows NOT YET BENCHMARKED until data exists)

## Socket.IO Real-time Events
All modules emit live events that frontend pages subscribe to:
- `anpr_sighting` — new confirmed plate reading
- `anpr_association` — cross-camera link computed
- `watchlist_hit` — stolen/wanted vehicle detected
- `anpr_anomaly` — route anomaly fired
- `incident_created` — incident auto-generated (watchlist/anomaly)
- `detection` — YOLO person/vehicle detections from stream

## Engineering Rules (Non-negotiable)
- No fabricated metrics — all data traces to real detections or is labeled `SIMULATION`
- Multi-frame consensus mandatory before plate is persisted
- Low-confidence associations remain in review queue — not silently merged
- Simulation badge always visible in demo mode
- Authentication and RBAC maintained for all new endpoints
- Model version attached to every ANPR event for traceability

## Claims policy
Do not put accuracy, latency, partnerships, pilots, or deployment numbers
in the pitch unless measured and evidenced. Phase 7 evaluation will show
`NOT YET BENCHMARKED` for unrun conditions — this is intentional and honest.
