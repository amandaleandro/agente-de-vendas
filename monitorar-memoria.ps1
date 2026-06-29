#!/usr/bin/env pwsh
# Script para monitorar memória do Fezinha em tempo real

Write-Host "📊 Monitorando Fezinha Bot..." -ForegroundColor Green
Write-Host "Pressione Ctrl+C para sair`n" -ForegroundColor Yellow

$i = 0
while ($true) {
    $i++
    $response = Invoke-WebRequest -Uri "http://localhost:3099/api/health" -UseBasicParsing -ErrorAction SilentlyContinue

    if ($response.StatusCode -eq 200) {
        $data = $response.Content | ConvertFrom-Json

        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Status #$i" -ForegroundColor Cyan
        Write-Host "  Banco de dados: $($data.database)" -ForegroundColor $(if ($data.database -eq 'healthy') { 'Green' } else { 'Yellow' })
        Write-Host "  WhatsApp: $($data.whatsapp)" -ForegroundColor $(if ($data.whatsapp -like '*healthy*') { 'Green' } else { 'Yellow' })
        Write-Host "  Memória: $($data.memory.used) / $($data.memory.total) ($($data.memory.percent)%)" -ForegroundColor $(if ([int]$data.memory.percent -lt 80) { 'Green' } else { 'Red' })
        Write-Host "  Disco: $($data.disk)" -ForegroundColor $(if ($data.disk -eq 'healthy') { 'Green' } else { 'Yellow' })
        Write-Host ""
    } else {
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] ❌ Sem conexão com o bot" -ForegroundColor Red
    }

    Start-Sleep -Seconds 10
}
