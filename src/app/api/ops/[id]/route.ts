import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ops } from '@/lib/db/schema/ops';
import { eq } from 'drizzle-orm';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const op = await db.query.ops.findFirst({
      where: eq(ops.op, parseInt(params.id)),
    });

    if (!op) {
      return NextResponse.json(
        { error: 'OP não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(op);
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}

