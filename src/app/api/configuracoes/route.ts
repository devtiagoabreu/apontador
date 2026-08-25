export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { configuracoes } from '@/lib/db/schema/configuracoes';

export async function GET() {
  try {
    const rows = await db.select().from(configuracoes);
    const config: Record<string, string> = {};
    for (const row of rows) {
      config[row.chave] = row.valor || '';
    }
    return NextResponse.json(config);
  } catch (error) {
    return NextResponse.json(
      { erro: error instanceof Error ? error.message : 'Erro ao buscar configurações' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const dados = await request.json();

    for (const [chave, valor] of Object.entries(dados)) {
      await db
        .insert(configuracoes)
        .values({ chave, valor: valor as string })
        .onConflictDoUpdate({
          target: configuracoes.chave,
          set: { valor: valor as string, atualizadoEm: new Date() },
        });
    }

    return NextResponse.json({ sucesso: true });
  } catch (error) {
    return NextResponse.json(
      { erro: error instanceof Error ? error.message : 'Erro ao salvar configurações' },
      { status: 500 }
    );
  }
}
