import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { usuarios } from '@/lib/db/schema/usuarios';
import { eq } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const nivel = searchParams.get('nivel');
    
    const users = await db.select({
      id: usuarios.id,
      nome: usuarios.nome,
      matricula: usuarios.matricula,
      nivel: usuarios.nivel,
      ativo: usuarios.ativo
    })
    .from(usuarios)
    .where(nivel ? eq(usuarios.nivel, nivel) : undefined);
    
    return NextResponse.json(users);
    
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}