import { NextResponse } from 'next/server';
import { importarOpsAutomatico } from '@/lib/cron/importar-ops';

// Esta rota pode ser chamada por um cron job externo (ex: Vercel Cron)
export async function GET() {
  try {
    await importarOpsAutomatico();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}