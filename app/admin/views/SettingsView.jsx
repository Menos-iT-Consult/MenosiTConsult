'use client';

import { useEffect, useRef, useState } from 'react';
import { apiFetch, uploadMediaFile, MAX_IMAGE_MB } from '../api';
import { toast, EyeIcon } from '../ui';

const EMPTY_STATS = { clients: '', years: '', satisfaction: '', projects: '' };
const EMPTY_CONTACT = { email: '', phone: '', whatsapp: '', location: '' };
const EMPTY_PW = { current: '', next: '', confirm: '' };

export default function SettingsView({ refreshSignal }) {
  const [stats, setStats] = useState(EMPTY_STATS);
  const [contact, setContact] = useState(EMPTY_CONTACT);
  const [logos, setLogos] = useState([]);
  const [savingContent, setSavingContent] = useState(false);
  const [savingLogos, setSavingLogos] = useState(false);
  const [pw, setPw] = useState(EMPTY_PW);
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshSignal]);

  async function load() {
    try {
      const res = await apiFetch('/api/manage/settings');
      if (!res.ok) {
        toast('Failed to load site settings.', 'error');
        return;
      }
      const data = await res.json();
      const s = data.stats || {};
      const c = data.contact || {};
      setStats({
        clients: s.clients ?? '',
        years: s.years ?? '',
        satisfaction: s.satisfaction ?? '',
        projects: s.projects ?? '',
      });
      setContact({
        email: c.email ?? '',
        phone: c.phone ?? '',
        whatsapp: c.whatsapp ?? '',
        location: c.location ?? '',
      });
      setLogos(Array.isArray(data.trustedLogos) ? data.trustedLogos.map((l) => ({ name: l.name || '', image: l.image || '' })) : []);
    } catch (err) {
      if (!(err && err.auth)) toast('Network error while loading settings.', 'error');
    }
  }

  async function saveContent(e) {
    e.preventDefault();
    const payload = {
      stats: {
        clients: stats.clients,
        years: stats.years,
        satisfaction: stats.satisfaction,
        projects: stats.projects,
      },
      contact: {
        email: contact.email.trim(),
        phone: contact.phone.trim(),
        whatsapp: contact.whatsapp.trim(),
        location: contact.location.trim(),
      },
    };
    setSavingContent(true);
    try {
      const res = await apiFetch('/api/manage/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        toast('Site content saved. The public website now shows the new values.');
        load();
      } else {
        toast(data.error || 'Failed to save settings.', 'error');
      }
    } catch (err) {
      if (!(err && err.auth)) toast('Network error.', 'error');
    } finally {
      setSavingContent(false);
    }
  }

  async function saveLogos() {
    const collected = logos
      .map((l) => ({ name: l.name.trim(), image: (l.image || '').trim() }))
      .filter((l) => l.name);
    if (collected.length === 0) {
      toast('Add at least one company name first.', 'error');
      return;
    }
    setSavingLogos(true);
    try {
      const res = await apiFetch('/api/manage/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trustedLogos: collected }),
      });
      const data = await res.json();
      if (res.ok) {
        toast('Trusted companies saved — the homepage marquee now uses them.');
      } else {
        toast(data.error || 'Failed to save trusted companies.', 'error');
      }
    } catch (err) {
      if (!(err && err.auth)) toast('Network error.', 'error');
    } finally {
      setSavingLogos(false);
    }
  }

  async function savePassword(e) {
    e.preventDefault();
    if (pw.next !== pw.confirm) {
      toast('New passwords do not match.', 'error');
      return;
    }
    if (pw.next.length < 6) {
      toast('New password must be at least 6 characters.', 'error');
      return;
    }
    setSavingPw(true);
    try {
      const res = await apiFetch('/api/auth/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: pw.current, newPassword: pw.next }),
      });
      const data = await res.json();
      if (data.success) {
        toast('Password updated successfully!');
        setPw(EMPTY_PW);
      } else {
        toast(data.error || 'Failed to update password.', 'error');
      }
    } catch (err) {
      if (!(err && err.auth)) toast('Network error.', 'error');
    } finally {
      setSavingPw(false);
    }
  }

  return (
    <section id="section-settings" className="section">
      <div className="settings-card">
        <h3>Site Content</h3>
        <p className="settings-hint">Stats and contact details shown across the public website (homepage counters, contact page, footer).</p>
        <form id="content-form" onSubmit={saveContent}>
          <div className="form-row">
            <div className="form-group">
              <label>Clients served</label>
              <input type="number" min="0" required value={stats.clients} onChange={(e) => setStats((s) => ({ ...s, clients: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Years experience</label>
              <input type="number" min="0" required value={stats.years} onChange={(e) => setStats((s) => ({ ...s, years: e.target.value }))} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Satisfaction rate (%)</label>
              <input type="number" min="0" max="100" required value={stats.satisfaction} onChange={(e) => setStats((s) => ({ ...s, satisfaction: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Projects completed</label>
              <input type="number" min="0" required value={stats.projects} onChange={(e) => setStats((s) => ({ ...s, projects: e.target.value }))} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Contact email</label>
              <input type="email" id="contact-email" required value={contact.email} onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input type="text" id="contact-phone" required value={contact.phone} onChange={(e) => setContact((c) => ({ ...c, phone: e.target.value }))} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>WhatsApp number (digits only)</label>
              <input type="text" id="contact-whatsapp" required value={contact.whatsapp} onChange={(e) => setContact((c) => ({ ...c, whatsapp: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Location</label>
              <input type="text" id="contact-location" required value={contact.location} onChange={(e) => setContact((c) => ({ ...c, location: e.target.value }))} />
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={savingContent}>
            {savingContent ? 'Saving...' : 'Save Site Content'}
          </button>
        </form>
      </div>

      <div className="settings-card">
        <h3>Trusted Companies (homepage marquee)</h3>
        <p className="settings-hint">These appear as logos in the scrolling strip on the homepage. Add a company name and upload its logo image (JPG, PNG, WebP or SVG up to 16 MB).</p>
        <div id="logo-list" className="logo-list">
          {logos.length === 0 ? (
            <p className="settings-hint" style={{ margin: '0 0 4px' }}>
              No companies yet — add one below.
            </p>
          ) : (
            logos.map((row, i) => (
              <LogoRow
                key={i}
                row={row}
                onChange={(patch) => setLogos((prev) => prev.map((l, j) => (j === i ? { ...l, ...patch } : l)))}
                onRemove={() => setLogos((prev) => prev.filter((_, j) => j !== i))}
              />
            ))
          )}
        </div>
        <div className="logo-actions">
          <button type="button" className="btn btn-secondary btn-sm" id="add-logo-btn" onClick={() => setLogos((prev) => [...prev, { name: '', image: '' }])}>
            + Add company
          </button>
        </div>
        <div className="settings-save">
          <button type="button" className="btn btn-primary" id="save-logos-btn" onClick={saveLogos} disabled={savingLogos}>
            {savingLogos ? 'Saving...' : 'Save Trusted Companies'}
          </button>
        </div>
      </div>

      <div className="settings-card">
        <h3>Change Password</h3>
        <form id="password-form" onSubmit={savePassword}>
          <PwField
            id="current-password"
            label="Current Password"
            autoComplete="current-password"
            value={pw.current}
            show={showPw.current}
            onValue={(v) => setPw((p) => ({ ...p, current: v }))}
            onToggle={() => setShowPw((s) => ({ ...s, current: !s.current }))}
          />
          <PwField
            id="new-password"
            label="New Password"
            autoComplete="new-password"
            minLength={6}
            value={pw.next}
            show={showPw.next}
            onValue={(v) => setPw((p) => ({ ...p, next: v }))}
            onToggle={() => setShowPw((s) => ({ ...s, next: !s.next }))}
          />
          <PwField
            id="confirm-password"
            label="Confirm New Password"
            autoComplete="new-password"
            value={pw.confirm}
            show={showPw.confirm}
            onValue={(v) => setPw((p) => ({ ...p, confirm: v }))}
            onToggle={() => setShowPw((s) => ({ ...s, confirm: !s.confirm }))}
          />
          <button type="submit" className="btn btn-primary" disabled={savingPw}>
            {savingPw ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </section>
  );
}

function PwField({ id, label, autoComplete, minLength, value, show, onValue, onToggle }) {
  return (
    <div className="form-group form-group--pw">
      <label>{label}</label>
      <input
        type={show ? 'text' : 'password'}
        id={id}
        autoComplete={autoComplete}
        required
        minLength={minLength}
        value={value}
        onChange={(e) => onValue(e.target.value)}
      />
      <button type="button" className="pw-toggle" aria-label={show ? 'Hide password' : 'Show password'} onClick={onToggle}>
        <EyeIcon />
      </button>
    </div>
  );
}

function LogoRow({ row, onChange, onRemove }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  async function onFile(f) {
    if (!f) return;
    if (f.size > MAX_IMAGE_MB * 1024 * 1024) {
      toast(`Image too large (max ${MAX_IMAGE_MB} MB).`, 'error');
      return;
    }
    setUploading(true);
    try {
      const url = await uploadMediaFile(f);
      onChange({ image: url });
      toast('Logo uploaded.');
    } catch (err) {
      toast(err && err.message ? err.message : 'Network error during upload.', 'error');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div className="logo-row">
      <div className="logo-cell">
        <label>Company</label>
        <input type="text" className="logo-name" placeholder="Company name" value={row.name} onChange={(e) => onChange({ name: e.target.value })} />
      </div>
      <div className="logo-cell">
        <label>Logo image</label>
        <div className="logo-upload">
          <img className="logo-preview" src={row.image || ''} alt="" style={row.image ? undefined : { display: 'none' }} />
          <span className="logo-fallback" style={row.image ? { display: 'none' } : undefined}>
            No logo
          </span>
          <input
            type="file"
            className="logo-file"
            ref={fileRef}
            accept="image/png,image/jpeg,image/webp,image/gif,image/avif,image/svg+xml"
            style={{ display: 'none' }}
            onChange={(e) => onFile(e.target.files && e.target.files[0])}
          />
          <button type="button" className="btn btn-sm btn-secondary logo-upload-btn" disabled={uploading} onClick={() => fileRef.current && fileRef.current.click()}>
            {uploading ? 'Uploading...' : row.image ? 'Replace' : 'Upload'}
          </button>
        </div>
      </div>
      <button type="button" className="btn btn-sm btn-danger logo-remove" aria-label="Remove company" title="Remove" onClick={onRemove}>
        &times;
      </button>
    </div>
  );
}
