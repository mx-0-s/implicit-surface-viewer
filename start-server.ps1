$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$serverProcess = $null

function Test-PortInUse {
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $connect = $client.BeginConnect('127.0.0.1', 8000, $null, $null)
        if (-not $connect.AsyncWaitHandle.WaitOne(300)) {
            return $false
        }
        $client.EndConnect($connect)
        return $true
    }
    catch {
        return $false
    }
    finally {
        $client.Close()
    }
}

try {
    if (Test-PortInUse) {
        throw 'Port 8000 is already in use. The launcher will not stop a process it did not start.'
    }

    $python = Get-Command python -ErrorAction SilentlyContinue
    if ($python) {
        Write-Host '[Starting] Launching the local server with Python...'
        $serverProcess = Start-Process -FilePath $python.Source `
            -ArgumentList @('-m', 'http.server', '8000') `
            -WorkingDirectory $projectRoot -PassThru -NoNewWindow
    }
    else {
        $npx = Get-Command npx.cmd -ErrorAction SilentlyContinue
        if (-not $npx) {
            throw 'Python or Node.js was not found; cannot start the local server.'
        }

        Write-Host '[Starting] Launching the local server with Node.js...'
        $serverProcess = Start-Process -FilePath $env:ComSpec `
            -ArgumentList @('/c', 'npx --yes serve -l 8000') `
            -WorkingDirectory $projectRoot -PassThru -NoNewWindow
    }

    $ready = $false
    for ($attempt = 0; $attempt -lt 50; $attempt++) {
        if ($serverProcess.HasExited) {
            throw 'The local server exited unexpectedly. Check whether port 8000 is available.'
        }
        if (Test-PortInUse) {
            $ready = $true
            break
        }
        Start-Sleep -Milliseconds 200
    }

    if (-not $ready) {
        throw 'Timed out while waiting for the local server to start.'
    }

    Start-Process 'http://localhost:8000'
    Write-Host 'Server started. Close this terminal or press Ctrl+C to stop the server started by this launcher.'
    Wait-Process -Id $serverProcess.Id
}
catch {
    Write-Host "[错误] $($_.Exception.Message)" -ForegroundColor Red
}
finally {
    if ($serverProcess -and -not $serverProcess.HasExited) {
        & taskkill.exe /PID $serverProcess.Id /T /F 2>$null | Out-Null
    }
}