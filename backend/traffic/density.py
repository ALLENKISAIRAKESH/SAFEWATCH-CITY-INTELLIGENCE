"""
traffic/density.py — Vehicle Density Computation
SIH26127 Phase 5

Computes per-camera vehicle density metrics from sighting data.
Density = vehicle count per time window per camera.
"""

import time
import logging
from collections import defaultdict
from datetime import datetime, timezone
from dataclasses import dataclass, field
from typing import Optional

logger = logging.getLogger('safewatch.traffic.density')


@dataclass
class DensitySnapshot:
    camera_id: str
    timestamp: str
    timestamp_epoch: float
    vehicle_count: int
    window_seconds: int = 300  # 5 min default
    density_level: str = 'low'  # 'low' | 'moderate' | 'high' | 'congested'

    def to_dict(self) -> dict:
        return {
            'camera_id': self.camera_id,
            'timestamp': self.timestamp,
            'timestamp_epoch': self.timestamp_epoch,
            'vehicle_count': self.vehicle_count,
            'window_seconds': self.window_seconds,
            'density_level': self.density_level,
        }


# ─── In-memory density tracking ──────────────────────────────────────────

# camera_id → list of recent vehicle timestamps
_camera_events: dict[str, list[float]] = defaultdict(list)
_density_history: list[DensitySnapshot] = []

# Configurable thresholds
DENSITY_THRESHOLDS = {
    'low': 5,
    'moderate': 15,
    'high': 30,
    'congested': 50,
}


def _classify_density(count: int) -> str:
    if count >= DENSITY_THRESHOLDS['congested']:
        return 'congested'
    if count >= DENSITY_THRESHOLDS['high']:
        return 'high'
    if count >= DENSITY_THRESHOLDS['moderate']:
        return 'moderate'
    return 'low'


def record_vehicle_event(camera_id: str, timestamp_epoch: Optional[float] = None):
    """Record a vehicle detection event at a camera."""
    ts = timestamp_epoch or time.time()
    _camera_events[camera_id].append(ts)
    # Keep only last 30 minutes of events
    cutoff = ts - 1800
    _camera_events[camera_id] = [t for t in _camera_events[camera_id] if t > cutoff]


def compute_density(
    camera_id: str,
    window_seconds: int = 300,
) -> DensitySnapshot:
    """Compute current density for a camera over a time window."""
    now = time.time()
    cutoff = now - window_seconds
    events = _camera_events.get(camera_id, [])
    count = sum(1 for t in events if t > cutoff)

    snapshot = DensitySnapshot(
        camera_id=camera_id,
        timestamp=datetime.now(timezone.utc).isoformat(),
        timestamp_epoch=now,
        vehicle_count=count,
        window_seconds=window_seconds,
        density_level=_classify_density(count),
    )
    _density_history.append(snapshot)
    # Keep rolling 500 snapshots
    if len(_density_history) > 500:
        del _density_history[:100]

    return snapshot


def compute_all_densities(window_seconds: int = 300) -> list[dict]:
    """Compute density for all known cameras."""
    results = []
    for cam_id in _camera_events:
        snap = compute_density(cam_id, window_seconds)
        results.append(snap.to_dict())
    return results


def get_density_history(
    camera_id: Optional[str] = None,
    limit: int = 50,
) -> list[dict]:
    """Return recent density snapshots, optionally filtered by camera."""
    results = _density_history
    if camera_id:
        results = [s for s in results if s.camera_id == camera_id]
    return [s.to_dict() for s in results[-limit:]]


def persist_snapshot(snapshot: DensitySnapshot, mongo_db) -> None:
    """Persist a density snapshot to MongoDB."""
    try:
        mongo_db.traffic_snapshots.insert_one(snapshot.to_dict())
    except Exception as exc:
        logger.warning(f'[Density] MongoDB persist failed: {exc}')
