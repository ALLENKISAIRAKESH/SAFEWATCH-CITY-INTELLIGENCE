"""
association/associator.py — Cross-Camera Vehicle Identity Association
SIH26127 Phase 3

Determines whether two sightings from different cameras likely represent
the same vehicle, using a confidence-weighted multi-factor score:

  1. Plate similarity    (primary signal)
  2. Temporal plausibility (reachable in time given camera topology)
  3. Camera topology     (adjacency / known transition pairs)
  4. Vehicle type match  (car/truck/bus consistency)

Key principle (from audit constraints):
  - Low-confidence associations are FLAGGED FOR REVIEW, never silently merged.
  - The identity score is always stored; consumers decide the merge threshold.

MongoDB collections:
  - cameras:       registry with adjacency list, GPS, direction
  - associations:  cross-sighting identity links

Terminology:
  "anchor"  = known sighting (the reference)
  "query"   = incoming sighting being evaluated
"""

import math
import uuid
import time
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger('safewatch.association')


# ─── Camera registry (topology graph) ────────────────────────────────────

@dataclass
class CameraNode:
    """A node in the camera topology graph."""
    id: str
    name: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    direction: Optional[str] = None        # 'N', 'S', 'E', 'W', 'NE', etc.
    location_desc: str = ''
    # IDs of cameras that vehicles can plausibly travel to from here
    adjacent_cameras: list[str] = field(default_factory=list)
    # Minimum travel time (seconds) to each adjacent camera
    travel_times: dict[str, float] = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'name': self.name,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'direction': self.direction,
            'location_desc': self.location_desc,
            'adjacent_cameras': self.adjacent_cameras,
            'travel_times': self.travel_times,
        }


# Global camera registry: camera_id → CameraNode
_camera_registry: dict[str, CameraNode] = {}


def register_camera(
    camera_id: str,
    name: str = '',
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    direction: Optional[str] = None,
    location_desc: str = '',
) -> CameraNode:
    """Register or update a camera in the topology graph."""
    if camera_id in _camera_registry:
        node = _camera_registry[camera_id]
        node.name = name or node.name
        if latitude is not None:
            node.latitude = latitude
        if longitude is not None:
            node.longitude = longitude
        if direction:
            node.direction = direction
        if location_desc:
            node.location_desc = location_desc
    else:
        node = CameraNode(
            id=camera_id,
            name=name or camera_id,
            latitude=latitude,
            longitude=longitude,
            direction=direction,
            location_desc=location_desc,
        )
        _camera_registry[camera_id] = node

    logger.debug(f'[Association] Camera registered: {camera_id}')
    return node


def add_camera_edge(
    from_camera: str,
    to_camera: str,
    min_travel_time_sec: float,
    bidirectional: bool = True,
) -> None:
    """
    Add a directed edge between two cameras in the topology graph.
    min_travel_time_sec: minimum expected transit time for a vehicle.
    """
    for cam_id in (from_camera, to_camera):
        if cam_id not in _camera_registry:
            register_camera(cam_id)

    node_from = _camera_registry[from_camera]
    if to_camera not in node_from.adjacent_cameras:
        node_from.adjacent_cameras.append(to_camera)
    node_from.travel_times[to_camera] = min_travel_time_sec

    if bidirectional:
        node_to = _camera_registry[to_camera]
        if from_camera not in node_to.adjacent_cameras:
            node_to.adjacent_cameras.append(from_camera)
        node_to.travel_times[from_camera] = min_travel_time_sec


def load_topology_from_db(mongo_db) -> int:
    """Load camera topology from MongoDB cameras collection."""
    try:
        docs = list(mongo_db.cameras.find({}, {'_id': 0}))
        for doc in docs:
            cam_id = doc.get('id', '')
            if not cam_id:
                continue
            node = CameraNode(
                id=cam_id,
                name=doc.get('name', cam_id),
                latitude=doc.get('latitude'),
                longitude=doc.get('longitude'),
                direction=doc.get('direction'),
                location_desc=doc.get('location_desc', ''),
                adjacent_cameras=doc.get('adjacent_cameras', []),
                travel_times=doc.get('travel_times', {}),
            )
            _camera_registry[cam_id] = node
        logger.info(f'[Association] Loaded {len(docs)} cameras from topology DB')
        return len(docs)
    except Exception as exc:
        logger.warning(f'[Association] Failed loading topology: {exc}')
        return 0


def get_camera_registry() -> dict[str, dict]:
    return {k: v.to_dict() for k, v in _camera_registry.items()}


# ─── Haversine distance ────────────────────────────────────────────────────

def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return great-circle distance in km between two GPS points."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# ─── Association scoring ──────────────────────────────────────────────────

@dataclass
class AssociationResult:
    id: str
    anchor_sighting_id: str
    query_sighting_id: str
    anchor_plate: str
    query_plate: str
    anchor_camera: str
    query_camera: str
    identity_score: float          # 0.0 → 1.0 composite
    plate_score: float             # plate string similarity
    temporal_score: float          # feasibility of transit time
    topology_score: float          # graph adjacency
    vehicle_type_score: float      # type consistency
    decision: str                  # 'confirmed' | 'probable' | 'review' | 'rejected'
    flags: list[str]               # human-readable explanations
    timestamp: str

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'anchor_sighting_id': self.anchor_sighting_id,
            'query_sighting_id': self.query_sighting_id,
            'anchor_plate': self.anchor_plate,
            'query_plate': self.query_plate,
            'anchor_camera': self.anchor_camera,
            'query_camera': self.query_camera,
            'identity_score': round(self.identity_score, 4),
            'plate_score': round(self.plate_score, 4),
            'temporal_score': round(self.temporal_score, 4),
            'topology_score': round(self.topology_score, 4),
            'vehicle_type_score': round(self.vehicle_type_score, 4),
            'decision': self.decision,
            'flags': self.flags,
            'timestamp': self.timestamp,
        }


# Decision thresholds
_THRESHOLD_CONFIRMED = 0.85
_THRESHOLD_PROBABLE = 0.65
_THRESHOLD_REVIEW = 0.40
# Below _THRESHOLD_REVIEW → 'rejected'

# Weights for composite score
_WEIGHTS = {
    'plate': 0.55,
    'temporal': 0.25,
    'topology': 0.12,
    'vehicle_type': 0.08,
}

# In-memory association log
_association_log: list[AssociationResult] = []


def _plate_similarity(plate_a: str, plate_b: str) -> float:
    """
    Normalized plate similarity.
    Exact match → 1.0. Uses edit-distance ratio for near-matches.
    """
    a, b = plate_a.upper().strip(), plate_b.upper().strip()
    if a == b:
        return 1.0
    if not a or not b:
        return 0.0

    # Levenshtein distance
    n, m = len(a), len(b)
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n + 1):
        dp[i][0] = i
    for j in range(m + 1):
        dp[0][j] = j
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            cost = 0 if a[i - 1] == b[j - 1] else 1
            dp[i][j] = min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)

    dist = dp[n][m]
    max_len = max(n, m)
    similarity = 1.0 - (dist / max_len)
    return max(0.0, similarity)


def _temporal_score(
    anchor_ts: float,
    query_ts: float,
    anchor_cam: str,
    query_cam: str,
) -> tuple[float, list[str]]:
    """
    Score temporal plausibility of a transition between two cameras.
    Returns (score, flags).
    """
    flags = []
    dt = abs(query_ts - anchor_ts)

    if anchor_cam == query_cam:
        # Same camera — short gaps are fine (same vehicle looping)
        if dt < 2.0:
            return 0.3, ['same_camera_instant']
        return 0.7, ['same_camera_return']

    # Check topology for minimum transit time
    anchor_node = _camera_registry.get(anchor_cam)
    query_node = _camera_registry.get(query_cam)

    min_transit = None
    if anchor_node and query_cam in anchor_node.travel_times:
        min_transit = anchor_node.travel_times[query_cam]
    elif anchor_node and query_node:
        # Estimate from GPS distance assuming 30 km/h min speed
        if anchor_node.latitude and query_node.latitude:
            dist = _haversine_km(
                anchor_node.latitude, anchor_node.longitude,
                query_node.latitude, query_node.longitude,
            )
            min_transit = (dist / 30.0) * 3600  # seconds at 30 km/h

    if min_transit is not None:
        if dt < min_transit * 0.5:
            # Impossibly fast — major red flag
            flags.append('impossible_transit_time')
            return 0.05, flags
        elif dt < min_transit:
            # Faster than expected but not impossible
            flags.append('fast_transit')
            score = 0.5 + 0.3 * (dt / min_transit)
            return min(score, 0.8), flags
        elif dt < min_transit * 5:
            # Plausible transit window
            return 1.0, flags
        else:
            # Very long gap — possible but uncertain
            flags.append('long_gap')
            return max(0.4, 1.0 - (dt / (min_transit * 10))), flags

    # No topology data — use heuristic
    if dt < 30:
        flags.append('no_topology_data_short_gap')
        return 0.6, flags
    elif dt < 1800:
        return 0.7, flags
    else:
        flags.append('long_gap_no_topology')
        return 0.4, flags


def _topology_score(anchor_cam: str, query_cam: str) -> float:
    """Score based on camera graph adjacency."""
    if anchor_cam == query_cam:
        return 0.5

    anchor_node = _camera_registry.get(anchor_cam)
    if not anchor_node:
        return 0.3  # no topology data

    if query_cam in anchor_node.adjacent_cameras:
        return 1.0  # direct adjacency
    # Check two-hop adjacency
    for adj_id in anchor_node.adjacent_cameras:
        adj_node = _camera_registry.get(adj_id)
        if adj_node and query_cam in adj_node.adjacent_cameras:
            return 0.7
    return 0.3  # unrelated cameras


def _vehicle_type_score(type_a: str, type_b: str) -> float:
    """Score vehicle type consistency. Same → 1.0, compatible → 0.7, incompatible → 0.2."""
    if not type_a or not type_b:
        return 0.5  # unknown

    compatible_groups = [
        {'car', 'sedan', 'hatchback', 'suv'},
        {'truck', 'lorry', 'hgv'},
        {'bus', 'minibus'},
        {'motorcycle', 'bike', 'scooter'},
    ]

    a, b = type_a.lower(), type_b.lower()
    if a == b:
        return 1.0
    for group in compatible_groups:
        if a in group and b in group:
            return 0.8
    return 0.2


def compute_association(
    anchor_sighting: dict,
    query_sighting: dict,
) -> AssociationResult:
    """
    Compute cross-camera identity association between two sightings.

    Args:
        anchor_sighting: dict with keys: id, normalized_plate, camera_id,
                         timestamp_epoch, vehicle_type (optional)
        query_sighting:  same structure

    Returns:
        AssociationResult with identity_score and decision.
    """
    flags: list[str] = []

    # 1. Plate similarity
    ps = _plate_similarity(
        anchor_sighting.get('normalized_plate', ''),
        query_sighting.get('normalized_plate', ''),
    )

    # 2. Temporal plausibility
    ts, t_flags = _temporal_score(
        anchor_sighting.get('timestamp_epoch', 0),
        query_sighting.get('timestamp_epoch', 0),
        anchor_sighting.get('camera_id', ''),
        query_sighting.get('camera_id', ''),
    )
    flags.extend(t_flags)

    # 3. Topology score
    topo = _topology_score(
        anchor_sighting.get('camera_id', ''),
        query_sighting.get('camera_id', ''),
    )

    # 4. Vehicle type consistency
    vt = _vehicle_type_score(
        anchor_sighting.get('vehicle_type', ''),
        query_sighting.get('vehicle_type', ''),
    )

    # Composite weighted score
    composite = (
        _WEIGHTS['plate'] * ps
        + _WEIGHTS['temporal'] * ts
        + _WEIGHTS['topology'] * topo
        + _WEIGHTS['vehicle_type'] * vt
    )

    # Decision
    if composite >= _THRESHOLD_CONFIRMED:
        decision = 'confirmed'
    elif composite >= _THRESHOLD_PROBABLE:
        decision = 'probable'
    elif composite >= _THRESHOLD_REVIEW:
        decision = 'review'
        flags.append('low_confidence_requires_review')
    else:
        decision = 'rejected'
        flags.append('insufficient_evidence')

    result = AssociationResult(
        id=f'ASSOC-{uuid.uuid4().hex[:8].upper()}',
        anchor_sighting_id=anchor_sighting.get('id', ''),
        query_sighting_id=query_sighting.get('id', ''),
        anchor_plate=anchor_sighting.get('normalized_plate', ''),
        query_plate=query_sighting.get('normalized_plate', ''),
        anchor_camera=anchor_sighting.get('camera_id', ''),
        query_camera=query_sighting.get('camera_id', ''),
        identity_score=composite,
        plate_score=ps,
        temporal_score=ts,
        topology_score=topo,
        vehicle_type_score=vt,
        decision=decision,
        flags=flags,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )

    _association_log.append(result)
    if len(_association_log) > 1000:
        del _association_log[:200]

    return result


def associate_sighting(
    new_sighting: dict,
    candidate_sightings: list[dict],
    min_score: float = _THRESHOLD_REVIEW,
) -> list[AssociationResult]:
    """
    Find all candidate sightings that associate with a new sighting above
    the minimum score threshold.

    Returns list of AssociationResult sorted by identity_score descending.
    Only non-same-sighting candidates are evaluated.
    """
    results = []
    new_id = new_sighting.get('id', '')

    for candidate in candidate_sightings:
        if candidate.get('id', '') == new_id:
            continue
        # Avoid same camera same track ID (already the same physical track)
        if (candidate.get('camera_id') == new_sighting.get('camera_id')
                and candidate.get('track_id') == new_sighting.get('track_id')):
            continue

        assoc = compute_association(new_sighting, candidate)
        if assoc.identity_score >= min_score:
            results.append(assoc)

    results.sort(key=lambda r: r.identity_score, reverse=True)
    return results


def get_association_log(limit: int = 50) -> list[dict]:
    """Return recent association computations."""
    return [r.to_dict() for r in _association_log[-limit:]]


def get_association_stats() -> dict:
    """Return summary statistics for association decisions."""
    from collections import Counter
    decisions = Counter(r.decision for r in _association_log)
    avg_score = (
        sum(r.identity_score for r in _association_log) / len(_association_log)
        if _association_log else 0.0
    )
    return {
        'total_computed': len(_association_log),
        'decisions': dict(decisions),
        'avg_identity_score': round(avg_score, 4),
        'cameras_in_topology': len(_camera_registry),
    }


def persist_association(result: AssociationResult, mongo_db) -> None:
    """Persist an association result to MongoDB."""
    try:
        mongo_db.associations.insert_one(result.to_dict())
    except Exception as exc:
        logger.warning(f'[Association] MongoDB persist failed: {exc}')


def persist_camera(node: CameraNode, mongo_db) -> None:
    """Upsert a camera node to MongoDB cameras collection."""
    try:
        mongo_db.cameras.update_one(
            {'id': node.id},
            {'$set': node.to_dict()},
            upsert=True,
        )
    except Exception as exc:
        logger.warning(f'[Association] Camera persist failed: {exc}')
