import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { produtos } from '@/lib/db/schema/produtos';

export async function GET() {
  try {
    console.log('📦 GET /api/produtos - Iniciando');
    
    const session = await getServerSession(authOptions);
    console.log('👤 Sessão:', session?.user?.email);
    
    if (!session) {
      console.log('❌ Não autorizado');
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    console.log('🔍 Buscando produtos...');
    const allProdutos = await db.select().from(produtos);
    console.log(`✅ Encontrados ${allProdutos.length} produtos`);

    return NextResponse.json(allProdutos);
  } catch (error) {
    console.error('❌ Erro detalhado:', error);
    return NextResponse.json(
      { 
        error: 'Erro interno ao buscar produtos',
        details: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}