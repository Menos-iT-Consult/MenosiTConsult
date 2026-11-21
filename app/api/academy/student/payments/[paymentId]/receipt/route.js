import { NextResponse } from 'next/server';

const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const academy = require('../../../../../../../backend/academy-db');
const auth = require('../../../../../../../lib/academy-auth');
const { noDbErrorResponse } = require('../../../../../../../lib/api-helpers');

function safeText(value) {
  return String(value || '').replace(/[^\x20-\x7E]/g, ' ');
}

export async function GET(request, { params }) {
  const studentId = auth.getStudentId(request);
  if (!studentId) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  try {
    const student = await academy.getStudent(studentId);
    if (!student || student.status !== 'active') {
      return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
    }
    const { paymentId } = await params;
    const payment = await academy.getStudentPaymentReceipt(student.id, paymentId);
    if (!payment) return NextResponse.json({ error: 'Receipt not found.' }, { status: 404 });

    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595, 842]);
    const regular = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    page.drawText('MITA IT ACADEMY', {
      x: 54, y: 770, size: 20, font: bold, color: rgb(0.05, 0.2, 0.42),
    });
    page.drawText('OFFICIAL PAYMENT RECEIPT', {
      x: 54, y: 735, size: 14, font: bold, color: rgb(0.12, 0.15, 0.22),
    });
    page.drawLine({
      start: { x: 54, y: 718 }, end: { x: 541, y: 718 },
      thickness: 1.5, color: rgb(0.12, 0.42, 0.78),
    });

    const details = [
      ['Receipt number', payment.id],
      ['Student', [payment.first_name, payment.middle_name, payment.last_name].filter(Boolean).join(' ')],
      ['Student ID', payment.student_number],
      ['Program', payment.program_name],
      ['Invoice', payment.invoice_title],
      ['Academic session', payment.session_name],
      ['Amount received', `GHS ${Number(payment.amount).toFixed(2)}`],
      ['Payment method', payment.method],
      ['Transaction reference', payment.reference],
      ['Date received', new Date(payment.paid_at).toLocaleString()],
    ];
    let y = 680;
    for (const [label, value] of details) {
      page.drawText(safeText(label), {
        x: 58, y, size: 10, font: bold, color: rgb(0.35, 0.39, 0.45),
      });
      page.drawText(safeText(value) || '—', {
        x: 205, y, size: 11, font: regular, color: rgb(0.08, 0.1, 0.14),
        maxWidth: 330,
      });
      y -= 36;
    }
    page.drawText('Payment verified by MITA Academy.', {
      x: 58, y: y - 16, size: 10, font: regular, color: rgb(0.35, 0.39, 0.45),
    });
    const bytes = await pdf.save();
    return new NextResponse(bytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="mita-receipt-${encodeURIComponent(payment.id)}.pdf"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    const noDb = noDbErrorResponse(error);
    if (noDb) return noDb;
    console.error('Academy payment receipt error:', error);
    return NextResponse.json({ error: 'Could not generate the payment receipt.' }, { status: 500 });
  }
}
