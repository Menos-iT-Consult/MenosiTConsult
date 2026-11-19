'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const EMPTY_FILTERS = {
  q: '',
  status: '',
  program_id: '',
  session_id: '',
  sms_status: '',
};

function displayDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
}

function smsLabel(status) {
  if (status === 'sent') return 'SMS sent';
  if (status === 'failed') return 'SMS failed';
  return 'SMS not attempted';
}

export default function AcademyStudentsAdminPage() {
  const router = useRouter();
  const [students, setStudents] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [issuingId, setIssuingId] = useState('');
  const [certificateMessage, setCertificateMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page) });
      for (const [key, value] of Object.entries(appliedFilters)) {
        if (value) params.set(key, value);
      }
      const response = await fetch(`/api/academy/admin/students/directory?${params}`, {
        credentials: 'include',
      });
      const result = await response.json();
      if (response.status === 401) {
        router.replace('/academy/admin/login');
        return;
      }
      if (!response.ok) throw new Error(result.error || 'Could not load the student directory.');
      setStudents(result.students || []);
      setPrograms(result.programs || []);
      setSessions(result.sessions || []);
      setTotal(Number(result.total) || 0);
    } catch (loadError) {
      setError(loadError.message || 'Could not load the student directory.');
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, page, router]);

  useEffect(() => { load(); }, [load]);

  function applyFilters(event) {
    event.preventDefault();
    setPage(0);
    setAppliedFilters({ ...filters });
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setPage(0);
  }

  async function issueCertificate(student) {
    const name = [student.firstName, student.middleName, student.lastName].filter(Boolean).join(' ');
    if (!window.confirm(`Issue a certificate for ${name || 'this student'}? This cannot be undone.`)) return;
    setIssuingId(student.id);
    setCertificateMessage('');
    setError('');
    try {
      const response = await fetch(`/api/academy/admin/students/${encodeURIComponent(student.id)}/certificate`, {
        method: 'POST',
        credentials: 'include',
      });
      const result = await response.json();
      if (response.status === 401 || response.status === 403) {
        router.replace('/academy/admin/login');
        return;
      }
      if (!response.ok) throw new Error(result.error || 'Could not issue the certificate.');
      setStudents((current) => current.map((item) => item.id === student.id
        ? { ...item, certificateNumber: result.certificate.certificateNumber, certificateIssuedAt: result.certificate.issuedAt }
        : item));
      setCertificateMessage(`Certificate ${result.certificate.certificateNumber} issued to ${name}.`);
    } catch (issueError) {
      setError(issueError.message || 'Could not issue the certificate.');
    } finally {
      setIssuingId('');
    }
  }

  return (
      <main className="ap-main">
        <header className="ap-page-head ap-admin-heading">
          <div>
            <h1>Student directory</h1>
            <p>Search student accounts, enrollments, and admission SMS status.</p>
          </div>
        </header>

        {error && <div className="ap-error" role="alert">{error}</div>}
        {certificateMessage && <div className="ap-notice" role="status">{certificateMessage}</div>}

        <section className="ap-card ap-section">
          <form onSubmit={applyFilters} className="ap-form-grid">
            <label>
              Search
              <input
                className="ap-input"
                type="search"
                maxLength={100}
                placeholder="Name, Student ID, email, or phone"
                value={filters.q}
                onChange={(event) => setFilters({ ...filters, q: event.target.value })}
              />
            </label>
            <label>
              Account status
              <select
                className="ap-select"
                value={filters.status}
                onChange={(event) => setFilters({ ...filters, status: event.target.value })}
              >
                <option value="">All statuses</option>
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            <label>
              Program
              <select
                className="ap-select"
                value={filters.program_id}
                onChange={(event) => setFilters({ ...filters, program_id: event.target.value })}
              >
                <option value="">All programs</option>
                {programs.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}
              </select>
            </label>
            <label>
              Session
              <select
                className="ap-select"
                value={filters.session_id}
                onChange={(event) => setFilters({ ...filters, session_id: event.target.value })}
              >
                <option value="">All sessions</option>
                {sessions.map((session) => <option key={session.id} value={session.id}>{session.name}</option>)}
              </select>
            </label>
            <label>
              Admission SMS
              <select
                className="ap-select"
                value={filters.sms_status}
                onChange={(event) => setFilters({ ...filters, sms_status: event.target.value })}
              >
                <option value="">All SMS states</option>
                <option value="sent">Sent</option>
                <option value="failed">Failed</option>
                <option value="not_sent">Not attempted</option>
              </select>
            </label>
            <div className="ap-actions">
              <button className="ap-button ap-button-primary" type="submit">Apply filters</button>
              <button className="ap-button" type="button" onClick={clearFilters}>Clear</button>
            </div>
          </form>
        </section>

        <section className="ap-section">
          <div className="ap-card-heading">
            <h2>Students</h2>
            <span className="ap-muted">{total} total</span>
          </div>
          {loading ? <p>Loading students…</p> : students.length ? (
            <div className="ap-stack">
              {students.map((student) => (
                <article className="ap-card" key={student.id}>
                  <div className="ap-card-heading">
                    <div>
                      <h3>{[student.firstName, student.middleName, student.lastName].filter(Boolean).join(' ')}</h3>
                      <p className="ap-muted">{student.studentId || 'No Student ID yet'}</p>
                    </div>
                    <span className={`ap-chip ${student.status === 'active' ? 'ap-chip-active' : 'ap-chip-neutral'}`}>
                      {student.status}
                    </span>
                  </div>
                  <dl className="ap-defs">
                    <div className="ap-def"><dt>Email</dt><dd>{student.email || '—'}</dd></div>
                    <div className="ap-def"><dt>Phone</dt><dd>{student.phone || '—'}</dd></div>
                    <div className="ap-def"><dt>Program</dt><dd>{student.programName}</dd></div>
                    <div className="ap-def"><dt>Sessions</dt><dd>{student.sessionNames.length ? student.sessionNames.join(', ') : 'None'}</dd></div>
                    <div className="ap-def"><dt>Admitted</dt><dd>{displayDate(student.admittedAt)}</dd></div>
                    <div className="ap-def"><dt>Admission SMS</dt><dd>{smsLabel(student.smsStatus)}</dd></div>
                  </dl>
                  {student.smsError && <p className="ap-muted">{student.smsError}</p>}
                  {student.certificateNumber ? (
                    <p className="ap-muted">
                      Certificate issued: <strong>{student.certificateNumber}</strong>
                    </p>
                  ) : (
                    <button
                      className="ap-button ap-certificate-action"
                      type="button"
                      onClick={() => issueCertificate(student)}
                      disabled={issuingId === student.id || student.status !== 'active' || !student.studentId || !student.programId}
                    >
                      {issuingId === student.id ? 'Issuing…' : 'Issue certificate'}
                    </button>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="ap-card ap-empty"><p>{error ? 'Student results are unavailable.' : 'No students match these filters.'}</p></div>
          )}
        </section>

        <nav className="ap-actions" aria-label="Student directory pages">
          <button className="ap-button" type="button" onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={page === 0 || loading}>
            Previous
          </button>
          <span className="ap-muted">Page {page + 1} of {Math.max(1, Math.ceil(total / 50))}</span>
          <button className="ap-button" type="button" onClick={() => setPage((current) => current + 1)} disabled={loading || (page + 1) * 50 >= total}>
            Next
          </button>
        </nav>
      </main>
  );
}
