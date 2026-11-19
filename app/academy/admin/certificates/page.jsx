'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AcademyCertificatesAdminPage() {
  const router = useRouter();
  const [template, setTemplate] = useState(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    async function loadTemplate() {
      try {
        const response = await fetch('/api/academy/admin/certificates/template', { credentials: 'include' });
        const result = await response.json();
        if (response.status === 401 || response.status === 403) {
          router.replace('/academy/admin/login');
          return;
        }
        if (!response.ok) throw new Error(result.error || 'Could not load certificate template settings.');
        if (active) setTemplate(result.template);
      } catch (loadError) {
        if (active) setError(loadError.message || 'Could not load certificate template settings.');
      } finally {
        if (active) setLoading(false);
      }
    }
    loadTemplate();
    return () => { active = false; };
  }, [router]);

  async function uploadTemplate(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!file) {
      setError('Choose a fillable PDF template first.');
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const formData = new FormData();
      formData.set('template', file);
      const response = await fetch('/api/academy/admin/certificates/template', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      const result = await response.json();
      if (response.status === 401 || response.status === 403) {
        router.replace('/academy/admin/login');
        return;
      }
      if (!response.ok) throw new Error(result.error || 'Could not save the certificate template.');
      setTemplate(result.template);
      setFile(null);
      form.reset();
      setMessage('Certificate template uploaded successfully.');
    } catch (uploadError) {
      setError(uploadError.message || 'Could not save the certificate template.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="ap-main">
      <header className="ap-page-head">
        <h1>Certificates</h1>
        <p>Manage the Academy certificate template and issue certificates from the student directory.</p>
      </header>
      {error && <div className="ap-error" role="alert">{error}</div>}
      {message && <div className="ap-notice" role="status">{message}</div>}
      <section className="ap-card ap-section">
        <h2>Academy certificate template</h2>
        <p className="ap-muted">
          Upload a fillable PDF containing text fields named student_name, program_name, issue_date, and certificate_number.
          Previously issued certificates remain unchanged when this template is replaced.
        </p>
        {loading ? <p>Loading template status…</p> : (
          <>
            <p>
              Current template:{' '}
              <strong>{template ? `${template.fileName} (uploaded ${new Date(template.uploadedAt).toLocaleString()})` : 'Not configured'}</strong>
            </p>
            <form className="ap-certificate-upload" onSubmit={uploadTemplate}>
              <label>
                Fillable PDF
                <input
                  className="ap-input"
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(event) => setFile(event.target.files?.[0] || null)}
                />
              </label>
              <button className="ap-button ap-button-primary" type="submit" disabled={saving}>
                {saving ? 'Uploading…' : template ? 'Replace template' : 'Upload template'}
              </button>
            </form>
          </>
        )}
      </section>
      <section className="ap-notice">
        <h2>Issue certificates</h2>
        <p>Open the student directory and use “Issue certificate” on an active student. Issuance is an explicit administrator decision.</p>
        <a className="ap-link" href="/academy/admin/students">Go to student directory</a>
      </section>
    </main>
  );
}
