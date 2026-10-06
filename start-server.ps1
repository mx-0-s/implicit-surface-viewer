$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$serverProcess = $null
$listener = $null

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

function Write-StaticResponse($stream, $statusCode, $statusText, $contentType, $body, $sendBody) {
    $bodyLength = if ($body) { $body.Length } else { 0 }
    $headers = "HTTP/1.1 $statusCode $statusText`r`nContent-Type: $contentType`r`nContent-Length: $bodyLength`r`nConnection: close`r`n`r`n"
    $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($headers)
    $stream.Write($headerBytes, 0, $headerBytes.Length)
    if ($sendBody -and $bodyLength -gt 0) {
        $stream.Write($body, 0, $bodyLength)
    }
}

function Serve-StaticFiles($httpListener, $rootPath) {
    $rootPrefix = $rootPath.TrimEnd('\') + '\'
    $mimeTypes = @{
        '.html' = 'text/html; charset=utf-8'
        '.css'  = 'text/css; charset=utf-8'
        '.js'   = 'text/javascript; charset=utf-8'
        '.json' = 'application/json; charset=utf-8'
        '.svg'  = 'image/svg+xml'
        '.png'  = 'image/png'
        '.jpg'  = 'image/jpeg'
        '.ico'  = 'image/x-icon'
    }

    while ($httpListener.Server.IsBound) {
        $client = $httpListener.AcceptTcpClient()
        $stream = $null
        $reader = $null
        try {
            $stream = $client.GetStream()
            $reader = [System.IO.StreamReader]::new(
                $stream,
                [System.Text.Encoding]::ASCII,
                $false,
                1024,
                $true
            )
            $requestLine = $reader.ReadLine()
            if (-not $requestLine) { continue }

            $requestParts = $requestLine -split ' ', 3
            if ($requestParts.Count -lt 2) { continue }
            while ($reader.ReadLine() -ne '') { }

            $method = $requestParts[0]
            if ($method -ne 'GET' -and $method -ne 'HEAD') {
                $errorBody = [System.Text.Encoding]::UTF8.GetBytes('Method Not Allowed')
                Write-StaticResponse $stream 405 'Method Not Allowed' 'text/plain; charset=utf-8' $errorBody ($method -ne 'HEAD')
                continue
            }

            $urlPath = [System.Uri]::UnescapeDataString(($requestParts[1] -split '\?', 2)[0])
            $relativePath = $urlPath.TrimStart('/').Replace('/', '\')
            if (-not $relativePath) { $relativePath = 'index.html' }
            $filePath = [System.IO.Path]::GetFullPath((Join-Path $rootPath $relativePath))

            if (-not $filePath.StartsWith($rootPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
                $errorBody = [System.Text.Encoding]::UTF8.GetBytes('Forbidden')
                Write-StaticResponse $stream 403 'Forbidden' 'text/plain; charset=utf-8' $errorBody ($method -ne 'HEAD')
                continue
            }

            if (Test-Path -LiteralPath $filePath -PathType Container) {
                $filePath = Join-Path $filePath 'index.html'
            }
            if (-not (Test-Path -LiteralPath $filePath -PathType Leaf)) {
                $errorBody = [System.Text.Encoding]::UTF8.GetBytes('Not Found')
                Write-StaticResponse $stream 404 'Not Found' 'text/plain; charset=utf-8' $errorBody ($method -ne 'HEAD')
                continue
            }

            $extension = [System.IO.Path]::GetExtension($filePath).ToLowerInvariant()
            $contentType = if ($mimeTypes.ContainsKey($extension)) { $mimeTypes[$extension] } else { 'application/octet-stream' }
            $body = [System.IO.File]::ReadAllBytes($filePath)
            Write-StaticResponse $stream 200 'OK' $contentType $body ($method -ne 'HEAD')
        }
        catch {
            # Ignore malformed or prematurely closed client requests.
        }
        finally {
            if ($reader) { $reader.Dispose() }
            $client.Close()
        }
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
        if ($npx) {
            Write-Host '[Starting] Launching the local server with Node.js...'
            $serverProcess = Start-Process -FilePath $env:ComSpec `
                -ArgumentList @('/c', 'npx --yes serve -l 8000') `
                -WorkingDirectory $projectRoot -PassThru -NoNewWindow
        }
    }

    if ($serverProcess) {
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
    else {
        Write-Host '[Starting] Python and Node.js were not found. Using the built-in PowerShell web server...'
        $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 8000)
        $listener.Start()

        Start-Process 'http://localhost:8000'
        Write-Host 'Server started. Close this terminal or press Ctrl+C to stop the server.'
        Serve-StaticFiles $listener $projectRoot
    }
}
catch {
    Write-Host "[Error] $($_.Exception.Message)" -ForegroundColor Red
}
finally {
    if ($listener) {
        $listener.Stop()
    }
    if ($serverProcess -and -not $serverProcess.HasExited) {
        & taskkill.exe /PID $serverProcess.Id /T /F 2>$null | Out-Null
    }
}