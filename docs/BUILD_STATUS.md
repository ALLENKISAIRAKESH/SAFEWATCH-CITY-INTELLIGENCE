# SafeWatch — Build Sprint

## MVP scope
Webcam/upload -> detection -> rule -> incident -> alert -> evidence -> dashboard.

## Existing assets
- React/Vite dashboard already exists.
- Browser COCO-SSD inference already exists.
- Flask + Socket.IO + OpenCV + YOLO backend already exists for remote streams.

## Build order
1. Environment + repo setup
2. Database schema
3. API + realtime event contract
4. Webcam/upload detection
5. Rule engine (person count + restricted zone)
6. Incident lifecycle
7. Evidence capture
8. Dashboard integration
9. Security/RBAC/audit
10. E2E + performance tests
11. Deployment

## Deferred until MVP is stable
- SMS/WhatsApp
- advanced geofencing
- 10-domain configuration
- model canary rollout
- advanced analytics
- drone-specific integrations

## Claims policy
Do not put accuracy, latency, partnerships, pilots, or deployment numbers in the pitch unless measured and evidenced.
