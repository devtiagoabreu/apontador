// src/lib/cron/importar-ops.ts
import { systextilService } from '@/lib/systextil';
import { db } from '@/lib/db';
import { ops } from '@/lib/db/schema/ops';
import { produtos } from '@/lib/db/schema/produtos';
import { sistemasIntegracao } from '@/lib/db/schema/sistemas-integracao';
import { eq } from 'drizzle-orm';

export async function importarOpsAutomatico(sistemaId?: string) {
  console.log('🔄 Iniciando importação automática de OPs...', new Date().toISOString());

  try {
    // Se não foi informado sistema, usar o primeiro ativo
    if (!sistemaId) {
      const [sistemaAtivo] = await db
        .select()
        .from(sistemasIntegracao)
        .where(eq(sistemasIntegracao.ativo, true));
      if (!sistemaAtivo) {
        console.log('⚠️ Nenhum sistema de integração ativo encontrado');
        return;
      }
      sistemaId = sistemaAtivo.id;
    }

    const opsImportadas = await systextilService.importarOps(sistemaId);

    let importadas = 0;
    let ignoradas = 0;

    for (const opData of opsImportadas) {
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
