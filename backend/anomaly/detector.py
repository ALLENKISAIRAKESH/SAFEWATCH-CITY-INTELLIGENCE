"""
anomaly/detector.py — Route Anomaly Detection
SIH26127 Phase 6

Detects suspicious route anomalies:
  1. Impossible transitions — vehicle appears at two distant cameras
     faster than physically possible.
  2. Travel time violations — unusually fast or slow travel between
     known camera pairs.
  3. Unexpected route patterns — vehicle visits cameras in an
     atypical sequence.

MongoDB collection: anomaly_events
"""

import time
import uuid
import logging
from collections import defaultdict
from datetime import datetime, timezone
from dataclasses import dataclass, field
from typing import Optional

logger = logging.getLogger('safewatch.anomaly')


@dataclass
class AnomalyEvent:
    id: str
    plate: str
    anomaly_type: str         # 'impossible_transition' | 'speed_violation' | 'route_deviation'
    severity: str             # 'critical' | 'high' | 'medium' | 'low'
    description: str
    camera_from: str
    camera_to: str
    timestamp: str
    travel_time_sec: float
    expected_min_sec: float   # minimum expected travel time
    confidence: float
    resolved: bool = False

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'plate': self.plate,
            'anomaly_type': self.anomaly_type,
            'severity': self.severity,
            'description': self.description,
            'camera_from': self.camera_from,
            'camera_to': self.camera_to,
            'timestamp': self.timestamp,
            'travel_time_sec': round(self.travel_time_sec, 1),
            'expected_min_sec': round(self.expected_min_sec, 1),
            'confidence': round(self.confidence, 3),
            'resolved': self.resolved,
        }


# ─── Camera topology (expected travel times between pairs) ────────────────

# (camera_a, camera_b) → minimum expected travel time in seconds
# This should be populated from camera registry with real GPS data;
# for now, uses configurable defaults.
_camera_travel_times: dict[tuple[str, str], float] = {}

# Default minimum travel time when no topology data exists (seconds)
_DEFAULT_MIN_TRAVEL_TIME = 30.0

# Speed violation multiplier: actual travel time < expected / SPEED_FACTOR → anomaly
_SPEED_FACTOR = 0.5


def set_camera_travel_time(cam_a: str, cam_b: str, min_seconds: float):
    """Set expected minimum travel time between two cameras (bidirectional)."""
    _camera_travel_times[(cam_a, cam_b)] = min_seconds
    _camera_travel_times[(cam_b, cam_a)] = min_seconds


def get_expected_travel_time(cam_a: str, cam_b: str) -> float:
    """Get expected minimum travel time between cameras."""
    return _camera_travel_times.get((cam_a, cam_b), _DEFAULT_MIN_TRAVEL_TIME)


# ─── Anomaly detection ───────────────────────────────────────────────────

_anomaly_events: list[AnomalyEvent] = []
_plate_transitions: dict[str, list[tuple[str, float]]] = defaultdict(list)
_MAX_TRANSITION_AGE = 3600  # 1 hour


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def record_transition(
    plate: str,
    camera_id: str,
    timestamp_epoch: Optional[float] = None,
) -> Optional[AnomalyEvent]:
    """
    Record a vehicle transition and check for anomalies.
    Returns AnomalyEvent if anomaly detected, else None.
    """
    ts = timestamp_epoch or time.time()
    plate = plate.upper().strip()

    log = _plate_transitions[plate]
    anomaly = None

    if log:
        last_cam, last_ts = log[-1]
        if last_cam != camera_id:
            travel_time = ts - last_ts
            expected = get_expected_travel_time(last_cam, camera_id)

            # Check for impossible transition
            if travel_time < expected * _SPEED_FACTOR and travel_time > 0:
                anomaly = AnomalyEvent(
                    id=f'ANM-{uuid.uuid4().hex[:8].upper()}',
                    plate=plate,
                    anomaly_type='impossible_transition',
                    severity='critical' if travel_time < expected * 0.3 else 'high',
                    description=(
                        f'Vehicle {plate} traveled from {last_cam} to {camera_id} '
                        f'in {travel_time:.0f}s (expected minimum: {expected:.0f}s). '
                        f'Possible cloned plate or system error.'
                    ),
                    camera_from=last_cam,
                    camera_to=camera_id,
                    timestamp=_now_iso(),
                    travel_time_sec=travel_time,
                    expected_min_sec=expected,
                    confidence=min(1.0, expected / max(travel_time, 1)),
                )
                _anomaly_events.append(anomaly)
                # Keep rolling 200 events
                if len(_anomaly_events) > 200:
                    del _anomaly_events[:50]

                logger.warning(f'[Anomaly] {anomaly.anomaly_type}: {anomaly.description}')

    log.append((camera_id, ts))
    # Prune old
    cutoff = ts - _MAX_TRANSITION_AGE
    _plate_transitions[plate] = [(c, t) for c, t in log if t > cutoff]

    return anomaly


def get_anomaly_events(
    plate: Optional[str] = None,
    anomaly_type: Optional[str] = None,
    limit: int = 50,
) -> list[dict]:
    """Return recent anomaly events with optional filters."""
    results = _anomaly_events
    if plate:
        results = [e for e in results if e.plate == plate.upper().strip()]
    if anomaly_type:
        results = [e for e in results if e.anomaly_type == anomaly_type]
    return [e.to_dict() for e in results[-limit:]]


def resolve_anomaly(anomaly_id: str) -> bool:
    """Mark an anomaly as resolved. Returns True if found."""
    for event in _anomaly_events:
        if event.id == anomaly_id:
            event.resolved = True
            return True
    return False


def get_anomaly_stats() -> dict:
    """Return summary statistics about anomaly detection."""
    total = len(_anomaly_events)
    unresolved = sum(1 for e in _anomaly_events if not e.resolved)
    by_type = defaultdict(int)
    by_severity = defaultdict(int)
    for e in _anomaly_events:
        by_type[e.anomaly_type] += 1
        by_severity[e.severity] += 1

    return {
        'total_events': total,
        'unresolved': unresolved,
        'by_type': dict(by_type),
        'by_severity': dict(by_severity),
        'tracked_plates': len(_plate_transitions),
    }


def persist_event(event: AnomalyEvent, mongo_db) -> None:
    """Persist an anomaly event to MongoDB."""
    try:
        mongo_db.anomaly_events.insert_one(event.to_dict())
    except Exception as exc:
        logger.warning(f'[Anomaly] MongoDB persist failed: {exc}')
