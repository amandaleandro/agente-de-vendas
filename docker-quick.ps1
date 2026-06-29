# ========================================
# SCRIPT RÁPIDO PARA DOCKER NO WINDOWS
# ========================================
# Uso: .\docker-quick.ps1 [comando]
# Exemplos:
#   .\docker-quick.ps1 up
#   .\docker-quick.ps1 logs
#   .\docker-quick.ps1 backup

param(
    [string]$Command = "help"
)

# Cores
$BLUE = "Cyan"
$GREEN = "Green"
$YELLOW = "Yellow"
$RED = "Red"

function Write-Header {
    param([string]$Text)
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor $BLUE
    Write-Host "  🐳 Fezinha Docker - $Text" -ForegroundColor $BLUE
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor $BLUE
}

function Test-EnvFile {
    if (-not (Test-Path ".env.docker")) {
        Write-Host "❌ Arquivo .env.docker não encontrado!" -ForegroundColor $RED
        Write-Host "   Copie: Copy-Item .env.docker .env.local" -ForegroundColor $YELLOW
        exit 1
    }
}

function Show-Help {
    Write-Header "Comandos Disponíveis"
    @"
  Gerenciamento:
    setup      - Setup inicial (build + up)
    build      - Build das imagens
    up         - Iniciar containers
    down       - Parar containers
    restart    - Reiniciar containers

  Logs e Status:
    logs       - Ver logs da app (tempo real)
    logs-db    - Ver logs do banco
    ps         - Status dos containers
    stats      - Uso de recursos

  Shell:
    shell      - Acessar shell da app
    db-shell   - Acessar psql

  Backup:
    backup     - Fazer backup do banco
    backup-ls  - Listar backups
    restore    - Restaurar backup

  Limpeza:
    clean      - Remover containers (⚠️ CUIDADO)
    rebuild    - Rebuild completo

"@
}

function Invoke-DockerCommand {
    param([string]$Cmd)

    if ($Command -eq "help") {
        Show-Help
        return
    }

    switch ($Cmd) {
        "setup" {
            Write-Host "🔨 Building images..." -ForegroundColor $BLUE
            docker-compose build
            Write-Host "▶️  Starting containers..." -ForegroundColor $GREEN
            docker-compose up -d
            Write-Host "✅ Setup concluído!" -ForegroundColor $GREEN
            Write-Host "   App:  http://localhost:3099" -ForegroundColor $YELLOW
            Write-Host "   DB:   localhost:5432" -ForegroundColor $YELLOW
        }

        "build" {
            Write-Host "🔨 Building..." -ForegroundColor $BLUE
            docker-compose build
        }

        "up" {
            Test-EnvFile
            Write-Host "▶️  Starting..." -ForegroundColor $GREEN
            docker-compose up -d
            Write-Host "✅ Running! Ver logs com: docker-compose logs -f" -ForegroundColor $GREEN
        }

        "down" {
            Write-Host "⏹️  Stopping..." -ForegroundColor $YELLOW
            docker-compose down
            Write-Host "✅ Parado" -ForegroundColor $GREEN
        }

        "restart" {
            Write-Host "🔄 Restarting..." -ForegroundColor $YELLOW
            docker-compose restart
            Write-Host "✅ Reiniciado" -ForegroundColor $GREEN
        }

        "logs" {
            Write-Host "📋 Logs da aplicação (Ctrl+C para sair):" -ForegroundColor $BLUE
            docker-compose logs -f fezinha
        }

        "logs-db" {
            Write-Host "📋 Logs do banco (Ctrl+C para sair):" -ForegroundColor $BLUE
            docker-compose logs -f postgres
        }

        "ps" {
            Write-Host "📊 Status dos containers:" -ForegroundColor $BLUE
            docker-compose ps
        }

        "stats" {
            Write-Host "📊 Uso de recursos (Ctrl+C para sair):" -ForegroundColor $BLUE
            docker stats
        }

        "shell" {
            Write-Host "🔌 Acessando shell..." -ForegroundColor $BLUE
            docker exec -it fezinha-app sh
        }

        "db-shell" {
            Write-Host "🔌 Acessando psql..." -ForegroundColor $BLUE
            docker exec -it fezinha-db psql -U postgres -d agentefecha
        }

        "backup" {
            Write-Host "📦 Fazendo backup..." -ForegroundColor $BLUE
            $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
            $backupDir = "backups"
            if (-not (Test-Path $backupDir)) {
                New-Item -ItemType Directory -Path $backupDir | Out-Null
            }
            $backupFile = "$backupDir/backup_agentefecha_$timestamp.sql"
            docker exec fezinha-db pg_dump -U postgres agentefecha | Out-File -FilePath $backupFile -Encoding ascii
            Write-Host "✅ Backup concluído: $backupFile" -ForegroundColor $GREEN
        }

        "backup-ls" {
            Write-Host "📋 Backups disponíveis:" -ForegroundColor $BLUE
            Get-ChildItem "backups" -ErrorAction SilentlyContinue | ForEach-Object {
                Write-Host "  $($_.Name) - $($_.Length / 1MB -as [int]) MB"
            }
        }

        "clean" {
            Write-Host "🗑️  CUIDADO: Isto vai remover tudo!" -ForegroundColor $RED
            $confirm = Read-Host "Digite 'SIM' para confirmar"
            if ($confirm -eq "SIM") {
                docker-compose down -v
                Write-Host "✅ Limpeza concluída" -ForegroundColor $GREEN
            } else {
                Write-Host "❌ Cancelado" -ForegroundColor $YELLOW
            }
        }

        "rebuild" {
            Write-Host "🔄 Rebuild completo..." -ForegroundColor $YELLOW
            docker-compose down -v
            docker-compose build
            docker-compose up -d
            Write-Host "✅ Rebuild concluído" -ForegroundColor $GREEN
        }

        default {
            Write-Host "❌ Comando desconhecido: $Cmd" -ForegroundColor $RED
            Write-Host ""
            Show-Help
        }
    }
}

# Main
Invoke-DockerCommand $Command
