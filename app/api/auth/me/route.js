import { NextResponse } from 'next/server';

const { requireAuth } = require('../../../../lib/require-auth');

export async function GET(request) {
  const loggedIn = await requireAuth(request);
  return NextResponse.json({ loggedIn });
}
