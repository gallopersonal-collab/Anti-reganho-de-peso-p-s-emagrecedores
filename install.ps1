#Requires -Version 5.1
<#
.SYNOPSIS
    Installs dependencies for the Anti-reganho-de-peso-pos-emagrecedores project on Windows.

.DESCRIPTION
    Sets up the backend Python virtual environment and installs requirements,
    then installs the frontend JavaScript dependencies with yarn (falling back
    to npm if yarn is unavailable). Writes starter .env files if they are
    missing so the backend and frontend can run out of the box.

.PARAMETER SkipBackend
    Skip the backend setup step.

.PARAMETER SkipFrontend
    Skip the frontend setup step.

.PARAMETER PythonExe
    Python executable to use for the virtual environment. Defaults to "python".

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\install.ps1

.EXAMPLE
    .\install.ps1 -SkipFrontend
#>
[CmdletBinding()]
param(
    [switch]$SkipBackend,
    [switch]$SkipFrontend,
    [string]$PythonExe = 'python'
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$RepoRoot   = $PSScriptRoot
$BackendDir = Join-Path $RepoRoot 'backend'
$FrontEndDir = Join-Path $RepoRoot 'frontend'

function Write-Section($message) {
    Write-Host ''
    Write-Host "==> $message" -ForegroundColor Cyan
}

function Test-Command($name) {
    return [bool](Get-Command $name -ErrorAction SilentlyContinue)
}

function Ensure-File($path, $content) {
    if (-not (Test-Path -LiteralPath $path)) {
        Write-Host "    creating $path"
        Set-Content -LiteralPath $path -Value $content -Encoding UTF8
    }
}

function Install-Backend {
    Write-Section 'Backend: Python environment'

    if (-not (Test-Command $PythonExe)) {
        throw "Python executable '$PythonExe' was not found on PATH. Install Python 3.11+ from https://www.python.org/downloads/ and retry."
    }

    Push-Location $BackendDir
    try {
        $venv = Join-Path $BackendDir '.venv'
        if (-not (Test-Path -LiteralPath $venv)) {
            Write-Host "    creating virtual environment at $venv"
            & $PythonExe -m venv $venv
        } else {
            Write-Host "    reusing virtual environment at $venv"
        }

        $venvPython = Join-Path $venv 'Scripts\python.exe'
        if (-not (Test-Path -LiteralPath $venvPython)) {
            throw "Virtual environment Python not found at $venvPython."
        }

        Write-Host '    upgrading pip'
        & $venvPython -m pip install --upgrade pip | Out-Host

        Write-Host '    installing requirements.txt'
        & $venvPython -m pip install -r (Join-Path $BackendDir 'requirements.txt') | Out-Host

        Ensure-File (Join-Path $BackendDir '.env') @"
MONGO_URL=mongodb://localhost:27017
DB_NAME=anti_reganho
CORS_ORIGINS=http://localhost:3000
"@
    }
    finally {
        Pop-Location
    }
}

function Install-Frontend {
    Write-Section 'Frontend: JavaScript dependencies'

    if (-not (Test-Command 'node')) {
        throw "Node.js was not found on PATH. Install Node.js 18+ from https://nodejs.org/ and retry."
    }

    $packageManager = $null
    if (Test-Command 'yarn') {
        $packageManager = 'yarn'
    } elseif (Test-Command 'npm') {
        $packageManager = 'npm'
        Write-Warning 'yarn was not found; falling back to npm. The repo pins yarn@1.22 in package.json.'
    } else {
        throw 'Neither yarn nor npm was found on PATH.'
    }

    Push-Location $FrontEndDir
    try {
        if ($packageManager -eq 'yarn') {
            Write-Host '    running: yarn install'
            & yarn install | Out-Host
        } else {
            Write-Host '    running: npm install'
            & npm install | Out-Host
        }

        Ensure-File (Join-Path $FrontEndDir '.env') @"
REACT_APP_BACKEND_URL=http://localhost:8000
"@
    }
    finally {
        Pop-Location
    }
}

Write-Host "Installing project dependencies in $RepoRoot" -ForegroundColor Green

if (-not $SkipBackend) {
    Install-Backend
} else {
    Write-Section 'Backend: skipped (-SkipBackend)'
}

if (-not $SkipFrontend) {
    Install-Frontend
} else {
    Write-Section 'Frontend: skipped (-SkipFrontend)'
}

Write-Host ''
Write-Host 'Done.' -ForegroundColor Green
Write-Host 'Next steps:'
Write-Host '  Backend : cd backend; .\.venv\Scripts\Activate.ps1; uvicorn server:app --reload'
Write-Host '  Frontend: cd frontend; yarn start'
