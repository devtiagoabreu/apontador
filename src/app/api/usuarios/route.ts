import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { usuarios } from '@/lib/db/schema/usuarios';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

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
    return NextResponse.json(
      { error: 'Erro interno ao buscar usuários' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validar dados obrigatórios
    if (!body.nome || !body.matricula) {
      return NextResponse.json(
        { error: 'Nome e matrícula são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se matrícula já existe
    const existingUser = await db.query.usuarios.findFirst({
      where: eq(usuarios.matricula, body.matricula),
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Matrícula já cadastrada' },
        { status: 400 }
      );
    }

    // Preparar dados para inserção
    const userData: any = {
      nome: body.nome,
      matricula: body.matricula,
      nivel: body.nivel || 'OPERADOR',
      ativo: body.ativo ?? true,
    };

    // Se for admin e tiver senha, fazer hash
    if (body.nivel === 'ADM' && body.senha) {
      userData.senha = await bcrypt.hash(body.senha, 10);
    }

    // Inserir usuário
    const [newUser] = await db.insert(usuarios)
      .values(userData)
      .returning({
        id: usuarios.id,
        nome: usuarios.nome,
        matricula: usuarios.matricula,
        nivel: usuarios.nivel,
        ativo: usuarios.ativo,
      });

    return NextResponse.json(newUser, { status: 201 });
    
  } catch (error) {
    console.error('Erro detalhado ao criar usuário:', error);
    
    // Verificar se é erro de JSON
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Dados inválidos enviados' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Erro interno ao criar usuário' },
      { status: 500 }
    );
  }
}