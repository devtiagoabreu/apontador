export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { systextilService } from '@/lib/systextil';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sistemaId = searchParams.get('sistema_id') || undefined;
  const apiId = searchParams.get('api_id') || undefined;

  const result: any = {
    timestamp: new Date().toISOString(),
    apiData: null,
    opsProcessadas: [],
    erros: []
  };

  try {
    if (!sistemaId) {
      throw new Error('sistema_id é obrigatório');
    }

    const opsImportadas = await systextilService.importarOps(sistemaId, apiId);
    result.apiData = {
      total: opsImportadas.length,
      amostra: opsImportadas.slice(0, 3),
    };

    for (const opData of opsImportadas) {
      try {
        const opExistente = await db.query.ops.findFirst({
          where: (ops, { eq }) => eq(ops.op, opData.op),
        });

        result.opsProcessadas.push({
          op: opData.op,
          produto: opData.produto,
          jaExiste: !!opExistente,
          dadosParaInsercao: {
            op: opData.op,
            produto: opData.produto,
            depositoFinal: opData.deposito_final,
            pecasVinculadas: opData.pecas_vinculadas,
            qtdeProgramado: opData.qtde_programado?.toString(),
            qtdeCarregado: opData.qtde_carregado?.toString(),
            qtdeProduzida: opData.qtde_produzida?.toString() || '0',
            calculoQuebra: opData.calculo_quebra?.toString(),
            obs: opData.obs,
            um: opData.um,
            narrativa: opData.narrativa,
            nivel: opData.nivel,
            grupo: opData.grupo,
            sub: opData.sub,
            item: opData.item,
          },
          validacoes: {
            opValida: !!opData.op,
            produtoValido: !!opData.produto,
          }
        });
      } catch (err) {
        result.erros.push({
          op: opData.op,
          erro: err instanceof Error ? err.message : String(err)
        });
      }
    }

  } catch (error) {
    result.erroGeral = error instanceof Error ? error.message : String(error);
  }

  return NextResponse.json(result);
}
