import { NextResponse } from 'next/server';

const academy = require('../../../../../backend/academy-db');
const staffAuth = require('../../../../../lib/academy-staff');
const { noDbErrorResponse } = require('../../../../../lib/api-helpers');

export async function GET(request) {
  try {
    const gate = await staffAuth.requireAdministrator(request);
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
    const status = new URL(request.url).searchParams.get('status') || '';
    if (status && !['open', 'in_progress', 'resolved'].includes(status)) {
      return NextResponse.json({ error: 'Invalid support status filter.' }, { status: 400 });
    }
    return NextResponse.json({ tickets: await academy.listAdminSupportTickets(status) });
  } catch (error) {
    const noDb = noDbErrorResponse(error);
    if (noDb) return noDb;
    console.error('Academy admin support tickets error:', error);
    return NextResponse.json({ error: 'Could not load support requests.' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const gate = await staffAuth.requireAdministrator(request);
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
    const body = await request.json().catch(() => null);
    if (
      typeof body?.id !== 'string' || !body.id.trim() || body.id.length > 200 ||
      !['open', 'in_progress', 'resolved'].includes(body.status)
    ) {
      return NextResponse.json({ error: 'Provide a valid support request and status.' }, { status: 400 });
    }
    const ticket = await academy.updateAdminSupportTicketStatus(body.id.trim(), body.status);
    if (!ticket) return NextResponse.json({ error: 'Support request not found.' }, { status: 404 });
    return NextResponse.json({ ticket });
  } catch (error) {
    const noDb = noDbErrorResponse(error);
    if (noDb) return noDb;
    console.error('Academy admin support ticket update error:', error);
    return NextResponse.json({ error: 'Could not update the support request.' }, { status: 500 });
  }
}
