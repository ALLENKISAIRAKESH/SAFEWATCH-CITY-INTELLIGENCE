"""
demo_city_simulation.py — Phase 8: SIH Demo City Simulation
SIH26127 SafeWatch Vehicle Intelligence

Simulates a 6-camera Indian city network with realistic vehicle flow:
  - MH, DL, KA, HR, TN, GJ, UP state plate formats
  - Normal vehicles, stolen vehicles, anomalous cloned-plate transitions
  - Clearly labeled SIMULATION throughout

Usage:
    python backend/demo_city_simulation.py [--duration 120] [--host http://localhost:5000]

The backend MUST be running before this script is started.
"""

import argparse
import random
import sys
import time
import threading
from datetime import datetime, timezone

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

try:
    import requests
except ImportError:
    print("[ERROR] requests not installed. Run: pip install requests")
    sys.exit(1)

# ─── SIMULATION LABEL ─────────────────────────────────────────────────────
# This is a simulation. All plates and events are synthetic.

BANNER = """
╔═════════════════════════════════════════════════════════╗
║   SIH 26127 — AI Vehicle Intelligence & Traffic System  ║
║   ⚠️  SIMULATION MODE — Synthetic Traffic Stream          ║
╚═════════════════════════════════════════════════════════╝
"""

# ─── 6-Camera City Topology ───────────────────────────────────────────────

CAMERAS = [
    {"id": "cam-01", "name": "Rajpath Junction — North",    "lat": 28.6139, "lng": 77.2090},
    {"id": "cam-02", "name": "Ring Road — West Gate",       "lat": 28.6180, "lng": 77.2020},
    {"id": "cam-03", "name": "Metro Interchange — Central", "lat": 28.6200, "lng": 77.2120},
    {"id": "cam-04", "name": "Airport Road — South",        "lat": 28.6080, "lng": 77.2060},
    {"id": "cam-05", "name": "Industrial Zone — East",      "lat": 28.6160, "lng": 77.2200},
    {"id": "cam-06", "name": "Market Square — Northwest",   "lat": 28.6220, "lng": 77.1980},
]

# Edges: (cam_a, cam_b, min_travel_time_sec)
TOPOLOGY = [
    ("cam-01", "cam-02", 45.0),
    ("cam-01", "cam-03", 60.0),
    ("cam-02", "cam-06", 35.0),
    ("cam-02", "cam-04", 90.0),
    ("cam-03", "cam-05", 70.0),
    ("cam-04", "cam-05", 50.0),
    ("cam-05", "cam-06", 40.0),
    ("cam-01", "cam-04", 120.0),
]

# ─── Synthetic Indian Plate Pool ──────────────────────────────────────────

def _rand_plate() -> str:
    """Generate a random syntactically valid Indian plate."""
    state = random.choice([
        "MH", "DL", "KA", "HR", "TN", "GJ", "UP", "RJ", "WB", "MP",
    ])
    district = f"{random.randint(1, 35):02d}"
    series = "".join(random.choices("ABCDEFGHJKLMNPQRSTUVWXYZ", k=2))
    number = f"{random.randint(1000, 9999)}"
    return f"{state}{district}{series}{number}"


# Pre-generate plate pools
_NORMAL_PLATES  = [_rand_plate() for _ in range(80)]
_STOLEN_PLATES  = [_rand_plate() for _ in range(3)]   # will be watchlisted
_CLONE_PLATE    = _rand_plate()                        # will trigger impossible transition


# ─── Helpers ──────────────────────────────────────────────────────────────

def _post(base_url: str, path: str, payload: dict) -> dict:
    try:
        r = requests.post(f"{base_url}{path}", json=payload, timeout=10)
        return r.json()
    except Exception as exc:
        return {"error": str(exc)}


def _get(base_url: str, path: str) -> dict:
    try:
        r = requests.get(f"{base_url}{path}", timeout=10)
        return r.json()
    except Exception as exc:
        return {"error": str(exc)}


def _log(msg: str):
    ts = datetime.now(timezone.utc).strftime("%H:%M:%S")
    print(f"[{ts}] {msg}")


# ─── Setup Phase ──────────────────────────────────────────────────────────

def setup_topology(base_url: str):
    """Register the 6 cameras and their edge topology in the backend."""
    _log("Setting up 6-camera city topology...")

    for cam in CAMERAS:
        resp = _post(base_url, "/api/cameras", {
            "id": cam["id"],
            "name": cam["name"],
            "latitude": cam["lat"],
            "longitude": cam["lng"],
            "location_desc": cam["name"],
        })
        status = "OK" if "id" in resp or "error" not in resp else resp.get("error")
        _log(f"  Camera {cam['id']} ({cam['name']}): {status}")

    for cam_a, cam_b, min_t in TOPOLOGY:
        _post(base_url, f"/api/cameras/{cam_a}/edges", {
            "to_camera": cam_b,
            "min_travel_time_sec": min_t,
            "bidirectional": True,
        })
    _log(f"  Topology: {len(TOPOLOGY)} edges registered (bidirectional).")


def seed_watchlist(base_url: str):
    """Add synthetic stolen vehicles to the watchlist."""
    _log("Seeding watchlist with stolen/wanted plates...")
    reasons = [
        "FIR-7821: Armed robbery getaway vehicle",
        "FIR-3344: Vehicle theft reported at Central Market",
        "Interpol Red Notice: Cross-border trafficking linkage",
    ]
    for i, plate in enumerate(_STOLEN_PLATES):
        _post(base_url, "/api/watchlists", {
            "plate": plate,
            "type": "stolen" if i < 2 else "wanted",
            "priority": "critical",
            "reason": reasons[i],
            "created_by": "Demo Seeder [SIMULATION]",
        })
        _log(f"  Watchlisted: {plate} — {reasons[i][:40]}...")


# ─── Simulation Scenarios ─────────────────────────────────────────────────

def simulate_normal_transit(base_url: str):
    """
    Scenario A — Normal city vehicle flow.
    Vehicles travel along plausible camera corridors with sufficient travel time.
    """
    while True:
        plate = random.choice(_NORMAL_PLATES)
        route = _random_route()
        confidence = round(random.uniform(0.88, 0.99), 3)
        prev_ts = time.time()
        for cam_id in route:
            edge_time = _min_travel_time(cam_id) or 60.0
            # Inject realistic travel delay (edge_time * 1.1 to 2.5x)
            wait = random.uniform(edge_time * 1.1, edge_time * 2.5)
            time.sleep(min(wait, 8))  # cap at 8s for demo speed
            _post(base_url, "/api/anpr/simulate", {
                "plate": plate,
                "camera_id": cam_id,
                "confidence": confidence,
                "vehicle_type": random.choice(["car", "car", "car", "motorcycle", "truck"]),
            })
            _log(f"  [NORMAL] {plate} → {cam_id}")

        sleep_between = random.uniform(2, 6)
        time.sleep(sleep_between)


def simulate_stolen_sightings(base_url: str):
    """
    Scenario B — Stolen/wanted vehicles.
    Will trigger watchlist alerts and auto-create incidents.
    """
    while True:
        plate = random.choice(_STOLEN_PLATES)
        cam_id = random.choice(CAMERAS)["id"]
        confidence = round(random.uniform(0.91, 0.98), 3)
        _post(base_url, "/api/anpr/simulate", {
            "plate": plate,
            "camera_id": cam_id,
            "confidence": confidence,
            "vehicle_type": "car",
        })
        _log(f"  [WATCHLIST HIT] {plate} sighted at {cam_id} — incident should auto-create")
        time.sleep(random.uniform(12, 25))


def simulate_cloned_plate_anomaly(base_url: str):
    """
    Scenario C — Cloned plate / impossible transition.
    Vehicle appears at cam-01 and then cam-05 3 seconds later
    (expected minimum ~130s via graph). Should trigger anomaly.
    """
    plate = _CLONE_PLATE
    while True:
        _log(f"  [ANOMALY] Injecting impossible transition for {plate}...")
        _post(base_url, "/api/anpr/simulate", {
            "plate": plate,
            "camera_id": "cam-01",
            "confidence": 0.97,
            "vehicle_type": "car",
        })
        time.sleep(2)  # only 2 seconds — physically impossible
        _post(base_url, "/api/anpr/simulate", {
            "plate": plate,
            "camera_id": "cam-05",
            "confidence": 0.96,
            "vehicle_type": "car",
        })
        _log(f"  [ANOMALY] Transition injected for {plate}: cam-01 → cam-05 in 2s "
             f"(min expected ~130s) — anomaly alert should fire.")
        time.sleep(random.uniform(50, 90))


def simulate_high_density_burst(base_url: str):
    """
    Scenario D — Traffic surge at a single camera (density test).
    """
    while True:
        cam_id = random.choice(["cam-01", "cam-03"])
        burst_count = random.randint(8, 15)
        _log(f"  [DENSITY] Injecting {burst_count}-vehicle burst at {cam_id}...")
        for _ in range(burst_count):
            _post(base_url, "/api/anpr/simulate", {
                "plate": random.choice(_NORMAL_PLATES),
                "camera_id": cam_id,
                "confidence": round(random.uniform(0.85, 0.98), 3),
                "vehicle_type": "car",
            })
            time.sleep(0.3)
        time.sleep(random.uniform(20, 40))


# ─── Utility ──────────────────────────────────────────────────────────────

def _random_route() -> list[str]:
    """Return a 2–4 camera route that follows topology edges."""
    start = random.choice(CAMERAS)["id"]
    route = [start]
    adjacency = {a: b for a, b, _ in TOPOLOGY}
    adjacency.update({b: a for a, b, _ in TOPOLOGY})
    for _ in range(random.randint(1, 3)):
        candidates = [b for a, b, _ in TOPOLOGY if a == route[-1]]
        candidates += [a for a, b, _ in TOPOLOGY if b == route[-1]]
        candidates = [c for c in candidates if c not in route]
        if not candidates:
            break
        route.append(random.choice(candidates))
    return route


def _min_travel_time(cam_id: str) -> float:
    """Look up minimum travel time for edges involving cam_id."""
    times = [t for a, b, t in TOPOLOGY if a == cam_id or b == cam_id]
    return min(times) if times else 60.0


# ─── Health Check ─────────────────────────────────────────────────────────

def wait_for_backend(base_url: str, timeout: int = 30):
    _log(f"Waiting for backend at {base_url}...")
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            r = requests.get(f"{base_url}/health", timeout=3)
            if r.status_code == 200:
                caps = _get(base_url, "/api/capabilities")
                _log(f"Backend online. Capabilities: "
                     f"ANPR={caps.get('anpr')}, "
                     f"Watchlist={caps.get('watchlist')}, "
                     f"Anomaly={caps.get('anomaly')}, "
                     f"Traffic={caps.get('traffic')}, "
                     f"DB={caps.get('database')}")
                return True
        except Exception:
            pass
        time.sleep(2)
    print(f"[ERROR] Backend not reachable at {base_url} after {timeout}s.")
    return False


# ─── Main ─────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="SafeWatch SIH26127 — Phase 8 City Demo Simulation"
    )
    parser.add_argument("--host", default="http://localhost:5000",
                        help="Backend base URL (default: http://localhost:5000)")
    parser.add_argument("--duration", type=int, default=180,
                        help="Simulation duration in seconds (default: 180)")
    parser.add_argument("--skip-setup", action="store_true",
                        help="Skip camera topology and watchlist seeding")
    args = parser.parse_args()

    print(BANNER)
    print(f"  Host:     {args.host}")
    print(f"  Duration: {args.duration}s")
    print(f"  Cameras:  {len(CAMERAS)}")
    print(f"  Stolen plates (watchlist): {_STOLEN_PLATES}")
    print(f"  Clone plate (anomaly):     {_CLONE_PLATE}")
    print()

    if not wait_for_backend(args.host, timeout=30):
        sys.exit(1)

    if not args.skip_setup:
        setup_topology(args.host)
        seed_watchlist(args.host)
        time.sleep(1)

    _log("Starting simulation scenarios...")
    _log("  Scenario A — Normal vehicle transit flow")
    _log("  Scenario B — Stolen/wanted vehicle sightings (watchlist alerts)")
    _log("  Scenario C — Cloned plate impossible transition (anomaly alerts)")
    _log("  Scenario D — High-density burst (traffic density)")
    print()

    threads = [
        threading.Thread(target=simulate_normal_transit,       args=(args.host,), daemon=True),
        threading.Thread(target=simulate_stolen_sightings,     args=(args.host,), daemon=True),
        threading.Thread(target=simulate_cloned_plate_anomaly, args=(args.host,), daemon=True),
        threading.Thread(target=simulate_high_density_burst,   args=(args.host,), daemon=True),
    ]
    for t in threads:
        t.start()

    try:
        deadline = time.time() + args.duration
        while time.time() < deadline:
            remaining = int(deadline - time.time())
            print(f"\r  ⏱  Simulation running… {remaining}s remaining   ", end="", flush=True)
            time.sleep(1)
    except KeyboardInterrupt:
        print()
        _log("Simulation interrupted by user.")

    print()
    _log("Simulation complete. Collecting final stats...")
    caps = _get(args.host, "/api/capabilities")
    status = _get(args.host, "/api/anpr/status")
    anomalies = _get(args.host, "/api/anomalies?limit=5")
    watchlists = _get(args.host, "/api/watchlists")
    assoc_stats = _get(args.host, "/api/associations/stats")

    print()
    print("══════════════════════════════════════════════")
    print("  SIH26127 Demo Summary — ⚠️  SIMULATION DATA")
    print("══════════════════════════════════════════════")
    print(f"  ANPR Sightings:         {status.get('sighting_count', '?')}")
    print(f"  Unique Plates:          {status.get('plate_count', '?')}")
    print(f"  Anomaly Events:         {anomalies[0].get('id', '?') if isinstance(anomalies, list) and anomalies else 'none detected'}")
    if isinstance(anomalies, list):
        print(f"  Anomaly Events (total): {len(anomalies)}")
    print(f"  Watchlist Entries:      {len(watchlists) if isinstance(watchlists, list) else '?'}")
    if isinstance(assoc_stats, dict):
        print(f"  Associations (total):   {assoc_stats.get('total_computed', '?')}")
        print(f"  Decisions:              {assoc_stats.get('decisions', {})}")
    print(f"  Database:               {caps.get('database', '?')}")
    print()
    print("  All events are labeled SIMULATION and trace to synthetic plates.")
    print("  Open SIH 26127 Mission Control dashboard to review incidents,")
    print("  watchlist hits, anomalies, trajectory, and traffic analytics.")
    print()


if __name__ == "__main__":
    main()
