// src/app/apontamento/avulso/page.tsx
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { producoesAvulsas } from '@/lib/db/schema/producoes-avulsas';
import { maquinas } from '@/lib/db/schema/maquinas';
import { produtos } from '@/lib/db/schema/produtos';
import { eq, and, sql } from 'drizzle-orm';
import { MobileCard } from '@/components/mobile/card';
import { Button } from '@/components/ui/button';
import { Plus, Package } from 'lucide-react';
import Link from 'next/link';

export default async function DashboardAvulsoPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const ativos = await db
    .select({
      id: producoesAvulsas.id,
      produto: { codigo: produtos.codigo, nome: produtos.nome },
      maquina: { nome: maquinas.nome, codigo: maquinas.codigo }
    })
    .from(producoesAvulsas)
    .leftJoin(produtos, eq(producoesAvulsas.produtoId, produtos.id))
    .leftJoin(maquinas, eq(producoesAvulsas.maquinaId, maquinas.id))
    .where(and(eq(producoesAvulsas.operadorInicioId, session.user.id), sql`${producoesAvulsas.dataFim} IS NULL`));

  return (
    <div className="p-4 space-y-6">
      <div className="bg-white p-4 rounded-xl border-l-4 border-l-primary shadow-sm">
        <h2 className="font-bold text-primary text-lg">Olá, {session.user.nome}</h2>
        <p className="text-xs text-muted-foreground">Contexto: Produção Avulsa</p>
      </div>

      <Link href="/apontamento/avulso/iniciar">
        <Button className="w-full h-16 text-lg gap-2"><Plus /> Iniciar Novo</Button>
      </Link>

      <div className="space-y-3">
        <h3 className="font-bold text-sm flex items-center gap-2"><Package size={16} /> Processos em andamento</h3>
        {ativos.length === 0 ? (
          <p className="text-center py-10 text-gray-400 italic border rounded-lg border-dashed">Nenhum processo ativo.</p>
        ) : (
          ativos.map((p) => (
            <MobileCard key={p.id}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-primary">{p.produto?.codigo || 'S/C'}</p>
                  <p className="text-xs text-gray-500">{p.produto?.nome || 'Produto não identificado'}</p>
                </div>
                <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-bold">ATIVO</span>
              </div>
              <p className="text-sm mt-2 font-medium">Máquina: {p.maquina?.nome || '???'}</p>
              <Link href={`/apontamento/avulso/finalizar?id=${p.id}`}>
                <Button className="w-full mt-3 bg-green-600 hover:bg-green-700">Finalizar</Button>
              </Link>
            </MobileCard>
          ))
        )}
      </div>
    </div>
  );
}