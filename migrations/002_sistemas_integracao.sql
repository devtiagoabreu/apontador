-- Migration: Criar tabelas de integração (sistemas + APIs)
-- Execute este SQL no banco de dados antes do deploy

-- 1. Tabela de sistemas de integração (cada um com suas credenciais)
CREATE TABLE IF NOT EXISTS sistemas_integracao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  token_url TEXT,
  client_id TEXT,
  client_secret TEXT,
  ativa BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 2. Atualizar tabela de APIs para referenciar sistema
-- Primeiro remover a tabela antiga se existir e recriar
DROP TABLE IF EXISTS apis_integracao CASCADE;

CREATE TABLE IF NOT EXISTS apis_integracao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sistema_id UUID NOT NULL REFERENCES sistemas_integracao(id),
  nome TEXT NOT NULL,
  api_url TEXT NOT NULL,
  metodo TEXT NOT NULL DEFAULT 'GET',
  ativa BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 3. Inserir Systextil como sistema padrão
INSERT INTO sistemas_integracao (id, nome, token_url, client_id, client_secret, ativa)
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'Systextil',
  'https://promoda.systextil.com.br/apexbd/erp/oauth/token',
  'vM_z3JIQSR7fMml912X4Wg..',
  'v6CnE7I6vI6JkYn7DOIQ6A..',
  true
)
ON CONFLICT DO NOTHING;

-- 4. Inserir endpoint padrão do Systextil
INSERT INTO apis_integracao (sistema_id, nome, api_url, metodo, ativa)
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'Consulta OPs',
  'https://promoda.systextil.com.br/apexbd/erp/systextil-intg-plm/api_apontador_ops',
  'GET',
  true
)
ON CONFLICT DO NOTHING;
