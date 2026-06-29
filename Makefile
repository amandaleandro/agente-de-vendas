.PHONY: help build up down logs ps shell db-shell backup clean rebuild

# Cores
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[1;33m
RED := \033[0;31m
NC := \033[0m

help: ## Mostrar este help
	@echo "$(BLUE)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(NC)"
	@echo "$(BLUE)  🐳 Fezinha Docker - Comandos Disponíveis$(NC)"
	@echo "$(BLUE)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "$(GREEN)%-15s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(YELLOW)Exemplo:$(NC) make up"
	@echo ""

# ========================================
# GERENCIAMENTO BÁSICO
# ========================================

build: ## Build das imagens Docker
	@echo "$(BLUE)🔨 Building images...$(NC)"
	docker-compose build

up: ## Iniciar containers (background)
	@echo "$(GREEN)▶️  Starting containers...$(NC)"
	docker-compose up -d
	@echo "$(GREEN)✅ Containers iniciados!$(NC)"
	@echo "   App:  http://localhost:3099"
	@echo "   DB:   localhost:5432"

down: ## Parar containers
	@echo "$(YELLOW)⏹️  Stopping containers...$(NC)"
	docker-compose down
	@echo "$(GREEN)✅ Containers parados$(NC)"

restart: down up ## Reiniciar containers

# ========================================
# LOGS E MONITORAMENTO
# ========================================

logs: ## Ver logs da aplicação (tempo real)
	docker-compose logs -f fezinha

logs-db: ## Ver logs do banco de dados
	docker-compose logs -f postgres

ps: ## Ver status dos containers
	@docker-compose ps

status: ps ## Alias para ps

# ========================================
# SHELL E DEBUGGING
# ========================================

shell: ## Acessar shell da aplicação
	docker exec -it fezinha-app sh

db-shell: ## Acessar psql do banco de dados
	@echo "$(BLUE)Conectando ao banco...$(NC)"
	docker exec -it fezinha-db psql -U postgres -d agentefecha

# ========================================
# BACKUP E RESTAURAÇÃO
# ========================================

backup: ## Fazer backup do banco de dados
	@echo "$(BLUE)📦 Fazendo backup...$(NC)"
	@./scripts/backup-db.sh

restore: ## Restaurar backup (use: make restore FILE=backups/seu_arquivo.sql.gz)
	@if [ -z "$(FILE)" ]; then \
		echo "$(RED)❌ Erro: Especifique FILE=caminho/arquivo.sql.gz$(NC)"; \
		echo "Exemplo: make restore FILE=backups/backup_agentefecha_20260626_120000.sql.gz"; \
	else \
		echo "$(BLUE)📥 Restaurando backup: $(FILE)$(NC)"; \
		gunzip -c $(FILE) | docker exec -i fezinha-db psql -U postgres -d agentefecha; \
		echo "$(GREEN)✅ Backup restaurado!$(NC)"; \
	fi

backup-list: ## Listar todos os backups disponíveis
	@echo "$(BLUE)📋 Backups disponíveis:$(NC)"
	@ls -lh backups/ | tail -n +2 || echo "Nenhum backup encontrado"

# ========================================
# LIMPEZA
# ========================================

clean: ## Remover containers, networks e volumes (⚠️ CUIDADO)
	@echo "$(RED)🗑️  Removendo containers, networks e volumes...$(NC)"
	docker-compose down -v
	@echo "$(GREEN)✅ Limpeza concluída$(NC)"

clean-logs: ## Limpar logs locais
	@rm -rf logs/*
	@echo "$(GREEN)✅ Logs removidos$(NC)"

prune: ## Limpeza geral do Docker (remove images não usadas, etc)
	@echo "$(YELLOW)⚠️  Executando docker system prune...$(NC)"
	docker system prune -f
	@echo "$(GREEN)✅ Prune concluído$(NC)"

# ========================================
# BUILD E DEPLOY
# ========================================

rebuild: clean build up ## Rebuild completo (remove e recompila)

dev: ## Iniciar em modo desenvolvimento com logs visíveis
	docker-compose up fezinha postgres

# ========================================
# INFRA
# ========================================

db-init: ## Executar script de inicialização do banco
	@echo "$(BLUE)⚙️  Inicializando banco...$(NC)"
	docker exec -it fezinha-db psql -U postgres -d agentefecha < scripts/init-db.sql
	@echo "$(GREEN)✅ Banco inicializado$(NC)"

db-backup-list: backup-list ## Alias para backup-list

stats: ## Ver uso de recursos dos containers
	docker stats

health: ## Verificar health check dos containers
	@echo "$(BLUE)🏥 Health Status:$(NC)"
	@docker inspect --format='{{ .Name }} - {{ .State.Health.Status }}' $$(docker ps -q) || echo "Nenhum container rodando"

# ========================================
# UTILITÁRIOS
# ========================================

version: ## Mostrar versões do Docker
	@echo "$(BLUE)Docker$(NC): $$(docker --version)"
	@echo "$(BLUE)Docker Compose$(NC): $$(docker-compose --version)"

env-check: ## Verificar se .env.docker existe
	@if [ -f .env.docker ]; then \
		echo "$(GREEN)✅ .env.docker encontrado$(NC)"; \
	else \
		echo "$(RED)❌ .env.docker NÃO encontrado$(NC)"; \
		echo "   Copie: cp .env.docker .env.local"; \
	fi

setup: ## Setup inicial (build + up)
	@make env-check
	@make build
	@make up
	@echo ""
	@echo "$(GREEN)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(NC)"
	@echo "$(GREEN)✅ Setup concluído!$(NC)"
	@echo "$(GREEN)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(NC)"
	@echo ""
	@echo "$(BLUE)Próximas ações:$(NC)"
	@echo "  1. Ver logs: $(YELLOW)make logs$(NC)"
	@echo "  2. Acessar shell: $(YELLOW)make shell$(NC)"
	@echo "  3. Banco de dados: $(YELLOW)make db-shell$(NC)"
	@echo ""

# ========================================
# DEFAULT
# ========================================

.DEFAULT_GOAL := help
