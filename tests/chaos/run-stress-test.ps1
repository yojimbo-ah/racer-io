[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string] $TestCommand,

    [string] $Namespace = "default",

    [switch] $SkipCleanup
)

$ErrorActionPreference = "Stop"
$testExitCode = 1
$cleanupError = $null

try {
    Write-Host "Running stress test: $TestCommand"
    $testProcess = Start-Process -FilePath "powershell" `
        -ArgumentList @("-NoProfile", "-Command", $TestCommand) `
        -NoNewWindow `
        -PassThru

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
