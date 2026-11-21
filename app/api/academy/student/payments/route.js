import { NextResponse } from 'next/server';

const academy = require('../../../../../backend/academy-db');
const auth = require('../../../../../lib/academy-auth');
const { normalizePaymentSubmissionInput } = require('../../../../../lib/academy-portal');
const { sendStudentNotification } = require('../../../../../lib/academy-notifications');
const { noDbErrorResponse } = require('../../../../../lib/api-helpers');

async function getActiveStudent(request) {
  const studentId = auth.getStudentId(request);
  if (!studentId) return null;
  const student = await academy.getStudent(studentId);
  return student?.status === 'active' ? student : null;
}

export async function GET(request) {
  try {
    const student = await getActiveStudent(request);
    if (!student) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
    const [invoices, payments, paymentInstructions] = await Promise.all([
      academy.listInvoices({ studentId: student.id }),
      academy.listStudentPayments(student.id),
      academy.getAcademySetting('payment_instructions'),
    ]);
    return NextResponse.json({
      invoices,
      paymentInstructions: typeof paymentInstructions === 'string' ? paymentInstructions : '',
      ...payments,
    }, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    const noDb = noDbErrorResponse(error);
    if (noDb) return noDb;
    console.error('Academy student payments error:', error);
    return NextResponse.json({ error: 'Could not load payment history.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const student = await getActiveStudent(request);
    if (!student) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
    const input = normalizePaymentSubmissionInput(await request.json().catch(() => null));
    if (!input) {
      return NextResponse.json(
        { error: 'Choose an invoice and payment method, and enter a valid transaction reference.' },
        { status: 400 }
      );
    }
    const submission = await academy.createStudentPaymentSubmission(student.id, input);
    if (!submission) {
      return NextResponse.json(
        { error: 'Invoice not found, already paid, or not assigned to your account.' },
        { status: 404 }
      );
    }
    const notifications = await sendStudentNotification(student, {
      type: 'payment_submitted',
      subject: 'MITA Academy payment submitted for review',
      message: `Your payment reference ${input.reference} has been submitted for administrator verification. We will notify you when it is reviewed.`,
      metadata: { paymentSubmissionId: submission.id, invoiceId: input.invoiceId },
    });
    return NextResponse.json({ submission, notifications }, { status: 201 });
  } catch (error) {
    const noDb = noDbErrorResponse(error);
    if (noDb) return noDb;
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'A payment submission for this invoice is already awaiting review.' },
        { status: 409 }
      );
    }
    console.error('Academy student payment submission error:', error);
    return NextResponse.json({ error: 'Could not submit payment for review.' }, { status: 500 });
  }
}
