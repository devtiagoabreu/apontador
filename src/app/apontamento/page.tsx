import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { apontamentos } from '@/lib/db/schema/apontamentos';
import { ops } from '@/lib/db/schema/ops';
import { maquinas } from '@/lib/db/schema/maquinas';
import { eq, and, sql } from 'drizzle-orm';
import { MobileCard } from '@/components/mobile/card';
import { QrCode, Play, Pause } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function ApontamentoPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  // Buscar apontamentos ativos do operador
  const apontamentosAtivos = await db
    .select({
      id: apontamentos.id,
      opId: apontamentos.opId,
      maquinaId: apontamentos.maquinaId,
      dataInicio: apontamentos.dataInicio,
      op: ops.op,
      produto: ops.produto,
      maquina: maquinas.nome,
    })
    .from(apontamentos)
    .leftJoin(ops, eq(apontamentos.opId, ops.op))
    .leftJoin(maquinas, eq(apontamentos.maquinaId, maquinas.id))
    .where(
      and(
        eq(apontamentos.operadorInicioId, session.user.id),
        eq(apontamentos.status, 'EM_ANDAMENTO')
      )
    );

  // Buscar últimas atividades
  const ultimasAtividades = await db
    .select({
      id: apontamentos.id,
      opId: apontamentos.opId,
      dataFim: apontamentos.dataFim,
      metragem: apontamentos.metragemProcessada,
      op: ops.op,
      produto: ops.produto,
    })
    .from(apontamentos)
    .leftJoin(ops, eq(apontamentos.opId, ops.op))
    .where(eq(apontamentos.operadorInicioId, session.user.id))
    .orderBy(sql`${apontamentos.dataFim} DESC`)
    .limit(5);

  return (
    <div className="p-4 space-y-6">
      {/* Boas-vindas */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Olá, {session.user.nome}!</h2>
        <p className="text-sm text-gray-500">O que você vai produzir hoje?</p>
      </div>

      {/* Botão rápido de leitura QR Code */}
      <Link href="/apontamento/leitor">
        <Button className="w-full h-16 text-lg gap-3">
          <QrCode className="h-6 w-6" />
          Ler QR Code
        </Button>
      </Link>

      {/* Apontamentos em andamento */}
      {apontamentosAtivos.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium text-gray-700">Em andamento</h3>
          {apontamentosAtivos.map((ap) => (
            <MobileCard key={ap.id}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium">OP {ap.op}</p>
                  <p className="text-sm text-gray-500">{ap.produto}</p>
                  <p className="text-xs text-gray-400 mt-1">Máquina: {ap.maquina}</p>
                </div>
                <div className="flex gap-2">
                  <Link href={`/apontamento/op/${ap.opId}`}>
                    <Button size="sm" variant="outline">
                      <Play className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href={`/apontamento/parada?apontamento=${ap.id}`}>
                    <Button size="sm" variant="outline" className="text-yellow-600">
                      <Pause className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </MobileCard>
          ))}
        </div>
      )}

      {/* Últimas atividades */}
      {ultimasAtividades.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium text-gray-700">Últimas atividades</h3>
          {ultimasAtividades.map((atv) => (
            <MobileCard key={atv.id}>
              <p className="font-medium">OP {atv.op}</p>
              <p className="text-sm text-gray-500">{atv.produto}</p>
              {atv.metragem && (
                <p className="text-xs text-gray-400 mt-1">
                  Produzido: {atv.metragem} m
                </p>
              )}
            </MobileCard>
          ))}
        </div>
      )}
    </div>
  );
}