import { NextResponse } from 'next/server';
import { db } from '@/lib/db';  // Usar alias @/
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    await db.execute(sql`SELECT 1 as health_check`);
    
    return NextResponse.json({ 
      status: 'healthy', 
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({ 
      status: 'unhealthy', 
      database: 'disconnected',
      error: String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}