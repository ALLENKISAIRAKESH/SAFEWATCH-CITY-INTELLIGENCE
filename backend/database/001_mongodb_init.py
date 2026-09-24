"""
SafeWatch MongoDB Database Initialization & Seeding Script
Initializes MongoDB collections, sets up indexes, and seeds initial configuration.
"""

import os
import sys
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

try:
    from pymongo import MongoClient, ASCENDING, DESCENDING
except ImportError:
    print("[ERROR] pymongo not installed. Run: pip install pymongo")
    sys.exit(1)

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/safewatch")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "safewatch")


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def init_db():
    print(f"Connecting to MongoDB at {MONGO_URI} (Database: {MONGO_DB_NAME})...")
    try:
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=3000)
        client.server_info()  # trigger connection check
        db = client[MONGO_DB_NAME]
        print("[SUCCESS] Connected to MongoDB.")
    except Exception as exc:
        print(f"[WARN] Could not connect to live MongoDB daemon ({exc}).")
        print("Note: The backend will use automatic fallback memory persistence when MongoDB is offline.")
        return

    # ─── 1. Setup Collections & Indexes ─────────────────────────────────
    print("Setting up MongoDB collections and indexes...")

    # Organizations
    db.organizations.create_index([("name", ASCENDING)], unique=True)

    # Sources
    db.sources.create_index([("id", ASCENDING)], unique=True)
    db.sources.create_index([("status", ASCENDING)])

    # Zones
    db.zones.create_index([("id", ASCENDING)], unique=True)
    db.zones.create_index([("source", ASCENDING)])

    # Rules
    db.rules.create_index([("id", ASCENDING)], unique=True)
    db.rules.create_index([("enabled", ASCENDING)])

    # Incidents
    db.incidents.create_index([("id", ASCENDING)], unique=True)
    db.incidents.create_index([("status", ASCENDING)])
    db.incidents.create_index([("severity", ASCENDING)])
    db.incidents.create_index([("detectedAt", DESCENDING)])

    # Evidence
    db.evidence.create_index([("id", ASCENDING)], unique=True)
    db.evidence.create_index([("incidentId", ASCENDING)])

    # Audit Logs
    db.audit_logs.create_index([("timestamp", DESCENDING)])
    db.audit_logs.create_index([("actor", ASCENDING)])

    # ─── 2. Seed Initial Core Data ──────────────────────────────────────
    print("Seeding initial data if empty...")

    # Seed Organization
    if db.organizations.count_documents({}) == 0:
        db.organizations.insert_one({
            "id": "org-safewatch-001",
            "name": "SafeWatch Mission Control",
            "tier": "Enterprise",
            "timezone": "UTC",
            "createdAt": now_iso()
        })
        print(" -> Seeded organization.")

    # Seed Sources
    if db.sources.count_documents({}) == 0:
        db.sources.insert_many([
            {"id": "cam-01", "name": "Camera 01 — Main Entrance", "type": "IP Camera", "location": "Main Entrance", "status": "online", "fps": 30, "latency": 42, "aiModel": "Person Detection v1.0.3", "createdAt": now_iso()},
            {"id": "cam-02", "name": "Camera 02 — North Gate", "type": "PTZ Camera", "location": "North Gate", "status": "online", "fps": 25, "latency": 38, "aiModel": "Person Detection v1.0.3", "createdAt": now_iso()},
            {"id": "cam-03", "name": "Camera 03 — Restricted Zone", "type": "IP Camera", "location": "Restricted Zone", "status": "online", "fps": 30, "latency": 55, "aiModel": "Person Detection v1.0.3", "createdAt": now_iso()},
            {"id": "cam-04", "name": "Camera 04 — Parking Area", "type": "CCTV", "location": "Parking Area", "status": "online", "fps": 15, "latency": 70, "aiModel": "Vehicle Detection v1.2.1", "createdAt": now_iso()},
        ])
        print(" -> Seeded monitoring sources.")

    # Seed Rules
    if db.rules.count_documents({}) == 0:
        db.rules.insert_many([
            {"id": "rule-01", "name": "Restricted Zone Entry", "trigger": "Person in exclusion zone", "severity": "critical", "threshold": "0 sec", "sourceCount": 4, "enabled": True, "createdAt": now_iso()},
            {"id": "rule-02", "name": "Crowd Density", "trigger": "Persons count > threshold", "severity": "high", "threshold": "> 5 persons", "sourceCount": 8, "enabled": True, "createdAt": now_iso()},
            {"id": "rule-03", "name": "Loitering Detection", "trigger": "Person stationary > threshold", "severity": "medium", "threshold": "> 60 sec", "sourceCount": 3, "enabled": True, "createdAt": now_iso()},
            {"id": "rule-04", "name": "Unauthorized Vehicle", "trigger": "Vehicle in pedestrian lane", "severity": "high", "threshold": "Instant", "sourceCount": 2, "enabled": True, "createdAt": now_iso()},
        ])
        print(" -> Seeded detection rules.")

    # Seed Incidents
    if db.incidents.count_documents({}) == 0:
        db.incidents.insert_many([
            {
                "id": "INC-1042",
                "title": "Unauthorized Zone Entry",
                "severity": "critical",
                "source": "Camera 03 — Restricted Zone",
                "rule": "Restricted Zone Entry",
                "detectedAt": now_iso(),
                "status": "open",
                "assignedTo": None,
                "trackId": "#104",
                "duration": "18 sec",
                "description": "Person detected entering restricted polygon zone without clearance.",
                "evidenceId": "EVD-0031",
                "zone": "Restricted Zone",
                "createdAt": now_iso()
            },
            {
                "id": "INC-1041",
                "title": "Crowd Density Threshold Exceeded",
                "severity": "high",
                "source": "Camera 01 — Main Entrance",
                "rule": "Crowd Density",
                "detectedAt": now_iso(),
                "status": "acknowledged",
                "assignedTo": "Jordan Chen",
                "trackId": "#Multiple",
                "duration": "2 min 15 sec",
                "description": "Crowd density in main entrance exceeded threshold of 5 persons.",
                "evidenceId": "EVD-0030",
                "zone": "Entry Zone",
                "createdAt": now_iso()
            }
        ])
        print(" -> Seeded incidents.")

    print("\n[SUCCESS] MongoDB Initialization and Database Setup Complete!")


if __name__ == "__main__":
    init_db()
