export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sistemasIntegracao } from '@/lib/db/schema/sistemas-integracao';
import { apisIntegracao } from '@/lib/db/schema/apis-integracao';
import { eq } from 'drizzle-orm';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sistemaId = searchParams.get('sistema_id');
  const apiId = searchParams.get('api_id');

  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    steps: [],
    error: null,
    data: null,
  };

  try {
    // Buscar sistema
    let sistema;
    if (sistemaId) {
      const [found] = await db.select().from(sistemasIntegracao).where(eq(sistemasIntegracao.id, sistemaId));
      sistema = found;
    } else {
      const [found] = await db.select().from(sistemasIntegracao).where(eq(sistemasIntegracao.ativo, true));
      sistema = found;
    }

    if (!sistema) {
      throw new Error('Nenhum sistema de integração encontrado.');
    }

    if (!sistema.clientId || !sistema.clientSecret || !sistema.tokenUrl) {
      throw new Error(`Sistema "${sistema.nome}" com credenciais incompletas.`);
    }

    // Buscar API
    let api;
    if (apiId) {
      const [found] = await db.select().from(apisIntegracao).where(eq(apisIntegracao.id, apiId));
      api = found;
    } else {
      const [found] = await db.select().from(apisIntegracao).where(eq(apisIntegracao.sistemaId, sistema.id));
      api = found;
    }

    if (!api) {
      throw new Error('Nenhuma API configurada para este sistema.');
    }

    // Passo 1: Token
    diagnostics.steps.push({ step: `Obtendo token para ${sistema.nome}...`, status: 'iniciado' });

    const credentials = Buffer.from(`${sistema.clientId}:${sistema.clientSecret}`).toString('base64');

    const tokenResponse = await fetch(sistema.tokenUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!tokenResponse.ok) {
      const tokenError = await tokenResponse.text();
      diagnostics.steps[0].status = 'erro';
      diagnostics.steps[0].error = { status: tokenResponse.status, statusText: tokenResponse.statusText, body: tokenError };
      throw new Error(`Erro no token: ${tokenResponse.statusText}`);
    }

    const tokenData = await tokenResponse.json();
    diagnostics.steps[0].status = 'sucesso';
    diagnostics.steps[0].tokenInfo = { type: tokenData.token_type, expiresIn: tokenData.expires_in };

    // Passo 2: API
    diagnostics.steps.push({ step: `Buscando dados em ${api.nome}...`, status: 'iniciado' });

    const apiResponse = await fetch(api.apiUrl, {
      method: api.metodo as 'GET' | 'POST' | 'PUT',
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!apiResponse.ok) {
      const apiError = await apiResponse.text();
      diagnostics.steps[1].status = 'erro';
      diagnostics.steps[1].error = { status: apiResponse.status, statusText: apiResponse.statusText, body: apiError };
      throw new Error(`Erro na API: ${apiResponse.statusText}`);
    }

    const apiData = await apiResponse.json();
    diagnostics.steps[1].status = 'sucesso';

    const items = apiData.items || [];
    diagnostics.data = {
      sistema: sistema.nome,
      api: api.nome,
      total: items.length,
      amostra: items.slice(0, 3),
      campos: items.length > 0 ? Object.keys(items[0]) : [],
      analise: {
        opsComOpNula: items.filter((item: any) => !item.op).length,
        opsComProdutoNulo: items.filter((item: any) => !item.produto).length,
      },
    };
  } catch (error) {
    diagnostics.error = error instanceof Error ? error.message : String(error);
  }

  return NextResponse.json(diagnostics);
}
