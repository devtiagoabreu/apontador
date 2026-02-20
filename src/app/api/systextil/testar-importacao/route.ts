export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { systextilService } from '@/lib/systextil';
import { eq } from 'drizzle-orm';

export async function GET() {
  const result: any = {
    timestamp: new Date().toISOString(),
    apiData: null,
    opsProcessadas: [],
    erros: []
  };

  try {
    // Buscar dados da API
    const opsImportadas = await systextilService.importarOps();
    result.apiData = {
      total: opsImportadas.length,
      amostra: opsImportadas.slice(0, 3),
    };

    // Processar cada OP e verificar o que seria inserido
    for (const opData of opsImportadas) {
      try {
        // Verificar se OP já existe - CORRIGIDO: usando opData.op (minúsculo)
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