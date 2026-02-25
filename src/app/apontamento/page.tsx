import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { producoesTable } from '@/lib/db/schema/producoes';
import { ops } from '@/lib/db/schema/ops';
import { maquinas } from '@/lib/db/schema/maquinas';
import { estagios } from '@/lib/db/schema/estagios';
import { eq, and, sql } from 'drizzle-orm';
import { MobileCard } from '@/components/mobile/card';
import { MobileHeader } from '@/components/mobile/header';
import { MobileNav } from '@/components/mobile/nav';
import { QrCode, Play, Pause, Clock, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { formatDate, formatNumber } from '@/lib/utils';

// Função auxiliar para estilizar o estágio (resolvendo o erro de cor)
function getEstagioStyle(estagio: any) {
  // Cores padrão (cinza)
  const defaultBg = '#6b7280'; // gray-500
  const defaultText = '#ffffff';
  
  if (!estagio?.cor) {
    return {
      backgroundColor: `${defaultBg}20`, // 20 = 12% de opacidade
      color: defaultText,
      border: '1px solid #e5e7eb'
    };
  }
  
  return {
    backgroundColor: `${estagio.cor}20`, // 20% de opacidade para fundo
    color: estagio.cor, // cor sólida para o texto
    border: '1px solid transparent'
  };
}

export default async function ApontamentoPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  // Buscar produções ativas do operador
  const producoesAtivas = await db
    .select({
      id: producoesTable.id,
      opId: producoesTable.opId,
      maquinaId: producoesTable.maquinaId,
      estagioId: producoesTable.estagioId,
      dataInicio: producoesTable.dataInicio,
      metragemProgramada: producoesTable.metragemProgramada,
      op: {
        op: ops.op,
        produto: ops.produto,
        carregado: ops.qtdeCarregado,
        um: ops.um,
      },
      maquina: {
        nome: maquinas.nome,
        codigo: maquinas.codigo,
      },
      estagio: {
        nome: estagios.nome,
        cor: estagios.cor,
      },
    })
    .from(producoesTable)
    .leftJoin(ops, eq(producoesTable.opId, ops.op))
    .leftJoin(maquinas, eq(producoesTable.maquinaId, maquinas.id))
    .leftJoin(estagios, eq(producoesTable.estagioId, estagios.id))
    .where(
      and(
        eq(producoesTable.operadorInicioId, session.user.id),
        sql`${producoesTable.dataFim} IS NULL`
      )
    );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <MobileHeader user={session.user} title="Início" />
      
      <main className="flex-1 pb-16 p-4">
        {/* Boas-vindas */}
        <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
          <h2 className="text-lg font-semibold">Olá, {session.user.nome}!</h2>
          <p className="text-sm text-gray-500">O que você vai produzir hoje?</p>
        </div>

        {/* Botão rápido de leitura QR Code */}
        <Link href="/apontamento/leitor">
          <Button className="w-full h-16 text-lg gap-3 mb-6">
            <QrCode className="h-6 w-6" />
            Ler QR Code
          </Button>
        </Link>

        {/* Produções em andamento */}
        <div className="space-y-3">
          <h3 className="font-medium text-gray-700">Em andamento</h3>
          
          {producoesAtivas.length === 0 ? (
            <MobileCard className="text-center py-8 text-gray-500">
              Nenhuma produção em andamento
            </MobileCard>
          ) : (
            producoesAtivas.map((prod) => {
              // Calcular estilo do estágio com fallback seguro
              const estiloEstagio = getEstagioStyle(prod.estagio);
              const nomeEstagio = prod.estagio?.nome || 'Sem estágio';
              const nomeMaquina = prod.maquina?.nome || 'Máquina não identificada';
              const valorCarregado = prod.op?.carregado || 0;
              const unidade = prod.op?.um || 'm';
              const dataInicio = prod.dataInicio ? formatDate(prod.dataInicio) : 'Data não disponível';

              return (
                <MobileCard key={prod.id}>
                  <div className="space-y-2">
                    {/* Cabeçalho com OP e Estágio */}
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">OP {prod.op?.op || '---'}</p>
                        <p className="text-sm text-gray-500 line-clamp-2">
                          {prod.op?.produto || 'Produto não especificado'}
                        </p>
                      </div>
                      <span 
                        className="text-xs px-3 py-1 rounded-full font-medium"
                        style={estiloEstagio}
                      >
                        {nomeEstagio}
                      </span>
                    </div>

                    {/* Informações da máquina e carregado */}
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">Máquina:</span>
                        <p className="font-medium">{nomeMaquina}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Carregado:</span>
                        <p className="font-medium">
                          {formatNumber(valorCarregado)} {unidade}
                        </p>
                      </div>
                    </div>

                    {/* Data de início */}
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="h-3 w-3" />
                      {dataInicio}
                    </div>

                    {/* Botões de ação */}
                    <div className="flex gap-2 pt-2">
                      <Link href={`/apontamento/producoes/finalizar?id=${prod.id}`} className="flex-1">
                        <Button size="sm" className="w-full bg-green-600 hover:bg-green-700">
                          <CheckCircle className="h-4 w-4 mr-1" /> Finalizar
                        </Button>
                      </Link>
                      <Link 
                        href={`/apontamento/parada?maquinaId=${prod.maquinaId}&opId=${prod.opId}`} 
                        className="flex-1"
                      >
                        <Button size="sm" variant="outline" className="w-full text-yellow-600">
                          <Pause className="h-4 w-4 mr-1" /> Parada
                        </Button>
                      </Link>
                    </div>
                  </div>
                </MobileCard>
              );
            })
          )}
        </div>
      </main>
      
      <MobileNav />
    </div>
  );
}