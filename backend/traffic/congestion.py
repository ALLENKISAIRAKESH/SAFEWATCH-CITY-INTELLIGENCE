"""
traffic/congestion.py — Congestion Analysis
SIH26127 Phase 5

Combines density metrics with historical baselines to compute
congestion scores and identify bottleneck locations.
"""

import time
import logging
from collections import defaultdict
from datetime import datetime, timezone
from dataclasses import dataclass
from typing import Optional

from traffic.density import compute_density, DensitySnapshot

logger = logging.getLogger('safewatch.traffic.congestion')


@dataclass
class CongestionReport:
    camera_id: str
    camera_name: str
    timestamp: str
    congestion_score: float      # 0.0 (free flow) → 1.0 (gridlocked)
    congestion_level: str        # 'free' | 'light' | 'moderate' | 'heavy' | 'gridlock'
    current_vehicle_count: int
    historical_avg: float
    deviation_pct: float         # % above historical average
    is_bottleneck: bool

    def to_dict(self) -> dict:
        return {
            'camera_id': self.camera_id,
            'camera_name': self.camera_name,
            'timestamp': self.timestamp,
            'congestion_score': round(self.congestion_score, 3),
            'congestion_level': self.congestion_level,
            'current_vehicle_count': self.current_vehicle_count,
            'historical_avg': round(self.historical_avg, 1),
            'deviation_pct': round(self.deviation_pct, 1),
            'is_bottleneck': self.is_bottleneck,
        }


# ─── Historical baseline tracking ────────────────────────────────────────

# camera_id → list of (timestamp, count) for running average
_baseline: dict[str, list[tuple[float, int]]] = defaultdict(list)
_BASELINE_WINDOW = 3600  # 1 hour rolling baseline
_BOTTLENECK_THRESHOLD = 0.75  # congestion_score >= this is a bottleneck


def _classify_congestion(score: float) -> str:
    if score >= 0.9:
        return 'gridlock'
    if score >= 0.7:
        return 'heavy'
    if score >= 0.4:
        return 'moderate'
    if score >= 0.2:
        return 'light'
    return 'free'


def update_baseline(camera_id: str, count: int):
    """Record a data point into the historical baseline."""
    now = time.time()
    _baseline[camera_id].append((now, count))
    cutoff = now - _BASELINE_WINDOW
    _baseline[camera_id] = [(t, c) for t, c in _baseline[camera_id] if t > cutoff]


def get_historical_avg(camera_id: str) -> float:
    """Compute the rolling average vehicle count for a camera."""
    data = _baseline.get(camera_id, [])
    if not data:
        return 10.0  # default baseline when no history
    return sum(c for _, c in data) / len(data)


def analyze_congestion(
    camera_id: str,
    camera_name: str = '',
    window_seconds: int = 300,
) -> CongestionReport:
    """Analyze congestion for a single camera."""
    density = compute_density(camera_id, window_seconds)
    current_count = density.vehicle_count
    hist_avg = get_historical_avg(camera_id)

    update_baseline(camera_id, current_count)

    # Congestion score: normalized ratio of current vs capacity
    capacity_est = max(hist_avg * 2, 20)  # rough capacity estimate
    score = min(1.0, current_count / capacity_est)

    deviation = ((current_count - hist_avg) / hist_avg * 100) if hist_avg > 0 else 0.0

    return CongestionReport(
        camera_id=camera_id,
        camera_name=camera_name or camera_id,
        timestamp=datetime.now(timezone.utc).isoformat(),
        congestion_score=score,
        congestion_level=_classify_congestion(score),
        current_vehicle_count=current_count,
        historical_avg=hist_avg,
        deviation_pct=deviation,
        is_bottleneck=score >= _BOTTLENECK_THRESHOLD,
    )


def analyze_all_congestion(
    camera_registry: dict[str, dict],
    window_seconds: int = 300,
) -> list[dict]:
    """Analyze congestion for all cameras in registry."""
    results = []
    for cam_id, cam_info in camera_registry.items():
        report = analyze_congestion(
            cam_id,
            camera_name=cam_info.get('name', cam_id),
            window_seconds=window_seconds,
        )
        results.append(report.to_dict())
    return results


def get_bottlenecks(camera_registry: dict[str, dict]) -> list[dict]:
    """Return only cameras currently identified as bottlenecks."""
    all_reports = analyze_all_congestion(camera_registry)
    return [r for r in all_reports if r['is_bottleneck']]
