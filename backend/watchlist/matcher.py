"""
watchlist/matcher.py — Plate Watchlist Matching + Alert Trigger
SIH26127 Phase 6

Provides:
  - In-memory + MongoDB-backed watchlist registry
  - Real-time plate matching against active watchlists
  - Alert generation via create_incident() + log_audit()

Watchlist entry structure:
  - plate:      normalized plate string
  - type:       'stolen' | 'wanted' | 'vip' | 'blacklist' | 'custom'
  - priority:   'critical' | 'high' | 'medium' | 'low'
  - reason:     free-text description
  - active:     bool (soft-disable without deletion)
  - created_by: actor who added the entry
  - created_at: ISO timestamp
"""

import os
import uuid
import time
import logging
from datetime import datetime, timezone
from dataclasses import dataclass, field
from typing import Optional, Literal

logger = logging.getLogger('safewatch.watchlist')

WatchType = Literal['stolen', 'wanted', 'vip', 'blacklist', 'custom']
Priority = Literal['critical', 'high', 'medium', 'low']


@dataclass
class WatchlistEntry:
    id: str
    plate: str
    type: WatchType
    priority: Priority
    reason: str
    active: bool = True
    created_by: str = 'System'
    created_at: str = ''
    updated_at: str = ''

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'plate': self.plate,
            'type': self.type,
            'priority': self.priority,
            'reason': self.reason,
            'active': self.active,
            'created_by': self.created_by,
            'created_at': self.created_at,
            'updated_at': self.updated_at,
        }


@dataclass
class WatchlistMatch:
    entry: WatchlistEntry
    matched_plate: str
    sighting_id: str
    camera_id: str
    timestamp: str
    confidence: float


# ─── In-memory watchlist store ────────────────────────────────────────────

_watchlist: dict[str, WatchlistEntry] = {}   # plate → entry
_watchlist_by_id: dict[str, WatchlistEntry] = {}  # id → entry


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def add_entry(
    plate: str,
    watch_type: WatchType = 'custom',
    priority: Priority = 'high',
    reason: str = '',
    created_by: str = 'System',
    mongo_db=None,
) -> WatchlistEntry:
    """Add a plate to the watchlist. Returns the created entry."""
    plate = plate.upper().strip()
    entry_id = f'WL-{uuid.uuid4().hex[:8].upper()}'
    now = _now_iso()
    entry = WatchlistEntry(
        id=entry_id,
        plate=plate,
        type=watch_type,
        priority=priority,
        reason=reason,
        active=True,
        created_by=created_by,
        created_at=now,
        updated_at=now,
    )
    _watchlist[plate] = entry
    _watchlist_by_id[entry_id] = entry

    if mongo_db is not None:
        try:
            mongo_db.watchlists.update_one(
                {'plate': plate},
                {'$set': entry.to_dict(), '$setOnInsert': {'plate': plate}},
                upsert=True,
            )
        except Exception as exc:
            logger.warning(f'[Watchlist] MongoDB insert failed: {exc}')

    logger.info(f'[Watchlist] Added plate {plate} (type={watch_type}, priority={priority})')
    return entry


def remove_entry(entry_id: str, mongo_db=None) -> bool:
    """Remove a watchlist entry by ID. Returns True if found and removed."""
    entry = _watchlist_by_id.pop(entry_id, None)
    if entry:
        _watchlist.pop(entry.plate, None)
        if mongo_db is not None:
            try:
                mongo_db.watchlists.delete_one({'id': entry_id})
            except Exception:
                pass
        return True
    return False


def update_entry(entry_id: str, updates: dict, mongo_db=None) -> Optional[WatchlistEntry]:
    """Update a watchlist entry. Returns updated entry or None."""
    entry = _watchlist_by_id.get(entry_id)
    if not entry:
        return None

    for key in ('type', 'priority', 'reason', 'active'):
        if key in updates:
            setattr(entry, key, updates[key])
    entry.updated_at = _now_iso()

    if mongo_db is not None:
        try:
            mongo_db.watchlists.update_one({'id': entry_id}, {'$set': entry.to_dict()})
        except Exception:
            pass

    return entry


def get_all_entries() -> list[dict]:
    """Return all watchlist entries as dicts."""
    return [e.to_dict() for e in _watchlist_by_id.values()]


def get_entry_by_id(entry_id: str) -> Optional[WatchlistEntry]:
    return _watchlist_by_id.get(entry_id)


def load_from_mongodb(mongo_db) -> int:
    """Load watchlist entries from MongoDB into memory. Returns count loaded."""
    try:
        docs = list(mongo_db.watchlists.find({}, {'_id': 0}))
        count = 0
        for doc in docs:
            entry = WatchlistEntry(
                id=doc.get('id', f'WL-{uuid.uuid4().hex[:8].upper()}'),
                plate=doc.get('plate', ''),
                type=doc.get('type', 'custom'),
                priority=doc.get('priority', 'medium'),
                reason=doc.get('reason', ''),
                active=doc.get('active', True),
                created_by=doc.get('created_by', 'System'),
                created_at=doc.get('created_at', ''),
                updated_at=doc.get('updated_at', ''),
            )
            if entry.plate:
                _watchlist[entry.plate] = entry
                _watchlist_by_id[entry.id] = entry
                count += 1
        logger.info(f'[Watchlist] Loaded {count} entries from MongoDB')
        return count
    except Exception as exc:
        logger.warning(f'[Watchlist] Failed loading from MongoDB: {exc}')
        return 0


# ─── Matching ─────────────────────────────────────────────────────────────

def check_plate(
    plate: str,
    sighting_id: str = '',
    camera_id: str = '',
    confidence: float = 0.0,
) -> Optional[WatchlistMatch]:
    """
    Check if a plate matches any active watchlist entry.
    Returns a WatchlistMatch if matched, else None.
    """
    plate = plate.upper().strip()
    entry = _watchlist.get(plate)
    if entry and entry.active:
        return WatchlistMatch(
            entry=entry,
            matched_plate=plate,
            sighting_id=sighting_id,
            camera_id=camera_id,
            timestamp=_now_iso(),
            confidence=confidence,
        )
    return None


def check_plate_fuzzy(plate: str, max_edit_distance: int = 1) -> list[WatchlistEntry]:
    """
    Fuzzy matching: find watchlist entries within edit distance of given plate.
    Useful for partial OCR reads. Returns list of matching entries.
    """
    plate = plate.upper().strip()
    matches = []
    for wl_plate, entry in _watchlist.items():
        if not entry.active:
            continue
        if _edit_distance(plate, wl_plate) <= max_edit_distance:
            matches.append(entry)
    return matches


def _edit_distance(a: str, b: str) -> int:
    """Compute Levenshtein edit distance between two strings."""
    if len(a) < len(b):
        return _edit_distance(b, a)
    if len(b) == 0:
        return len(a)
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a):
        curr = [i + 1]
        for j, cb in enumerate(b):
            cost = 0 if ca == cb else 1
            curr.append(min(prev[j + 1] + 1, curr[j] + 1, prev[j] + cost))
        prev = curr
    return prev[len(b)]
