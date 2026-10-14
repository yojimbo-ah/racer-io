# racer.io

racer.io is a microservices racing app with:

- React client
- API gateway (Ingress on `ticket.com`)
- Auth, Positions, Races, Archive, Socket Gateway, and Race Saga Orchestrator services
- NATS for events
- MongoDB/Redis per service
- OpenTelemetry + Grafana/Tempo for tracing

This README focuses on **how to run everything locally** from scratch.

---

## 1) Prerequisites

Install and verify:

- Docker (or Docker Desktop)
- Kubernetes cluster (Docker Desktop Kubernetes, minikube, or kind)
- `kubectl`
- Skaffold (`skaffold`)
- Optional for load tests: `k6`

Check tools:

```powershell
kubectl version --client
skaffold version
docker --version
```

If you plan to run Jest tests or npm k6 scripts from your machine, install service
dependencies once:

```powershell
npm --prefix auth install
npm --prefix positions install
npm --prefix races install
npm --prefix archive install
npm --prefix socket-gateway install
npm --prefix races-saga-orchestrator install
```

---

## 2) Start Kubernetes and set context

Start your local cluster, then confirm you are pointed to it:

```powershell
kubectl config current-context
kubectl get nodes
```

If the node list is empty or unreachable, fix your cluster/context first.

---

## 3) Configure local host routing

The app is exposed as `https://ticket.com`, so your machine must resolve `ticket.com`
to the ingress IP used by your local cluster.

On Windows, edit:

- `C:\Windows\System32\drivers\etc\hosts`

Add an entry similar to:

```text
127.0.0.1 ticket.com
```

Use your actual ingress IP if it is not `127.0.0.1`.

---

## 4) Create required Kubernetes secrets

Create JWT secrets:

```powershell
kubectl create secret generic jwt-secret `
  --from-literal=JWT_KEY="replace-with-long-random-secret" `
  --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret generic access-jwt-key `
  --from-literal=ACCESS_JWT_KEY="replace-with-another-long-random-secret" `
  --dry-run=client -o yaml | kubectl apply -f -
```

Create the TLS secret used by ingress (`ticket-com-tls`):

```powershell
kubectl create secret tls ticket-com-tls `
  --cert=path\to\tls.crt `
  --key=path\to\tls.key `
  --dry-run=client -o yaml | kubectl apply -f -
```

> If your certificate is self-signed, the browser and k6 may warn unless trusted.

Verify:

```powershell
kubectl get secrets jwt-secret access-jwt-key ticket-com-tls
```

---

## 5) Choose environment profile

This repo uses Kustomize overlays selected by Skaffold profiles:

- `production` (default): keeps ingress and runtime rate limits enabled
- `test`: removes ingress rate limits and disables position update throttling for load testing

Kustomize paths:

- Base resources: `infra/kustomize/base/resources`
- Production overlay: `infra/kustomize/overlays/production`
- Test overlay: `infra/kustomize/overlays/test`

---

## 6) Run the full stack with Skaffold

From repo root:

```powershell
# Production profile (same as plain "skaffold dev")
skaffold dev --profile production
```

For load/chaos testing:

```powershell
skaffold dev --profile test
```

Skaffold builds images and deploys all resources.

When deployed, open:

- `https://ticket.com`

Useful checks:

```powershell
kubectl get pods
kubectl get ingress
```

---

## 7) Stop and clean up

If Skaffold is running in the current shell:

1. press `Ctrl+C`
2. then run:

```powershell
skaffold delete --profile production
```

or:

```powershell
skaffold delete --profile test
```

---

## 8) Deploy overlays directly (without Skaffold build loop)

Apply production manifests:

```powershell
kubectl apply -k infra/kustomize/overlays/production
```

Apply test manifests:

```powershell
kubectl apply -k infra/kustomize/overlays/test
```

Delete them:

```powershell
kubectl delete -k infra/kustomize/overlays/production
kubectl delete -k infra/kustomize/overlays/test
```

---

## 9) Run tests

### Unit/integration tests (Jest)

From repo root:

```powershell
npm --prefix auth run test:ci
npm --prefix positions run test:ci
npm --prefix races run test:ci
npm --prefix archive run test:ci
npm --prefix socket-gateway run test:ci
npm --prefix races-saga-orchestrator run test:ci
```

### Load tests (k6)

Examples:

```powershell
k6 run --insecure-skip-tls-verify auth/src/test/k6_tests/auth-flow.js
k6 run --insecure-skip-tls-verify positions/src/test/k6_tests/health.js
k6 run --insecure-skip-tls-verify positions/src/test/k6_tests/position-stream.js
```

Use the `test` profile for meaningful k6 results:

```powershell
skaffold dev --profile test
```

---

## 10) Chaos and stress testing with automatic cleanup

See full details in [tests/chaos/README.md](tests/chaos/README.md).

Run pod disruption test:

```powershell
.\tests\chaos\run-pod-disruption.ps1 `
  -Deployment races-depl `
  -TestCommand "npm --prefix auth run k6:signup"
```

Run stress wrapper:

```powershell
.\tests\chaos\run-stress-test.ps1 `
  -TestCommand "npm --prefix auth run k6:mixed"
```

Both wrappers clean allowlisted MongoDB/Redis test data at the end (unless `-SkipCleanup` is used).

---

## 11) Observability (Grafana + traces)

Port-forward Grafana:

```powershell
kubectl port-forward service/otel-lgtm-srv 3001:3001
```

Open:

- `http://localhost:3001`

Use Grafana Explore (Tempo) to inspect end-to-end traces across ingress and services.

---

## 12) Common troubleshooting

### `ticket.com` does not load

- Check hosts file mapping
- Check ingress exists: `kubectl get ingress`
- Check pods are running: `kubectl get pods`

### 401/403 JWT errors

- Ensure `jwt-secret` and `access-jwt-key` exist and contain expected values

### TLS/certificate warnings

- Expected with self-signed certs unless trusted
- For k6 use `--insecure-skip-tls-verify`

### k6 gets many 429 responses

- You are likely on `production` profile
- Switch to `test`: `skaffold dev --profile test`

### Cluster resource pressure

- Check `kubectl top pods` (if metrics server exists)
- Restart local cluster
- Use `skaffold delete` before re-running

---

## Repository quick map

- `skaffold.yaml` — build/deploy entry point
- `infra/kustomize/base/resources` — shared Kubernetes manifests
- `infra/kustomize/overlays/production` — production behavior
- `infra/kustomize/overlays/test` — load-test behavior
- `tests/chaos` — chaos/stress wrappers and cleanup scripts
