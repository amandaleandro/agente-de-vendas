-- ========================================
-- INICIALIZAÇÃO DO BANCO DE DADOS
-- ========================================
-- Script executado automaticamente pelo Docker

-- Criar schema se não existir
CREATE SCHEMA IF NOT EXISTS public;

-- Criar tabela de leads (se necessário)
-- Descomentar e adaptar conforme sua estrutura de dados
/*
CREATE TABLE IF NOT EXISTS leads (
    id SERIAL PRIMARY KEY,
    telefone VARCHAR(20) UNIQUE NOT NULL,
    nome VARCHAR(255),
    empresa VARCHAR(255),
    segmento VARCHAR(100),
    cidade VARCHAR(100),
    intencao VARCHAR(50),
    principal_dor VARCHAR(255),
    etapa_comercial VARCHAR(50),
    temperatura VARCHAR(20),
    score INTEGER DEFAULT 0,
    precisa_humano BOOLEAN DEFAULT false,
    resumo_conversa TEXT,
    ultima_atividade TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_leads_telefone ON leads(telefone);
CREATE INDEX IF NOT EXISTS idx_leads_etapa ON leads(etapa_comercial);
CREATE INDEX IF NOT EXISTS idx_leads_temperatura ON leads(temperatura);
*/

-- Criar tabela de logs (opcional)
/*
CREATE TABLE IF NOT EXISTS evento_logs (
    id SERIAL PRIMARY KEY,
    lead_telefone VARCHAR(20) REFERENCES leads(telefone),
    tipo_evento VARCHAR(50),
    descricao TEXT,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_logs_telefone ON evento_logs(lead_telefone);
*/

-- Criar tabela de atendimentos humanos (opcional)
/*
CREATE TABLE IF NOT EXISTS atendimentos_humanos (
    id SERIAL PRIMARY KEY,
    lead_telefone VARCHAR(20) REFERENCES leads(telefone),
    motivo_escalacao VARCHAR(255),
    atendente VARCHAR(100),
    data_escalacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_conclusao TIMESTAMP,
    nota_atendente TEXT
);

CREATE INDEX IF NOT EXISTS idx_atendimentos_telefone ON atendimentos_humanos(lead_telefone);
*/

-- Atribuir permissões (se necessário)
GRANT ALL PRIVILEGES ON SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
