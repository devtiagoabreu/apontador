// src/lib/systextil/index.ts
import { db } from '@/lib/db';
import { configuracoes } from '@/lib/db/schema/configuracoes';
import { apisIntegracao } from '@/lib/db/schema/apis-integracao';
import { eq } from 'drizzle-orm';

interface SystextilToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

interface SystextilOP {
  op: number;
  produto: string;
  deposito_final: string;
  pecas_vinculadas: string;
  qtde_programado: number;
  qtde_carregado: number;
  qtde_produzida: number;
  calculo_quebra: number;
  obs: string;
  um: string;
  narrativa: string;
  nivel: string;
  grupo: string;
  sub: string;
  item: string;
}

interface SystextilResponse {
  items: SystextilOP[];
}

async function getConfiguracoes(): Promise<Record<string, string>> {
  const rows = await db.select().from(configuracoes);
  const config: Record<string, string> = {};
  for (const row of rows) {
    config[row.chave] = row.valor || '';
  }
  return config;
}

async function getApiById(apiId: string) {
  const [api] = await db
    .select()
    .from(apisIntegracao)
    .where(eq(apisIntegracao.id, apiId));
  return api;
}

async function getApiAtiva() {
  const [api] = await db
    .select()
    .from(apisIntegracao)
    .where(eq(apisIntegracao.ativa, true));
  return api;
}

class SystextilService {
  private accessToken: string | null = null;
  private tokenExpiresAt: number | null = null;

  private async getAccessToken(config: Record<string, string>): Promise<string> {
    if (this.accessToken && this.tokenExpiresAt && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    const clientId = config.systextil_client_id;
    const clientSecret = config.systextil_client_secret;
    const tokenUrl = config.systextil_token_url;

    if (!clientId || !clientSecret || !tokenUrl) {
      throw new Error(
        'Configurações do Systextil incompletas. Preencha: systextil_token_url, systextil_client_id, systextil_client_secret'
      );
    }

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      throw new Error(`Erro ao obter token: ${response.statusText}`);
    }

    const data: SystextilToken = await response.json();

    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + data.expires_in * 1000 - 60000;

    return this.accessToken;
  }

  async importarOps(apiId?: string): Promise<SystextilOP[]> {
    const config = await getConfiguracoes();

    const api = apiId ? await getApiById(apiId) : await getApiAtiva();
    if (!api) {
      throw new Error('Nenhuma API de integração configurada ou ativa');
    }

    const token = await this.getAccessToken(config);

    const response = await fetch(api.apiUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Erro na API (${api.nome}): ${response.statusText}`);
    }

    const data: SystextilResponse = await response.json();
    return data.items || [];
  }
}

export const systextilService = new SystextilService();
