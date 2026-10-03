# Positions k6 tests

These tests target the live positions stack. Positions does not use MongoDB for its
runtime data; it stores active locations and recent position history in Redis. Position
updates arrive through Socket.IO on `socket-gateway`, while `/api/positions/aroundme`
is served by `positions-srv`.

## Run locally

For the base stack, either bypass the development TLS certificate:

```bash
k6 run --insecure-skip-tls-verify positions/src/test/k6_tests/health.js
k6 run --insecure-skip-tls-verify positions/src/test/k6_tests/aroundme.js
k6 run --insecure-skip-tls-verify positions/src/test/k6_tests/position-stream.js
```

`position-stream.js` is the concurrent load scenario. It creates `STREAM_USERS` test
users during setup, assigns one user to each VU, opens one Socket.IO connection per VU,
and sends position updates repeatedly until the stream duration ends. For example, 20
users sending an update every 250 ms for 30 seconds:

```bash
k6 run \
	--insecure-skip-tls-verify \
	--vus 20 \
	--duration 30s \
	-e STREAM_USERS=20 \
	-e UPDATE_INTERVAL_MS=250 \
	-e STREAM_DURATION_MS=30000 \
	positions/src/test/k6_tests/position-stream.js
```

Keep `STREAM_USERS` equal to the VU count so every VU gets its own user and Redis
position key. The test cleans up the auth users after the run; disconnected position
state is removed by the positions disconnect listener and also expires from Redis.

Or port-forward the services and use direct URLs:

```bash
kubectl port-forward service/auth-srv 3000:3000
kubectl port-forward service/positions-srv 3001:3000
kubectl port-forward service/socket-gateway-srv 3002:3000

k6 run -e AUTH_URL=http://127.0.0.1:3000 -e POSITIONS_URL=http://127.0.0.1:3001 -e SOCKET_URL=http://127.0.0.1:3002 positions/src/test/k6_tests/position-stream.js
```

`aroundme.js` creates a user in `setup()` and logs it out in `teardown()`. The socket
scenario also closes its socket and logs out its user. The positions service removes the
user's Redis location and recent history when it receives the disconnect event; the Redis
keys also have a ten-minute expiry.

## Memory services versus live services

`RedisMemoryServer` is appropriate for Jest unit tests because it isolates tests and is
fast. It is not appropriate for k6 live testing: it would bypass Redis networking,
serialization, expiry, shared state, rate limiting, and the NATS event path.

Keep MongoDB and Redis from `infra/base` for k6. Positions has no MongoDB runtime data,
so there is no positions Mongo database to reset. Avoid `FLUSHDB` on the shared Redis
instance; it can remove state belonging to other services. Use unique test users and the
per-run cleanup path instead.