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
    'cam-01': {'id': 'cam-01', 'name': 'Camera 01 — Main Entrance', 'type': 'IP Camera', 'location': 'Main Entrance', 'status': 'online', 'fps': 30, 'latency': 42, 'aiModel': 'Person Detection v1.0.3'},
    'cam-02': {'id': 'cam-02', 'name': 'Camera 02 — North Gate', 'type': 'PTZ Camera', 'location': 'North Gate', 'status': 'online', 'fps': 25, 'latency': 38, 'aiModel': 'Person Detection v1.0.3'},
    'cam-03': {'id': 'cam-03', 'name': 'Camera 03 — Restricted Zone', 'type': 'IP Camera', 'location': 'Restricted Zone', 'status': 'online', 'fps': 30, 'latency': 55, 'aiModel': 'Person Detection v1.0.3'},
    'cam-04': {'id': 'cam-04', 'name': 'Camera 04 — Parking Area', 'type': 'CCTV', 'location': 'Parking Area', 'status': 'online', 'fps': 15, 'latency': 70, 'aiModel': 'Vehicle Detection v1.2.1'},
}

incidents = [
    {
        'id': 'INC-1042',
        'title': 'Unauthorized Zone Entry',
        'severity': 'critical',
        'source': 'Camera 03 — Restricted Zone',
        'rule': 'Restricted Zone Entry',
        'detectedAt': datetime.now(timezone.utc).isoformat(),
        'status': 'open',
        'assignedTo': None,
        'trackId': '#104',
        'duration': '18 sec',
        'description': 'Person detected entering restricted area without authorization.',
        'evidenceId': 'EVD-0031',
        'zone': 'Restricted Zone',
    },
    {
        'id': 'INC-1041',
        'title': 'Crowd Density Threshold Exceeded',
        'severity': 'high',
        'source': 'Camera 01 — Main Entrance',
        'rule': 'Crowd Density',
        'detectedAt': datetime.now(timezone.utc).isoformat(),
        'status': 'acknowledged',
        'assignedTo': 'Jordan Chen',
        'trackId': '#Multiple',
        'duration': '2 min 15 sec',
        'description': 'Crowd density in main entrance exceeded configured threshold of 15 persons.',
        'evidenceId': 'EVD-0030',
        'zone': 'Entry Zone',
    },
]

audit_logs = [
    {'id': 'log-001', 'timestamp': datetime.now(timezone.utc).isoformat(), 'actor': 'System', 'action': 'System Initialized (MongoDB Ready)', 'resource': 'SafeWatch Engine', 'ip': '127.0.0.1', 'result': 'success'},
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
    except Exception as exc:
        print(f'[WARN] Failed reading from MongoDB: {exc}')

active_sessions = {}
live_metrics = {
    'peopleCount': 0,
    'riskLevel': 'low',
    'activeSourcesCount': 4,
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


def generate_and_detect(url):
    url = unquote(url)
    cap = cv2.VideoCapture(url)
    if not cap.isOpened():
        print('VideoCapture failed to open:', url)
        return

    last_incident_at = 0.0
    try:
        while True:
            ok, frame = cap.read()
            if not ok or frame is None:
                time.sleep(0.1)
                continue

            detections = detect(frame)
            people = [d for d in detections if d['label'] == 'person']
            risk = 'low'
            if len(people) > 5:
                risk = 'critical'
            elif len(people) > 3:
                risk = 'high'
            elif len(people) > 1:
                risk = 'medium'

            payload = {
                'sourceUrl': url,
                'frameWidth': int(frame.shape[1]),
                'frameHeight': int(frame.shape[0]),
                'detections': detections,
                'peopleCount': len(people),
                'riskLevel': risk,
                'timestamp': now_iso(),
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



@app.route('/stream')
def stream():
    url = request.args.get('url')
    if not url:
        return 'missing url', 400
    return Response(
        stream_with_context(generate_and_detect(url)),
        mimetype='multipart/x-mixed-replace; boundary=frame',
    )


if __name__ == '__main__':
    socketio.run(
        app,
        host=os.getenv('BACKEND_HOST', '0.0.0.0'),
        port=int(os.getenv('BACKEND_PORT', '5000')),
        allow_unsafe_werkzeug=True,
    )

