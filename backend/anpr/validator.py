"""
anpr/validator.py — Indian Plate Format Validator
SIH26127 Phase 1

Validates a normalized plate string against:
  1. Known Indian state codes
  2. Standard format regex
  3. BH-series format regex
  4. Minimum confidence threshold

Returns a ValidationResult with status + reason, never mutates the plate.
"""

import re
from dataclasses import dataclass
from typing import Literal

from anpr.normalizer import NormalizedPlate, _STATE_CODES, _STANDARD_PLATE_RE, _BH_PLATE_RE

ValidStatus = Literal['valid', 'probable', 'invalid', 'unknown']


@dataclass
class ValidationResult:
    status: ValidStatus          # 'valid' | 'probable' | 'invalid' | 'unknown'
    reason: str                  # human-readable explanation
    passed_format: bool = False
    passed_state_code: bool = False
    passed_length: bool = False


# Plates that are syntactically valid but known to be test/demo plates
_KNOWN_TEST_PLATES = {'TEST0001', 'XXTEST00', 'SIMPLATE'}

_MIN_LENGTH = 6   # shortest valid Indian plate (e.g. MH1A1)
_MAX_LENGTH = 10  # longest valid Indian plate


def validate(plate: NormalizedPlate, min_ocr_confidence: float = 0.0) -> ValidationResult:
    """
    Validate a NormalizedPlate.

    Args:
        plate: output of normalizer.normalize()
        min_ocr_confidence: if the calling code has an OCR confidence score,
            pass it here; plates below 0.30 are always marked 'unknown'.

    Returns:
        ValidationResult
    """
    text = plate.normalized

    # Empty / too short
    if not text or len(text) < _MIN_LENGTH:
        return ValidationResult(
            status='invalid',
            reason=f'Too short: {len(text)} chars (min {_MIN_LENGTH})',
            passed_length=False,
        )

    # Too long
    if len(text) > _MAX_LENGTH:
        return ValidationResult(
            status='invalid',
            reason=f'Too long: {len(text)} chars (max {_MAX_LENGTH})',
            passed_length=False,
        )

    passed_length = True

    # Known test/simulation plates
    if text in _KNOWN_TEST_PLATES:
        return ValidationResult(
            status='invalid',
            reason='Known simulation/test plate',
            passed_length=passed_length,
        )

    # Very low OCR confidence → cannot validate
    if min_ocr_confidence > 0 and min_ocr_confidence < 0.30:
        return ValidationResult(
            status='unknown',
            reason=f'OCR confidence too low ({min_ocr_confidence:.2f}) to validate',
            passed_length=passed_length,
        )

    # BH-series check
    if _BH_PLATE_RE.match(text):
        return ValidationResult(
            status='valid',
            reason='Matches BH (Bharat) series format',
            passed_format=True,
            passed_state_code=True,
            passed_length=passed_length,
        )

    # Standard format check
    m = _STANDARD_PLATE_RE.match(text)
    if not m:
        # Could be a partial read or non-standard plate
        return ValidationResult(
            status='probable',
            reason='Does not match standard SS-DD-LL-NNNN format; may be partial or non-standard',
            passed_length=passed_length,
        )

    passed_format = True
    state = m.group(1)

    if state not in _STATE_CODES:
        return ValidationResult(
            status='probable',
            reason=f'State code "{state}" not in known Indian state code list; may be valid future/special code',
            passed_format=passed_format,
            passed_state_code=False,
            passed_length=passed_length,
        )

    # Heavy correction applied by normalizer → downgrade to probable
    if len(plate.corrections_applied) >= 3:
        return ValidationResult(
            status='probable',
            reason=f'Valid format but {len(plate.corrections_applied)} OCR corrections applied; treat as probable',
            passed_format=passed_format,
            passed_state_code=True,
            passed_length=passed_length,
        )

    return ValidationResult(
        status='valid',
        reason='Matches standard Indian plate format with known state code',
        passed_format=passed_format,
        passed_state_code=True,
        passed_length=passed_length,
    )
