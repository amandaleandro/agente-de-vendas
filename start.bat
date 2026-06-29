@echo off
REM 🤖 Fezinha Bot - Script de Inicialização Windows

cls
echo.
echo 🚀 Iniciando Fezinha Bot...
echo.

REM Verificar se .env existe
if not exist "backend\config\.env" (
    echo ⚠️  Arquivo .env não encontrado!
    echo 📋 Copie .env.example para backend/config/.env
    echo.
    echo Executando:
    echo   copy .env.example backend\config\.env
    copy .env.example backend\config\.env >nul 2>&1
    echo.
    echo ✏️  Edite backend\config\.env com suas configurações
    pause
    exit /b 1
)

REM Entrar na pasta backend
cd /d backend

REM Verificar node_modules
if not exist "node_modules" (
    echo 📦 Instalando dependências...
    call npm install
    echo.
)

REM Iniciar a aplicação
echo ✅ Iniciando aplicação...
echo 📍 Acesse: http://localhost:3099
echo.

call npm start
pause
