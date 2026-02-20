import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { maquinas } from '@/lib/db/schema/maquinas';
import { maquinaSetor } from '@/lib/db/schema/maquina-setor';
import { setores } from '@/lib/db/schema/setores';
import { eq, inArray } from 'drizzle-orm';

export async function GET() {
  try {
    const allMaquinas = await db
      .select({
        id: maquinas.id,
        nome: maquinas.nome,
        codigo: maquinas.codigo,
        status: maquinas.status,
        ativo: maquinas.ativo,
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
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { setores, ...maquinaData } = body;

    // Inserir máquina
    const [newMaquina] = await db.insert(maquinas).values(maquinaData).returning();

    // Inserir vínculos com setores
    if (setores && setores.length > 0) {
      await db.insert(maquinaSetor).values(
        setores.map((setorId: string) => ({
          maquinaId: newMaquina.id,
          setorId,
        }))
      );
    }

    return NextResponse.json(newMaquina);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}