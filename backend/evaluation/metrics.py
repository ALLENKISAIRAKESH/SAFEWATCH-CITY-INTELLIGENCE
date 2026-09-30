"""
evaluation/metrics.py — ANPR Pipeline Evaluation Metrics
SIH26127 Phase 7

Computes and tracks:
  - Precision / Recall / F1 for plate detection
  - Character Error Rate (CER) for OCR accuracy
  - Processing FPS and latency per frame
  - Per-engine OCR accuracy comparison

IMPORTANT: No fabricated accuracy. All metrics trace to actual
detection events or are explicitly labeled 'NOT YET BENCHMARKED'.

MongoDB collection: anpr_evaluations
"""

import time
import uuid
import logging
from collections import defaultdict
from datetime import datetime, timezone
from dataclasses import dataclass, field
from typing import Optional

logger = logging.getLogger('safewatch.evaluation')


@dataclass
class EvaluationRun:
    id: str
    started_at: str
    completed_at: str
    status: str  # 'running' | 'complete' | 'failed'
    total_frames: int = 0
    total_plates_detected: int = 0
    true_positives: int = 0
    false_positives: int = 0
    false_negatives: int = 0
    precision: Optional[float] = None
    recall: Optional[float] = None
    f1_score: Optional[float] = None
    avg_cer: Optional[float] = None
    avg_fps: Optional[float] = None
    avg_latency_ms: Optional[float] = None
    ocr_engine: str = 'unknown'
    model_version: str = 'unknown'
    dataset_name: str = 'live'
    notes: str = ''

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'started_at': self.started_at,
            'completed_at': self.completed_at,
            'status': self.status,
            'total_frames': self.total_frames,
            'total_plates_detected': self.total_plates_detected,
            'true_positives': self.true_positives,
            'false_positives': self.false_positives,
            'false_negatives': self.false_negatives,
            'precision': round(self.precision, 4) if self.precision is not None else None,
            'recall': round(self.recall, 4) if self.recall is not None else None,
            'f1_score': round(self.f1_score, 4) if self.f1_score is not None else None,
            'avg_cer': round(self.avg_cer, 4) if self.avg_cer is not None else None,
            'avg_fps': round(self.avg_fps, 2) if self.avg_fps is not None else None,
            'avg_latency_ms': round(self.avg_latency_ms, 2) if self.avg_latency_ms is not None else None,
            'ocr_engine': self.ocr_engine,
            'model_version': self.model_version,
            'dataset_name': self.dataset_name,
            'notes': self.notes,
        }


# ─── In-memory metrics tracking ──────────────────────────────────────────

_evaluation_runs: list[EvaluationRun] = []
_frame_latencies: list[float] = []   # ms per frame
_cer_scores: list[float] = []


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ─── Character Error Rate (CER) ──────────────────────────────────────────

def compute_cer(predicted: str, ground_truth: str) -> float:
    """
    Compute Character Error Rate between predicted and ground truth strings.
    CER = edit_distance(pred, truth) / len(truth)
    Returns 0.0 for perfect match, 1.0+ for high error.
    """
    if not ground_truth:
        return 0.0 if not predicted else 1.0

    n = len(ground_truth)
    m = len(predicted)

    # Levenshtein distance
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n + 1):
        dp[i][0] = i
    for j in range(m + 1):
        dp[0][j] = j

    for i in range(1, n + 1):
        for j in range(1, m + 1):
            cost = 0 if ground_truth[i - 1] == predicted[j - 1] else 1
            dp[i][j] = min(
                dp[i - 1][j] + 1,
                dp[i][j - 1] + 1,
                dp[i - 1][j - 1] + cost,
            )

    return dp[n][m] / n


def record_cer(predicted: str, ground_truth: str) -> float:
    """Record a CER measurement and return the CER value."""
    cer = compute_cer(predicted, ground_truth)
    _cer_scores.append(cer)
    if len(_cer_scores) > 1000:
        del _cer_scores[:500]
    return cer


# ─── Latency tracking ────────────────────────────────────────────────────

def record_frame_latency(latency_ms: float):
    """Record the processing latency for a single frame."""
    _frame_latencies.append(latency_ms)
    if len(_frame_latencies) > 1000:
        del _frame_latencies[:500]


def get_avg_latency() -> Optional[float]:
    """Return average frame processing latency in ms."""
    if not _frame_latencies:
        return None
    return sum(_frame_latencies) / len(_frame_latencies)


def get_avg_fps() -> Optional[float]:
    """Estimate FPS from recorded latencies."""
    avg = get_avg_latency()
    if avg is None or avg <= 0:
        return None
    return 1000.0 / avg


# ─── Precision / Recall computation ──────────────────────────────────────

def compute_precision_recall(
    true_positives: int,
    false_positives: int,
    false_negatives: int,
) -> tuple[Optional[float], Optional[float], Optional[float]]:
    """
    Compute precision, recall, and F1 from counts.
    Returns (precision, recall, f1) or (None, None, None) if undefined.
    """
    if true_positives + false_positives == 0:
        precision = None
    else:
        precision = true_positives / (true_positives + false_positives)

    if true_positives + false_negatives == 0:
        recall = None
    else:
        recall = true_positives / (true_positives + false_negatives)

    if precision is not None and recall is not None and (precision + recall) > 0:
        f1 = 2 * (precision * recall) / (precision + recall)
    else:
        f1 = None

    return precision, recall, f1


# ─── Evaluation run management ────────────────────────────────────────────

def start_evaluation(
    model_version: str = 'unknown',
    ocr_engine: str = 'unknown',
    dataset_name: str = 'live',
    notes: str = '',
) -> EvaluationRun:
    """Start a new evaluation run."""
    run = EvaluationRun(
        id=f'EVAL-{uuid.uuid4().hex[:8].upper()}',
        started_at=_now_iso(),
        completed_at='',
        status='running',
        ocr_engine=ocr_engine,
        model_version=model_version,
        dataset_name=dataset_name,
        notes=notes,
    )
    _evaluation_runs.append(run)
    logger.info(f'[Evaluation] Started run {run.id}')
    return run


def complete_evaluation(
    run_id: str,
    true_positives: int,
    false_positives: int,
    false_negatives: int,
    total_frames: int = 0,
) -> Optional[EvaluationRun]:
    """Complete an evaluation run with final metrics."""
    run = next((r for r in _evaluation_runs if r.id == run_id), None)
    if not run:
        return None

    precision, recall, f1 = compute_precision_recall(true_positives, false_positives, false_negatives)

    run.completed_at = _now_iso()
    run.status = 'complete'
    run.true_positives = true_positives
    run.false_positives = false_positives
    run.false_negatives = false_negatives
    run.total_frames = total_frames
    run.total_plates_detected = true_positives + false_positives
    run.precision = precision
    run.recall = recall
    run.f1_score = f1
    run.avg_cer = sum(_cer_scores) / len(_cer_scores) if _cer_scores else None
    run.avg_fps = get_avg_fps()
    run.avg_latency_ms = get_avg_latency()

    logger.info(
        f'[Evaluation] Completed run {run.id}: '
        f'P={precision}, R={recall}, F1={f1}, CER={run.avg_cer}'
    )
    return run


def get_evaluation_runs(limit: int = 20) -> list[dict]:
    """Return recent evaluation runs."""
    return [r.to_dict() for r in _evaluation_runs[-limit:]]


def get_evaluation_by_id(run_id: str) -> Optional[dict]:
    """Get a specific evaluation run."""
    run = next((r for r in _evaluation_runs if r.id == run_id), None)
    return run.to_dict() if run else None


def get_live_metrics() -> dict:
    """
    Return current live (un-benchmarked) pipeline metrics.
    Labeled clearly as live telemetry, not a formal benchmark.
    """
    avg_lat = get_avg_latency()
    avg_fps = get_avg_fps()
    avg_cer = sum(_cer_scores) / len(_cer_scores) if _cer_scores else None

    return {
        'status': 'live_telemetry',
        'note': 'These are live pipeline metrics, NOT formal benchmark results.',
        'total_frames_processed': len(_frame_latencies),
        'avg_latency_ms': round(avg_lat, 2) if avg_lat else 'NOT YET BENCHMARKED',
        'avg_fps': round(avg_fps, 2) if avg_fps else 'NOT YET BENCHMARKED',
        'avg_cer': round(avg_cer, 4) if avg_cer else 'NOT YET BENCHMARKED',
        'cer_samples': len(_cer_scores),
        'evaluation_runs': len(_evaluation_runs),
        'timestamp': _now_iso(),
    }


def persist_evaluation(run: EvaluationRun, mongo_db) -> None:
    """Persist an evaluation run to MongoDB."""
    try:
        mongo_db.anpr_evaluations.update_one(
            {'id': run.id},
            {'$set': run.to_dict()},
            upsert=True,
        )
    except Exception as exc:
        logger.warning(f'[Evaluation] MongoDB persist failed: {exc}')
