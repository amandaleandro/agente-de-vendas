#!/bin/bash

# 🤖 Fezinha Bot - Script de Inicialização

set -e

echo "🚀 Iniciando Fezinha Bot..."
echo ""

# Verificar se .env existe
if [ ! -f "backend/config/.env" ]; then
    echo "⚠️  Arquivo .env não encontrado!"
    echo "📋 Copie .env.example para backend/config/.env"
    echo ""
    echo "Executando:"
    echo "  cp .env.example backend/config/.env"
    cp .env.example backend/config/.env
    echo ""
    echo "✏️  Edite backend/config/.env com suas configurações"
    exit 1
fi

# Entrar na pasta backend
cd backend

# Verificar node_modules
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependências..."
    npm install
    echo ""
fi

# Iniciar a aplicação
echo "✅ Iniciando aplicação..."
echo "📍 Acesse: http://localhost:3099"
echo ""

npm start
