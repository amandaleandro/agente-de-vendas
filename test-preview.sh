#!/bin/bash

# 🧪 Script para testar o bot em modo PREVIEW (sem enviar mensagens)

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║  🧪 Fezinha Bot - MODO PREVIEW (NÃO VAI ENVIAR)       ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

cd "$(dirname "$0")/backend"

echo "📋 Configurando modo preview..."
echo "  ✓ PROSPECCAO_ATIVA=false (não vai enviar)"
echo "  ✓ Conecta ao WhatsApp (normal)"
echo "  ✓ Painel web ativo (normal)"
echo ""

# Iniciar bot em modo preview
export PROSPECCAO_ATIVA=false
export PROSPECCAO_AGENDA_ATIVA=false

echo "▶️  Iniciando bot..."
echo ""
echo "📍 Acesse:"
echo "   • Painel: http://localhost:3099"
echo "   • Agenda: http://localhost:3099/agenda.html"
echo ""
echo "⏹️  Para parar: Pressione Ctrl+C"
echo ""

npm start
