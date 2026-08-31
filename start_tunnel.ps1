$process = Start-Process -FilePath "C:\cloudflared\cloudflared.exe" -ArgumentList "tunnel", "--url", "http://localhost:8000" -PassThru -RedirectStandardError "$env:TEMP\cloudflared.log" -NoNewWindow

$url = ""
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 2
    if (Test-Path "$env:TEMP\cloudflared.log") {
        $contenido = Get-Content "$env:TEMP\cloudflared.log" -Raw
        if ($contenido -match "(https://[a-z0-9\-]+\.trycloudflare\.com)") {
            $url = $matches[1]
            break
        }
    }
}

if ($url -eq "") {
    Write-Host "No se pudo capturar la URL del tunel"
    exit 1
}

Write-Host "Tunel activo en: $url"

# Actualizar API_BASE en client.js
$clientPath = "frontend/src/api/client.js"
$contenido = Get-Content $clientPath -Raw
$contenido = $contenido -replace 'export const API_BASE = ".*"', "export const API_BASE = `"$url/api`""
Set-Content -Path $clientPath -Value $contenido -NoNewline

# Push a GitHub
git add $clientPath
git commit -m "tunnel url actualizada"
git push

Write-Host "URL pusheada. En el equipo laboral hace git pull."
Write-Host "Presiona Ctrl+C para cerrar el tunel."

Wait-Process -Id $process.Id
