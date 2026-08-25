-- Migration: Criar tabelas de configuração
-- Execute este SQL no banco de dados antes do deploy

-- Tabela de configurações chave-valor
CREATE TABLE IF NOT EXISTS configuracoes (
  chave TEXT PRIMARY KEY,
  valor TEXT,
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Tabela de APIs de integração
CREATE TABLE IF NOT EXISTS apis_integracao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  api_url TEXT NOT NULL,
  ativa BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Inserir configurações iniciais do Systextil (valores atuais do .env)
-- Ajuste os valores abaixo conforme necessário
INSERT INTO configuracoes (chave, valor) VALUES
  ('systextil_token_url', 'https://promoda.systextil.com.br/apexbd/erp/oauth/token'),
  ('systextil_client_id', 'vM_z3JIQSR7fMml912X4Wg..'),
  ('systextil_client_secret', 'v6CnE7I6vI6JkYn7DOIQ6A..')
ON CONFLICT (chave) DO NOTHING;

-- Inserir API padrão do Systextil
INSERT INTO apis_integracao (nome, api_url, ativa) VALUES
  ('Systextil Promoda', 'https://promoda.systextil.com.br/apexbd/erp/systextil-intg-plm/api_apontador_ops', true)
ON CONFLICT DO NOTHING;
