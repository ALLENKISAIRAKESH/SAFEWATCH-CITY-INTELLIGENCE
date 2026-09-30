"""
anpr/preprocessor.py — Plate Image Preprocessor
SIH26127 Phase 1

Pipeline:
  1. Crop plate region from full frame
  2. Resize to standard height (64 px)
  3. Perspective / deskew correction
  4. Denoise (bilateral filter)
  5. Contrast enhancement (CLAHE)
  6. Optional binarization (Otsu)

All operations use OpenCV (already in requirements).
No external AI model needed for preprocessing.
"""

import cv2
import numpy as np
from typing import Optional


# ─── Config ───────────────────────────────────────────────────────────────

TARGET_HEIGHT = 64          # pixels — fixed height after resize
MAX_WIDTH = 640             # pixels — cap width to avoid huge crops
BILATERAL_D = 5             # bilateral filter diameter
BILATERAL_SIGMA_COLOR = 50
BILATERAL_SIGMA_SPACE = 50
CLAHE_CLIP = 2.0
CLAHE_TILE = (4, 4)


# ─── Public API ───────────────────────────────────────────────────────────

def crop_and_preprocess(
    frame: np.ndarray,
    bbox: list[float],           # [x, y, w, h] in pixels
    plate_corners: Optional[np.ndarray] = None,  # 4×2 float array for perspective
    binarize: bool = False,
) -> Optional[np.ndarray]:
    """
    Crop a plate region from a full frame and run the preprocessing pipeline.

    Args:
        frame:          BGR numpy array (full camera frame)
        bbox:           [x, y, w, h] bounding box of the plate
        plate_corners:  optional 4-point array for perspective correction
                        (top-left, top-right, bottom-right, bottom-left)
        binarize:       if True, apply Otsu binarization after CLAHE

    Returns:
        Preprocessed BGR (or grayscale if binarize=True) numpy array,
        or None if the crop is invalid.
    """
    try:
        crop = _crop(frame, bbox)
        if crop is None:
            return None
        if plate_corners is not None:
            crop = _perspective_correct(crop, plate_corners)
        crop = _resize(crop)
        crop = _denoise(crop)
        crop = _enhance_contrast(crop)
        if binarize:
            crop = _binarize(crop)
        return crop
    except Exception as exc:
        print(f'[ANPR Preprocessor] Error: {exc}')
        return None


def preprocess_raw(image: np.ndarray, binarize: bool = False) -> np.ndarray:
    """
    Run preprocessing on an already-cropped plate image.
    Useful when the detector returns a cropped plate directly.
    """
    img = _resize(image)
    img = _denoise(img)
    img = _enhance_contrast(img)
    if binarize:
        img = _binarize(img)
    return img


# ─── Internal steps ───────────────────────────────────────────────────────

def _crop(frame: np.ndarray, bbox: list[float]) -> Optional[np.ndarray]:
    h_frame, w_frame = frame.shape[:2]
    x, y, w, h = (int(v) for v in bbox)
    # Clamp to frame bounds
    x1 = max(0, x)
    y1 = max(0, y)
    x2 = min(w_frame, x + w)
    y2 = min(h_frame, y + h)
    if x2 <= x1 or y2 <= y1:
        return None
    return frame[y1:y2, x1:x2].copy()


def _perspective_correct(crop: np.ndarray, corners: np.ndarray) -> np.ndarray:
    """
    Apply perspective warp using 4 detected corner points.
    corners: np.array of shape (4, 2) in order TL, TR, BR, BL
    """
    src = corners.astype(np.float32)
    # Compute target dimensions from corner distances
    w_top = np.linalg.norm(src[1] - src[0])
    w_bot = np.linalg.norm(src[2] - src[3])
    h_left = np.linalg.norm(src[3] - src[0])
    h_right = np.linalg.norm(src[2] - src[1])
    W = int(max(w_top, w_bot))
    H = int(max(h_left, h_right))
    if W <= 0 or H <= 0:
        return crop
    dst = np.array([[0, 0], [W - 1, 0], [W - 1, H - 1], [0, H - 1]], dtype=np.float32)
    M = cv2.getPerspectiveTransform(src, dst)
    return cv2.warpPerspective(crop, M, (W, H))


def _resize(img: np.ndarray) -> np.ndarray:
    h, w = img.shape[:2]
    if h == 0:
        return img
    scale = TARGET_HEIGHT / h
    new_w = min(int(w * scale), MAX_WIDTH)
    if new_w <= 0:
        return img
    return cv2.resize(img, (new_w, TARGET_HEIGHT), interpolation=cv2.INTER_CUBIC)


def _denoise(img: np.ndarray) -> np.ndarray:
    return cv2.bilateralFilter(img, BILATERAL_D, BILATERAL_SIGMA_COLOR, BILATERAL_SIGMA_SPACE)


def _enhance_contrast(img: np.ndarray) -> np.ndarray:
    """Apply CLAHE on L-channel (LAB color space) for natural contrast enhancement."""
    if len(img.shape) == 2 or img.shape[2] == 1:
        # Grayscale
        clahe = cv2.createCLAHE(clipLimit=CLAHE_CLIP, tileGridSize=CLAHE_TILE)
        return clahe.apply(img if len(img.shape) == 2 else img[:, :, 0])
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=CLAHE_CLIP, tileGridSize=CLAHE_TILE)
    l = clahe.apply(l)
    return cv2.cvtColor(cv2.merge([l, a, b]), cv2.COLOR_LAB2BGR)


def _binarize(img: np.ndarray) -> np.ndarray:
    """Convert to grayscale and apply Otsu binarization."""
    if len(img.shape) == 3:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    else:
        gray = img
    _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    return binary
