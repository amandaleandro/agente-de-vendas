#!/bin/bash

# ========================================
# SCRIPT DE BACKUP DO BANCO DE DADOS
# ========================================
# Uso: ./scripts/backup-db.sh [container_name] [database_name]
# Exemplo: ./scripts/backup-db.sh fezinha-db agentefecha

set -e

# Variáveis
CONTAINER_NAME=${1:-fezinha-db}
DATABASE_NAME=${2:-agentefecha}
DB_USER=${3:-postgres}
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/backup_${DATABASE_NAME}_${TIMESTAMP}.sql"

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Criar diretório de backups se não existir
mkdir -p "$BACKUP_DIR"

echo -e "${YELLOW}📦 Iniciando backup do banco de dados...${NC}"
echo "Container: $CONTAINER_NAME"
echo "Database: $DATABASE_NAME"
echo "Arquivo: $BACKUP_FILE"

# Executar dump do banco
if docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" "$DATABASE_NAME" > "$BACKUP_FILE" 2>/dev/null; then
    FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo -e "${GREEN}✅ Backup concluído com sucesso!${NC}"
    echo "Tamanho: $FILE_SIZE"

    # Manter apenas últimos 7 backups
    echo -e "${YELLOW}🧹 Limpando backups antigos...${NC}"
    ls -t "$BACKUP_DIR"/backup_${DATABASE_NAME}_*.sql 2>/dev/null | tail -n +8 | xargs -r rm
    echo -e "${GREEN}✅ Limpeza concluída${NC}"
else
    echo -e "${RED}❌ Erro ao fazer backup${NC}"
    exit 1
fi

# Comprimir backup (opcional)
if command -v gzip &> /dev/null; then
    gzip "$BACKUP_FILE"
    echo -e "${GREEN}✅ Backup comprimido${NC}"
fi

echo -e "${GREEN}✅ Processo finalizado!${NC}"
