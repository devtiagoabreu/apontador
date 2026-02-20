import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { areas } from '@/lib/db/schema/areas';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const allAreas = await db.select().from(areas).orderBy(areas.nome);
    return NextResponse.json(allAreas);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const [newArea] = await db.insert(areas).values(body).returning();
    return NextResponse.json(newArea);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}