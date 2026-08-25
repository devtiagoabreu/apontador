// src/lib/systextil/index.ts
import { db } from '@/lib/db';
import { sistemasIntegracao } from '@/lib/db/schema/sistemas-integracao';
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

async function getSistemaById(sistemaId: string) {
  const [sistema] = await db
    .select()
    .from(sistemasIntegracao)
    .where(eq(sistemasIntegracao.id, sistemaId));
  return sistema;
}

async function getApiById(apiId: string) {
  const [api] = await db
    .select()
    .from(apisIntegracao)
    .where(eq(apisIntegracao.id, apiId));
  return api;
}

class SystextilService {
  private tokens: Record<string, { accessToken: string; expiresAt: number }> = {};

  private async getAccessToken(sistema: { clientId: string | null; clientSecret: string | null; tokenUrl: string | null }): Promise<string> {
    const cacheKey = sistema.clientId || '';
    const cached = this.tokens[cacheKey];
    if (cached && Date.now() < cached.expiresAt) {
      return cached.accessToken;
    }

    if (!sistema.clientId || !sistema.clientSecret || !sistema.tokenUrl) {
      throw new Error(
        'Credenciais incompletas. Preencha Token URL, Client ID e Client Secret no cadastro do sistema.'
      );
    }

    const credentials = Buffer.from(`${sistema.clientId}:${sistema.clientSecret}`).toString('base64');

    const response = await fetch(sistema.tokenUrl, {
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

    this.tokens[cacheKey] = {
      accessToken: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000 - 60000,
    };

    return this.tokens[cacheKey].accessToken;
  }

  async importarOps(sistemaId: string, apiId?: string): Promise<SystextilOP[]> {
    const sistema = await getSistemaById(sistemaId);
    if (!sistema) {
      throw new Error('Sistema de integração não encontrado');
    }

    const api = apiId
      ? await getApiById(apiId)
      : (await db.select().from(apisIntegracao).where(eq(apisIntegracao.sistemaId, sistemaId))).find((a) => a.ativa);

    if (!api) {
      throw new Error('Nenhuma API configurada para este sistema');
    }

    const token = await this.getAccessToken(sistema);

    const response = await fetch(api.apiUrl, {
      method: api.metodo as 'GET' | 'POST' | 'PUT',
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
