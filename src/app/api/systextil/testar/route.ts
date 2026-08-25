export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { configuracoes } from '@/lib/db/schema/configuracoes';
import { apisIntegracao } from '@/lib/db/schema/apis-integracao';
import { eq } from 'drizzle-orm';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const apiId = searchParams.get('api_id');

  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    steps: [],
    error: null,
    data: null,
  };

  try {
    // Buscar configs do banco
    const configRows = await db.select().from(configuracoes);
    const config: Record<string, string> = {};
    for (const row of configRows) {
      config[row.chave] = row.valor || '';
    }

    const clientId = config.systextil_client_id;
    const clientSecret = config.systextil_client_secret;
    const tokenUrl = config.systextil_token_url;

    if (!clientId || !clientSecret || !tokenUrl) {
      throw new Error(
        'Configurações incompletas. Preencha systextil_client_id, systextil_client_secret e systextil_token_url na tela de Configurações.'
      );
    }

    // Buscar API selecionada ou ativa
    let api;
    if (apiId) {
      const [found] = await db
        .select()
        .from(apisIntegracao)
        .where(eq(apisIntegracao.id, apiId));
      api = found;
    } else {
      const [found] = await db
        .select()
        .from(apisIntegracao)
        .where(eq(apisIntegracao.ativa, true));
      api = found;
    }

    if (!api) {
      throw new Error('Nenhuma API de integração configurada ou ativa.');
    }

    // Passo 1: Obter token
    diagnostics.steps.push({ step: 'Obtendo token...', status: 'iniciado' });

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const tokenResponse = await fetch(tokenUrl, {
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
      diagnostics.steps[0].error = {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        body: tokenError,
      };
      throw new Error(`Erro no token: ${tokenResponse.statusText}`);
    }

    const tokenData = await tokenResponse.json();
    diagnostics.steps[0].status = 'sucesso';
    diagnostics.steps[0].tokenInfo = {
      type: tokenData.token_type,
      expiresIn: tokenData.expires_in,
    };

    // Passo 2: Chamar API de OPs
    diagnostics.steps.push({ step: `Buscando OPs em ${api.nome}...`, status: 'iniciado' });

    const apiResponse = await fetch(api.apiUrl, {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!apiResponse.ok) {
      const apiError = await apiResponse.text();
      diagnostics.steps[1].status = 'erro';
      diagnostics.steps[1].error = {
        status: apiResponse.status,
        statusText: apiResponse.statusText,
        body: apiError,
      };
      throw new Error(`Erro na API: ${apiResponse.statusText}`);
    }

    const apiData = await apiResponse.json();
    diagnostics.steps[1].status = 'sucesso';

    const items = apiData.items || [];
    diagnostics.data = {
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
