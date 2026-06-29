# Fezinha Bot - WhatsApp Sales Bot

Bot de vendas automático para WhatsApp com IA, qualificação de leads e prospecção em massa.

## 📁 Estrutura do Projeto

```
.
├── backend/                    # 🖥️  Servidor e lógica da aplicação
│   ├── modules/                # Módulos core
│   │   ├── index.js           # Aplicação principal
│   │   ├── webserver.js       # API REST e serviço web
│   │   ├── chatbot-manager.js # Gerenciador de conversas
│   │   ├── diagnostico-*.js   # Sistema de diagnóstico
│   │   ├── tank.js            # Tank de mensagens
│   │   ├── warmup.js          # Gerenciador de warmup
│   │   ├── backup.js          # Backup automático
│   │   ├── cache.js           # Cache de dados
│   │   ├── logger.js          # Sistema de logs
│   │   ├── metrics.js         # Métricas
│   │   ├── healthcheck.js     # Health check
│   │   └── *.js               # Outros módulos
│   ├── config/                 # Configurações
│   │   └── .env               # Variáveis de ambiente
│   ├── conhecimento/           # Base de conhecimento
│   ├── listas/                 # Contatos CSV
│   ├── scripts/                # Scripts auxiliares
│   ├── Dockerfile             # Docker image
│   ├── docker-compose.yml     # Docker compose
│   ├── entrypoint.sh          # Entrypoint do container
│   └── package.json           # Dependências
│
├── frontend/                   # 🎨 Interface web
│   └── public/                 # Painéis HTML
│       ├── index.html         # Painel principal
│       ├── dashboard.html     # Dashboard
│       ├── qrcodes.html       # QR Codes WhatsApp
│       ├── analytics.html     # Analytics
│       └── *.html             # Outros painéis
│
├── docs/                       # 📚 Documentação
│   ├── STATUS-ATUAL.md        # Estado do projeto
│   ├── ROTEIRO_ROBUSTO.md     # Fluxo conversacional
│   ├── PLAYBOOK-DE-VENDAS.md  # Estratégia comercial
│   └── CONFIGURAR-GEMINI.md   # Setup da IA
│
├── .gitignore                 # Git ignore
├── .env.example               # Exemplo de variáveis
└── README.md                  # Este arquivo
```

## 🚀 Quick Start

### Opção 1: Localmente (Node.js)

```bash
cd backend
npm install
npm start
```

Acesse http://localhost:3099

### Opção 2: Docker

```bash
cd backend
docker-compose up -d
```

## 📖 Documentação

- **STATUS-ATUAL.md** - Estado atual e próximos passos
- **ROTEIRO_ROBUSTO.md** - Fluxo de conversação do bot
- **PLAYBOOK-DE-VENDAS.md** - Estratégia comercial
- **CONFIGURAR-GEMINI.md** - Como configurar IA

## ⚙️ Configuração

Copie `.env.example` para `backend/config/.env` e configure:

```bash
cp .env.example backend/config/.env
# Edite backend/config/.env com suas variáveis
```

Variáveis essenciais:
- `GEMINI_API_KEY` - Chave da IA Gemini
- `WHATSAPP_NUMEROS` - Quantidade de números WhatsApp
- `PROSPECCAO_ATIVA` - Ativar prospecção automática

## 📦 Dependências Principais

- **Baileys** - WhatsApp Web API
- **Gemini/xAI** - IA para conversas
- **Express/HTTP** - Servidor web
- **PostgreSQL** - Banco de dados (opcional)

## 🐳 Docker

Estrutura otimizada para Docker:
- Imagem leve e eficiente
- Health checks automáticos
- Backup automático a cada 6 horas

```bash
docker-compose up -d
docker-compose logs -f
```

## 📊 Painéis Web

Acesse em http://localhost:3099

- **Dashboard** - Visão geral do bot
- **QR Codes** - Conectar WhatsApp
- **Analytics** - Métricas e resultados
- **Status** - Estado do sistema

## 🔧 Estrutura de Módulos

### Core Modules (`backend/modules/`)
- `index.js` - Aplicação principal
- `webserver.js` - API REST
- `tank.js` - Queue de mensagens
- `warmup.js` - Gerenciador de warmup
- `diagnostico-*.js` - Sistema de diagnóstico

### Utilitários (`backend/modules/`)
- `backup.js` - Backup automático
- `cache.js` - Cache em memória
- `csv.js` - Processamento de CSV
- `healthcheck.js` - Verificação de saúde
- `logger.js` - Sistema de logs
- `metrics.js` - Coleta de métricas
- `ratelimit.js` - Rate limiting
- `security.js` - Segurança

## 📝 Logs

Logs salvos em `backend/logs/`

```bash
# Ver logs em tempo real
docker-compose logs -f

# Ver logs de um container
docker-compose logs backend
```

## 🔐 Segurança

- `.env` nunca deve ser commitado (está em .gitignore)
- Senhas e chaves apenas em variáveis de ambiente
- Rate limiting e proteção contra abuse
- Validação de entrada em todas as APIs

## 🤝 Contribuindo

1. Crie uma branch: `git checkout -b feature/sua-feature`
2. Commite: `git commit -am 'Descrição'`
3. Push: `git push origin feature/sua-feature`
4. Abra um Pull Request

## 📄 Licença

Propriedade de Amanda Carmo

## 📞 Suporte

Para dúvidas ou problemas, consulte `docs/STATUS-ATUAL.md`
