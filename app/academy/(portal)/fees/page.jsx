'use client';

import Link from 'next/link';
import useStudentPortalData from '../useStudentPortalData';

function formatAmount(value, currency = 'GHS') {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 'Not available';
  return new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(value) {
  if (!value) return 'Not set';
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? 'Not set'
    : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function statusStyle(status) {
  const value = String(status || '').toLowerCase();
  if (value === 'paid') return 'ap-chip-active';
  if (value === 'unpaid' || value === 'overdue') return 'ap-chip-pending';
  return 'ap-chip-neutral';
}

export default function StudentFeesPage() {
  const { data, loading, error, reload } = useStudentPortalData();

  if (loading) return <main className="ap-main"><p>Loading your fees…</p></main>;
  if (error) {
    return (
      <main className="ap-main">
        <div className="ap-error" role="alert">{error}</div>
        <button className="ap-button" type="button" onClick={reload}>Try again</button>
      </main>
    );
  }

  const fees = data.academicFees;
  const invoices = data.invoices || [];
  const currency = fees?.currency || 'GHS';
  const paidTotal = invoices.reduce(
    (total, invoice) => total + (String(invoice.status).toLowerCase() === 'paid' ? Number(invoice.amount) || 0 : 0),
    0
  );
  const outstandingTotal = invoices.reduce(
    (total, invoice) => total + (String(invoice.status).toLowerCase() !== 'paid' ? Number(invoice.amount) || 0 : 0),
    0
  );

  return (
    <main className="ap-main">
      <header className="ap-page-head">
        <h1>Fees and invoices</h1>
        <p>Review your program tuition, scholarship, and Academy invoices.</p>
      </header>

      <section className="ap-card ap-section">
        <h2>Tuition per semester</h2>
        {fees ? (
          <>
            <p className="ap-card-sub">{data.student.programName || 'Your program'}</p>
            <dl className="ap-defs">
              <div className="ap-def"><dt>Program tuition</dt><dd>{formatAmount(fees.fee, currency)}</dd></div>
              <div className="ap-def"><dt>Scholarship</dt><dd>{fees.scholarshipName || 'None assigned'}</dd></div>
              <div className="ap-def"><dt>Scholarship discount</dt><dd>{formatAmount(fees.scholarshipDiscount, currency)}</dd></div>
              <div className="ap-def"><dt>Amount due per semester</dt><dd><strong>{formatAmount(fees.amountDue, currency)}</strong></dd></div>
            </dl>
          </>
        ) : (
          <p className="ap-muted">Tuition has not been configured for your program yet.</p>
        )}
      </section>

      <section className="ap-stat-grid ap-section" aria-label="Invoice summary">
        <article className="ap-stat">
          <span>Invoices</span>
          <strong>{invoices.length}</strong>
        </article>
        <article className="ap-stat">
          <span>Recorded as paid</span>
          <strong>{formatAmount(paidTotal, currency)}</strong>
        </article>
        <article className="ap-stat">
          <span>Outstanding</span>
          <strong>{formatAmount(outstandingTotal, currency)}</strong>
        </article>
      </section>

      <section className="ap-section">
        <div className="ap-card-heading">
          <h2>Invoice history</h2>
          <Link className="ap-link" href="/academy/profile">View profile</Link>
        </div>
        {invoices.length ? (
          <div className="ap-table-wrap ap-card">
            <table className="ap-table">
              <thead>
                <tr>
                  <th scope="col">Invoice</th>
                  <th scope="col">Session</th>
                  <th scope="col">Due date</th>
                  <th scope="col">Amount</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>{invoice.title || 'Academy fee'}</td>
                    <td>{invoice.session_name || 'Not specified'}</td>
                    <td>{formatDate(invoice.due_date)}</td>
                    <td>{formatAmount(invoice.amount, currency)}</td>
                    <td>
                      <span className={`ap-chip ${statusStyle(invoice.status)}`}>
                        {invoice.status || 'Unknown'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="ap-card ap-empty">
            <p>No invoices have been issued to your account.</p>
          </div>
        )}
      </section>
    </main>
  );
}
