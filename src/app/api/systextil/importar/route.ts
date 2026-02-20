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
    const opsImportadas = await systextilService.importarOps();
    
    for (const opData of opsImportadas) {
      try {
        // VALIDAÇÃO usando os campos minúsculos
        if (!opData.op) {
          resultado.erros.push({
            tipo: 'OP inválida',
            dados: opData,
            motivo: 'Campo op é obrigatório'
          });
          continue;
        }

        if (!opData.produto) {
          resultado.erros.push({
            op: opData.op,
            tipo: 'Produto inválido',
            motivo: 'Campo produto é obrigatório'
          });
          continue;
        }

        // Verificar se OP já existe
        const opExistente = await db.query.ops.findFirst({
          where: eq(ops.op, opData.op),
        });

        if (opExistente) {
          resultado.ignoradas++;
          resultado.detalhes.push({
            op: opData.op,
            status: 'ignorada',
            motivo: 'Já existe no banco'
          });
          continue;
        }

        // Buscar produto correspondente
        const produtoExistente = await db.query.produtos.findFirst({
          where: eq(produtos.codigo, opData.produto),
        });

        // Inserir nova OP
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

        resultado.importadas++;
        resultado.detalhes.push({
          op: opData.op,
          status: 'importada',
          produto: opData.produto
        });

      } catch (err) {
        resultado.erros.push({
          op: opData.op,
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