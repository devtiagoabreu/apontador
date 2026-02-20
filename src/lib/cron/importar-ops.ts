import { systextilService } from '@/lib/systextil';
import { db } from '@/lib/db';
import { ops } from '@/lib/db/schema/ops';
import { produtos } from '@/lib/db/schema/produtos';
import { eq } from 'drizzle-orm';

export async function importarOpsAutomatico() {
  console.log('🔄 Iniciando importação automática de OPs...', new Date().toISOString());
  
  try {
    const opsImportadas = await systextilService.importarOps();
    
    let importadas = 0;
    let ignoradas = 0;

    for (const opData of opsImportadas) {
      const opExistente = await db.query.ops.findFirst({
        where: eq(ops.op, opData.OP),
      });

      if (opExistente) {
        ignoradas++;
        continue;
      }

      const produtoExistente = await db.query.produtos.findFirst({
        where: eq(produtos.codigo, opData.PRODUTO),
      });

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

    console.log(`✅ Importação automática concluída: ${importadas} importadas, ${ignoradas} ignoradas`);
    
  } catch (error) {
    console.error('❌ Erro na importação automática:', error);
  }
}