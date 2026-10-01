# infra/base — load test / development stack

A complete, standalone copy of `infra/k8s` with **all rate limiting removed**, so the
k6 suite measures the services instead of nginx answering `429`.

| | `infra/k8s` | `infra/base` |
| --- | --- | --- |
| Deployed by | `skaffold dev` | `kubectl apply -f infra/base/` |
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

Skaffold owns `infra/k8s`, so stop it first — otherwise it will immediately put the
rate-limited ingress back:

```bash
# load test stack
skaffold delete
kubectl apply -f infra/base/

# back to the normal stack
kubectl delete -f infra/base/ --ignore-not-found
skaffold dev
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