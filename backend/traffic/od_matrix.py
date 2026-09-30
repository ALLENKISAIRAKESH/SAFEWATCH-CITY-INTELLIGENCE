"""
traffic/od_matrix.py — Origin-Destination Flow Analysis
SIH26127 Phase 5

Computes OD (origin-destination) flow matrices from vehicle trajectory data.
An OD flow tracks how many vehicles moved from camera A to camera B
within a configurable time window.

MongoDB collection: od_flows
"""

import time
import logging
from collections import defaultdict
from datetime import datetime, timezone
from dataclasses import dataclass
from typing import Optional

logger = logging.getLogger('safewatch.traffic.od')


@dataclass
class ODFlow:
    origin_camera: str
    destination_camera: str
    vehicle_count: int
    avg_travel_time_sec: float
    window_start: str
    window_end: str
    period_minutes: int = 60

    def to_dict(self) -> dict:
        return {
            'origin_camera': self.origin_camera,
            'destination_camera': self.destination_camera,
            'vehicle_count': self.vehicle_count,
            'avg_travel_time_sec': round(self.avg_travel_time_sec, 1),
            'window_start': self.window_start,
            'window_end': self.window_end,
            'period_minutes': self.period_minutes,
        }


# ─── In-memory OD tracking ───────────────────────────────────────────────

# Tracks pairs: (plate, camera_id, timestamp_epoch) to detect transitions
# plate → [(camera_id, timestamp_epoch)]
_plate_camera_log: dict[str, list[tuple[str, float]]] = defaultdict(list)
_od_matrix: dict[tuple[str, str], list[float]] = defaultdict(list)  # (origin, dest) → list of travel times
_MAX_LOG_AGE = 7200  # 2 hours


def record_plate_at_camera(plate: str, camera_id: str, timestamp_epoch: Optional[float] = None):
    """Record a plate observation at a camera for OD computation."""
    ts = timestamp_epoch or time.time()
    plate = plate.upper().strip()

    log = _plate_camera_log[plate]

    # If this plate was seen at a different camera recently, record an OD transition
    if log:
        last_cam, last_ts = log[-1]
        if last_cam != camera_id and (ts - last_ts) < _MAX_LOG_AGE:
            travel_time = ts - last_ts
            _od_matrix[(last_cam, camera_id)].append(travel_time)
            # Keep last 100 travel times per pair
            if len(_od_matrix[(last_cam, camera_id)]) > 100:
                _od_matrix[(last_cam, camera_id)] = _od_matrix[(last_cam, camera_id)][-100:]

    log.append((camera_id, ts))
    # Prune old entries
    cutoff = ts - _MAX_LOG_AGE
    _plate_camera_log[plate] = [(c, t) for c, t in log if t > cutoff]


def compute_od_matrix(period_minutes: int = 60) -> list[dict]:
    """
    Compute the current OD flow matrix.

    Returns list of ODFlow dicts for each observed origin-destination pair.
    """
    now = time.time()
    cutoff = now - (period_minutes * 60)
    now_iso = datetime.now(timezone.utc).isoformat()
    window_start = datetime.fromtimestamp(cutoff, tz=timezone.utc).isoformat()

    results = []
    for (origin, dest), travel_times in _od_matrix.items():
        # Filter to recent window
        recent = [t for t in travel_times if t > 0]  # all times are positive
        if not recent:
            continue

        avg_tt = sum(recent) / len(recent)
        flow = ODFlow(
            origin_camera=origin,
            destination_camera=dest,
            vehicle_count=len(recent),
            avg_travel_time_sec=avg_tt,
            window_start=window_start,
            window_end=now_iso,
            period_minutes=period_minutes,
        )
        results.append(flow.to_dict())

    # Sort by vehicle count descending
    results.sort(key=lambda x: x['vehicle_count'], reverse=True)
    return results


def get_top_flows(n: int = 10, period_minutes: int = 60) -> list[dict]:
    """Get the top N busiest OD flows."""
    matrix = compute_od_matrix(period_minutes)
    return matrix[:n]


def persist_od_matrix(mongo_db, period_minutes: int = 60) -> int:
    """Persist the current OD matrix to MongoDB. Returns count stored."""
    matrix = compute_od_matrix(period_minutes)
    if not matrix:
        return 0
    try:
        mongo_db.od_flows.insert_many(matrix)
        return len(matrix)
    except Exception as exc:
        logger.warning(f'[OD Matrix] MongoDB persist failed: {exc}')
        return 0
