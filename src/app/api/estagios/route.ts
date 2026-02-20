import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { estagios } from '@/lib/db/schema/estagios';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const allEstagios = await db.select().from(estagios).orderBy(estagios.ordem);
    return NextResponse.json(allEstagios);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const [newEstagio] = await db.insert(estagios).values(body).returning();
    return NextResponse.json(newEstagio);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}