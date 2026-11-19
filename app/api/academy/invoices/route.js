import { NextResponse } from 'next/server';
const academy = require('../../../../backend/academy-db');
const staffAuth = require('../../../../lib/academy-staff');
const { sendStudentNotification } = require('../../../../lib/academy-notifications');
const { noDbErrorResponse } = require('../../../../lib/api-helpers');

function validDueDate(value) {
  if (value == null || value === '') return true;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

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
    const gate = await staffAuth.requireAdministrator(request);
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
    const body = await request.json().catch(() => ({}));
    if (!validDueDate(body.dueDate)) {
      return NextResponse.json({ error: 'Due date must be a valid YYYY-MM-DD date.' }, { status: 400 });
    }
    const invoice = await academy.createInvoice({
      studentId: body.studentId,
      sessionId: body.sessionId,
      title: body.title,
      amount: body.amount,
      dueDate: body.dueDate,
      paid: body.paid,
      createdBy: gate.staff.id,
    });
    const [student, sessions] = await Promise.all([
      academy.getStudent(body.studentId),
      academy.listSessions(),
    ]);
    const sessionName = sessions.find((session) => session.id === body.sessionId)?.name || 'Academy';
    const due = body.dueDate || 'No due date set';
    const amount = new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(Number(body.amount) || 0);
    const notifications = student
      ? await sendStudentNotification(student, {
          type: 'invoice_issued',
          subject: `New Academy invoice: ${body.title || 'Academy fee'}`,
          message: `${sessionName} invoice issued: ${body.title || 'Academy fee'}, ${amount}. Due: ${due}. Sign in to the portal to review your invoice.`,
        })
      : null;
    if (student && body.paid === true) {
      await sendStudentNotification(student, {
        type: 'payment_recorded',
        subject: 'MITA Academy payment recorded',
        message: `Your payment of ${amount} for ${body.title || 'Academy fee'} has been recorded. Thank you.`,
      });
    }
    return NextResponse.json({ ...invoice, notifications });
  } catch (error) {
    const noDb = noDbErrorResponse(error);
    if (noDb) return noDb;
    console.error('Academy invoice create error:', error);
    return NextResponse.json({ error: 'Could not create invoice.' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const gate = await staffAuth.requireAdministrator(request);
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
    const body = await request.json().catch(() => ({}));
    const id = typeof body.id === 'string' ? body.id : '';
    if (!id || (body.paid != null && typeof body.paid !== 'boolean')) {
      return NextResponse.json({ error: 'Provide an invoice ID and a valid paid state.' }, { status: 400 });
    }
    if (!validDueDate(body.dueDate)) {
      return NextResponse.json({ error: 'Due date must be a valid YYYY-MM-DD date.' }, { status: 400 });
    }
    const existing = await academy.getInvoice(id);
    if (!existing) return NextResponse.json({ error: 'Invoice not found.' }, { status: 404 });
    const updated = await academy.updateInvoice(id, {
      title: body.title == null ? null : String(body.title).trim(),
      amount: body.amount == null ? null : Number(body.amount),
      dueDate: body.dueDate == null ? null : body.dueDate,
      paid: body.paid == null ? null : body.paid,
    });
    if (!updated) return NextResponse.json({ error: 'Invoice not found.' }, { status: 404 });
    const student = await academy.getStudent(updated.student_id);
    let notifications = null;
    if (student && !existing.paid && updated.paid) {
      const amount = new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(Number(updated.amount) || 0);
      notifications = await sendStudentNotification(student, {
        type: 'payment_recorded',
        subject: 'MITA Academy payment recorded',
        message: `Your payment of ${amount} for ${updated.title || 'Academy fee'} has been recorded. Thank you.`,
      });
    } else if (student && (
      existing.title !== updated.title ||
      Number(existing.amount) !== Number(updated.amount) ||
      String(existing.due_date || '').slice(0, 10) !== String(updated.due_date || '').slice(0, 10)
    )) {
      notifications = await sendStudentNotification(student, {
        type: 'invoice_updated',
        subject: `MITA Academy invoice updated: ${updated.title || 'Academy fee'}`,
        message: `Your invoice "${updated.title || 'Academy fee'}" has been updated. Amount: GHS ${Number(updated.amount).toFixed(2)}. Due date: ${updated.due_date || 'not set'}. Sign in to the portal to review it.`,
      });
    }
    return NextResponse.json({ ...updated, notifications });
  } catch (error) {
    const noDb = noDbErrorResponse(error);
    if (noDb) return noDb;
    console.error('Academy invoice update error:', error);
    return NextResponse.json({ error: 'Could not update invoice.' }, { status: 500 });
  }
}