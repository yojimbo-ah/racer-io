# Chaos testing

The scripts in this directory run k6 tests, optionally while deliberately deleting
a pod.
They are intended for the local `infra/base` stack or a disposable test cluster,
not a production or public cluster.

## Prerequisites

- Docker Desktop Kubernetes, minikube, kind, or another reachable Kubernetes cluster
- `kubectl` configured to the target cluster
- PowerShell
- k6 installed and available on `PATH`
- the stack deployed from the repository root

Use the test profile for k6 because it disables the ingress and position rate limits:

```powershell
skaffold dev --profile test
```

Make sure the required Kubernetes secrets and TLS setup are present before starting
the stack. See [`infra/base/README.md`](../../infra/base/README.md).

## Run a disruption test

Run this command from the repository root:

```powershell
.\tests\chaos\run-pod-disruption.ps1 `
  -Deployment races-depl `
  -TestCommand "npm --prefix auth run k6:signup" `
  -DeleteAfterSeconds 10 `
  -RecoveryTimeoutSeconds 120
```

The script:

1. finds the first pod selected by the requested Deployment;
2. starts the supplied k6 command;
3. waits `DeleteAfterSeconds`;
4. deletes that pod without waiting;
5. waits for the Deployment to become ready again; and
6. removes test data from the MongoDB and Redis deployments that are running; and
7. returns the k6 process exit code.

The Deployment should recreate the deleted pod. The test command is run on the
machine where PowerShell is running; k6 is not installed in, copied to, or deleted
from the Kubernetes pod. Cleanup is enabled by default. Pass `-SkipCleanup` only
when you intentionally need to inspect test data after the run.

### Test another consumer

To disrupt the archive consumer instead:

```powershell
.\tests\chaos\run-pod-disruption.ps1 `
  -Deployment archive-depl `
  -TestCommand "npm --prefix auth run k6:signup" `
  -DeleteAfterSeconds 10 `
  -RecoveryTimeoutSeconds 120
```

The `k6:signup` npm script runs
[`auth/src/test/k6_tests/signup.js`](../../auth/src/test/k6_tests/signup.js).
You can replace it with another command, for example:

```powershell
-TestCommand "k6 run --insecure-skip-tls-verify positions/src/test/k6_tests/health.js"
```

If the command contains environment variables, pass them inside the command string:

```powershell
-TestCommand "k6 run --insecure-skip-tls-verify -e RACE_USERS=10 races/src/test/k6_tests/race-start.js"
```

## Interpreting the result

An exit code of `0` means the k6 command passed and the Deployment recovered before
the recovery timeout. It does not prove that every asynchronous NATS consumer
completed its work. For disruption tests, inspect the relevant service logs and
database/event state after the run:

```powershell
kubectl logs deployment/races-depl --all-containers --since=10m
kubectl logs deployment/archive-depl --all-containers --since=10m
kubectl get pods
```

The script does not delete deployments, persistent volumes, k6 binaries, or k6 test
files. It drops only the application databases (`auth`, `archive`, and `races`)
through their allowlisted Mongo deployments and flushes only the four application
Redis deployments. Missing deployments are skipped, which allows focused Skaffold
module runs. Stop the stack separately when testing is complete:

```powershell
skaffold delete --profile test
```

### Stress tests

Run any k6 or other load command through the cleanup wrapper:

```powershell
.\tests\chaos\run-stress-test.ps1 `
  -TestCommand "npm --prefix auth run k6:mixed"
```

The wrapper waits for the command to finish and performs the same cleanup in a
`finally` block, including when the test exits with a failure. It returns the test
exit code when cleanup succeeds and returns `2` when cleanup itself fails.

## Parameters

| Parameter | Required | Default | Description |
| --- | --- | --- | --- |
| `-Deployment` | yes | - | Deployment whose selected pod will be deleted |
| `-Namespace` | no | `default` | Kubernetes namespace |
| `-TestCommand` | yes | - | Local PowerShell command to run, normally a k6 command |
| `-DeleteAfterSeconds` | no | `30` | Delay before pod deletion (`0`-`3600`) |
| `-RecoveryTimeoutSeconds` | no | `120` | Rollout wait timeout (`1`-`600`) |
| `-SkipCleanup` | no | off | Preserve test data instead of cleaning MongoDB and Redis |

Use a short deletion delay only when the test has enough setup time to reach the
behavior being measured. Never run this against a shared or production cluster.
