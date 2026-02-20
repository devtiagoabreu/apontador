export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ops } from '@/lib/db/schema/ops';
import { produtos } from '@/lib/db/schema/produtos';
import { systextilService } from '@/lib/systextil';
import { eq } from 'drizzle-orm';

export async function POST() {
  const resultado = {
    sucesso: false,
    importadas: 0,
    ignoradas: 0,
    erros: [] as any[],
    detalhes: [] as any[]
  };

  try {
    // Importar OPs da API
    const opsImportadas = await systextilService.importarOps();
    
    for (const opData of opsImportadas) {
      try {
        // VALIDAÇÃO: OP deve existir
        if (!opData.OP) {
          resultado.erros.push({
            tipo: 'OP inválida',
            dados: opData,
            motivo: 'Campo OP é obrigatório'
          });
          continue;
        }

        // VALIDAÇÃO: Produto deve existir
        if (!opData.PRODUTO) {
          resultado.erros.push({
            op: opData.OP,
            tipo: 'Produto inválido',
            motivo: 'Campo PRODUTO é obrigatório'
          });
          continue;
        }

        // Verificar se OP já existe
        const opExistente = await db.query.ops.findFirst({
          where: eq(ops.op, opData.OP),
        });

        if (opExistente) {
          resultado.ignoradas++;
          resultado.detalhes.push({
            op: opData.OP,
            status: 'ignorada',
            motivo: 'Já existe no banco'
          });
          continue;
        }

        // Buscar produto correspondente
        const produtoExistente = await db.query.produtos.findFirst({
          where: eq(produtos.codigo, opData.PRODUTO),
        });

        // Inserir nova OP
        await db.insert(ops).values({
          op: opData.OP,
          produto: opData.PRODUTO,
          depositoFinal: opData.DEPOSITO_FINAL || null,
          pecasVinculadas: opData.PECAS_VINCULADAS || null,
          qtdeProgramado: opData.QTDE_PROGRAMADO?.toString() || null,
          qtdeCarregado: opData.QTDE_CARREGADO?.toString() || null,
          qtdeProduzida: opData.QTDE_PRODUZIDA?.toString() || '0',
          calculoQuebra: opData.CALCULO_QUEBRA?.toString() || null,
          obs: opData.OBS || null,
          um: opData.UM || null,
          narrativa: opData.NARRATIVA || null,
          nivel: opData.NIVEL || null,
          grupo: opData.GRUPO || null,
          sub: opData.SUB || null,
          item: opData.ITEM || null,
          produtoId: produtoExistente?.id || null,
          codEstagioAtual: '00',
          estagioAtual: 'NENHUM',
          codMaquinaAtual: '00',
          maquinaAtual: 'NENHUMA',
          status: 'ABERTA',
        });

        resultado.importadas++;
        resultado.detalhes.push({
          op: opData.OP,
          status: 'importada',
          produto: opData.PRODUTO
        });

      } catch (err) {
        resultado.erros.push({
          op: opData.OP,
          erro: err instanceof Error ? err.message : String(err),
          dados: opData
        });
      }
    }

    resultado.sucesso = true;

  } catch (error) {
    return NextResponse.json({
      sucesso: false,
      erro: error instanceof Error ? error.message : 'Erro desconhecido',
      resultado
    }, { status: 500 });
  }

  return NextResponse.json(resultado);
}