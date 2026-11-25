'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const EMPTY_PROGRAM = {
  name: '',
  code: '',
  description: '',
  durationSemesters: '4',
  feePerSemester: '',
  published: true,
};

const EMPTY_SCHOLARSHIP = {
  name: '',
  description: '',
  programId: '',
  discountType: 'percentage',
  discountValue: '',
};

function ProgramEditor({ program, onSave }) {
  const [form, setForm] = useState({
    name: program.name,
    code: program.code,
    description: program.description || '',
    durationSemesters: String(program.durationSemesters),
    feePerSemester: program.feeStructure?.feePerSemester == null
      ? ''
      : String(program.feeStructure.feePerSemester),
    published: program.published,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSave(program.id, {
        ...form,
        durationSemesters: Number(form.durationSemesters),
        feePerSemester: Number(form.feePerSemester),
      });
    } catch (saveError) {
      setError(saveError.message || 'Could not update this program.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <details className="ap-program-edit">
      <summary>Edit program and fees</summary>
      {error && <div className="ap-error" role="alert">{error}</div>}
      <form className="ap-form-grid" onSubmit={submit}>
        <label>Program name
          <input className="ap-input" maxLength={120} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
        </label>
        <label>Program code
          <input className="ap-input" maxLength={32} value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} required />
        </label>
        <label>Duration (semesters)
          <input className="ap-input" type="number" min="1" max="20" value={form.durationSemesters} onChange={(event) => setForm({ ...form, durationSemesters: event.target.value })} required />
        </label>
        <label>Fee per semester (GHS)
          <input className="ap-input" type="number" min="0" max="999999999.99" step="0.01" value={form.feePerSemester} onChange={(event) => setForm({ ...form, feePerSemester: event.target.value })} required />
        </label>
        <label className="ap-form-wide">Description
          <textarea className="ap-input ap-textarea" rows={3} maxLength={3000} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
        </label>
        <label className="ap-checkbox-label">
          <input type="checkbox" checked={form.published} onChange={(event) => setForm({ ...form, published: event.target.checked })} />
          Open for applications
        </label>
        <button className="ap-button ap-button-primary" type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save program'}
        </button>
      </form>
    </details>
  );
}

function scholarshipFormFrom(scholarship) {
  return {
    name: scholarship.name,
    description: scholarship.description || '',
    programId: scholarship.programId || '',
    discountType: scholarship.discountType,
    discountValue: String(scholarship.discountValue),
  };
}

function ScholarshipEditor({ scholarship, programs, onSave, saving, setSaving }) {
  const [form, setForm] = useState(() => scholarshipFormFrom(scholarship));
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const updated = await onSave(scholarship.id, {
        ...form,
        discountValue: Number(form.discountValue),
      });
      setForm(scholarshipFormFrom(updated));
    } catch (saveError) {
      setError(saveError.message || 'Could not update this scholarship.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <details className="ap-program-edit">
      <summary>Edit scholarship details</summary>
      <p className="ap-muted">Changes apply to students currently assigned this scholarship and future awards.</p>
      {error && <div className="ap-error" role="alert">{error}</div>}
      <form className="ap-form-grid" onSubmit={submit}>
        <label>Scholarship name
          <input className="ap-input" maxLength={120} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
        </label>
        <label>Applies to
          <select className="ap-select" value={form.programId} onChange={(event) => setForm({ ...form, programId: event.target.value })}>
            <option value="">All programs</option>
            {programs.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}
          </select>
        </label>
        <label>Discount type
          <select className="ap-select" value={form.discountType} onChange={(event) => setForm({ ...form, discountType: event.target.value })}>
            <option value="percentage">Percentage</option>
            <option value="fixed">Fixed amount (GHS)</option>
          </select>
        </label>
        <label>{form.discountType === 'percentage' ? 'Discount (%)' : 'Discount per semester (GHS)'}
          <input
            className="ap-input"
            type="number"
            min="0.01"
            max={form.discountType === 'percentage' ? '100' : '999999999.99'}
            step="0.01"
            value={form.discountValue}
            onChange={(event) => setForm({ ...form, discountValue: event.target.value })}
            required
          />
        </label>
        <label className="ap-form-wide">Description
          <textarea className="ap-input ap-textarea" rows={2} maxLength={1000} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
        </label>
        <button className="ap-button ap-button-primary" type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save scholarship'}
        </button>
      </form>
    </details>
  );
}

export default function AcademyProgramsAdminPage() {
  const router = useRouter();
  const [programs, setPrograms] = useState([]);
  const [courses, setCourses] = useState([]);
  const [scholarships, setScholarships] = useState([]);
  const [applications, setApplications] = useState([]);
  const [programForm, setProgramForm] = useState(EMPTY_PROGRAM);
  const [scholarshipForm, setScholarshipForm] = useState(EMPTY_SCHOLARSHIP);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [programResponse, scholarshipResponse, coursesResponse, applicationsResponse] = await Promise.all([
        fetch('/api/academy/admin/programs', { credentials: 'include' }),
        fetch('/api/academy/admin/scholarships', { credentials: 'include' }),
        fetch('/api/academy/admin/courses', { credentials: 'include' }),
        fetch('/api/academy/admin/scholarships/applications', { credentials: 'include' }),
      ]);
      const [programResult, scholarshipResult, coursesResult, applicationsResult] = await Promise.all([
        programResponse.json(),
        scholarshipResponse.json(),
        coursesResponse.json(),
        applicationsResponse.json(),
      ]);
      if (programResponse.status === 401 || scholarshipResponse.status === 401 ||
          coursesResponse.status === 401 || applicationsResponse.status === 401) {
        router.replace('/academy/admin/login');
        return;
      }
      if (programResponse.status === 403 || scholarshipResponse.status === 403 ||
          coursesResponse.status === 403 || applicationsResponse.status === 403) {
        router.replace('/academy/admin/login');
        return;
      }
      if (!programResponse.ok) throw new Error(programResult.error || 'Could not load programs.');
      if (!scholarshipResponse.ok) throw new Error(scholarshipResult.error || 'Could not load scholarship programs.');
      if (!coursesResponse.ok) throw new Error(coursesResult.error || 'Could not load courses and instructors.');
      if (!applicationsResponse.ok) throw new Error(applicationsResult.error || 'Could not load scholarship applications.');
      setPrograms(programResult.programs || []);
      setScholarships(scholarshipResult.scholarships || []);
      setCourses(coursesResult.courses || []);
      setApplications(applicationsResult.applications || []);
    } catch (loadError) {
      setError(loadError.message || 'Could not load Academy programs.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  async function createProgram(event) {
    event.preventDefault();
    setSaving('program');
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/academy/admin/programs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...programForm,
          durationSemesters: Number(programForm.durationSemesters),
          feePerSemester: Number(programForm.feePerSemester),
        }),
      });
      const result = await response.json();
      if (response.status === 401 || response.status === 403) {
        router.replace('/academy/admin/login');
        return;
      }
      if (!response.ok) throw new Error(result.error || 'Could not create the program.');
      setProgramForm(EMPTY_PROGRAM);
      setNotice('Program created and made available to applicants.');
      await load();
    } catch (saveError) {
      setError(saveError.message || 'Could not create the program.');
    } finally {
      setSaving('');
    }
  }

  async function updateProgram(id, changes) {
    const response = await fetch(`/api/academy/admin/programs/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(changes),
    });
    const result = await response.json();
    if (response.status === 401 || response.status === 403) {
      router.replace('/academy/admin/login');
      throw new Error(result.error || 'Administrator access is required.');
    }
    if (!response.ok) throw new Error(result.error || 'Could not update this program.');
    setNotice('Program and fee settings saved.');
    await load();
  }

  async function createScholarship(event) {
    event.preventDefault();
    setSaving('scholarship');
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/academy/admin/scholarships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...scholarshipForm,
          discountValue: Number(scholarshipForm.discountValue),
        }),
      });
      const result = await response.json();
      if (response.status === 401 || response.status === 403) {
        router.replace('/academy/admin/login');
        return;
      }
      if (!response.ok) throw new Error(result.error || 'Could not create the scholarship program.');
      setScholarshipForm(EMPTY_SCHOLARSHIP);
      setNotice('Scholarship program created. Assign it to students from their detail pages.');
      await load();
    } catch (saveError) {
      setError(saveError.message || 'Could not create the scholarship program.');
    } finally {
      setSaving('');
    }
  }

  async function toggleScholarship(scholarship) {
    setSaving(scholarship.id);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/academy/admin/scholarships', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: scholarship.id, active: !scholarship.active }),
      });
      const result = await response.json();
      if (response.status === 401 || response.status === 403) {
        router.replace('/academy/admin/login');
        return;
      }
      if (!response.ok) throw new Error(result.error || 'Could not update the scholarship program.');
      setNotice(`Scholarship program ${result.scholarship.active ? 'activated' : 'paused'}.`);
      await load();
    } catch (saveError) {
      setError(saveError.message || 'Could not update the scholarship program.');
    } finally {
      setSaving('');
    }
  }

  async function updateScholarship(id, changes) {
    const response = await fetch('/api/academy/admin/scholarships', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id, ...changes }),
    });
    const result = await response.json();
    if (response.status === 401 || response.status === 403) {
      router.replace('/academy/admin/login');
      throw new Error(result.error || 'Administrator access is required.');
    }
    if (!response.ok) throw new Error(result.error || 'Could not update this scholarship.');
    setNotice('Scholarship details updated.');
    await load();
    return result.scholarship;
  }

  async function reviewApplication(application, status) {
    const savingId = `application:${application.id}`;
    setSaving(savingId);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/academy/admin/scholarships/applications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ applicationId: application.id, status }),
      });
      const result = await response.json();
      if (response.status === 401 || response.status === 403) {
        router.replace('/academy/admin/login');
        return;
      }
      if (!response.ok) throw new Error(result.error || 'Could not review this application.');
      setNotice(status === 'approved'
        ? `Scholarship application approved for ${application.studentName}.`
        : `Scholarship application declined for ${application.studentName}.`);
      await load();
    } catch (reviewError) {
      setError(reviewError.message || 'Could not review this application.');
    } finally {
      setSaving('');
    }
  }

  return (
    <main className="ap-main">
      <header className="ap-page-head ap-admin-heading">
        <div>
          <h1>Programs & fees</h1>
          <p>Manage the programs applicants can choose and the GHS tuition charged each semester.</p>
        </div>
      </header>
      {error && <div className="ap-error" role="alert">{error}</div>}
      {notice && <div className="ap-success" role="status">{notice}</div>}

      <section className="ap-card ap-section">
        <h2>Add an academic program</h2>
        <form className="ap-form-grid" onSubmit={createProgram}>
          <label>Program name
            <input className="ap-input" maxLength={120} value={programForm.name} onChange={(event) => setProgramForm({ ...programForm, name: event.target.value })} required />
          </label>
          <label>Program code
            <input className="ap-input" maxLength={32} value={programForm.code} onChange={(event) => setProgramForm({ ...programForm, code: event.target.value.toUpperCase() })} required />
          </label>
          <label>Duration (semesters)
            <input className="ap-input" type="number" min="1" max="20" value={programForm.durationSemesters} onChange={(event) => setProgramForm({ ...programForm, durationSemesters: event.target.value })} required />
          </label>
          <label>Fee per semester (GHS)
            <input className="ap-input" type="number" min="0" max="999999999.99" step="0.01" value={programForm.feePerSemester} onChange={(event) => setProgramForm({ ...programForm, feePerSemester: event.target.value })} required />
          </label>
          <label className="ap-form-wide">Description
            <textarea className="ap-input ap-textarea" rows={3} maxLength={3000} value={programForm.description} onChange={(event) => setProgramForm({ ...programForm, description: event.target.value })} />
          </label>
          <label className="ap-checkbox-label">
            <input type="checkbox" checked={programForm.published} onChange={(event) => setProgramForm({ ...programForm, published: event.target.checked })} />
            Open for applications
          </label>
          <button className="ap-button ap-button-primary" type="submit" disabled={saving === 'program'}>
            {saving === 'program' ? 'Creating…' : 'Add program'}
          </button>
        </form>
      </section>

      <section className="ap-section">
        <div className="ap-card-heading"><h2>Academic programs</h2><span className="ap-muted">{programs.length} total</span></div>
        {loading ? <p>Loading programs…</p> : programs.length ? (
          <div className="ap-stack">
            {programs.map((program) => (
              <article className="ap-card" key={program.id}>
                <div className="ap-card-heading">
                  <div><h3>{program.name}</h3><p className="ap-muted">{program.code} · {program.durationSemesters} semesters</p></div>
                  <span className={`ap-chip ${program.published ? 'ap-chip-active' : 'ap-chip-neutral'}`}>
                    {program.published ? 'Open' : 'Closed'}
                  </span>
                </div>
                <p>{program.feeStructure?.feePerSemester == null
                  ? 'Semester fee not configured'
                  : `GHS ${Number(program.feeStructure.feePerSemester).toFixed(2)} per semester`}</p>
                <ProgramEditor program={program} onSave={updateProgram} />
              </article>
            ))}
          </div>
        ) : !error ? <div className="ap-card ap-empty"><p>No programs have been added.</p></div> : null}
      </section>

      <section className="ap-section">
        <div className="ap-card-heading">
          <h2>Courses and instructors</h2>
          <Link className="ap-link" href="/academy/admin/instructors">Manage courses and instructors</Link>
        </div>
        {loading ? <p>Loading courses and instructors…</p> : courses.length ? (
          <div className="ap-table-wrap ap-card">
            <table className="ap-table">
              <thead>
                <tr>
                  <th scope="col">Course</th>
                  <th scope="col">Program</th>
                  <th scope="col">Semester</th>
                  <th scope="col">Instructor</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((course) => (
                  <tr key={course.id}>
                    <td>{course.title}{course.code ? <small>{course.code} · {course.creditHours} credits</small> : null}</td>
                    <td>{programs.find((program) => program.id === course.programId)?.name || 'No program'}</td>
                    <td>{course.semesterNumber}</td>
                    <td>{course.instructorName || 'Not assigned'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : !error ? <div className="ap-card ap-empty"><p>No courses have been created yet.</p></div> : null}
      </section>

      <section id="scholarships" className="ap-card ap-section">
        <h2>Add a scholarship program</h2>
        <p className="ap-muted">Scholarships are manually awarded by administrators. One scholarship can be assigned to each student.</p>
        <form className="ap-form-grid" onSubmit={createScholarship}>
          <label>Scholarship name
            <input className="ap-input" maxLength={120} value={scholarshipForm.name} onChange={(event) => setScholarshipForm({ ...scholarshipForm, name: event.target.value })} required />
          </label>
          <label>Applies to
            <select className="ap-select" value={scholarshipForm.programId} onChange={(event) => setScholarshipForm({ ...scholarshipForm, programId: event.target.value })}>
              <option value="">All programs</option>
              {programs.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}
            </select>
          </label>
          <label>Discount type
            <select className="ap-select" value={scholarshipForm.discountType} onChange={(event) => setScholarshipForm({ ...scholarshipForm, discountType: event.target.value })}>
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed amount (GHS)</option>
            </select>
          </label>
          <label>{scholarshipForm.discountType === 'percentage' ? 'Discount (%)' : 'Discount per semester (GHS)'}
            <input className="ap-input" type="number" min="0.01" max={scholarshipForm.discountType === 'percentage' ? '100' : '999999999.99'} step="0.01" value={scholarshipForm.discountValue} onChange={(event) => setScholarshipForm({ ...scholarshipForm, discountValue: event.target.value })} required />
          </label>
          <label className="ap-form-wide">Description
            <textarea className="ap-input ap-textarea" rows={2} maxLength={1000} value={scholarshipForm.description} onChange={(event) => setScholarshipForm({ ...scholarshipForm, description: event.target.value })} />
          </label>
          <button className="ap-button ap-button-primary" type="submit" disabled={saving === 'scholarship'}>
            {saving === 'scholarship' ? 'Creating…' : 'Add scholarship'}
          </button>
        </form>
      </section>

      <section className="ap-section">
        <div className="ap-card-heading"><h2>Scholarship programs</h2><span className="ap-muted">{scholarships.length} total</span></div>
        {scholarships.length ? (
          <div className="ap-stack">
            {scholarships.map((scholarship) => (
              <article className="ap-card" key={scholarship.id}>
                <div>
                  <div className="ap-card-heading">
                    <div>
                      <h3>{scholarship.name}</h3>
                      <p className="ap-muted">
                        {scholarship.programName || 'All programs'} · {scholarship.discountType === 'percentage'
                          ? `${scholarship.discountValue}%`
                          : `GHS ${scholarship.discountValue.toFixed(2)} per semester`}
                      </p>
                    </div>
                    <button
                      className="ap-button"
                      type="button"
                      onClick={() => toggleScholarship(scholarship)}
                      disabled={saving === scholarship.id}
                    >
                      {saving === scholarship.id ? 'Saving…' : scholarship.active ? 'Pause' : 'Activate'}
                    </button>
                  </div>
                  {scholarship.description && <p>{scholarship.description}</p>}
                </div>
                <ScholarshipEditor
                  scholarship={scholarship}
                  programs={programs}
                  onSave={updateScholarship}
                  saving={saving === scholarship.id}
                  setSaving={(isSaving) => setSaving(isSaving ? scholarship.id : '')}
                />
              </article>
            ))}
          </div>
        ) : !loading && !error ? <div className="ap-card ap-empty"><p>No scholarship programs have been created.</p></div> : null}
      </section>

      <section className="ap-section">
        <div className="ap-card-heading">
          <h2>Scholarship applications</h2>
          <span className="ap-muted">{applications.length} awaiting review</span>
        </div>
        {loading ? <p>Loading scholarship applications…</p> : applications.length ? (
          <div className="ap-stack">
            {applications.map((application) => (
              <article className="ap-card" key={application.id}>
                <div className="ap-card-heading">
                  <div>
                    <h3>{application.studentName || 'Student application'}</h3>
                    <p className="ap-muted">
                      {application.studentNumber || 'No Student ID'} · {application.programName || 'Program unavailable'}
                    </p>
                  </div>
                  <span className="ap-chip ap-chip-pending">Pending</span>
                </div>
                <p>
                  <strong>{application.scholarshipName}</strong> · {application.discountType === 'percentage'
                    ? `${application.discountValue}% discount`
                    : `GHS ${Number(application.discountValue).toFixed(2)} per semester`}
                </p>
                <p className="ap-student-statement">{application.statement}</p>
                <p className="ap-muted">
                  {application.studentEmail} · Applied {new Date(application.createdAt).toLocaleDateString()}
                </p>
                <div className="ap-form-grid">
                  <button
                    className="ap-button ap-button-primary"
                    type="button"
                    onClick={() => reviewApplication(application, 'approved')}
                    disabled={saving === `application:${application.id}`}
                  >
                    {saving === `application:${application.id}` ? 'Saving…' : 'Approve & award'}
                  </button>
                  <button
                    className="ap-button ap-button-danger"
                    type="button"
                    onClick={() => reviewApplication(application, 'rejected')}
                    disabled={saving === `application:${application.id}`}
                  >
                    Decline
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : !error ? <div className="ap-card ap-empty"><p>No scholarship applications are awaiting review.</p></div> : null}
      </section>
    </main>
  );
}
