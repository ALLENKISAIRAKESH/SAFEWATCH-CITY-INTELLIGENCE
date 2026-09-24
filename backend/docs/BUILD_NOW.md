# SafeWatch — BUILD NOW

## What is already present
- React + TypeScript + Vite dashboard
- Webcam and video upload UI
- Browser-side COCO-SSD detection fallback
- Flask + Socket.IO backend
- OpenCV stream proxy
- YOLO backend inference for remote streams
- Alert acknowledgement UI

## What was completed in this sprint
- MVP scope frozen
- Supabase/PostgreSQL initial schema added at `database/001_initial_schema.sql`
- Backend health/API endpoints added
- Incident lifecycle endpoint added
- Basic crowd-density incident rule added with debounce
- YOLO confidence threshold configuration added
- `.env.example` added
- Python backend dependency file added
- Build order and claim policy documented

## Start frontend
```bash
npm install
cp .env.example .env
npm run dev
```

## Start AI backend
```bash
python -m venv .venv
# Windows
.venv\\Scripts\\activate
# macOS/Linux
source .venv/bin/activate
pip install -r backend_requirements.txt
python backend.py
```

The backend will be available on `http://localhost:5000`.

## Database
Run `database/001_initial_schema.sql` in the Supabase SQL editor, then add your Supabase URL/key to `.env`.

## MVP demo path
1. Start backend.
2. Start frontend.
3. Allow webcam access.
4. Keep monitoring active.
5. Move people into the frame.
6. Verify detection count and risk level.
7. For remote streams, enter a reachable HLS/MP4/RTSP source and use the backend proxy.
8. Trigger >5 people to exercise the crowd-density incident rule.

## Important
The current browser detection uses COCO-SSD for webcam/upload because it runs locally in the browser. The Python backend uses YOLO for remote-stream inference. Do not claim that every input path is YOLO-backed until the webcam/upload path is moved to the backend inference service.
