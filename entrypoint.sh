#!/bin/sh

echo ""
echo "🚀 Iniciando Fezinha com Servidor Web..."
echo ""

# Iniciar servidor web em background
node servidor-web-simples.js &
WEB_PID=$!
echo "✅ Servidor Web iniciado (PID: $WEB_PID)"

sleep 1

# Iniciar bot em foreground (vai ocupar o terminal)
echo "🤖 Iniciando Bot..."
exec node index.js
