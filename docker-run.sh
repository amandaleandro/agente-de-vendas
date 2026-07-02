#!/bin/bash

# Script para rodar FechaPro com Docker em Linux/Mac

echo ""
echo "===================================="
echo "   FechaPro - Docker Launcher"
echo "===================================="
echo ""

# Verificar Docker
if ! command -v docker &> /dev/null; then
    echo "[ERRO] Docker não está instalado!"
    echo ""
    echo "Instale: https://docs.docker.com/get-docker/"
    exit 1
fi

echo "[OK] Docker encontrado"
docker --version

# Verificar Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "[ERRO] Docker Compose não encontrado"
    exit 1
fi

echo "[OK] Docker Compose encontrado"
docker-compose --version
echo ""

# Menu
menu() {
    echo "Escolha uma opção:"
    echo ""
    echo "1) Iniciar servicos (docker-compose up -d)"
    echo "2) Ver logs em tempo real (docker-compose logs -f)"
    echo "3) Parar servicos (docker-compose stop)"
    echo "4) Ver status (docker-compose ps)"
    echo "5) Limpar tudo (docker-compose down -v)"
    echo "6) Rebuild (docker-compose up -d --build)"
    echo "7) Sair"
    echo ""
    read -p "Digite sua opção (1-7): " choice

    case $choice in
        1) start_services ;;
        2) show_logs ;;
        3) stop_services ;;
        4) show_status ;;
        5) clean_all ;;
        6) rebuild ;;
        7) echo "Até logo!" && exit 0 ;;
        *) echo "Opção inválida!" && menu ;;
    esac
}

start_services() {
    echo ""
    echo "Iniciando servicos..."
    docker-compose up -d
    sleep 5
    clear
    echo ""
    echo "===================================="
    echo "  SERVICOS INICIADOS COM SUCESSO!"
    echo "===================================="
    echo ""
    echo "Frontend:  http://localhost"
    echo "API:       http://localhost:3099"
    echo ""
    echo "Aguarde 30 segundos para o banco de dados iniciar..."
    sleep 30
    echo "[OK] Sistema está pronto!"
    echo ""
    read -p "Pressione ENTER para continuar..." dummy
    menu
}

show_logs() {
    echo ""
    echo "Mostrando logs (Ctrl+C para parar)..."
    docker-compose logs -f
    menu
}

stop_services() {
    echo ""
    echo "Parando servicos..."
    docker-compose stop
    echo "[OK] Servicos parados"
    sleep 3
    menu
}

show_status() {
    echo ""
    docker-compose ps
    echo ""
    read -p "Pressione ENTER para continuar..." dummy
    menu
}

clean_all() {
    echo ""
    echo "[AVISO] Isso vai remover TODOS os dados (banco de dados, etc)"
    read -p "Deseja continuar? (s/n): " confirm
    if [ "$confirm" = "s" ]; then
        docker-compose down -v
        echo "[OK] Tudo removido"
    else
        echo "Cancelado"
    fi
    sleep 3
    menu
}

rebuild() {
    echo ""
    echo "Rebuild dos images..."
    docker-compose build --no-cache
    echo ""
    echo "Iniciando servicos..."
    docker-compose up -d
    sleep 5
    start_services
}

# Executar
menu
