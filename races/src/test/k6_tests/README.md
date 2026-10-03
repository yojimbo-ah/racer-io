# Races k6 tests

`race-start.js` creates one isolated user per VU, publishes a live position through
Socket.IO, and drives `POST /api/races/new` followed by `POST /api/races/accept-race`.
The accept request emits `RaceStarted`, so this scenario exercises the races outbox,
NATS delivery, the race-created saga orchestrator, and its archive/positions result
fan-in. It then polls `GET /api/races` to detect a saga failure that compensates the
race back to `RaceCancelled`.

Run it against the base load-test stack:

```bash
k6 run --insecure-skip-tls-verify -e RACE_USERS=10 races/src/test/k6_tests/race-start.js
```

For direct service testing, port-forward auth, races, and socket-gateway, then set
`AUTH_URL`, `RACES_URL`, and `SOCKET_URL` to those local addresses. Keep the base
stack enabled so ingress rate limiting does not dominate the result.

The scenario uses the same user as both race participants so each VU needs only one
socket. This keeps the load test deterministic while exercising the orchestrator's
race-start event path. Use `SAGA_POLL_ATTEMPTS` and `SAGA_POLL_INTERVAL_MS` when the
cluster needs more time to fan out and collect saga results.