#!/bin/sh

echo "🚀 Iniciando Fezinha..."
echo ""

# Iniciar servidor web em background
echo "🌐 Iniciando servidor web na porta 3099..."
node servidor-web-simples.js &
WEB_PID=$!
echo "✅ Servidor web iniciado (PID: $WEB_PID)"

# Aguardar um pouco
sleep 2

# Iniciar bot
echo ""
echo "🤖 Iniciando bot Fezinha..."
node index.js &
BOT_PID=$!

# Aguardar algum dos dois processos terminar
wait
