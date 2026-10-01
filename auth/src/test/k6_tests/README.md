# k6 load tests — auth service

Load and behaviour tests for the `auth-srv` Express service. Every file is a standalone
k6 script, so you run the one you want:

```bash
k6 run auth/src/test/k6_tests/signup.js
k6 run auth/src/test/k6_tests/mixed-auth.js
```

For the local base stack, the development certificate is not trusted by k6:

```bash
k6 run --insecure-skip-tls-verify auth/src/test/k6_tests/auth-flow.js
```

To bypass ingress completely:

```bash
kubectl port-forward service/auth-srv 3000:3000
k6 run -e BASE_URL=http://127.0.0.1:3000 auth/src/test/k6_tests/auth-flow.js
```

## Configuration

| Variable | Default | Used by |
| --- | --- | --- |
| `BASE_URL` | `https://ticket.com` | all scripts |
| `TEST_PASSWORD` | `Passw0rd!123` | all scripts that create a user |
| `POOL_SIZE` | `25` | `mixed-auth.js` setup only |

`BASE_URL` can point to any reachable auth ingress or service endpoint.

Push results to Grafana the usual way:

```bash
k6 run --out experimental-prometheus-rw auth/src/test/k6_tests/auth-flow.js
```

## Tests

| Script | What it exercises |
| --- | --- |
| `helpers.js` | shared config, user factory, cookie helpers, endpoint paths |
| `signup.js` | `POST /api/users/signup` only (original script, hardcodes the host) |
| `signin.js` | signup then `POST /api/users/signin` |
| `refresh.js` | signup then `GET /api/refresh` |
| `auth-flow.js` | signup → `currentUser` → `refresh` → `logout` |
| `current-user.js` | authenticated `GET /api/users/currentUser` with the access cookie |
| `refresh-session.js` | three consecutive `GET /api/refresh` rounds on one session |
| `logout.js` | `POST /api/auth/logout`, cookie clearing, dead refresh token |
| `logout-all.js` | `POST /api/auth/logoutall` and missing-cookie rejection |
| `concurrent-sessions.js` | 5 parallel `signin` calls for separate accounts |
| `validation.js` | signup express-validator rules and duplicate email |
| `bad-credentials.js` | signin with unknown/blank/whitespace credentials |
| `unauthenticated.js` | anonymous `currentUser`, forged tokens, unknown route |
| `idempotency.js` | `Idempotency-Key` replay, conflict (409) and oversized key |
| `health.js` | `GET /api/positions/healthz` and `/readyz` |
| `mixed-auth.js` | ramping-vus scenario over a weighted mix of every auth route |

## Behaviour the tests rely on

- `currentUser`, `currentRefreshToken` and `requireAccessAuth` read **cookies only**.
  An `Authorization: Bearer` header is ignored entirely.
- Signup and signin both answer `201` with `{ user, token, accessToken }`. The
  `accessToken` field in that body is actually the *refresh* token — read it from the
  `Set-Cookie` header instead, or use `authenticate()` from `helpers.js`.
- Validation failures, bad credentials and duplicate emails all answer `400`.
- Missing or forged tokens answer `401`. Unknown routes answer `404`.
- Any `4xx` is an expected outcome in `validation.js`, `bad-credentials.js`,
  `unauthenticated.js`, `idempotency.js` and `logout.js`, so those call
  `expectClientErrors()` to widen the response callback and keep `http_req_failed`
  meaningful.

## Things to know before you run these

The normal `infra/k8s` ingress still rate-limits auth at `5` requests per minute with a
burst multiplier of `2`. Use `infra/base` for load tests, or point `BASE_URL` straight
at `auth-srv:3000` through a port-forward if you want to measure the service rather than
the proxy.

The base and normal auth ingresses route `/api/users/*`, `/api/auth/*`, and
`/api/refresh` to `auth-srv`. `health.js` targets `/api/positions/healthz`, which the
ingress sends to `positions-srv` — that service exposes the same route.

The auth session model permits one session per user because `Session.userId` is unique.
The concurrency scenario therefore uses separate users; testing multiple sessions for
one user requires changing that model first.