"""
trajectory/engine.py — Chronological Journey Reconstruction
SIH26127 Phase 4

Builds spatial-temporal trajectories from cross-camera sightings.
A trajectory is a chronologically ordered sequence of sighting points
for a specific plate, optionally enriched with camera GPS coordinates.

MongoDB collections:
  - trajectories:      per-plate journey summary
  - trajectory_points: individual waypoints per trajectory
"""

import uuid
import time
import logging
from datetime import datetime, timezone
from dataclasses import dataclass, field
from typing import Optional

logger = logging.getLogger('safewatch.trajectory')


@dataclass
class TrajectoryPoint:
    sighting_id: str
    camera_id: str
    timestamp: str
    timestamp_epoch: float
    plate: str
    confidence: float
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    camera_name: Optional[str] = None

    def to_dict(self) -> dict:
        return {
            'sighting_id': self.sighting_id,
            'camera_id': self.camera_id,
            'timestamp': self.timestamp,
            'timestamp_epoch': self.timestamp_epoch,
            'plate': self.plate,
            'confidence': self.confidence,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'camera_name': self.camera_name,
        }


@dataclass
class Trajectory:
    id: str
    plate: str
    points: list[TrajectoryPoint] = field(default_factory=list)
    total_cameras: int = 0
    first_seen: str = ''
    last_seen: str = ''
    duration_seconds: float = 0.0
    status: str = 'active'  # 'active' | 'complete' | 'stale'

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'plate': self.plate,
            'points': [p.to_dict() for p in self.points],
            'total_cameras': self.total_cameras,
            'first_seen': self.first_seen,
            'last_seen': self.last_seen,
            'duration_seconds': self.duration_seconds,
            'status': self.status,
        }


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ─── In-memory trajectory store ───────────────────────────────────────────

_trajectories: dict[str, Trajectory] = {}  # plate → Trajectory


def build_trajectory(
    plate: str,
    sightings: list[dict],
    camera_registry: Optional[dict] = None,
) -> Trajectory:
    """
    Build or update a trajectory from a list of sighting dicts.

    Args:
        plate:           normalized plate string
        sightings:       list of sighting dicts (from MongoDB or in-memory)
        camera_registry: optional mapping camera_id → {latitude, longitude, name}

    Returns:
        Trajectory object with chronologically ordered points.
    """
    camera_registry = camera_registry or {}

    sorted_sightings = sorted(sightings, key=lambda s: s.get('timestamp_epoch', 0))

    points = []
    cameras_seen = set()
    for s in sorted_sightings:
        cam_id = s.get('camera_id', '')
        cam_info = camera_registry.get(cam_id, {})
        cameras_seen.add(cam_id)

        point = TrajectoryPoint(
            sighting_id=s.get('id', ''),
            camera_id=cam_id,
            timestamp=s.get('timestamp', ''),
            timestamp_epoch=s.get('timestamp_epoch', 0),
            plate=plate,
            confidence=s.get('plate_confidence', 0.0),
            latitude=cam_info.get('latitude'),
            longitude=cam_info.get('longitude'),
            camera_name=cam_info.get('name', cam_id),
        )
        points.append(point)

    first = points[0] if points else None
    last = points[-1] if points else None

    traj = Trajectory(
        id=f'TRAJ-{uuid.uuid4().hex[:8].upper()}',
        plate=plate,
        points=points,
        total_cameras=len(cameras_seen),
        first_seen=first.timestamp if first else '',
        last_seen=last.timestamp if last else '',
        duration_seconds=(last.timestamp_epoch - first.timestamp_epoch) if first and last else 0.0,
        status='active' if points else 'stale',
    )

    _trajectories[plate] = traj
    return traj


def get_trajectory(plate: str) -> Optional[Trajectory]:
    """Get cached trajectory for a plate."""
    return _trajectories.get(plate.upper().strip())


def build_trajectory_from_db(
    plate: str,
    mongo_db,
    camera_registry: Optional[dict] = None,
    limit: int = 200,
) -> Trajectory:
    """
    Build trajectory by querying MongoDB sightings collection.
    Falls back to in-memory if DB unavailable.
    """
    plate = plate.upper().strip()
    try:
        sightings = list(
            mongo_db.sightings
            .find({'normalized_plate': plate}, {'_id': 0})
            .sort('timestamp_epoch', 1)
            .limit(limit)
        )
    except Exception as exc:
        logger.warning(f'[Trajectory] MongoDB query failed: {exc}')
        sightings = []

    traj = build_trajectory(plate, sightings, camera_registry)

    # Persist trajectory summary to MongoDB
    try:
        traj_dict = traj.to_dict()
        traj_dict.pop('points', None)  # points stored separately
        mongo_db.trajectories.update_one(
            {'plate': plate},
            {'$set': traj_dict},
            upsert=True,
        )
        if traj.points:
            mongo_db.trajectory_points.delete_many({'plate': plate})
            mongo_db.trajectory_points.insert_many([p.to_dict() for p in traj.points])
    except Exception as exc:
        logger.warning(f'[Trajectory] MongoDB persist failed: {exc}')

    return traj


def compute_travel_time(point_a: TrajectoryPoint, point_b: TrajectoryPoint) -> float:
    """Compute travel time in seconds between two trajectory points."""
    return abs(point_b.timestamp_epoch - point_a.timestamp_epoch)


def compute_speed_estimate(
    point_a: TrajectoryPoint,
    point_b: TrajectoryPoint,
    distance_km: float,
) -> Optional[float]:
    """Estimate speed in km/h between two points given known distance."""
    dt = compute_travel_time(point_a, point_b)
    if dt <= 0:
        return None
    return (distance_km / dt) * 3600
