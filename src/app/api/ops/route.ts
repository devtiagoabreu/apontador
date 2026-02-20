import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ops } from '@/lib/db/schema/ops';
import { desc } from 'drizzle-orm';

export async function GET() {
  try {
    const allOps = await db.select()
      .from(ops)
      .orderBy(desc(ops.dataImportacao));
    
    return NextResponse.json(allOps);
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}