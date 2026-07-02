@echo off
REM Script para rodar FechaPro com Docker no Windows

echo.
echo ====================================
echo    FechaPro - Docker Launcher
echo ====================================
echo.

REM Verificar Docker
docker --version > nul 2>&1
if errorlevel 1 (
    echo [ERRO] Docker nao esta instalado ou nao esta rodando!
    echo.
    echo 1. Instale Docker Desktop: https://www.docker.com/products/docker-desktop
    echo 2. Inicie o Docker Desktop
    echo 3. Execute este script novamente
    pause
    exit /b 1
)

echo [OK] Docker encontrado
docker --version

REM Verificar Docker Compose
docker-compose --version > nul 2>&1
if errorlevel 1 (
    echo [ERRO] Docker Compose nao encontrado
    pause
    exit /b 1
)

echo [OK] Docker Compose encontrado
docker-compose --version
echo.

REM Menu
:menu
echo Escolha uma opcao:
echo.
echo 1) Iniciar servicos (docker-compose up -d)
echo 2) Ver logs em tempo real (docker-compose logs -f)
echo 3) Parar servicos (docker-compose stop)
echo 4) Ver status (docker-compose ps)
echo 5) Limpar tudo (docker-compose down -v)
echo 6) Rebuild (docker-compose up -d --build)
echo 7) Sair
echo.

set /p choice="Digite sua opcao (1-7): "

if "%choice%"=="1" goto start
if "%choice%"=="2" goto logs
if "%choice%"=="3" goto stop
if "%choice%"=="4" goto status
if "%choice%"=="5" goto clean
if "%choice%"=="6" goto rebuild
if "%choice%"=="7" goto end

echo Opcao invalida!
goto menu

:start
echo.
echo Iniciando servicos...
docker-compose up -d
timeout /t 5
cls
echo.
echo ====================================
echo    SERVICOS INICIADOS COM SUCESSO!
echo ====================================
echo.
echo Frontend:  http://localhost
echo API:       http://localhost:3099
echo.
echo Aguarde 30 segundos para o banco de dados iniciar...
timeout /t 30
docker-compose logs backend | findstr /R "listening" > nul
if errorlevel 0 (
    echo.
    echo [OK] Backend esta pronto!
) else (
    echo.
    echo Aguarde mais um pouco...
)
echo.
pause
goto menu

:logs
echo.
echo Mostrando logs (Ctrl+C para parar)...
docker-compose logs -f
goto menu

:stop
echo.
echo Parando servicos...
docker-compose stop
echo [OK] Servicos parados
timeout /t 3
goto menu

:status
echo.
docker-compose ps
echo.
pause
goto menu

:clean
echo.
echo [AVISO] Isso vai remover TODOS os dados (banco de dados, etc)
set /p confirm="Deseja continuar? (s/n): "
if "%confirm%"=="s" (
    docker-compose down -v
    echo [OK] Tudo removido
) else (
    echo Cancelado
)
timeout /t 3
goto menu

:rebuild
echo.
echo Rebuild dos images...
docker-compose build --no-cache
echo.
echo Iniciando servicos...
docker-compose up -d
timeout /t 5
goto start

:end
echo.
echo Ate logo!
exit /b 0
