import { NextResponse } from 'next/server';

const academy = require('../../../../../backend/academy-db');
const staffAuth = require('../../../../../lib/academy-staff');
const { sendStudentNotification } = require('../../../../../lib/academy-notifications');
const { noDbErrorResponse } = require('../../../../../lib/api-helpers');

export async function GET(request) {
  try {
    const gate = await staffAuth.requireAdministrator(request);
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
    const status = new URL(request.url).searchParams.get('status') || 'pending';
    if (status && !['pending', 'approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid payment review status.' }, { status: 400 });
    }
    const [submissions, paymentInstructions] = await Promise.all([
      academy.listAdminPaymentSubmissions(status),
      academy.getAcademySetting('payment_instructions'),
    ]);
    return NextResponse.json({
      submissions,
      paymentInstructions: typeof paymentInstructions === 'string' ? paymentInstructions : '',
    });
  } catch (error) {
    const noDb = noDbErrorResponse(error);
    if (noDb) return noDb;
    console.error('Academy admin payment submissions error:', error);
    return NextResponse.json({ error: 'Could not load payment submissions.' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const gate = await staffAuth.requireAdministrator(request);
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
    const body = await request.json().catch(() => null);
    if (typeof body?.paymentInstructions !== 'string' || body.paymentInstructions.trim().length > 3000) {
      return NextResponse.json({ error: 'Payment instructions must be 3,000 characters or fewer.' }, { status: 400 });
    }
    await academy.setAcademySetting('payment_instructions', body.paymentInstructions.trim());
    return NextResponse.json({ success: true });
  } catch (error) {
    const noDb = noDbErrorResponse(error);
    if (noDb) return noDb;
    console.error('Academy payment instructions update error:', error);
    return NextResponse.json({ error: 'Could not save payment instructions.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const gate = await staffAuth.requireAdministrator(request);
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
    const body = await request.json().catch(() => null);
    if (
      typeof body?.id !== 'string' || !body.id.trim() || body.id.length > 200 ||
      typeof body.approve !== 'boolean' ||
      typeof body.reviewNote !== 'string' || body.reviewNote.length > 1000
    ) {
      return NextResponse.json({ error: 'Provide a valid payment review decision.' }, { status: 400 });
    }
    const submission = await academy.reviewStudentPaymentSubmission(
      body.id.trim(),
      gate.staff.id,
      { approve: body.approve, reviewNote: body.reviewNote.trim() }
    );
    if (!submission) return NextResponse.json({ error: 'Payment submission not found.' }, { status: 404 });

    const student = await academy.getStudent(submission.student_id);
    const invoices = await academy.listInvoices({ studentId: submission.student_id });
    const invoice = invoices.find((item) => item.id === submission.invoice_id);
    const approved = submission.status === 'approved';
    const notifications = student
      ? await sendStudentNotification(student, {
          type: approved ? 'payment_verified' : 'payment_rejected',
          subject: approved ? 'MITA Academy payment verified' : 'MITA Academy payment needs attention',
          message: approved
            ? `Your payment for ${invoice?.title || 'Academy fees'} has been verified. Your receipt is available in the Fees section of the student portal.`
            : `Your payment submission for ${invoice?.title || 'Academy fees'} was not approved. ${submission.review_note || 'Please contact the Academy if you need help.'}`,
          metadata: { paymentSubmissionId: submission.id, invoiceId: submission.invoice_id },
        })
      : null;
    return NextResponse.json({ submission, notifications });
  } catch (error) {
    const noDb = noDbErrorResponse(error);
    if (noDb) return noDb;
    if (error.code === 'PAYMENT_SUBMISSION_REVIEWED' || error.code === 'INVOICE_ALREADY_PAID') {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error.code === '23505') {
      return NextResponse.json({ error: 'This payment reference has already been recorded.' }, { status: 409 });
    }
    console.error('Academy payment review error:', error);
    return NextResponse.json({ error: 'Could not review the payment submission.' }, { status: 500 });
  }
}
