"""
tracking/vehicle_tracker.py — Per-Camera Vehicle Tracking
SIH26127 Phase 2

Uses supervision's ByteTrack for multi-object tracking.
Assigns persistent track IDs to vehicles across consecutive frames
within a single camera stream.

Provides a mapping from detection bbox → track_id that the ANPR
detector uses to associate plate reads with specific vehicles.
"""

import time
import uuid
import logging
from dataclasses import dataclass, field
from typing import Optional
import numpy as np

logger = logging.getLogger('safewatch.tracker')

# ─── Try loading supervision's ByteTrack ──────────────────────────────────

_sv_available = False
try:
    import supervision as sv
    _sv_available = True
    logger.info('[Tracker] supervision library available — ByteTrack enabled')
except ImportError:
    logger.warning('[Tracker] supervision library not installed. Falling back to simple IoU tracker.')


# ─── Data types ───────────────────────────────────────────────────────────

@dataclass
class TrackInfo:
    track_id: str
    bbox: list[float]               # [x, y, w, h]
    vehicle_type: str
    first_seen: float               # epoch
    last_seen: float                # epoch
    frame_count: int = 1
    color_estimate: Optional[str] = None


@dataclass
class TrackerState:
    """Per-camera tracker state container."""
    camera_id: str
    tracks: dict[str, TrackInfo] = field(default_factory=dict)
    _byte_tracker: object = field(default=None, repr=False)
    _frame_count: int = 0

    def __post_init__(self):
        if _sv_available:
            self._byte_tracker = sv.ByteTrack(
                track_activation_threshold=0.25,
                lost_track_buffer=30,
                minimum_matching_threshold=0.8,
                frame_rate=30,
            )


# ─── Tracker registry (one per camera) ───────────────────────────────────

_trackers: dict[str, TrackerState] = {}


def get_tracker(camera_id: str) -> TrackerState:
    if camera_id not in _trackers:
        _trackers[camera_id] = TrackerState(camera_id=camera_id)
    return _trackers[camera_id]


def reset_tracker(camera_id: str) -> None:
    """Remove tracker state for a camera (e.g., on stream restart)."""
    _trackers.pop(camera_id, None)


# ─── Public API ───────────────────────────────────────────────────────────

def update_tracks(
    camera_id: str,
    detections_xyxy: np.ndarray,    # Nx4 array of [x1, y1, x2, y2]
    confidences: np.ndarray,        # N confidence scores
    class_ids: np.ndarray,          # N class IDs
    class_names: dict[int, str],    # class ID → name
) -> dict[str, str]:
    """
    Update tracker with new detections and return bbox_key → track_id mapping.

    Args:
        camera_id:       camera identifier
        detections_xyxy: Nx4 numpy array of bounding boxes [x1, y1, x2, y2]
        confidences:     N-element confidence array
        class_ids:       N-element class ID array
        class_names:     mapping from class ID to string name

    Returns:
        dict mapping bbox_key ('{x1}_{y1}_{x2}_{y2}') to persistent track_id
    """
    tracker = get_tracker(camera_id)
    tracker._frame_count += 1
    now = time.time()

    if len(detections_xyxy) == 0:
        _prune_stale_tracks(tracker, now)
        return {}

    if _sv_available and tracker._byte_tracker is not None:
        return _update_bytetrack(tracker, detections_xyxy, confidences, class_ids, class_names, now)
    else:
        return _update_iou_fallback(tracker, detections_xyxy, confidences, class_ids, class_names, now)


def get_active_tracks(camera_id: str) -> list[TrackInfo]:
    """Return all active tracks for a camera."""
    tracker = get_tracker(camera_id)
    return list(tracker.tracks.values())


def get_track_count(camera_id: str) -> int:
    tracker = get_tracker(camera_id)
    return len(tracker.tracks)


# ─── ByteTrack implementation ─────────────────────────────────────────────

def _update_bytetrack(
    tracker: TrackerState,
    xyxy: np.ndarray,
    confs: np.ndarray,
    cls_ids: np.ndarray,
    cls_names: dict,
    now: float,
) -> dict[str, str]:
    detections = sv.Detections(
        xyxy=xyxy.astype(np.float64),
        confidence=confs.astype(np.float64),
        class_id=cls_ids.astype(int),
    )

    tracked = tracker._byte_tracker.update_with_detections(detections)

    mapping: dict[str, str] = {}
    for i in range(len(tracked.xyxy)):
        x1, y1, x2, y2 = tracked.xyxy[i]
        bbox_key = f'{int(x1)}_{int(y1)}_{int(x2)}_{int(y2)}'
        sv_id = int(tracked.tracker_id[i]) if tracked.tracker_id is not None else i
        track_id = f'trk-{tracker.camera_id[:8]}-{sv_id}'

        cls_id = int(tracked.class_id[i]) if tracked.class_id is not None else 0
        vehicle_type = cls_names.get(cls_id, 'unknown')

        if track_id in tracker.tracks:
            trk = tracker.tracks[track_id]
            trk.bbox = [float(x1), float(y1), float(x2 - x1), float(y2 - y1)]
            trk.last_seen = now
            trk.frame_count += 1
        else:
            tracker.tracks[track_id] = TrackInfo(
                track_id=track_id,
                bbox=[float(x1), float(y1), float(x2 - x1), float(y2 - y1)],
                vehicle_type=vehicle_type,
                first_seen=now,
                last_seen=now,
            )

        mapping[bbox_key] = track_id

    _prune_stale_tracks(tracker, now)
    return mapping


# ─── Simple IoU fallback tracker ──────────────────────────────────────────

def _iou(box_a: list[float], box_b: list[float]) -> float:
    """Compute IoU between two [x, y, w, h] boxes."""
    ax, ay, aw, ah = box_a
    bx, by, bw, bh = box_b
    x1 = max(ax, bx)
    y1 = max(ay, by)
    x2 = min(ax + aw, bx + bw)
    y2 = min(ay + ah, by + bh)
    if x2 <= x1 or y2 <= y1:
        return 0.0
    inter = (x2 - x1) * (y2 - y1)
    union = aw * ah + bw * bh - inter
    return inter / union if union > 0 else 0.0


def _update_iou_fallback(
    tracker: TrackerState,
    xyxy: np.ndarray,
    confs: np.ndarray,
    cls_ids: np.ndarray,
    cls_names: dict,
    now: float,
) -> dict[str, str]:
    mapping: dict[str, str] = {}
    used_tracks: set[str] = set()
    new_dets: list[tuple] = []

    for i in range(len(xyxy)):
        x1, y1, x2, y2 = xyxy[i]
        det_bbox = [float(x1), float(y1), float(x2 - x1), float(y2 - y1)]
        bbox_key = f'{int(x1)}_{int(y1)}_{int(x2)}_{int(y2)}'
        cls_id = int(cls_ids[i])

        best_iou = 0.3  # minimum IoU threshold
        best_tid = None
        for tid, trk in tracker.tracks.items():
            if tid in used_tracks:
                continue
            score = _iou(det_bbox, trk.bbox)
            if score > best_iou:
                best_iou = score
                best_tid = tid

        if best_tid:
            used_tracks.add(best_tid)
            trk = tracker.tracks[best_tid]
            trk.bbox = det_bbox
            trk.last_seen = now
            trk.frame_count += 1
            mapping[bbox_key] = best_tid
        else:
            new_dets.append((bbox_key, det_bbox, cls_id))

    for bbox_key, det_bbox, cls_id in new_dets:
        tid = f'trk-{uuid.uuid4().hex[:8]}'
        tracker.tracks[tid] = TrackInfo(
            track_id=tid,
            bbox=det_bbox,
            vehicle_type=cls_names.get(cls_id, 'unknown'),
            first_seen=now,
            last_seen=now,
        )
        mapping[bbox_key] = tid

    _prune_stale_tracks(tracker, now)
    return mapping


def _prune_stale_tracks(tracker: TrackerState, now: float, max_age: float = 5.0):
    """Remove tracks not seen for max_age seconds."""
    stale = [tid for tid, trk in tracker.tracks.items() if now - trk.last_seen > max_age]
    for tid in stale:
        del tracker.tracks[tid]
