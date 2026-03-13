// src/app/api/maquinas/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { maquinas } from '@/lib/db/schema/maquinas';
import { maquinaSetor } from '@/lib/db/schema/maquina-setor';
import { setores } from '@/lib/db/schema/setores';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const maquinaSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  codigo: z.string().min(1, 'Código é obrigatório').max(20),
  setores: z.array(z.string()).min(1, 'Selecione pelo menos um setor'),
  status: z.enum(['DISPONIVEL', 'EM_PROCESSO', 'PARADA']).default('DISPONIVEL'),
  ativo: z.boolean().default(true),
  
  // NOVOS CAMPOS
  velocidadePadrao: z.number().optional().default(0),
  capacidadeKg: z.number().optional().default(0),
  capacidadeLitros: z.number().optional().default(0),
  tempoDiarioDisponivel: z.number().optional().default(1440),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const allMaquinas = await db
      .select({
        id: maquinas.id,
        nome: maquinas.nome,
        codigo: maquinas.codigo,
        status: maquinas.status,
        ativo: maquinas.ativo,
        velocidadePadrao: maquinas.velocidadePadrao,
        capacidadeKg: maquinas.capacidadeKg,
        capacidadeLitros: maquinas.capacidadeLitros,
        tempoDiarioDisponivel: maquinas.tempoDiarioDisponivel,
        createdAt: maquinas.createdAt,
        updatedAt: maquinas.updatedAt,
      })
      .from(maquinas)
      .orderBy(maquinas.codigo);

    // Buscar setores para cada máquina
    const maquinasComSetores = await Promise.all(
      allMaquinas.map(async (maquina) => {
        const setoresDaMaquina = await db
          .select({
            setorId: maquinaSetor.setorId,
            setorNome: setores.nome,
          })
          .from(maquinaSetor)
          .leftJoin(setores, eq(maquinaSetor.setorId, setores.id))
          .where(eq(maquinaSetor.maquinaId, maquina.id));

        return {
          ...maquina,
          setoresNomes: setoresDaMaquina.map(s => s.setorNome).join(', '),
          setores: setoresDaMaquina.map(s => s.setorId),
        };
      })
    );

    return NextResponse.json(maquinasComSetores);
  } catch (error) {
    console.error('Erro ao buscar máquinas:', error);
    return NextResponse.json(
      { error: 'Erro interno ao buscar máquinas' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    console.log('📦 Dados recebidos:', body);

    // Validar dados
    const validated = maquinaSchema.parse(body);
    console.log('✅ Dados validados:', validated);

    // Verificar se código já existe
    const existing = await db.query.maquinas.findFirst({
      where: eq(maquinas.codigo, validated.codigo),
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Código já cadastrado' },
        { status: 400 }
      );
    }

    // Inserir máquina em transação
    const result = await db.transaction(async (tx) => {
      // Inserir máquina com novos campos
      const [newMaquina] = await tx
        .insert(maquinas)
        .values({
          nome: validated.nome,
          codigo: validated.codigo,
          status: validated.status,
          ativo: validated.ativo,
          velocidadePadrao: validated.velocidadePadrao?.toString(),
          capacidadeKg: validated.capacidadeKg?.toString(),
          capacidadeLitros: validated.capacidadeLitros?.toString(),
          tempoDiarioDisponivel: validated.tempoDiarioDisponivel,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      console.log('✅ Máquina inserida:', newMaquina);

      // Inserir vínculos com setores
      if (validated.setores && validated.setores.length > 0) {
        await tx.insert(maquinaSetor).values(
          validated.setores.map((setorId: string) => ({
            maquinaId: newMaquina.id,
            setorId,
          }))
        );
        console.log(`✅ ${validated.setores.length} vínculos inseridos`);
      }

      return newMaquina;
    });

    return NextResponse.json(result, { status: 201 });

  } catch (error) {
    console.error('❌ Erro detalhado ao criar máquina:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', detalhes: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Erro interno ao criar máquina' },
      { status: 500 }
    );
  }
}