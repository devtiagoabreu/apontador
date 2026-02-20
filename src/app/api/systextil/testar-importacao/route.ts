import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { systextilService } from '@/lib/systextil';

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
        // Verificar se OP já existe
        const opExistente = await db.query.ops.findFirst({
          where: (ops, { eq }) => eq(ops.op, opData.OP),
        });

        result.opsProcessadas.push({
          op: opData.OP,
          produto: opData.PRODUTO,
          jaExiste: !!opExistente,
          dadosParaInsercao: {
            op: opData.OP,
            produto: opData.PRODUTO,
            depositoFinal: opData.DEPOSITO_FINAL,
            pecasVinculadas: opData.PECAS_VINCULADAS,
            qtdeProgramado: opData.QTDE_PROGRAMADO?.toString(),
            qtdeCarregado: opData.QTDE_CARREGADO?.toString(),
            qtdeProduzida: opData.QTDE_PRODUZIDA?.toString() || '0',
            calculoQuebra: opData.CALCULO_QUEBRA?.toString(),
            obs: opData.OBS,
            um: opData.UM,
            narrativa: opData.NARRATIVA,
            nivel: opData.NIVEL,
            grupo: opData.GRUPO,
            sub: opData.SUB,
            item: opData.ITEM,
          },
          validacoes: {
            opValida: !!opData.OP,
            produtoValido: !!opData.PRODUTO,
          }
        });
      } catch (err) {
        result.erros.push({
          op: opData.OP,
          erro: err instanceof Error ? err.message : String(err)
        });
      }
    }

  } catch (error) {
    result.erroGeral = error instanceof Error ? error.message : String(error);
  }

  return NextResponse.json(result);
}