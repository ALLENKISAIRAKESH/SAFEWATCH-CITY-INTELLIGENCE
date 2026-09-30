"""
anpr/normalizer.py — Indian Vehicle Registration Plate Normalizer
SIH26127 Phase 1

Handles:
  - Whitespace / separator removal
  - Case normalization (uppercase)
  - Common OCR character confusions (0↔O, 1↔I, 8↔B, 5↔S)
  - Indian plate format extraction (state + district + series + number)

Rules:
  - Raw OCR output is ALWAYS retained alongside the normalized form.
  - Uncertain characters are NEVER silently changed without recording the
    original; ambiguous corrections are flagged.
"""

import re
from dataclasses import dataclass, field
from typing import Optional

# ─── Indian plate format patterns ─────────────────────────────────────────
#
# Standard format: SS DD LL NNNN
#   SS  = 2-letter state code  (MH, DL, TN, KA, TS, AP, …)
#   DD  = 2-digit district code (01–99)
#   LL  = 1–2 letter series    (A–ZZ)
#   NNNN= 1–4 digit number     (1–9999)
#
# BH-series (Bharat series): YY BH NNNN LL
#   YY  = 2-digit year
#   BH  = literal "BH"
#   NNNN= 4-digit number
#   LL  = 2-letter category
#
# Temporary/Trade plates use slightly different formats; we validate those
# separately and flag them.
#
# Reference: Central Motor Vehicles Rules, 1989

_STATE_CODES = {
    'AN','AP','AR','AS','BR','CG','CH','DD','DL','DN','GA','GJ','HP',
    'HR','JH','JK','KA','KL','LA','LD','MH','ML','MN','MP','MZ','NL',
    'OD','PB','PY','RJ','SK','TN','TR','TS','UK','UP','WB',
    # Common variants / legacy
    'OR',  # Odisha legacy
}

_STANDARD_PLATE_RE = re.compile(
    r'^([A-Z]{2})'           # state code
    r'(\d{2})'               # district
    r'([A-Z]{1,2})'          # series
    r'(\d{1,4})$'            # number
)

_BH_PLATE_RE = re.compile(
    r'^(\d{2})'              # year
    r'(BH)'                  # literal BH
    r'(\d{4})'               # number
    r'([A-Z]{2})$'           # category
)

# Characters that OCR commonly confuses:
# key = frequently-misread char, value = likely intended char
_OCR_ALPHA_FIX: dict[str, str] = {
    '0': 'O',   # in letter positions
    '1': 'I',
    '8': 'B',
    '5': 'S',
    '6': 'G',
    '2': 'Z',
}

_OCR_DIGIT_FIX: dict[str, str] = {
    'O': '0',   # in digit positions
    'I': '1',
    'B': '8',
    'S': '5',
    'G': '6',
    'Z': '2',
    'Q': '0',
}


@dataclass
class NormalizedPlate:
    raw_ocr: str                     # original OCR output, unchanged
    normalized: str                  # best normalized form
    state_code: Optional[str] = None
    district: Optional[str] = None
    series: Optional[str] = None
    number: Optional[str] = None
    bh_series: bool = False
    corrections_applied: list[str] = field(default_factory=list)
    normalization_confidence: float = 1.0  # degrades with each correction


def _strip_separators(text: str) -> str:
    """Remove spaces, hyphens, dots, underscores from a plate string."""
    return re.sub(r'[\s\-._]', '', text)


def _to_upper(text: str) -> str:
    return text.upper().strip()


def _apply_positional_fix(plate: str) -> tuple[str, list[str]]:
    """
    Apply position-aware OCR confusion corrections for standard plates.
    Positions 0-1: state code (alpha) — fix digit→alpha confusions
    Positions 2-3: district (digit) — fix alpha→digit confusions
    Positions 4-5: series (alpha) — fix digit→alpha confusions
    Positions 6+:  number (digit) — fix alpha→digit confusions

    Returns (corrected_plate, list_of_corrections_applied).
    """
    if len(plate) < 6:
        return plate, []

    corrections: list[str] = []
    chars = list(plate)

    # State code: positions 0-1 must be alpha
    for i in range(2):
        c = chars[i]
        if c.isdigit() and c in _OCR_ALPHA_FIX:
            fix = _OCR_ALPHA_FIX[c]
            corrections.append(f'pos{i}:{c}→{fix}(alpha-zone)')
            chars[i] = fix

    # District: positions 2-3 must be digit
    for i in range(2, 4):
        c = chars[i]
        if c.isalpha() and c in _OCR_DIGIT_FIX:
            fix = _OCR_DIGIT_FIX[c]
            corrections.append(f'pos{i}:{c}→{fix}(digit-zone)')
            chars[i] = fix

    # Series: positions 4-5 (1 or 2 alpha chars before the trailing digits)
    # Detect where digits begin after position 3
    digit_start = None
    for i in range(4, len(chars)):
        if chars[i].isdigit():
            digit_start = i
            break
    if digit_start is None:
        digit_start = len(chars)

    for i in range(4, digit_start):
        c = chars[i]
        if c.isdigit() and c in _OCR_ALPHA_FIX:
            fix = _OCR_ALPHA_FIX[c]
            corrections.append(f'pos{i}:{c}→{fix}(series-zone)')
            chars[i] = fix

    # Number: remaining positions must be digits
    for i in range(digit_start, len(chars)):
        c = chars[i]
        if c.isalpha() and c in _OCR_DIGIT_FIX:
            fix = _OCR_DIGIT_FIX[c]
            corrections.append(f'pos{i}:{c}→{fix}(number-zone)')
            chars[i] = fix

    return ''.join(chars), corrections


def normalize(raw_ocr: str) -> NormalizedPlate:
    """
    Normalize a raw OCR string into a structured Indian plate form.

    Always stores raw_ocr unchanged.
    Returns a NormalizedPlate with corrections_applied list so callers
    can assess how heavily the result was modified.
    """
    stripped = _strip_separators(_to_upper(raw_ocr))
    plate, corrections = _apply_positional_fix(stripped)

    confidence_penalty = len(corrections) * 0.05
    norm_conf = max(0.0, 1.0 - confidence_penalty)

    result = NormalizedPlate(
        raw_ocr=raw_ocr,
        normalized=plate,
        corrections_applied=corrections,
        normalization_confidence=norm_conf,
    )

    # Try standard format
    m = _STANDARD_PLATE_RE.match(plate)
    if m:
        result.state_code = m.group(1)
        result.district = m.group(2)
        result.series = m.group(3)
        result.number = m.group(4).lstrip('0') or '0'
        return result

    # Try BH series
    m = _BH_PLATE_RE.match(plate)
    if m:
        result.bh_series = True
        result.state_code = 'BH'
        result.series = m.group(1)
        result.number = m.group(3)
        return result

    # Could not parse structure — return best-effort normalized string
    return result
