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
      // CORRIGIDO: usar opData.op (minúsculo) em vez de opData.OP
      const opExistente = await db.query.ops.findFirst({
        where: eq(ops.op, opData.op),
      });

      if (opExistente) {
        ignoradas++;
        continue;
      }

      const produtoExistente = await db.query.produtos.findFirst({
        where: eq(produtos.codigo, opData.produto),
      });

      await db.insert(ops).values({
        op: opData.op,
        produto: opData.produto,
        depositoFinal: opData.deposito_final || null,
        pecasVinculadas: opData.pecas_vinculadas || null,
        qtdeProgramado: opData.qtde_programado?.toString() || null,
        qtdeCarregado: opData.qtde_carregado?.toString() || null,
        qtdeProduzida: opData.qtde_produzida?.toString() || '0',
        calculoQuebra: opData.calculo_quebra?.toString() || null,
        obs: opData.obs || null,
        um: opData.um || null,
        narrativa: opData.narrativa || null,
        nivel: opData.nivel || null,
        grupo: opData.grupo || null,
        sub: opData.sub || null,
        item: opData.item || null,
        produtoId: produtoExistente?.id || null,
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