// src/app/apontamento/avulso/page.tsx
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { producoesAvulsas } from '@/lib/db/schema/producoes-avulsas';
import { maquinas } from '@/lib/db/schema/maquinas';
import { produtos } from '@/lib/db/schema/produtos';
import { estagios } from '@/lib/db/schema/estagios';
import { eq, and, sql } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { MobileCard } from '@/components/mobile/card';
import { Button } from '@/components/ui/button';
import { Plus, CheckCircle, Package, Clock } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';

export default async function DashboardAvulsoPage() {
  const session = await getServerSession(authOptions);
  
  // Proteção de rota: Redireciona para o login avulso se não houver sessão
  if (!session) {
    redirect('/login/avulso');
  }

  /**
   * Busca produções avulsas ativas deste operador.
   * Filtra apenas registros onde dataFim é nulo (em andamento) [1].
   */
  const ativos = await db
    .select({
      id: producoesAvulsas.id,
      dataInicio: producoesAvulsas.dataInicio,
      produto: { 
        codigo: produtos.codigo, 
        nome: produtos.nome 
      },
      maquina: { 
        nome: maquinas.nome, 
        codigo: maquinas.codigo 
      },
      estagio: { 
        nome: estagios.nome, 
        cor: estagios.cor 
      }
    })
    .from(producoesAvulsas)
    .leftJoin(produtos, eq(producoesAvulsas.produtoId, produtos.id))
    .leftJoin(maquinas, eq(producoesAvulsas.maquinaId, maquinas.id))
    .leftJoin(estagios, eq(producoesAvulsas.estagioId, estagios.id))
    .where(
      and(
        eq(producoesAvulsas.operadorInicioId, session.user.id),
        sql`${producoesAvulsas.dataFim} IS NULL`
      )
    );

  return (
    <div className="p-4 space-y-6 mb-20">
      {/* Cabeçalho de Boas-vindas seguindo padrão Mobile [2] */}
      <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-l-primary">
        <h2 className="text-lg font-semibold text-primary">Olá, {session.user.nome}!</h2>
        <p className="text-sm text-gray-500 font-medium">Painel de Produção Avulsa</p>
      </div>

      {/* Ação Principal: Iniciar novo processo sem OP */}
      <Link href="/apontamento/avulso/iniciar">
        <Button className="w-full h-16 text-lg gap-3 mb-2 bg-primary hover:bg-primary/90 shadow-md">
          <Plus className="h-6 w-6" /> Iniciar Portada/Carrolão
        </Button>
      </Link>

      <div className="space-y-3">
        <h3 className="font-bold text-gray-700 flex items-center gap-2 px-1">
          <Package className="h-4 w-4 text-primary" /> Seus processos ativos
        </h3>

        {ativos.length === 0 ? (
          /* Estado Vazio [3] */
          <MobileCard className="text-center py-10 text-gray-500 border-dashed border-2">
            <p>Nenhuma produção avulsa ativa no momento.</p>
            <p className="text-xs mt-1">Toque no botão acima para iniciar.</p>
          </MobileCard>
        ) : (
          /* Lista de Processos Ativos com Correção TS(18047) */
          ativos.map((prod) => (
            <MobileCard key={prod.id}>
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    {/* Fallbacks para Produto Nulo */}
                    <p className="font-bold text-primary text-base">
                      {prod.produto?.codigo || 'S/C'}
                    </p>
                    <p className="text-xs text-gray-600 line-clamp-1">
                      {prod.produto?.nome || 'Produto não identificado'}
                    </p>
                  </div>
                  <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-bold uppercase tracking-wider">
                    Em Processo
                  </span>
                </div>
                
                <div className="grid grid-cols-1 gap-1 text-sm text-gray-700 border-t pt-2">
                   <div className="flex items-center gap-2">
                      <span className="text-gray-400 font-medium text-xs uppercase">Máquina:</span>
                      {/* Fallbacks para Máquina Nula */}
                      <span className="font-semibold">
                        {prod.maquina?.nome || 'Não definida'} ({prod.maquina?.codigo || '???'})
                      </span>
                   </div>
                   <div className="flex items-center gap-2">
                      <span className="text-gray-400 font-medium text-xs uppercase">Estágio:</span>
                      <span className="font-medium">{prod.estagio?.nome || 'Sem estágio'}</span>
                   </div>
                </div>

                <div className="flex items-center gap-1 text-[10px] text-gray-400">
                  <Clock className="h-3 w-3" />
                  Iniciado em {formatDate(prod.dataInicio)}
                </div>

                <div className="flex gap-2 pt-2 border-t">
                  <Link href={`/apontamento/avulso/finalizar?id=${prod.id}`} className="flex-1">
                    <Button size="sm" className="w-full bg-green-600 hover:bg-green-700 h-11 text-white font-bold">
                      <CheckCircle className="h-4 w-4 mr-2" /> Finalizar Processo
                    </Button>
                  </Link>
                </div>
              </div>
            </MobileCard>
          ))
        )}
      </div>
    </div>
  );
}