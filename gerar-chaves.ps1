# Script para gerar chaves seguras
# Uso: .\gerar-chaves.ps1

Write-Host "================================" -ForegroundColor Cyan
Write-Host "Gerador de Chaves Seguras" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Gerar chave API
Write-Host "Gerando Chave de API Segura..." -ForegroundColor Yellow
$apiKey = node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
Write-Host "✅ Chave API gerada:" -ForegroundColor Green
Write-Host $apiKey -ForegroundColor White
Write-Host ""

# Copiar para clipboard (Windows)
$apiKey | Set-Clipboard
Write-Host "📋 Copiado para clipboard!" -ForegroundColor Cyan
Write-Host ""

# Instruções
Write-Host "================================" -ForegroundColor Cyan
Write-Host "PRÓXIMOS PASSOS:" -ForegroundColor Yellow
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Adicione a chave ao .env:" -ForegroundColor White
Write-Host "   PAINEL_API_KEY=$apiKey" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Gere chaves de IA em:" -ForegroundColor White
Write-Host "   - Gemini: https://aistudio.google.com/app/apikey" -ForegroundColor Cyan
Write-Host "   - xAI: https://console.x.ai/" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Adicione ao .env:" -ForegroundColor White
Write-Host "   GEMINI_API_KEY=sua_chave" -ForegroundColor Gray
Write-Host "   XAI_API_KEY=sua_chave" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Inicie o servidor:" -ForegroundColor White
Write-Host "   npm start" -ForegroundColor Gray
Write-Host ""

# Pausar para o usuário ler
Read-Host "Pressione Enter para fechar"
