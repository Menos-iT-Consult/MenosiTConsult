import { NextResponse } from 'next/server';
const academy = require('../../../../backend/academy-db');

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('student_id');
    const sessionId = searchParams.get('session_id');

    let invoices;
    if (studentId) {
      invoices = await academy.listInvoices({ studentId });
    } else if (sessionId) {
      invoices = await academy.listInvoices({ sessionId });
    } else {
      invoices = await academy.listInvoices();
    }
    return NextResponse.json(invoices);
  } catch (err) {
    console.error('Academy invoices error:', err);
    return NextResponse.json(
      { error: 'Could not load invoices.' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const invoice = await academy.createInvoice({
      studentId: body.studentId,
      sessionId: body.sessionId,
      title: body.title,
      amount: body.amount,
      dueDate: body.dueDate,
      paid: body.paid,
      createdBy: body.createdBy,
    });
    return NextResponse.json(invoice);
  } catch (err) {
    console.error('Academy invoice create error:', err);
    return NextResponse.json(
      { error: 'Could not create invoice.' },
      { status: 500 }
    );
  }
}