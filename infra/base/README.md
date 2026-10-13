# infra/base — load test / development stack

A complete, standalone copy of `infra/k8s` with **all rate limiting removed**, so the
k6 suite measures the services instead of nginx answering `429`.

| | `infra/k8s` | `infra/base` |
| --- | --- | --- |
| Deployed by | `skaffold dev --profile production` | `skaffold dev --profile test` |
| nginx per-IP limits | yes (`limit-rpm` / `limit-rps` / burst) | **none** |
| socket `position:update` limit | 1 per 10s per user | **disabled** |
| JWT / redis / mongo / NATS | required | same |

## What is different

Only three files diverge from `infra/k8s`:

- **`ingress-srv.yaml`** — every `nginx.ingress.kubernetes.io/limit-*` annotation is
  gone (`auth` 5 rpm, `positions` 20 rps, `races` 30 rps, `archive` 10 rps,
  `client` 10 rps).
- **`socket-gateway-depl.yaml`** — sets `POSITION_RATE_LIMIT_DISABLED=true`.
- **`positions-depl.yaml`** — sets `POSITION_RATE_LIMIT_DISABLED=true`.

`POSITION_RATE_LIMIT_DISABLED` is read in
`socket-gateway/src/rate-limiters/positionRateLimiter.ts` and
`positions/src/rate-limiters/positionRateLimiter.ts`. When it is not `"true"` the
limiter behaves exactly as before (1 point per 10 seconds), so `infra/k8s` is
unchanged.

`races-saga-orchestrator-mongo-depl.yaml` exists here under its correct name; the copy
in `infra/k8s` is still called `races-saga-orchestrator-mongo-depl copy.yaml`.

## Switching between the two setups

Skaffold selects the manifest tree through its profile. Stop the current profile
before switching:

```powershell
# load test stack
skaffold delete --profile production
skaffold dev --profile test

# back to the normal stack
skaffold delete --profile test
skaffold dev --profile production
```

To reduce local resource usage, select a service module. Its declared infrastructure
dependencies are included automatically:

```powershell
skaffold dev --profile test --module auth
skaffold dev --profile test --module positions
```

Rolling back just the rate limiting while leaving the pods alone:

```bash
kubectl apply -f infra/k8s/ingress-srv.yaml
kubectl set env deployment/socket-gateway-depl POSITION_RATE_LIMIT_DISABLED-
kubectl set env deployment/positions-depl POSITION_RATE_LIMIT_DISABLED-
```

## Prerequisites

Same as `infra/k8s` — these are not created by either folder:

```bash
kubectl create secret generic jwt-secret --from-literal=JWT_KEY=<32+ chars>
kubectl create secret generic access-jwt-key --from-literal=ACCESS_JWT_KEY=<32+ chars>
```

`ticket-com-tls` must exist too, see the certificates in `infra/cert/`.

## Warning

This stack has no abuse protection of any kind. Only run it locally or on a throwaway
cluster — never against a public host.

## Pod disruption testing

Run the real auth signup k6 scenario while replacing one downstream consumer:

```powershell
.\tests\chaos\run-pod-disruption.ps1 `
  -Deployment races-depl `
  -TestCommand "npm --prefix auth run k6:signup" `
  -DeleteAfterSeconds 10 `
  -RecoveryTimeoutSeconds 120
```

Run the same test against the archive consumer:

```powershell
.\tests\chaos\run-pod-disruption.ps1 `
  -Deployment archive-depl `
  -TestCommand "npm --prefix auth run k6:signup" `
  -DeleteAfterSeconds 10 `
  -RecoveryTimeoutSeconds 120
```

The script deletes one pod, waits for the deployment rollout to become ready, and
returns the k6 process exit code. `k6:signup` checks that signup returns a user,
access token, and cookies. It does not by itself prove that a downstream saga
completed, so inspect the service logs and database/event state after the run.

Deleting `races-depl` or `archive-depl` tests whether NATS retains the user-created
event and the consumer processes it after the pod returns. It is intentionally
opt-in and requires `kubectl` to point at a disposable test cluster.