import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ops } from '@/lib/db/schema/ops';
import { produtos } from '@/lib/db/schema/produtos';
import { systextilService } from '@/lib/systextil';
import { eq, and, sql } from 'drizzle-orm';

export async function POST() {
  try {
    // Importar OPs da API
    const opsImportadas = await systextilService.importarOps();
    
    let importadas = 0;
    let ignoradas = 0;

    for (const opData of opsImportadas) {
      // Verificar se OP já existe
      const opExistente = await db.query.ops.findFirst({
        where: eq(ops.op, opData.OP),
      });

      if (opExistente) {
        ignoradas++;
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
        produtoId: produtoExistente?.id,
        codEstagioAtual: '00',
        estagioAtual: 'NENHUM',
        codMaquinaAtual: '00',
        maquinaAtual: 'NENHUMA',
        status: 'ABERTA',
      });

      importadas++;
    }

    return NextResponse.json({
      success: true,
      importadas,
      ignoradas,
      total: opsImportadas.length,
    });

  } catch (error) {
    console.error('Erro na importação:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno' },
      { status: 500 }
    );
  }
}