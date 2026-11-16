import { NextResponse } from 'next/server';

const db = require('../../../backend/db');

export async function GET() {
  let dbState = 'not_configured';
  if (db.pool) {
    try {
      await db.pool.query('SELECT 1');
      dbState = 'connected';
    } catch {
      dbState = 'unreachable';
    }
  }
  return NextResponse.json({ status: 'ok', db: dbState });
}
