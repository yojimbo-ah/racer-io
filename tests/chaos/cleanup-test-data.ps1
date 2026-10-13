[CmdletBinding()]
param(
    [string] $Namespace = "default",

    [switch] $SkipRedis
)

$ErrorActionPreference = "Stop"

$mongoDatabases = @(
    @{ Deployment = "auth-mongo-depl"; Database = "auth" },
    @{ Deployment = "archive-mongo-depl"; Database = "archive" },
    @{ Deployment = "races-mongo-depl"; Database = "races" },
    @{ Deployment = "races-saga-orchestrator-mongo-depl"; Database = "races" }
)

$redisDeployments = @(
    "blacklist-redis-depl",
    "positions-redis-depl",
    "races-redis-depl",
    "socket-gateway-redis-depl"
)

kubectl version --client | Out-Null

function Invoke-KubectlExec {
    param(
        [string] $Deployment,
        [string[]] $Command
    )

    & kubectl exec "deployment/$Deployment" -n $Namespace -- @Command
    if ($LASTEXITCODE -ne 0) {
        throw "Cleanup command failed for deployment '$Deployment'."
    }
}

function Test-DeploymentPresent {
    param([string] $Deployment)

    $result = & kubectl get deployment $Deployment -n $Namespace `
        -o name --ignore-not-found
    if ($LASTEXITCODE -ne 0) {
        throw "Could not inspect deployment '$Deployment'."
    }

    return -not [string]::IsNullOrWhiteSpace(($result -join "").Trim())
}

foreach ($mongo in $mongoDatabases) {
    if (-not (Test-DeploymentPresent -Deployment $mongo.Deployment)) {
        Write-Host "Skipping absent MongoDB deployment '$($mongo.Deployment)'."
        continue
    }

    Write-Host "Dropping MongoDB database '$($mongo.Database)' via '$($mongo.Deployment)'."
    $mongoScript = "db.getSiblingDB('$($mongo.Database)').dropDatabase()"
    Invoke-KubectlExec `
        -Deployment $mongo.Deployment `
        -Command @("mongosh", "--quiet", "--eval", $mongoScript)
}

if (-not $SkipRedis) {
    foreach ($deployment in $redisDeployments) {
        if (-not (Test-DeploymentPresent -Deployment $deployment)) {
            Write-Host "Skipping absent Redis deployment '$deployment'."
            continue
        }

        Write-Host "Flushing Redis database via '$deployment'."
        Invoke-KubectlExec -Deployment $deployment -Command @("redis-cli", "FLUSHDB")
    }
}

Write-Host "Test data cleanup completed."
