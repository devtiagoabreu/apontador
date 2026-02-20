import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { motivosCancelamento } from '@/lib/db/schema/motivos-cancelamento';

export async function GET() {
  try {
    const allMotivos = await db.select().from(motivosCancelamento);
    return NextResponse.json(allMotivos);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const [newMotivo] = await db.insert(motivosCancelamento).values(body).returning();
    return NextResponse.json(newMotivo);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}