@echo off
REM 🤖 Script para rodar Fezinha Bot com Docker

echo.
echo ╔════════════════════════════════════════════════════════╗
echo ║         🚀 Fezinha Bot - Docker Container              ║
echo ╚════════════════════════════════════════════════════════╝
echo.

REM Parar container anterior se existir
echo 🛑 Parando container anterior...
docker stop fezinha-bot 2>nul
docker rm fezinha-bot 2>nul

REM Build da imagem
echo.
echo 🔨 Construindo imagem Docker...
docker build -t fezinha-bot:latest .

if %errorlevel% neq 0 (
    echo.
    echo ❌ Erro ao construir imagem Docker!
    echo Certifique-se de que Docker está instalado e rodando.
    pause
    exit /b 1
)

REM Rodar container
echo.
echo ▶️  Iniciando container...
docker run -d ^
    --name fezinha-bot ^
    -p 3099:3099 ^
    -e PROSPECCAO_ATIVA=true ^
    -e PROSPECCAO_AGENDA_ATIVA=true ^
    -v "%cd%\backend\sessions":/app/backend/sessions ^
    -v "%cd%\backend\backups":/app/backend/backups ^
    -v "%cd%\backend\arquivos":/app/backend/arquivos ^
    fezinha-bot:latest

if %errorlevel% neq 0 (
    echo.
    echo ❌ Erro ao iniciar container!
    pause
    exit /b 1
)

echo.
echo ✅ Container iniciado com sucesso!
echo.
echo 📍 Acesse:
echo    • Painel: http://localhost:3099
echo    • QR Code: http://localhost:3099/qr
echo    • Agenda: http://localhost:3099/agenda.html
echo.
echo 📋 Ver logs em tempo real:
echo    docker logs -f fezinha-bot
echo.
echo 🛑 Para parar:
echo    docker stop fezinha-bot
echo.
pause
