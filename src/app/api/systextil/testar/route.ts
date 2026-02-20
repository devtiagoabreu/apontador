export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { env } from '@/lib/env';

export async function GET() {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    steps: [],
    error: null,
    data: null
  };

  try {
    // Passo 1: Obter token
    diagnostics.steps.push({ step: 'Obtendo token...', status: 'iniciado' });
    
    const credentials = Buffer.from(
      `${env.SYSTEXTIL_CLIENT_ID}:${env.SYSTEXTIL_CLIENT_SECRET}`
    ).toString('base64');

    const tokenResponse = await fetch(env.SYSTEXTIL_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
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
        body: tokenError
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
    diagnostics.steps.push({ step: 'Buscando OPs...', status: 'iniciado' });

    const apiResponse = await fetch(env.SYSTEXTIL_API_URL, {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!apiResponse.ok) {
      const apiError = await apiResponse.text();
      diagnostics.steps[1].status = 'erro';
      diagnostics.steps[1].error = {
        status: apiResponse.status,
        statusText: apiResponse.statusText,
        body: apiError
      };
      throw new Error(`Erro na API: ${apiResponse.statusText}`);
    }

    const apiData = await apiResponse.json();
    diagnostics.steps[1].status = 'sucesso';
    
    // Analisar os dados recebidos
    const items = apiData.items || [];
    diagnostics.data = {
      total: items.length,
      amostra: items.slice(0, 3), // Mostrar apenas 3 exemplos
      campos: items.length > 0 ? Object.keys(items[0]) : [],
      analise: {
        opsComOpNula: items.filter((item: any) => !item.OP).length,
        opsComProdutoNulo: items.filter((item: any) => !item.PRODUTO).length,
      }
    };

  } catch (error) {
    diagnostics.error = error instanceof Error ? error.message : String(error);
  }

  return NextResponse.json(diagnostics);
}