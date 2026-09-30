"""
anpr/consensus.py — Multi-Frame OCR Consensus Engine
SIH26127 Phase 1

A single OCR frame is NEVER automatically treated as ground truth.

For a given vehicle track (identified by camera_id + track_id), we collect
multiple OCR observations over consecutive frames and apply a voting/scoring
mechanism to produce a final plate reading.

Algorithm:
  1. Each observation is a (normalized_plate, ocr_confidence, frame_time).
  2. Observations are grouped by normalized_plate candidate.
  3. The winning candidate is the one with the highest combined vote-weight.
  4. vote_weight = ocr_confidence * count_weight
     where count_weight favors candidates seen in more frames.
  5. Consensus is accepted only when:
       - winning candidate has >= MIN_OBSERVATIONS frames, OR
       - winning confidence >= HIGH_CONF_THRESHOLD (single-frame bypass)
  6. Disagreement count and confidence are stored for auditability.

Configurable via environment variables (ANPR_MIN_OBSERVATIONS, etc.).
"""

import os
import time
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Optional

# ─── Thresholds ───────────────────────────────────────────────────────────

MIN_OBSERVATIONS: int = int(os.getenv('ANPR_MIN_OBSERVATIONS', '3'))
HIGH_CONF_BYPASS: float = float(os.getenv('ANPR_HIGH_CONF_BYPASS', '0.92'))
MAX_TRACK_AGE_SEC: float = float(os.getenv('ANPR_MAX_TRACK_AGE_SEC', '10.0'))
MAX_CANDIDATES: int = 10  # max distinct candidates per track window


# ─── Types ────────────────────────────────────────────────────────────────

@dataclass
class PlateObservation:
    raw_ocr: str
    normalized_plate: str
    ocr_confidence: float
    normalization_confidence: float
    validation_status: str        # 'valid' | 'probable' | 'invalid' | 'unknown'
    camera_id: str
    track_id: str
    timestamp: float              # epoch seconds
    frame_reference: Optional[str] = None
    plate_crop_reference: Optional[str] = None
    model_version: str = 'unknown'
    ocr_engine: str = 'unknown'


@dataclass
class ConsensusResult:
    plate: str                                 # winning normalized plate
    consensus_confidence: float                # 0.0–1.0
    observation_count: int                     # total frames considered
    supporting_observations: list[PlateObservation] = field(default_factory=list)
    disagreement_count: int = 0               # frames that voted for a different plate
    candidate_votes: dict = field(default_factory=dict)  # plate → vote weight
    accepted: bool = False                    # True if consensus threshold met
    reason: str = ''


# ─── Per-track buffer ─────────────────────────────────────────────────────

class TrackBuffer:
    """Accumulates plate observations for a single vehicle track."""

    def __init__(self, camera_id: str, track_id: str):
        self.camera_id = camera_id
        self.track_id = track_id
        self.observations: list[PlateObservation] = []
        self.created_at: float = time.time()
        self.last_updated: float = time.time()

    def add(self, obs: PlateObservation) -> None:
        self.observations.append(obs)
        self.last_updated = time.time()
        # Prune old observations outside the rolling time window
        cutoff = time.time() - MAX_TRACK_AGE_SEC
        self.observations = [o for o in self.observations if o.timestamp >= cutoff]

    def is_stale(self) -> bool:
        return (time.time() - self.last_updated) > MAX_TRACK_AGE_SEC

    def compute_consensus(self) -> ConsensusResult:
        return compute_consensus(self.observations)


# ─── Global buffer registry ───────────────────────────────────────────────
# key = (camera_id, track_id)
_track_buffers: dict[tuple[str, str], TrackBuffer] = {}


def get_or_create_buffer(camera_id: str, track_id: str) -> TrackBuffer:
    key = (camera_id, track_id)
    if key not in _track_buffers:
        _track_buffers[key] = TrackBuffer(camera_id, track_id)
    return _track_buffers[key]


def flush_stale_buffers() -> int:
    """Remove buffers for tracks that have gone stale. Returns count removed."""
    stale = [k for k, v in _track_buffers.items() if v.is_stale()]
    for k in stale:
        del _track_buffers[k]
    return len(stale)


# ─── Core consensus algorithm ─────────────────────────────────────────────

def compute_consensus(observations: list[PlateObservation]) -> ConsensusResult:
    """
    Compute the consensus plate from a list of observations.
    Pure function — does not mutate any buffer.
    """
    if not observations:
        return ConsensusResult(
            plate='',
            consensus_confidence=0.0,
            observation_count=0,
            accepted=False,
            reason='No observations',
        )

    # Filter out empty/invalid OCR results
    valid_obs = [o for o in observations if o.normalized_plate and o.ocr_confidence > 0.1]
    if not valid_obs:
        return ConsensusResult(
            plate='',
            consensus_confidence=0.0,
            observation_count=len(observations),
            accepted=False,
            reason='All observations had empty or zero-confidence OCR',
        )

    # Group by candidate plate and compute vote-weight
    candidate_weights: dict[str, float] = defaultdict(float)
    candidate_obs: dict[str, list[PlateObservation]] = defaultdict(list)
    candidate_counts: dict[str, int] = defaultdict(int)

    for obs in valid_obs:
        p = obs.normalized_plate
        candidate_counts[p] += 1
        candidate_obs[p].append(obs)

    total = len(valid_obs)
    for p, count in candidate_counts.items():
        avg_conf = sum(o.ocr_confidence for o in candidate_obs[p]) / count
        count_weight = count / total   # fraction of frames that agree
        candidate_weights[p] = avg_conf * (0.5 + 0.5 * count_weight)

    # Sort candidates by weight descending
    ranked = sorted(candidate_weights.items(), key=lambda x: x[1], reverse=True)
    winner_plate, winner_weight = ranked[0]
    winner_obs = candidate_obs[winner_plate]
    disagreement_count = total - candidate_counts[winner_plate]

    # High-confidence single-frame bypass
    if len(winner_obs) == 1 and winner_obs[0].ocr_confidence >= HIGH_CONF_BYPASS:
        return ConsensusResult(
            plate=winner_plate,
            consensus_confidence=winner_weight,
            observation_count=total,
            supporting_observations=winner_obs,
            disagreement_count=disagreement_count,
            candidate_votes=dict(ranked),
            accepted=True,
            reason=f'High-confidence single-frame bypass (conf={winner_obs[0].ocr_confidence:.2f})',
        )

    # Normal consensus: need MIN_OBSERVATIONS
    accepted = candidate_counts[winner_plate] >= MIN_OBSERVATIONS
    reason = (
        f'Consensus: {candidate_counts[winner_plate]}/{total} frames agree on "{winner_plate}"'
        if accepted else
        f'Pending: only {candidate_counts[winner_plate]}/{MIN_OBSERVATIONS} required observations'
    )

    return ConsensusResult(
        plate=winner_plate,
        consensus_confidence=winner_weight,
        observation_count=total,
        supporting_observations=winner_obs,
        disagreement_count=disagreement_count,
        candidate_votes=dict(ranked),
        accepted=accepted,
        reason=reason,
    )


def add_observation_and_check(obs: PlateObservation) -> Optional[ConsensusResult]:
    """
    Add an observation to the track buffer and return a ConsensusResult
    if the buffer has enough evidence, else return None.
    """
    buf = get_or_create_buffer(obs.camera_id, obs.track_id)
    buf.add(obs)
    result = buf.compute_consensus()
    return result if result.accepted else None
