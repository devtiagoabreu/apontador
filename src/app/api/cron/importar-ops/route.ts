import { NextResponse } from 'next/server';
import { importarOpsAutomatico } from '@/lib/cron/importar-ops';

// Esta rota pode ser chamada por um cron job externo (ex: Vercel Cron)
// Query param opcional: ?sistema_id=uuid
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sistemaId = searchParams.get('sistema_id') || undefined;

  try {
    await importarOpsAutomatico(sistemaId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
