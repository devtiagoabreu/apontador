import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { usuarios } from '@/lib/db/schema/usuarios';
import { eq } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const nivel = searchParams.get('nivel');
    
    let query = db.select({
      id: usuarios.id,
      nome: usuarios.nome,
      matricula: usuarios.matricula,
      nivel: usuarios.nivel,
      ativo: usuarios.ativo
    }).from(usuarios);
    
    if (nivel) {
      query = query.where(eq(usuarios.nivel, nivel));
    }
    
    const allUsers = await query;
    
    return NextResponse.json(allUsers);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}