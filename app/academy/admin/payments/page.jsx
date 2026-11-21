'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

function displayDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString();
}

function amount(value) {
  return new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
    minimumFractionDigits: 2,
  }).format(Number(value) || 0);
}

export default function AcademyPaymentReviewPage() {
  const router = useRouter();
  const [submissions, setSubmissions] = useState([]);
  const [paymentInstructions, setPaymentInstructions] = useState('');
  const [instructionsDraft, setInstructionsDraft] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/academy/admin/payments?status=${statusFilter}`, {
        credentials: 'include',
      });
      const result = await response.json();
      if (response.status === 401 || response.status === 403) {
        router.replace('/academy/admin/login');
        return;
      }
      if (!response.ok) throw new Error(result.error || 'Could not load payment submissions.');
      setSubmissions(result.submissions || []);
      setPaymentInstructions(result.paymentInstructions || '');
      setInstructionsDraft(result.paymentInstructions || '');
    } catch (loadError) {
      setError(loadError.message || 'Could not load payment submissions.');
    } finally {
      setLoading(false);
    }
  }, [router, statusFilter]);

  useEffect(() => { load(); }, [load]);

  async function review(submission, approve) {
    if (approve && !window.confirm(`Verify the ${amount(submission.invoice_amount)} payment for ${submission.student_number}?`)) return;
    const reviewNote = approve
      ? ''
      : (window.prompt('Reason for rejecting this payment reference:') || '').trim();
    if (!approve && !reviewNote) return;
    setSaving(submission.id);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/academy/admin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: submission.id, approve, reviewNote }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not review payment.');
      setSubmissions((current) => current.filter((item) => item.id !== submission.id));
      setNotice(approve
        ? `Payment verified. ${submission.student_number} can now download the receipt.`
        : `Payment reference rejected for ${submission.student_number}.`);
    } catch (reviewError) {
      setError(reviewError.message || 'Could not review payment.');
    } finally {
      setSaving('');
    }
  }

  async function savePaymentInstructions(event) {
    event.preventDefault();
    setSaving('instructions');
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/academy/admin/payments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ paymentInstructions: instructionsDraft }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not save payment instructions.');
      setPaymentInstructions(instructionsDraft.trim());
      setNotice('Student payment instructions were saved.');
    } catch (saveError) {
      setError(saveError.message || 'Could not save payment instructions.');
    } finally {
      setSaving('');
    }
  }

  return (
    <main className="ap-main">
      <header className="ap-page-head ap-admin-heading">
        <div>
          <h1>Payment review</h1>
          <p>Verify student-submitted Mobile Money, bank transfer, and other payment references.</p>
        </div>
        <label className="ap-filter-field">Show
          <select className="ap-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="pending">Awaiting review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="">All submissions</option>
          </select>
        </label>
      </header>
      {error && <div className="ap-error" role="alert">{error}</div>}
      {notice && <div className="ap-success" role="status">{notice}</div>}
      <section className="ap-card ap-section">
        <h2>Student payment instructions</h2>
        <p className="ap-muted">Tell students where to pay and what details to include. These instructions appear in the student Fees page.</p>
        <form className="ap-support-reply" onSubmit={savePaymentInstructions}>
          <label htmlFor="payment-instructions">Instructions</label>
          <textarea
            id="payment-instructions"
            className="ap-input ap-textarea"
            rows={4}
            maxLength={3000}
            value={instructionsDraft}
            onChange={(event) => setInstructionsDraft(event.target.value)}
          />
          <button className="ap-button ap-button-primary" type="submit" disabled={saving === 'instructions'}>
            {saving === 'instructions' ? 'Saving…' : 'Save instructions'}
          </button>
        </form>
        {!paymentInstructions && <p className="ap-muted">No payment instructions have been configured yet.</p>}
      </section>
      {loading ? <p>Loading payment submissions…</p> : submissions.length ? (
        <div className="ap-stack">
          {submissions.map((submission) => (
            <article className="ap-card" key={submission.id}>
              <div className="ap-card-heading">
                <div>
                  <h2>{submission.invoice_title || 'Academy fee'} · {amount(submission.invoice_amount)}</h2>
                  <p className="ap-muted">
                    {submission.first_name} {submission.last_name} · {submission.student_number} · {submission.email}
                  </p>
                </div>
                <span className="ap-chip ap-chip-neutral">{submission.status}</span>
              </div>
              <dl className="ap-defs">
                <div className="ap-def"><dt>Method</dt><dd>{submission.method}</dd></div>
                <div className="ap-def"><dt>Reference</dt><dd>{submission.reference}</dd></div>
                <div className="ap-def"><dt>Submitted</dt><dd>{displayDate(submission.submitted_at)}</dd></div>
                <div className="ap-def"><dt>Student note</dt><dd>{submission.note || '—'}</dd></div>
                {submission.review_note && <div className="ap-def"><dt>Review note</dt><dd>{submission.review_note}</dd></div>}
              </dl>
              {submission.status === 'pending' && (
                <div className="ap-actions">
                  <button
                    className="ap-button ap-button-primary"
                    type="button"
                    disabled={!!saving}
                    onClick={() => review(submission, true)}
                  >
                    {saving === submission.id ? 'Reviewing…' : 'Verify payment'}
                  </button>
                  <button
                    className="ap-button"
                    type="button"
                    disabled={!!saving}
                    onClick={() => review(submission, false)}
                  >
                    Reject
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      ) : <div className="ap-card ap-empty"><p>No payment submissions in this category.</p></div>}
    </main>
  );
}
