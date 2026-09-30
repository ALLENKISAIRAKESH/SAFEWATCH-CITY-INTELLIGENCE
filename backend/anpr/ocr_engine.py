"""
anpr/ocr_engine.py — OCR Engine Wrapper
SIH26127 Phase 1

Primary:  EasyOCR  (pip install easyocr)
Fallback: Tesseract via pytesseract (if easyocr unavailable)
Last resort: regex-only stub that returns empty string with zero confidence

Design rules:
  - Never crash; always return an OcrResult (possibly with empty text)
  - Always report which engine produced the result
  - Always report per-character confidence where available
  - Never silently alter the raw text; normalization happens in normalizer.py
"""

import cv2
import numpy as np
from dataclasses import dataclass, field
from typing import Optional
import logging

logger = logging.getLogger('safewatch.ocr')

# ─── Engine availability detection ────────────────────────────────────────

_easyocr_reader = None
_easyocr_available = False
_pytesseract_available = False
_engine_name = 'stub'

try:
    import easyocr
    _easyocr_reader = easyocr.Reader(['en'], gpu=False, verbose=False)
    _easyocr_available = True
    _engine_name = 'easyocr'
    logger.info('[OCR] EasyOCR initialized (CPU mode)')
except Exception as _e:
    logger.warning(f'[OCR] EasyOCR unavailable: {_e}')
    try:
        import pytesseract
        pytesseract.get_tesseract_version()
        _pytesseract_available = True
        _engine_name = 'tesseract'
        logger.info('[OCR] Tesseract fallback active')
    except Exception as _e2:
        logger.warning(f'[OCR] Tesseract unavailable: {_e2}. Using stub engine.')
        _engine_name = 'stub'


# ─── Result type ──────────────────────────────────────────────────────────

@dataclass
class OcrResult:
    raw_text: str                        # exactly what the OCR returned
    confidence: float                    # 0.0–1.0
    engine: str                          # 'easyocr' | 'tesseract' | 'stub'
    char_confidences: list[float] = field(default_factory=list)
    bboxes: list = field(default_factory=list)  # raw bounding boxes from engine
    error: Optional[str] = None


# ─── Public API ───────────────────────────────────────────────────────────

def run_ocr(image: np.ndarray) -> OcrResult:
    """
    Run OCR on a preprocessed plate image.

    Args:
        image: numpy array (BGR or grayscale), already preprocessed

    Returns:
        OcrResult with raw_text, confidence, engine name
    """
    if _easyocr_available:
        return _run_easyocr(image)
    if _pytesseract_available:
        return _run_tesseract(image)
    return OcrResult(
        raw_text='',
        confidence=0.0,
        engine='stub',
        error='No OCR engine available. Install easyocr: pip install easyocr',
    )


def engine_name() -> str:
    return _engine_name


# ─── EasyOCR ──────────────────────────────────────────────────────────────

def _run_easyocr(image: np.ndarray) -> OcrResult:
    try:
        # EasyOCR expects RGB or grayscale
        if len(image.shape) == 3:
            rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        else:
            rgb = image

        results = _easyocr_reader.readtext(
            rgb,
            allowlist='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
            detail=1,
            paragraph=False,
        )

        if not results:
            return OcrResult(raw_text='', confidence=0.0, engine='easyocr')

        # Concatenate all detected text segments (usually just one for a plate)
        texts = []
        confs = []
        bboxes = []
        for (bbox, text, conf) in results:
            texts.append(text.upper().strip())
            confs.append(float(conf))
            bboxes.append(bbox)

        combined = ''.join(texts)
        avg_conf = sum(confs) / len(confs) if confs else 0.0

        return OcrResult(
            raw_text=combined,
            confidence=avg_conf,
            engine='easyocr',
            char_confidences=confs,
            bboxes=bboxes,
        )
    except Exception as exc:
        logger.warning(f'[OCR] EasyOCR failed: {exc}')
        return OcrResult(raw_text='', confidence=0.0, engine='easyocr', error=str(exc))


# ─── Tesseract fallback ───────────────────────────────────────────────────

def _run_tesseract(image: np.ndarray) -> OcrResult:
    try:
        import pytesseract
        from PIL import Image

        if len(image.shape) == 3:
            pil_img = Image.fromarray(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
        else:
            pil_img = Image.fromarray(image)

        # PSM 7 = single text line (ideal for plates)
        config = '--psm 7 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
        data = pytesseract.image_to_data(pil_img, config=config, output_type=pytesseract.Output.DICT)

        texts = []
        confs = []
        for i, word in enumerate(data['text']):
            word = word.strip()
            conf = int(data['conf'][i])
            if word and conf >= 0:
                texts.append(word.upper())
                confs.append(conf / 100.0)

        combined = ''.join(texts)
        avg_conf = sum(confs) / len(confs) if confs else 0.0

        return OcrResult(
            raw_text=combined,
            confidence=avg_conf,
            engine='tesseract',
            char_confidences=confs,
        )
    except Exception as exc:
        logger.warning(f'[OCR] Tesseract failed: {exc}')
        return OcrResult(raw_text='', confidence=0.0, engine='tesseract', error=str(exc))
