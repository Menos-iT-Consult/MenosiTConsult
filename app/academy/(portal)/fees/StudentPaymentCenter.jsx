'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

function displayDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
}

function amount(value) {
  return new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
    minimumFractionDigits: 2,
  }).format(Number(value) || 0);
}

export default function StudentPaymentCenter({ invoices }) {
  const router = useRouter();
  const [submissions, setSubmissions] = useState([]);
  const [payments, setPayments] = useState([]);
  const [paymentInstructions, setPaymentInstructions] = useState('');
  const [invoiceId, setInvoiceId] = useState('');
  const [method, setMethod] = useState('Mobile Money');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/academy/student/payments', { credentials: 'include' });
      const result = await response.json();
      if (response.status === 401) {
        router.replace('/academy/login');
        return;
      }
      if (!response.ok) throw new Error(result.error || 'Could not load payment history.');
      setSubmissions(result.submissions || []);
      setPayments(result.payments || []);
      setPaymentInstructions(result.paymentInstructions || '');
    } catch (loadError) {
      setError(loadError.message || 'Could not load payment history.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const awaitingInvoiceIds = new Set(submissions
    .filter((submission) => submission.status === 'pending')
    .map((submission) => submission.invoice_id));
  const payableInvoices = invoices.filter((invoice) =>
    !invoice.paid && !awaitingInvoiceIds.has(invoice.id)
  );
  const selectedInvoiceId = payableInvoices.some((invoice) => invoice.id === invoiceId)
    ? invoiceId
    : payableInvoices[0]?.id || '';

  async function submitPayment(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/academy/student/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ invoiceId: selectedInvoiceId, method, reference, note }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not submit payment for review.');
      setSubmissions((current) => [result.submission, ...current]);
      setReference('');
      setNote('');
      setNotice('Payment reference submitted. The Academy will verify it and update your invoice.');
    } catch (submitError) {
      setError(submitError.message || 'Could not submit payment for review.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="ap-section">
      <div className="ap-card">
        <h2>Submit a payment reference</h2>
        {paymentInstructions ? (
          <div className="ap-payment-instructions">
            <strong>Official payment instructions</strong>
            <p>{paymentInstructions}</p>
          </div>
        ) : (
          <div className="ap-notice">
            <strong>Payment instructions are not available yet.</strong>
            <p>Contact the <Link href="/academy/support">Academy help desk</Link> before making a payment.</p>
          </div>
        )}
        <p className="ap-muted">
          After following the instructions above, submit your transaction reference here.
          An administrator will verify it before the invoice is marked paid.
        </p>
        {error && <div className="ap-error" role="alert">{error}</div>}
        {notice && <div className="ap-success" role="status">{notice}</div>}
        {payableInvoices.length ? (
          <form className="ap-form-grid ap-payment-form" onSubmit={submitPayment}>
            <label>Invoice
              <select
                className="ap-select"
                value={selectedInvoiceId}
                onChange={(event) => setInvoiceId(event.target.value)}
                required
              >
                {payableInvoices.map((invoice) => (
                  <option value={invoice.id} key={invoice.id}>
                    {invoice.title || 'Academy fee'} · {amount(invoice.amount)}
                  </option>
                ))}
              </select>
            </label>
            <label>Payment method
              <select className="ap-select" value={method} onChange={(event) => setMethod(event.target.value)}>
                <option>Mobile Money</option>
                <option>Bank transfer</option>
                <option>Cash</option>
                <option>Other</option>
              </select>
            </label>
            <label>Transaction reference
              <input
                className="ap-input"
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                minLength={4}
                maxLength={120}
                required
              />
            </label>
            <label>Note (optional)
              <input
                className="ap-input"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={1000}
              />
            </label>
            <button className="ap-button ap-button-primary" type="submit" disabled={saving}>
              {saving ? 'Submitting…' : 'Submit for verification'}
            </button>
          </form>
        ) : (
          <p className="ap-muted">
            {invoices.some((invoice) => !invoice.paid)
              ? 'Your payment submission is awaiting review.'
              : 'There are no unpaid invoices to submit.'}
          </p>
        )}
      </div>

      <div className="ap-grid-2 ap-payment-history">
        <section>
          <h2>Payment verification</h2>
          {loading ? <p>Loading payment history…</p> : submissions.length ? (
            <div className="ap-stack">
              {submissions.map((submission) => (
                <article className="ap-card ap-payment-row" key={submission.id}>
                  <div className="ap-card-heading">
                    <strong>{submission.invoice_title || 'Academy fee'}</strong>
                    <span className={`ap-chip ${submission.status === 'approved' ? 'ap-chip-active' : submission.status === 'rejected' ? 'ap-chip-pending' : 'ap-chip-neutral'}`}>
                      {submission.status}
                    </span>
                  </div>
                  <p>{submission.method} · Ref: {submission.reference}</p>
                  <small>Submitted {displayDate(submission.submitted_at)}</small>
                  {submission.review_note && <p className="ap-muted">Admin note: {submission.review_note}</p>}
                </article>
              ))}
            </div>
          ) : !loading ? <p className="ap-muted">No payment references submitted.</p> : null}
        </section>
        <section>
          <h2>Verified receipts</h2>
          {loading ? null : payments.length ? (
            <div className="ap-stack">
              {payments.map((payment) => (
                <article className="ap-card ap-payment-row" key={payment.id}>
                  <strong>{payment.invoice_title || 'Academy fee'} · {amount(payment.amount)}</strong>
                  <p>{payment.method} · {displayDate(payment.paid_at)}</p>
                  <a
                    className="ap-resource-link"
                    href={`/api/academy/student/payments/${encodeURIComponent(payment.id)}/receipt`}
                  >
                    Download receipt
                  </a>
                </article>
              ))}
            </div>
          ) : <p className="ap-muted">Verified payments and receipts will appear here.</p>}
        </section>
      </div>
    </section>
  );
}
