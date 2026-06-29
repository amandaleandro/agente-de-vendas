@echo off
REM 🧪 Script para testar o bot em modo PREVIEW (sem enviar mensagens)

echo.
echo ╔════════════════════════════════════════════════════════╗
echo ║  🧪 Fezinha Bot - MODO PREVIEW (NÃO VAI ENVIAR)       ║
echo ╚════════════════════════════════════════════════════════╝
echo.

cd /d "%~dp0backend"

echo 📋 Configurando modo preview...
echo   ✓ PROSPECCAO_ATIVA=false (não vai enviar)
echo   ✓ Conecta ao WhatsApp (normal)
echo   ✓ Painel web ativo (normal)
echo.

REM Iniciar bot em modo preview
set PROSPECCAO_ATIVA=false
set PROSPECCAO_AGENDA_ATIVA=false

echo ▶️  Iniciando bot...
echo.
echo 📍 Acesse:
echo    • Painel: http://localhost:3099
echo    • Agenda: http://localhost:3099/agenda.html
echo.
echo ⏹️  Para parar: Pressione Ctrl+C
echo.

npm start

pause
