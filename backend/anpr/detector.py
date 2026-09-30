"""
anpr/detector.py — Plate Detection + Full ANPR Pipeline
SIH26127 Phase 1

Uses Ultralytics YOLO (already in requirements) for:
  1. Vehicle detection (existing yolov8n.pt COCO model)
  2. License plate detection (dedicated plate model, optional)

If the plate model is unavailable, falls back to using vehicle bounding boxes
directly for OCR (lower accuracy but functional for demos).

Full pipeline per frame:
  frame → vehicle detection → for each vehicle → plate detection →
  preprocess → OCR → normalize → validate → PlateObservation
"""

import os
import time
import uuid
import logging
from typing import Optional
import numpy as np
import cv2

from anpr.preprocessor import crop_and_preprocess, preprocess_raw
from anpr.ocr_engine import run_ocr, engine_name as ocr_engine_name
from anpr.normalizer import normalize
from anpr.validator import validate
from anpr.consensus import PlateObservation

logger = logging.getLogger('safewatch.detector')

# ─── Model paths ──────────────────────────────────────────────────────────

PLATE_MODEL_PATH = os.getenv('PLATE_MODEL', 'license_plate_detector.pt')
VEHICLE_MODEL_PATH = os.getenv('YOLO_MODEL', 'yolov8n.pt')
PLATE_CONF_THRESHOLD = float(os.getenv('PLATE_CONF_THRESHOLD', '0.40'))
VEHICLE_CONF_THRESHOLD = float(os.getenv('CONFIDENCE_THRESHOLD', '0.50'))

# COCO class IDs for vehicles
_VEHICLE_CLASSES = {
    2: 'car', 3: 'motorcycle', 5: 'bus', 7: 'truck',
    6: 'train',  # rarely detected but include
}

# ─── Model loading ────────────────────────────────────────────────────────

_plate_model = None
_vehicle_model = None
_model_version = 'unknown'

try:
    from ultralytics import YOLO as _YOLO

    # Vehicle model (shared with existing backend.py — do not double-load)
    try:
        _vehicle_model = _YOLO(VEHICLE_MODEL_PATH)
        logger.info(f'[ANPR Detector] Vehicle model loaded: {VEHICLE_MODEL_PATH}')
    except Exception as e:
        logger.warning(f'[ANPR Detector] Vehicle model unavailable: {e}')

    # Plate-specific model (optional — higher accuracy)
    try:
        _plate_model = _YOLO(PLATE_MODEL_PATH)
        _model_version = f'plate:{PLATE_MODEL_PATH}+ocr:{ocr_engine_name()}'
        logger.info(f'[ANPR Detector] Plate model loaded: {PLATE_MODEL_PATH}')
    except Exception as e:
        logger.warning(
            f'[ANPR Detector] Plate model "{PLATE_MODEL_PATH}" unavailable ({e}). '
            'Will use vehicle bbox as plate crop fallback.'
        )
        _model_version = f'vehicle-fallback:{VEHICLE_MODEL_PATH}+ocr:{ocr_engine_name()}'

except ImportError:
    logger.warning('[ANPR Detector] Ultralytics unavailable. Detector disabled.')


def model_version() -> str:
    return _model_version


# ─── Public API ───────────────────────────────────────────────────────────

def process_frame(
    frame: np.ndarray,
    camera_id: str,
    track_assignments: Optional[dict] = None,  # bbox_key → track_id (from tracker)
    frame_reference: Optional[str] = None,
    simulation_mode: bool = False,
) -> list[PlateObservation]:
    """
    Run the full ANPR pipeline on a single frame.

    Args:
        frame:              BGR numpy array
        camera_id:          camera identifier string
        track_assignments:  optional mapping from vehicle bbox key to track ID
                            (populated by vehicle_tracker in Phase 2)
        frame_reference:    storage path/ID of the frame for evidence linking
        simulation_mode:    if True, tag observations as simulated

    Returns:
        List of PlateObservation objects (one per detected plate in this frame).
        Empty list if no plates detected or models unavailable.
    """
    if _vehicle_model is None:
        return []

    observations: list[PlateObservation] = []
    ts = time.time()

    # Step 1 — Vehicle detection
    try:
        v_results = _vehicle_model(frame, verbose=False, conf=VEHICLE_CONF_THRESHOLD)[0]
    except Exception as exc:
        logger.warning(f'[ANPR Detector] Vehicle inference failed: {exc}')
        return []

    for box in v_results.boxes:
        cls_id = int(box.cls[0])
        if cls_id not in _VEHICLE_CLASSES:
            continue  # skip non-vehicle detections

        v_conf = float(box.conf[0])
        x1, y1, x2, y2 = [float(v) for v in box.xyxy[0].tolist()]
        v_bbox = [x1, y1, x2 - x1, y2 - y1]  # [x, y, w, h]
        vehicle_type = _VEHICLE_CLASSES[cls_id]
        bbox_key = f'{int(x1)}_{int(y1)}_{int(x2)}_{int(y2)}'

        # Track ID assignment (populated by tracker in Phase 2; stub for now)
        track_id = (
            track_assignments.get(bbox_key, f'trk-{uuid.uuid4().hex[:6]}')
            if track_assignments
            else f'trk-{uuid.uuid4().hex[:6]}'
        )

        # Step 2 — Plate detection
        plate_boxes = _detect_plates(frame, v_bbox)

        if not plate_boxes:
            # Fallback: use vehicle bbox directly as plate crop
            plate_boxes = [v_bbox]

        for p_bbox in plate_boxes:
            obs = _process_plate(
                frame=frame,
                plate_bbox=p_bbox,
                vehicle_bbox=v_bbox,
                vehicle_type=vehicle_type,
                camera_id=camera_id,
                track_id=track_id,
                timestamp=ts,
                frame_reference=frame_reference,
                simulation_mode=simulation_mode,
            )
            if obs:
                observations.append(obs)

    return observations


def _detect_plates(frame: np.ndarray, vehicle_bbox: list[float]) -> list[list[float]]:
    """Detect plate regions within a vehicle crop. Returns list of [x,y,w,h] in frame coords."""
    if _plate_model is None:
        return []

    x, y, w, h = (int(v) for v in vehicle_bbox)
    hf, wf = frame.shape[:2]
    # Add 10% padding around vehicle crop
    pad_x = int(w * 0.1)
    pad_y = int(h * 0.1)
    x1 = max(0, x - pad_x)
    y1 = max(0, y - pad_y)
    x2 = min(wf, x + w + pad_x)
    y2 = min(hf, y + h + pad_y)
    vehicle_crop = frame[y1:y2, x1:x2]

    if vehicle_crop.size == 0:
        return []

    try:
        p_results = _plate_model(vehicle_crop, verbose=False, conf=PLATE_CONF_THRESHOLD)[0]
    except Exception as exc:
        logger.warning(f'[ANPR Detector] Plate inference failed: {exc}')
        return []

    plates = []
    for box in p_results.boxes:
        px1, py1, px2, py2 = [float(v) for v in box.xyxy[0].tolist()]
        # Translate back to full-frame coordinates
        plates.append([
            px1 + x1, py1 + y1,
            px2 - px1, py2 - py1,
        ])
    return plates


def _process_plate(
    frame: np.ndarray,
    plate_bbox: list[float],
    vehicle_bbox: list[float],
    vehicle_type: str,
    camera_id: str,
    track_id: str,
    timestamp: float,
    frame_reference: Optional[str],
    simulation_mode: bool,
) -> Optional[PlateObservation]:
    """Run preprocess → OCR → normalize → validate for a single plate bbox."""

    # Preprocess
    plate_img = crop_and_preprocess(frame, plate_bbox)
    if plate_img is None:
        return None

    # OCR
    ocr_result = run_ocr(plate_img)
    if not ocr_result.raw_text:
        return None

    # Normalize
    normalized = normalize(ocr_result.raw_text)

    # Validate
    validation = validate(normalized, min_ocr_confidence=ocr_result.confidence)

    # Build observation — raw OCR is always preserved
    return PlateObservation(
        raw_ocr=ocr_result.raw_text,
        normalized_plate=normalized.normalized,
        ocr_confidence=ocr_result.confidence,
        normalization_confidence=normalized.normalization_confidence,
        validation_status=validation.status,
        camera_id=camera_id,
        track_id=track_id,
        timestamp=timestamp,
        frame_reference=frame_reference,
        model_version=_model_version + (':SIM' if simulation_mode else ''),
        ocr_engine=ocr_result.engine,
    )
