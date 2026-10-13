[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string] $Deployment,

    [string] $Namespace = "default",

    [Parameter(Mandatory = $true)]
    [string] $TestCommand,

    [ValidateRange(0, 3600)]
    [int] $DeleteAfterSeconds = 30,

    [ValidateRange(1, 600)]
    [int] $RecoveryTimeoutSeconds = 120,

    [switch] $SkipCleanup
)

$ErrorActionPreference = "Stop"
$testExitCode = 1
$cleanupError = $null

kubectl version --client | Out-Null
$deploymentJson = kubectl get deployment $Deployment -n $Namespace -o json | ConvertFrom-Json
$selector = ($deploymentJson.spec.selector.matchLabels.psobject.Properties | ForEach-Object {
    "$($_.Name)=$($_.Value)"
}) -join ","

if ([string]::IsNullOrWhiteSpace($selector)) {
    throw "Deployment '$Deployment' has no matchLabels selector."
}

$pod = kubectl get pods -n $Namespace -l $selector `
    -o jsonpath="{.items[0].metadata.name}"

if ([string]::IsNullOrWhiteSpace($pod)) {
    throw "No pod found for deployment '$Deployment'."
}

Write-Host "Running '$TestCommand'. Pod '$pod' will be deleted after $DeleteAfterSeconds seconds."
$testProcess = $null

try {
    $testProcess = Start-Process -FilePath "powershell" `
        -ArgumentList @("-NoProfile", "-Command", $TestCommand) `
        -NoNewWindow `
        -PassThru

    Start-Sleep -Seconds $DeleteAfterSeconds

    if ($testProcess.HasExited) {
        $testProcess.WaitForExit()
        throw "Test command exited with code $($testProcess.ExitCode) before pod deletion. The pod was not disrupted."
    }

    Write-Host "Deleting pod '$pod' to simulate service disruption."
    kubectl delete pod $pod -n $Namespace --wait=false

    Write-Host "Waiting for deployment '$Deployment' to recover."
    kubectl rollout status deployment/$Deployment `
        -n $Namespace --timeout="${RecoveryTimeoutSeconds}s"

    $testProcess.WaitForExit()
    $testExitCode = $testProcess.ExitCode
}
finally {
    if ($null -ne $testProcess -and -not $testProcess.HasExited) {
        Stop-Process -Id $testProcess.Id
    }

    if (-not $SkipCleanup) {
        try {
            & "$PSScriptRoot\cleanup-test-data.ps1" -Namespace $Namespace
        }
        catch {
            $cleanupError = $_
            Write-Error "Test data cleanup failed: $($_.Exception.Message)"
        }
    }
}

if ($null -ne $cleanupError) {
    exit 2
}

exit $testExitCode
