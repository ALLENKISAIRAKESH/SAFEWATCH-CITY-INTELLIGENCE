import os
import time
import uuid
from datetime import datetime, timezone
from threading import Lock
from urllib.parse import unquote

import cv2
from flask import Flask, jsonify, request, Response, stream_with_context
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from dotenv import load_dotenv

# Load shared .env from project root (one level up from backend/), then
# optionally overlay with a backend-local .env for environment-specific overrides.
_root_env = os.path.join(os.path.dirname(__file__), '..', '.env')
load_dotenv(dotenv_path=_root_env)
load_dotenv()  # also load backend/.env if present (overrides root)

try:
    from ultralytics import YOLO
except Exception:
    YOLO = None

# ─── ANPR Pipeline (SIH26127 Phase 1) ────────────────────────────────────
try:
    from anpr.detector import process_frame as anpr_process_frame, model_version as anpr_model_version
    from anpr.consensus import add_observation_and_check, flush_stale_buffers, ConsensusResult
    _anpr_enabled = True
    print('[INFO] ANPR pipeline loaded successfully')
except Exception as _anpr_err:
    _anpr_enabled = False
    print(f'[WARN] ANPR pipeline unavailable: {_anpr_err}')
    def anpr_process_frame(*a, **kw): return []
    def add_observation_and_check(*a, **kw): return None
    def flush_stale_buffers(): return 0
    def anpr_model_version(): return 'unavailable'

# ─── Vehicle Tracking (SIH26127 Phase 2) ─────────────────────────────────
try:
    from tracking.vehicle_tracker import update_tracks, get_active_tracks, get_track_count
    _tracking_enabled = True
    print('[INFO] Vehicle tracking module loaded')
except Exception as _trk_err:
    _tracking_enabled = False
    print(f'[WARN] Vehicle tracking unavailable: {_trk_err}')

# ─── Watchlist Matching (SIH26127 Phase 6) ────────────────────────────────
try:
    from watchlist import matcher as watchlist_matcher
    _watchlist_enabled = True
    print('[INFO] Watchlist module loaded')
except Exception as _wl_err:
    _watchlist_enabled = False
    print(f'[WARN] Watchlist module unavailable: {_wl_err}')

# ─── Trajectory Engine (SIH26127 Phase 4) ────────────────────────────────
try:
    from trajectory.engine import build_trajectory_from_db, get_trajectory, build_trajectory
    _trajectory_enabled = True
    print('[INFO] Trajectory engine loaded')
except Exception as _traj_err:
    _trajectory_enabled = False
    print(f'[WARN] Trajectory engine unavailable: {_traj_err}')

# ─── Traffic Analytics (SIH26127 Phase 5) ────────────────────────────────
try:
    from traffic.density import compute_all_densities, record_vehicle_event, get_density_history
    from traffic.congestion import analyze_all_congestion, get_bottlenecks
    from traffic.od_matrix import compute_od_matrix, record_plate_at_camera, get_top_flows
    _traffic_enabled = True
    print('[INFO] Traffic analytics module loaded')
except Exception as _traffic_err:
    _traffic_enabled = False
    print(f'[WARN] Traffic analytics unavailable: {_traffic_err}')

# ─── Anomaly Detection (SIH26127 Phase 6) ────────────────────────────────
try:
    from anomaly.detector import record_transition, get_anomaly_events, get_anomaly_stats, resolve_anomaly, persist_event, set_camera_travel_time
    _anomaly_enabled = True
    print('[INFO] Anomaly detection module loaded')
except Exception as _anom_err:
    _anomaly_enabled = False
    print(f'[WARN] Anomaly detection unavailable: {_anom_err}')

# ─── ANPR Evaluation (SIH26127 Phase 7) ──────────────────────────────────
try:
    from evaluation.metrics import (
        get_evaluation_runs, get_live_metrics as eval_live_metrics,
        start_evaluation, complete_evaluation, record_frame_latency,
    )
    _evaluation_enabled = True
    print('[INFO] ANPR evaluation module loaded')
except Exception as _eval_err:
    _evaluation_enabled = False
    print(f'[WARN] ANPR evaluation unavailable: {_eval_err}')

# ─── Cross-Camera Association (SIH26127 Phase 3) ──────────────────────────
try:
    from association.associator import (
        associate_sighting, compute_association, register_camera, add_camera_edge,
        load_topology_from_db, get_camera_registry, get_association_log,
        get_association_stats, persist_association, persist_camera,
        CameraNode,
    )
    _association_enabled = True
    print('[INFO] Cross-camera association module loaded')
except Exception as _assoc_err:
    _association_enabled = False
    print(f'[WARN] Cross-camera association unavailable: {_assoc_err}')


# ─── MongoDB Initialization ──────────────────────────────────────────────
MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/safewatch')
MONGO_DB_NAME = os.getenv('MONGO_DB_NAME', 'safewatch')
mongo_db = None
mongo_connected = False

try:
    from pymongo import MongoClient
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=2000)
    client.server_info()
    mongo_db = client[MONGO_DB_NAME]
    mongo_connected = True
    print(f'[INFO] MongoDB connected successfully to {MONGO_URI} (DB: {MONGO_DB_NAME})')
except Exception as exc:
    print(f'[WARN] MongoDB offline or unreachable ({exc}). Falling back to resilient in-memory store.')

# Initialize Camera Topology for Phase 3 & Phase 6
if _association_enabled:
    if mongo_connected and mongo_db is not None:
        load_topology_from_db(mongo_db)
    if not get_camera_registry():
        register_camera('cam-01', name='Camera 01 — MG Road Junction (Northbound)', latitude=28.6139, longitude=77.2090, direction='N', location_desc='MG Road Main Junction')
        register_camera('cam-02', name='Camera 02 — Ring Road Flyover (Eastbound)', latitude=28.6180, longitude=77.2020, direction='E', location_desc='Ring Road Flyover Portal')
        register_camera('cam-03', name='Camera 03 — Outer Expressway Toll Plaza', latitude=28.6200, longitude=77.2120, direction='NE', location_desc='Outer Expressway Speed Toll')
        register_camera('cam-04', name='Camera 04 — Downtown Terminal Crossing', latitude=28.6080, longitude=77.2060, direction='S', location_desc='Downtown Terminal Hub')
        register_camera('cam-05', name='Camera 05 — Industrial Corridor Gate', latitude=28.6160, longitude=77.2200, direction='SE', location_desc='Industrial Commercial Sector')
        register_camera('cam-06', name='Camera 06 — Airport Flyover Approach', latitude=28.6220, longitude=77.1980, direction='NW', location_desc='Airport Inbound Flyover')
        add_camera_edge('cam-01', 'cam-02', min_travel_time_sec=45.0)
        add_camera_edge('cam-01', 'cam-03', min_travel_time_sec=60.0)
        add_camera_edge('cam-02', 'cam-06', min_travel_time_sec=35.0)
        add_camera_edge('cam-02', 'cam-04', min_travel_time_sec=90.0)
        add_camera_edge('cam-03', 'cam-05', min_travel_time_sec=75.0)
        add_camera_edge('cam-04', 'cam-05', min_travel_time_sec=50.0)
        if _anomaly_enabled:
            set_camera_travel_time('cam-01', 'cam-02', 45.0)
            set_camera_travel_time('cam-01', 'cam-03', 60.0)
            set_camera_travel_time('cam-02', 'cam-06', 35.0)
            set_camera_travel_time('cam-02', 'cam-04', 90.0)
            set_camera_travel_time('cam-03', 'cam-05', 75.0)
            set_camera_travel_time('cam-04', 'cam-05', 50.0)

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('BACKEND_SECRET', 'change-me')
CORS(app, resources={r'/*': {'origins': '*'}})
socketio = SocketIO(app, cors_allowed_origins='*', async_mode='threading')

MODEL_PATH = os.getenv('YOLO_MODEL', 'yolov8n.pt')
CONFIDENCE_THRESHOLD = float(os.getenv('CONFIDENCE_THRESHOLD', '0.50'))
model = None
if YOLO is not None:
    try:
        model = YOLO(MODEL_PATH)
        print(f'[INFO] YOLO model loaded from {MODEL_PATH}')
    except Exception as exc:
        print(f'[WARN] YOLO model unavailable: {exc}')

store_lock = Lock()
sources = {
    'cam-01': {'id': 'cam-01', 'name': 'Camera 01 — MG Road Junction (Northbound)', 'type': 'Junction ANPR Camera', 'location': 'MG Road Junction', 'status': 'online', 'fps': 30, 'latency': 28, 'aiModel': 'ANPR Indian Plate OCR Engine v2.4'},
    'cam-02': {'id': 'cam-02', 'name': 'Camera 02 — Ring Road Flyover (Eastbound)', 'type': 'Overhead Gantry', 'location': 'Ring Road Flyover', 'status': 'online', 'fps': 30, 'latency': 32, 'aiModel': 'ANPR Indian Plate OCR Engine v2.4'},
    'cam-03': {'id': 'cam-03', 'name': 'Camera 03 — Outer Expressway Toll Plaza', 'type': 'Highway Speed Trap', 'location': 'Outer Expressway Gate', 'status': 'online', 'fps': 60, 'latency': 22, 'aiModel': 'High-Speed Highway ANPR v3.1'},
    'cam-04': {'id': 'cam-04', 'name': 'Camera 04 — Downtown Terminal Crossing', 'type': 'PTZ Traffic Dome', 'location': 'Downtown Terminal', 'status': 'online', 'fps': 25, 'latency': 45, 'aiModel': 'Vehicle Flow & ANPR Tracker v2.0'},
    'cam-05': {'id': 'cam-05', 'name': 'Camera 05 — Industrial Corridor Gate', 'type': 'Toll Booth Sensor', 'location': 'Industrial Corridor', 'status': 'online', 'fps': 20, 'latency': 40, 'aiModel': 'Heavy Vehicle Classifier v2.1'},
    'cam-06': {'id': 'cam-06', 'name': 'Camera 06 — Airport Flyover Approach', 'type': 'Overhead Gantry', 'location': 'Airport Approach', 'status': 'online', 'fps': 30, 'latency': 30, 'aiModel': 'ANPR Indian Plate OCR Engine v2.4'},
}

# ─── ANPR in-memory stores (fallback when MongoDB offline) ────────────────
# sightings: confirmed consensus plate sightings
_sightings: list[dict] = []
# plates: known normalized plate registry (deduped)
_plates: dict[str, dict] = {}  # normalized_plate → plate record
_anpr_lock = Lock()

incidents = [
    {
        'id': 'INC-1042',
        'title': 'Stolen Vehicle Hotlist Hit: MH12DE1433',
        'severity': 'critical',
        'source': 'Camera 02 — Ring Road Flyover (Eastbound)',
        'rule': 'Stolen Vehicle Hotlist Match',
        'detectedAt': datetime.now(timezone.utc).isoformat(),
        'status': 'open',
        'assignedTo': None,
        'trackId': '#TRK-4402',
        'duration': '18 sec',
        'description': 'Vehicle with plate MH12DE1433 flagged as STOLEN matched with 96.4% OCR consensus confidence.',
        'evidenceId': 'EVD-0031',
        'zone': 'Ring Road Corridor',
    },
    {
        'id': 'INC-1041',
        'title': 'Impossible Travel Time Anomaly: DL01CA9999',
        'severity': 'high',
        'source': 'Camera 03 — Outer Expressway Toll Plaza',
        'rule': 'Velocity & Plausibility Violation',
        'detectedAt': datetime.now(timezone.utc).isoformat(),
        'status': 'acknowledged',
        'assignedTo': 'Jordan Chen',
        'trackId': '#TRK-8819',
        'duration': '2 min 10 sec',
        'description': 'Plate DL01CA9999 observed traversing 8.4 km between Cam-01 and Cam-03 in 18s (expected >180s). Possible cloned plate or extreme speed.',
        'evidenceId': 'EVD-0030',
        'zone': 'Expressway Outer Sector',
    },
]

audit_logs = [
    {'id': 'log-001', 'timestamp': datetime.now(timezone.utc).isoformat(), 'actor': 'System', 'action': 'System Initialized (SIH26127 ANPR Ready)', 'resource': 'SafeWatch City Intelligence Engine', 'ip': '127.0.0.1', 'result': 'success'},
]

# Load existing data from MongoDB on boot if available
if mongo_connected and mongo_db is not None:
    try:
        db_incidents = list(mongo_db.incidents.find({}, {'_id': 0}).sort('detectedAt', -1).limit(50))
        if db_incidents:
            incidents = db_incidents
            print(f'[INFO] Loaded {len(db_incidents)} incidents from MongoDB.')
        db_logs = list(mongo_db.audit_logs.find({}, {'_id': 0}).sort('timestamp', -1).limit(50))
        if db_logs:
            audit_logs = db_logs
            print(f'[INFO] Loaded {len(db_logs)} audit logs from MongoDB.')
        # Ensure ANPR collections and indexes exist
        mongo_db.plates.create_index('normalized_plate', unique=True, background=True)
        mongo_db.sightings.create_index([('normalized_plate', 1), ('timestamp', -1)], background=True)
        mongo_db.sightings.create_index([('camera_id', 1), ('timestamp', -1)], background=True)
        print('[INFO] ANPR MongoDB collections/indexes ready.')
    except Exception as exc:
        print(f'[WARN] Failed reading from MongoDB: {exc}')

active_sessions = {}
live_metrics = {
    'vehicleCount': 148,
    'peopleCount': 0,
    'activePlatesCount': 84,
    'congestionLevel': 'normal',
    'riskLevel': 'low',
    'activeSourcesCount': len(sources),
    'totalIncidentsCount': len(incidents),
    'activeOperators': [],
    'database': 'MongoDB' if mongo_connected else 'Memory (MongoDB Ready)',
}



def now_iso():
    return datetime.now(timezone.utc).isoformat()


def log_audit(actor, action, resource, ip='127.0.0.1', result='success'):
    entry = {
        'id': f'log-{uuid.uuid4().hex[:6]}',
        'timestamp': now_iso(),
        'actor': actor or 'System',
        'action': action,
        'resource': resource,
        'ip': ip,
        'result': result,
    }
    with store_lock:
        audit_logs.insert(0, entry)
        del audit_logs[100:]
    
    if mongo_connected and mongo_db is not None:
        try:
            mongo_db.audit_logs.insert_one(entry.copy())
        except Exception as exc:
            print(f'[WARN] MongoDB audit insert failed: {exc}')

    socketio.emit('audit_log', entry)
    return entry


def create_incident(source_url, title, severity, description, rule='Custom Rule', metadata=None, zone='General Zone'):
    incident = {
        'id': f'INC-{uuid.uuid4().hex[:4].upper()}',
        'source': source_url or 'Live Camera Feed',
        'title': title,
        'severity': severity.lower(),
        'status': 'open',
        'rule': rule,
        'detectedAt': now_iso(),
        'assignedTo': None,
        'trackId': f'#{uuid.uuid4().hex[:3]}',
        'duration': '10 sec',
        'description': description,
        'evidenceId': f'EVD-{uuid.uuid4().hex[:4].upper()}',
        'zone': zone,
        'metadata': metadata or {},
    }
    with store_lock:
        incidents.insert(0, incident)
        del incidents[100:]
        live_metrics['totalIncidentsCount'] = len(incidents)
    
    if mongo_connected and mongo_db is not None:
        try:
            mongo_db.incidents.insert_one(incident.copy())
        except Exception as exc:
            print(f'[WARN] MongoDB incident insert failed: {exc}')

    log_audit('AI Engine', f'Incident Generated: {title}', incident['id'])
    socketio.emit('incident_created', incident)
    socketio.emit('incidents_list', incidents)
    return incident



def detect(frame):
    if model is None:
        return []
    try:
        result = model(frame, verbose=False)[0]
        detections = []
        for box in result.boxes:
            conf = float(box.conf[0])
            if conf < CONFIDENCE_THRESHOLD:
                continue
            cls_id = int(box.cls[0])
            name = result.names.get(cls_id, str(cls_id))
            x1, y1, x2, y2 = [float(v) for v in box.xyxy[0].tolist()]
            detections.append({
                'bbox': [x1, y1, x2 - x1, y2 - y1],
                'label': name,
                'score': conf,
            })
        return detections
    except Exception as exc:
        print(f'[WARN] inference failed: {exc}')
        return []


def _persist_sighting(consensus, camera_id: str) -> dict:
    """
    Persist a confirmed consensus plate sighting and run the full
    intelligence pipeline:
      Phase 1 — store sighting + plate record
      Phase 3 — cross-camera association
      Phase 5 — traffic density event
      Phase 6 — watchlist matching + anomaly detection
    """
    sighting_id = f'SIG-{uuid.uuid4().hex[:8].upper()}'
    supporting = consensus.supporting_observations
    best_obs = max(supporting, key=lambda o: o.ocr_confidence) if supporting else None

    sighting = {
        'id': sighting_id,
        'normalized_plate': consensus.plate,
        'raw_ocr': best_obs.raw_ocr if best_obs else '',
        'camera_id': camera_id,
        'timestamp': now_iso(),
        'timestamp_epoch': time.time(),
        'plate_confidence': consensus.consensus_confidence,
        'ocr_confidence': best_obs.ocr_confidence if best_obs else 0.0,
        'validation_status': best_obs.validation_status if best_obs else 'unknown',
        'track_id': best_obs.track_id if best_obs else '',
        'observation_count': consensus.observation_count,
        'disagreement_count': consensus.disagreement_count,
        'frame_reference': best_obs.frame_reference if best_obs else None,
        'model_version': anpr_model_version(),
        'ocr_engine': best_obs.ocr_engine if best_obs else 'unknown',
        'consensus_reason': consensus.reason,
        'simulated': ':SIM' in (anpr_model_version() or ''),
        'associations': [],          # filled by Phase 3 below
        'watchlist_hit': None,       # filled by Phase 6 below
        'anomaly_id': None,          # filled by Phase 6 below
    }

    with _anpr_lock:
        _sightings.insert(0, sighting)
        del _sightings[500:]  # rolling window
        plate_key = consensus.plate
        if plate_key not in _plates:
            _plates[plate_key] = {
                'normalized_plate': plate_key,
                'first_seen': sighting['timestamp'],
                'last_seen': sighting['timestamp'],
                'sighting_count': 1,
            }
        else:
            _plates[plate_key]['last_seen'] = sighting['timestamp']
            _plates[plate_key]['sighting_count'] += 1

    if mongo_connected and mongo_db is not None:
        try:
            mongo_db.sightings.insert_one({**sighting, '_id_str': sighting_id})
            mongo_db.plates.update_one(
                {'normalized_plate': consensus.plate},
                {'$set': {'last_seen': sighting['timestamp']},
                 '$inc': {'sighting_count': 1},
                 '$setOnInsert': {'normalized_plate': consensus.plate, 'first_seen': sighting['timestamp']}},
                upsert=True,
            )
        except Exception as exc:
            print(f'[WARN] MongoDB ANPR sighting insert failed: {exc}')

    # ── Phase 3: Cross-Camera Association ────────────────────────────────
    if _association_enabled:
        try:
            with _anpr_lock:
                # Compare against the 100 most recent sightings from OTHER cameras
                candidates = [
                    s for s in _sightings[:100]
                    if s.get('id') != sighting_id
                    and s.get('camera_id') != camera_id
                ]
            assoc_results = associate_sighting(sighting, candidates)
            for ar in assoc_results[:5]:  # keep top 5 associations
                sighting['associations'].append({
                    'id': ar.id,
                    'anchor_camera': ar.anchor_camera,
                    'identity_score': ar.identity_score,
                    'decision': ar.decision,
                })
                if ar.decision in ('confirmed', 'probable') and mongo_connected and mongo_db is not None:
                    persist_association(ar, mongo_db)
                    # Emit association event for review dashboard
                    socketio.emit('anpr_association', ar.to_dict())
        except Exception as assoc_exc:
            print(f'[WARN] Association failed: {assoc_exc}')

    # ── Phase 5: Traffic density recording ───────────────────────────────
    if _traffic_enabled:
        try:
            record_vehicle_event(camera_id, sighting['timestamp_epoch'])
            record_plate_at_camera(consensus.plate, camera_id, sighting['timestamp_epoch'])
        except Exception as traffic_exc:
            print(f'[WARN] Traffic density recording failed: {traffic_exc}')

    # ── Phase 6: Watchlist Matching ───────────────────────────────────────
    if _watchlist_enabled:
        try:
            wl_match = watchlist_matcher.check_plate(
                plate=consensus.plate,
                sighting_id=sighting_id,
                camera_id=camera_id,
                confidence=consensus.consensus_confidence,
            )
            if wl_match:
                sighting['watchlist_hit'] = {
                    'entry_id': wl_match.entry.id,
                    'type': wl_match.entry.type,
                    'priority': wl_match.entry.priority,
                    'reason': wl_match.entry.reason,
                }
                # Trigger incident via existing create_incident() pipeline
                create_incident(
                    source_url=camera_id,
                    title=f'Watchlist Alert: {consensus.plate} — {wl_match.entry.type.upper()}',
                    severity=wl_match.entry.priority,
                    description=(
                        f'Plate {consensus.plate} matched watchlist entry '
                        f'[{wl_match.entry.type.upper()}] at camera {camera_id}. '
                        f'Reason: {wl_match.entry.reason or "N/A"}'
                    ),
                    rule='Watchlist Match',
                    metadata={
                        'plate': consensus.plate,
                        'watchlist_type': wl_match.entry.type,
                        'sighting_id': sighting_id,
                        'camera_id': camera_id,
                    },
                    zone='Vehicle Monitoring',
                )
                socketio.emit('watchlist_hit', {
                    'plate': consensus.plate,
                    'entry': wl_match.entry.to_dict(),
                    'sighting_id': sighting_id,
                    'camera_id': camera_id,
                    'timestamp': sighting['timestamp'],
                })
                log_audit('ANPR Engine', f'Watchlist HIT: {consensus.plate}', sighting_id)
        except Exception as wl_exc:
            print(f'[WARN] Watchlist matching failed: {wl_exc}')

    # ── Phase 6: Anomaly Detection ────────────────────────────────────────
    if _anomaly_enabled:
        try:
            anomaly = record_transition(
                plate=consensus.plate,
                camera_id=camera_id,
                timestamp_epoch=sighting['timestamp_epoch'],
            )
            if anomaly:
                sighting['anomaly_id'] = anomaly.id
                if mongo_connected and mongo_db is not None:
                    persist_event(anomaly, mongo_db)
                socketio.emit('anpr_anomaly', anomaly.to_dict())
                # Create incident for critical/high anomalies
                if anomaly.severity in ('critical', 'high'):
                    create_incident(
                        source_url=camera_id,
                        title=f'Route Anomaly: {anomaly.plate} — {anomaly.anomaly_type.replace("_", " ").title()}',
                        severity=anomaly.severity,
                        description=anomaly.description,
                        rule='Route Anomaly',
                        metadata={
                            'plate': anomaly.plate,
                            'anomaly_type': anomaly.anomaly_type,
                            'anomaly_id': anomaly.id,
                            'travel_time_sec': anomaly.travel_time_sec,
                        },
                        zone='Vehicle Monitoring',
                    )
        except Exception as anom_exc:
            print(f'[WARN] Anomaly detection failed: {anom_exc}')

    # Real-time emit to frontend
    socketio.emit('anpr_sighting', sighting)
    return sighting




def generate_and_detect(url):
    url = unquote(url)
    cap = cv2.VideoCapture(url)
    if not cap.isOpened():
        print('VideoCapture failed to open:', url)
        return

    last_incident_at = 0.0
    _frame_counter = 0
    _anpr_sample_every = int(os.getenv('ANPR_SAMPLE_EVERY_N_FRAMES', '5'))  # process ANPR every N frames
    camera_id = url  # use URL as camera ID until camera registry is built

    try:
        while True:
            ok, frame = cap.read()
            if not ok or frame is None:
                time.sleep(0.1)
                continue

            _frame_counter += 1
            detections = detect(frame)
            people = [d for d in detections if d['label'] == 'person']
            risk = 'low'
            if len(people) > 5:
                risk = 'critical'
            elif len(people) > 3:
                risk = 'high'
            elif len(people) > 1:
                risk = 'medium'

            # ── ANPR processing (every N frames to manage CPU) ────────────
            anpr_results = []
            if _anpr_enabled and _frame_counter % _anpr_sample_every == 0:
                try:
                    observations = anpr_process_frame(
                        frame,
                        camera_id=camera_id,
                        frame_reference=f'stream:{url}:frame:{_frame_counter}',
                    )
                    for obs in observations:
                        consensus = add_observation_and_check(obs)
                        if consensus:
                            sighting = _persist_sighting(consensus, camera_id)
                            log_audit('ANPR Engine', f'Plate sighted: {consensus.plate}', sighting['id'])
                            anpr_results.append({
                                'plate': consensus.plate,
                                'confidence': consensus.consensus_confidence,
                                'track_id': obs.track_id,
                                'validation': obs.validation_status,
                            })
                    # Periodic cleanup of stale track buffers
                    if _frame_counter % 100 == 0:
                        flush_stale_buffers()
                except Exception as anpr_exc:
                    print(f'[WARN] ANPR frame processing error: {anpr_exc}')
            # ─────────────────────────────────────────────────────────────

            payload = {
                'sourceUrl': url,
                'frameWidth': int(frame.shape[1]),
                'frameHeight': int(frame.shape[0]),
                'detections': detections,
                'peopleCount': len(people),
                'riskLevel': risk,
                'timestamp': now_iso(),
                'anprResults': anpr_results,
                'anprEnabled': _anpr_enabled,
            }
            socketio.emit('detection', payload)

            if len(people) > 5 and time.time() - last_incident_at > 10:
                create_incident(
                    url,
                    'Critical crowd density detected',
                    'critical',
                    f'{len(people)} people detected in remote stream.',
                    rule='Crowd Density',
                    metadata={'peopleCount': len(people)},
                )
                last_incident_at = time.time()

            ret, jpeg = cv2.imencode('.jpg', frame)
            if not ret:
                continue
            yield (
                b'--frame\r\n'
                b'Content-Type: image/jpeg\r\n\r\n' + jpeg.tobytes() + b'\r\n'
            )
    finally:
        cap.release()


# ─── Socket.IO Real-time Events ──────────────────────────────────────────
@socketio.on('connect')
def handle_connect():
    emit('incidents_list', incidents)
    emit('audit_logs_list', audit_logs)
    emit('metrics_update', live_metrics)


@socketio.on('user_presence')
def handle_user_presence(data):
    """Tracks active operator activity and broadcasts to Admin dashboard"""
    user = data.get('user')
    action = data.get('action', 'active')
    if user and 'name' in user:
        active_sessions[user['id']] = {
            'user': user,
            'lastSeen': now_iso(),
            'action': action,
            'source': data.get('source', 'Dashboard'),
        }
        live_metrics['activeOperators'] = list(active_sessions.values())
        socketio.emit('metrics_update', live_metrics)
        if action in ['logged_in', 'live_monitoring_started']:
            log_audit(user['name'], action.replace('_', ' ').title(), data.get('source', 'App'))


@socketio.on('client_detection')
def handle_client_detection(payload):
    """Receives detection updates from browser webcam/uploaded videos and syncs to Admin"""
    people_count = payload.get('peopleCount', 0)
    risk_level = payload.get('riskLevel', 'low')
    source_name = payload.get('sourceName', 'Operator Camera')
    operator_name = payload.get('operatorName', 'Operator')

    live_metrics['peopleCount'] = people_count
    live_metrics['riskLevel'] = risk_level
    socketio.emit('metrics_update', live_metrics)
    socketio.emit('operator_stream_detection', payload)

    # Trigger automatic server incident if critical risk occurs in client feed
    if risk_level == 'critical' and people_count >= 4:
        create_incident(
            source_name,
            f'High Density Warning: {people_count} People Detected',
            'critical',
            f'Operator {operator_name} active feed exceeded threshold with {people_count} detections.',
            rule='Crowd Density',
            metadata=payload,
            zone='Entry Zone',
        )


@socketio.on('action_acknowledge_incident')
def handle_ack(data):
    inc_id = data.get('incidentId')
    actor = data.get('actor', 'Operator')
    with store_lock:
        for inc in incidents:
            if inc['id'] == inc_id:
                inc['status'] = 'acknowledged'
                inc['assignedTo'] = actor
                break
    
    if mongo_connected and mongo_db is not None:
        try:
            mongo_db.incidents.update_one({'id': inc_id}, {'$set': {'status': 'acknowledged', 'assignedTo': actor}})
        except Exception as exc:
            print(f'[WARN] MongoDB update failed: {exc}')

    log_audit(actor, 'Acknowledged Incident', inc_id)
    socketio.emit('incidents_list', incidents)


@socketio.on('action_resolve_incident')
def handle_resolve(data):
    inc_id = data.get('incidentId')
    actor = data.get('actor', 'Operator')
    with store_lock:
        for inc in incidents:
            if inc['id'] == inc_id:
                inc['status'] = 'resolved'
                break
    
    if mongo_connected and mongo_db is not None:
        try:
            mongo_db.incidents.update_one({'id': inc_id}, {'$set': {'status': 'resolved'}})
        except Exception as exc:
            print(f'[WARN] MongoDB resolve update failed: {exc}')

    log_audit(actor, 'Resolved Incident', inc_id)
    socketio.emit('incidents_list', incidents)


# ─── REST API Endpoints ──────────────────────────────────────────────────
@app.get('/health')
def health():
    return jsonify({
        'status': 'ok',
        'database': 'MongoDB' if mongo_connected else 'In-Memory (MongoDB Driver Ready)',
        'ai': 'ready' if model is not None else 'unavailable',
        'timestamp': now_iso()
    })


@app.get('/api/db/status')
def db_status():
    return jsonify({
        'type': 'MongoDB',
        'connected': mongo_connected,
        'database': MONGO_DB_NAME,
        'uri': MONGO_URI.split('@')[-1] if '@' in MONGO_URI else MONGO_URI,
        'collections': ['organizations', 'sources', 'zones', 'rules', 'incidents', 'evidence', 'audit_logs'],
        'timestamp': now_iso()
    })


@app.get('/api/incidents')
def get_incidents():
    if mongo_connected and mongo_db is not None:
        try:
            return jsonify(list(mongo_db.incidents.find({}, {'_id': 0}).sort('detectedAt', -1).limit(100)))
        except Exception:
            pass
    return jsonify(incidents)


@app.post('/api/incidents')
def post_incident():
    data = request.get_json(silent=True) or {}
    inc = create_incident(
        data.get('source', 'Manual Report'),
        data.get('title', 'Manual Incident Alert'),
        data.get('severity', 'high'),
        data.get('description', 'Reported via dashboard interface.'),
        rule=data.get('rule', 'Manual Alert'),
        zone=data.get('zone', 'General Zone'),
    )
    return jsonify(inc), 201


@app.patch('/api/incidents/<incident_id>')
def update_incident(incident_id):
    data = request.get_json(silent=True) or {}
    with store_lock:
        incident = next((x for x in incidents if x['id'] == incident_id), None)
        if not incident:
            return jsonify({'error': 'incident_not_found'}), 404
        status = data.get('status', '').lower()
        if status not in {'open', 'acknowledged', 'escalated', 'resolved'}:
            return jsonify({'error': 'invalid_status'}), 400
        incident['status'] = status
        if data.get('assignedTo'):
            incident['assignedTo'] = data['assignedTo']
    
    if mongo_connected and mongo_db is not None:
        try:
            mongo_db.incidents.update_one({'id': incident_id}, {'$set': {'status': status, 'assignedTo': incident.get('assignedTo')}})
        except Exception:
            pass

    actor = data.get('actor', 'Operator')
    log_audit(actor, f'Updated Incident status to {status.upper()}', incident_id)
    socketio.emit('incidents_list', incidents)
    return jsonify(incident)


@app.get('/api/sources')
def get_sources():
    if mongo_connected and mongo_db is not None:
        try:
            db_sources = list(mongo_db.sources.find({}, {'_id': 0}))
            if db_sources:
                return jsonify(db_sources)
        except Exception:
            pass
    return jsonify(list(sources.values()))


@app.get('/api/audit-logs')
def get_audit_logs():
    if mongo_connected and mongo_db is not None:
        try:
            return jsonify(list(mongo_db.audit_logs.find({}, {'_id': 0}).sort('timestamp', -1).limit(100)))
        except Exception:
            pass
    return jsonify(audit_logs)


@app.get('/api/metrics')
def get_metrics():
    return jsonify(live_metrics)


# ─── ANPR REST Endpoints (SIH26127 Phase 1) ──────────────────────────────

@app.get('/api/vehicles/search')
def search_vehicles():
    """Search sightings by plate number (exact or prefix match)."""
    q = (request.args.get('plate') or '').upper().strip()
    camera = request.args.get('camera', '').strip()
    limit = min(int(request.args.get('limit', 50)), 200)

    if not q:
        return jsonify({'error': 'plate query required'}), 400

    if mongo_connected and mongo_db is not None:
        try:
            mongo_filter = {'normalized_plate': {'$regex': f'^{q}', '$options': 'i'}}
            if camera:
                mongo_filter['camera_id'] = camera
            results = list(
                mongo_db.sightings.find(mongo_filter, {'_id': 0})
                .sort('timestamp_epoch', -1).limit(limit)
            )
            return jsonify(results)
        except Exception:
            pass

    # In-memory fallback
    with _anpr_lock:
        results = [
            s for s in _sightings
            if s.get('normalized_plate', '').startswith(q)
            and (not camera or s.get('camera_id') == camera)
        ][:limit]
    return jsonify(results)


@app.get('/api/vehicles/<plate>/sightings')
def vehicle_sightings(plate: str):
    """Return all sightings for a specific plate."""
    plate = plate.upper().strip()
    limit = min(int(request.args.get('limit', 100)), 500)

    if mongo_connected and mongo_db is not None:
        try:
            results = list(
                mongo_db.sightings.find({'normalized_plate': plate}, {'_id': 0})
                .sort('timestamp_epoch', -1).limit(limit)
            )
            return jsonify(results)
        except Exception:
            pass

    with _anpr_lock:
        results = [s for s in _sightings if s.get('normalized_plate') == plate][:limit]
    return jsonify(results)


@app.get('/api/sightings')
def get_sightings():
    """Return recent sightings with optional camera/plate filter."""
    camera = request.args.get('camera', '').strip()
    plate = (request.args.get('plate') or '').upper().strip()
    limit = min(int(request.args.get('limit', 50)), 200)

    if mongo_connected and mongo_db is not None:
        try:
            mongo_filter = {}
            if camera:
                mongo_filter['camera_id'] = camera
            if plate:
                mongo_filter['normalized_plate'] = {'$regex': f'^{plate}', '$options': 'i'}
            results = list(
                mongo_db.sightings.find(mongo_filter, {'_id': 0})
                .sort('timestamp_epoch', -1).limit(limit)
            )
            return jsonify(results)
        except Exception:
            pass

    with _anpr_lock:
        results = _sightings[:limit]
        if camera:
            results = [s for s in results if s.get('camera_id') == camera]
        if plate:
            results = [s for s in results if s.get('normalized_plate', '').startswith(plate)]
    return jsonify(results[:limit])


@app.get('/api/sightings/<sighting_id>')
def get_sighting(sighting_id: str):
    """Return a single sighting record by ID."""
    if mongo_connected and mongo_db is not None:
        try:
            doc = mongo_db.sightings.find_one({'id': sighting_id}, {'_id': 0})
            if doc:
                return jsonify(doc)
        except Exception:
            pass
    with _anpr_lock:
        match = next((s for s in _sightings if s.get('id') == sighting_id), None)
    if not match:
        return jsonify({'error': 'sighting_not_found'}), 404
    return jsonify(match)


@app.get('/api/anpr/status')
def anpr_status():
    """Return ANPR pipeline status."""
    with _anpr_lock:
        sighting_count = len(_sightings)
        plate_count = len(_plates)
    return jsonify({
        'enabled': _anpr_enabled,
        'model_version': anpr_model_version(),
        'sighting_count': sighting_count,
        'plate_count': plate_count,
        'timestamp': now_iso(),
    })



@app.get('/api/anpr/sightings')
def get_anpr_sightings():
    """Alias for /api/sightings with full filtering."""
    return get_sightings()


@app.post('/api/anpr/simulate')
def simulate_sighting():
    """
    Simulate a vehicle passing a camera node.
    Feeds directly into _persist_sighting() to exercise the complete
    Phase 1–6 intelligence pipeline (Consensus, Tracking, Association,
    Traffic Density, Watchlist matching, and Route Anomaly detection).
    """
    data = request.get_json(silent=True) or {}
    plate = (data.get('plate') or 'MH12AB1234').upper().strip()
    camera_id = data.get('camera_id', 'cam-01')
    confidence = float(data.get('confidence', 0.94))
    validation_status = data.get('validation_status', 'valid')
    vehicle_type = data.get('vehicle_type', 'car')

    class MockObs:
        def __init__(self):
            self.raw_ocr = plate
            self.ocr_confidence = confidence
            self.validation_status = validation_status
            self.track_id = f'TRK-{uuid.uuid4().hex[:6].upper()}'
            self.frame_reference = f'sim:{camera_id}:frame:{int(time.time())}'
            self.ocr_engine = 'PaddleOCR (Simulated)'
            self.vehicle_type = vehicle_type

    mock_obs = MockObs()

    class MockConsensus:
        def __init__(self):
            self.plate = plate
            self.consensus_confidence = confidence
            self.supporting_observations = [mock_obs]
            self.observation_count = int(data.get('observation_count', 4))
            self.disagreement_count = 0
            self.reason = f'Multi-frame simulation: {self.observation_count} frames agree'

    consensus = MockConsensus()
    sighting = _persist_sighting(consensus, camera_id)
    return jsonify({
        'status': 'simulated',
        'sighting': sighting,
    }), 201


@app.route('/stream')
def stream():
    url = request.args.get('url')
    if not url:
        return 'missing url', 400
    return Response(
        stream_with_context(generate_and_detect(url)),
        mimetype='multipart/x-mixed-replace; boundary=frame',
    )


# ─── Watchlist REST Endpoints (SIH26127 Phase 6) ─────────────────────────

@app.get('/api/watchlists')
def get_watchlists():
    """Return all watchlist entries."""
    if not _watchlist_enabled:
        return jsonify({'error': 'Watchlist module not available'}), 503
    return jsonify(watchlist_matcher.get_all_entries())


@app.post('/api/watchlists')
def create_watchlist_entry():
    """Add a plate to the watchlist."""
    if not _watchlist_enabled:
        return jsonify({'error': 'Watchlist module not available'}), 503
    data = request.get_json(silent=True) or {}
    plate = data.get('plate', '').upper().strip()
    if not plate:
        return jsonify({'error': 'plate is required'}), 400
    entry = watchlist_matcher.add_entry(
        plate=plate,
        watch_type=data.get('type', 'custom'),
        priority=data.get('priority', 'high'),
        reason=data.get('reason', ''),
        created_by=data.get('created_by', 'Operator'),
        mongo_db=mongo_db if mongo_connected else None,
    )
    log_audit(data.get('created_by', 'Operator'), f'Added watchlist entry: {plate}', entry.id)
    return jsonify(entry.to_dict()), 201


@app.patch('/api/watchlists/<entry_id>')
def update_watchlist_entry(entry_id):
    """Update a watchlist entry."""
    if not _watchlist_enabled:
        return jsonify({'error': 'Watchlist module not available'}), 503
    data = request.get_json(silent=True) or {}
    entry = watchlist_matcher.update_entry(
        entry_id, data,
        mongo_db=mongo_db if mongo_connected else None,
    )
    if not entry:
        return jsonify({'error': 'entry_not_found'}), 404
    log_audit('Operator', f'Updated watchlist entry', entry_id)
    return jsonify(entry.to_dict())


@app.delete('/api/watchlists/<entry_id>')
def delete_watchlist_entry(entry_id):
    """Remove a watchlist entry."""
    if not _watchlist_enabled:
        return jsonify({'error': 'Watchlist module not available'}), 503
    removed = watchlist_matcher.remove_entry(
        entry_id,
        mongo_db=mongo_db if mongo_connected else None,
    )
    if not removed:
        return jsonify({'error': 'entry_not_found'}), 404
    log_audit('Operator', f'Removed watchlist entry', entry_id)
    return jsonify({'status': 'deleted', 'id': entry_id})


# ─── Trajectory REST Endpoints (SIH26127 Phase 4) ────────────────────────

@app.get('/api/vehicles/<plate>/trajectory')
def vehicle_trajectory(plate: str):
    """Build and return the trajectory for a plate."""
    if not _trajectory_enabled:
        return jsonify({'error': 'Trajectory engine not available'}), 503
    plate = plate.upper().strip()
    if mongo_connected and mongo_db is not None:
        traj = build_trajectory_from_db(plate, mongo_db)
    else:
        with _anpr_lock:
            sightings = [s for s in _sightings if s.get('normalized_plate') == plate]
        traj = build_trajectory(plate, sightings)
    return jsonify(traj.to_dict())


# ─── Traffic Analytics REST Endpoints (SIH26127 Phase 5) ─────────────────

@app.get('/api/analytics/traffic')
def analytics_traffic():
    """Return comprehensive traffic analytics."""
    if not _traffic_enabled:
        return jsonify({'error': 'Traffic analytics not available'}), 503
    window = int(request.args.get('window', 300))
    return jsonify({
        'density': compute_all_densities(window),
        'od_flows': get_top_flows(20, period_minutes=window // 60 or 1),
        'timestamp': now_iso(),
    })


@app.get('/api/analytics/density')
def analytics_density():
    """Return vehicle density per camera."""
    if not _traffic_enabled:
        return jsonify({'error': 'Traffic analytics not available'}), 503
    window = int(request.args.get('window', 300))
    camera = request.args.get('camera', '').strip()
    if camera:
        history = get_density_history(camera_id=camera, limit=100)
        return jsonify(history)
    return jsonify(compute_all_densities(window))


@app.get('/api/analytics/congestion')
def analytics_congestion():
    """Return congestion analysis for all cameras."""
    if not _traffic_enabled:
        return jsonify({'error': 'Traffic analytics not available'}), 503
    camera_reg = {}
    for sid, src in sources.items():
        camera_reg[sid] = {'name': src.get('name', sid)}
    return jsonify(analyze_all_congestion(camera_reg))


@app.get('/api/analytics/od')
def analytics_od():
    """Return origin-destination flow matrix."""
    if not _traffic_enabled:
        return jsonify({'error': 'Traffic analytics not available'}), 503
    period = int(request.args.get('period', 60))
    return jsonify(compute_od_matrix(period))


@app.get('/api/analytics/bottlenecks')
def analytics_bottlenecks():
    """Return cameras identified as bottlenecks."""
    if not _traffic_enabled:
        return jsonify({'error': 'Traffic analytics not available'}), 503
    camera_reg = {}
    for sid, src in sources.items():
        camera_reg[sid] = {'name': src.get('name', sid)}
    return jsonify(get_bottlenecks(camera_reg))


# ─── Anomaly REST Endpoints (SIH26127 Phase 6) ───────────────────────────

@app.get('/api/anomalies')
def get_anomalies():
    """Return recent anomaly events."""
    if not _anomaly_enabled:
        return jsonify({'error': 'Anomaly detection not available'}), 503
    plate = request.args.get('plate', '').strip()
    atype = request.args.get('type', '').strip()
    limit = min(int(request.args.get('limit', 50)), 200)
    return jsonify(get_anomaly_events(
        plate=plate or None,
        anomaly_type=atype or None,
        limit=limit,
    ))


@app.get('/api/anomalies/stats')
def anomaly_stats():
    """Return anomaly detection statistics."""
    if not _anomaly_enabled:
        return jsonify({'error': 'Anomaly detection not available'}), 503
    return jsonify(get_anomaly_stats())


@app.patch('/api/anomalies/<anomaly_id>')
def resolve_anomaly_endpoint(anomaly_id):
    """Resolve an anomaly event."""
    if not _anomaly_enabled:
        return jsonify({'error': 'Anomaly detection not available'}), 503
    if resolve_anomaly(anomaly_id):
        log_audit('Operator', 'Resolved anomaly event', anomaly_id)
        return jsonify({'status': 'resolved', 'id': anomaly_id})
    return jsonify({'error': 'anomaly_not_found'}), 404


# ─── ANPR Evaluation REST Endpoints (SIH26127 Phase 7) ───────────────────

@app.get('/api/anpr/evaluation')
def get_evaluations():
    """Return ANPR evaluation results and live metrics."""
    if not _evaluation_enabled:
        return jsonify({'error': 'Evaluation module not available'}), 503
    limit = min(int(request.args.get('limit', 20)), 50)
    return jsonify({
        'runs': get_evaluation_runs(limit),
        'live_metrics': eval_live_metrics(),
        'timestamp': now_iso(),
    })


@app.post('/api/anpr/evaluation/run')
def start_evaluation_run():
    """Start a new ANPR evaluation benchmark run."""
    if not _evaluation_enabled:
        return jsonify({'error': 'Evaluation module not available'}), 503
    data = request.get_json(silent=True) or {}
    run = start_evaluation(
        model_version=data.get('model_version', anpr_model_version()),
        ocr_engine=data.get('ocr_engine', 'unknown'),
        dataset_name=data.get('dataset', 'live'),
        notes=data.get('notes', ''),
    )
    log_audit('Operator', f'Started ANPR evaluation run', run.id)
    return jsonify(run.to_dict()), 201


# ─── Vehicle Tracking REST Endpoints (SIH26127 Phase 2) ──────────────────

@app.get('/api/tracking/status')
def tracking_status():
    """Return vehicle tracking status for all cameras."""
    if not _tracking_enabled:
        return jsonify({'error': 'Tracking module not available'}), 503
    results = {}
    for cam_id in sources:
        results[cam_id] = {
            'active_tracks': get_track_count(cam_id),
            'tracks': [
                {
                    'track_id': t.track_id,
                    'vehicle_type': t.vehicle_type,
                    'bbox': t.bbox,
                    'frame_count': t.frame_count,
                }
                for t in get_active_tracks(cam_id)
            ],
        }
    return jsonify(results)


# ─── Cross-Camera Association REST Endpoints (SIH26127 Phase 3) ─────────

@app.get('/api/associations')
def get_associations():
    """Return association log, optionally filtered by decision or plate."""
    if not _association_enabled:
        return jsonify({'error': 'Association module not available'}), 503
    limit = int(request.args.get('limit', 50))
    decision = request.args.get('decision')
    plate = request.args.get('plate')
    logs = get_association_log(limit=100)
    if decision:
        logs = [a for a in logs if a.get('decision') == decision]
    if plate:
        p_clean = plate.strip().upper()
        logs = [a for a in logs if p_clean in a.get('anchor_plate', '') or p_clean in a.get('query_plate', '')]
    return jsonify(logs[:limit])


@app.get('/api/associations/stats')
def get_associations_stats_endpoint():
    """Return association summary stats."""
    if not _association_enabled:
        return jsonify({'error': 'Association module not available'}), 503
    return jsonify(get_association_stats())


@app.get('/api/cameras')
def get_cameras():
    """Return registered cameras and topology graph."""
    if not _association_enabled:
        return jsonify(list(sources.values()))
    reg = get_camera_registry()
    return jsonify(list(reg.values()))


@app.post('/api/cameras')
def add_or_update_camera():
    """Register or update a camera in the topology graph."""
    if not _association_enabled:
        return jsonify({'error': 'Association module not available'}), 503
    data = request.get_json(silent=True) or {}
    cam_id = data.get('id')
    if not cam_id:
        return jsonify({'error': 'Camera id is required'}), 400
    node = register_camera(
        camera_id=cam_id,
        name=data.get('name', ''),
        latitude=data.get('latitude'),
        longitude=data.get('longitude'),
        direction=data.get('direction'),
        location_desc=data.get('location_desc', ''),
    )
    if mongo_connected and mongo_db is not None:
        persist_camera(node, mongo_db)
    return jsonify(node.to_dict()), 201


@app.get('/api/cameras/<camera_id>/topology')
def get_camera_topology(camera_id):
    """Get topology and adjacent cameras for a specific camera."""
    if not _association_enabled:
        return jsonify({'error': 'Association module not available'}), 503
    reg = get_camera_registry()
    if camera_id not in reg:
        return jsonify({'error': 'Camera not found'}), 404
    return jsonify(reg[camera_id])


@app.post('/api/cameras/<camera_id>/edges')
def add_topology_edge(camera_id):
    """Add a transition edge between cameras."""
    if not _association_enabled:
        return jsonify({'error': 'Association module not available'}), 503
    data = request.get_json(silent=True) or {}
    to_camera = data.get('to_camera')
    min_travel_time_sec = float(data.get('min_travel_time_sec', 30.0))
    bidirectional = bool(data.get('bidirectional', True))
    if not to_camera:
        return jsonify({'error': 'to_camera is required'}), 400
    add_camera_edge(camera_id, to_camera, min_travel_time_sec, bidirectional)
    if _anomaly_enabled:
        set_camera_travel_time(camera_id, to_camera, min_travel_time_sec)
    reg = get_camera_registry()
    if mongo_connected and mongo_db is not None:
        if camera_id in reg:
            persist_camera(CameraNode(**reg[camera_id]), mongo_db)
        if bidirectional and to_camera in reg:
            persist_camera(CameraNode(**reg[to_camera]), mongo_db)
    return jsonify({'success': True, 'from': camera_id, 'to': to_camera, 'min_travel_time_sec': min_travel_time_sec})


# ─── Pipeline Capabilities Endpoint ──────────────────────────────────────

@app.get('/api/capabilities')
def get_capabilities():
    """Return which pipeline modules are available."""
    return jsonify({
        'anpr': _anpr_enabled,
        'tracking': _tracking_enabled,
        'association': _association_enabled,
        'watchlist': _watchlist_enabled,
        'trajectory': _trajectory_enabled,
        'traffic': _traffic_enabled,
        'anomaly': _anomaly_enabled,
        'evaluation': _evaluation_enabled,
        'database': 'MongoDB' if mongo_connected else 'In-Memory',
        'ai_model': model is not None,
        'timestamp': now_iso(),
    })


if __name__ == '__main__':
    socketio.run(
        app,
        host=os.getenv('BACKEND_HOST', '0.0.0.0'),
        port=int(os.getenv('BACKEND_PORT', '5000')),
        allow_unsafe_werkzeug=True,
    )

