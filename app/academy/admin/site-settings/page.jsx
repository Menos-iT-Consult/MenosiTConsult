'use client';

import { useEffect, useState } from 'react';
import academySettings from '@/lib/academy-site-settings';

const { DEFAULT_ACADEMY_SITE_SETTINGS, normalizeAcademySiteSettings } = academySettings;

const CONTACT_FIELDS = [
  { field: 'email', label: 'Academy contact email', type: 'email', required: true, maxLength: 254 },
  { field: 'phone', label: 'Phone number', type: 'tel', maxLength: 40 },
  { field: 'whatsapp', label: 'WhatsApp number with country code', type: 'text', placeholder: '233549128384', maxLength: 15 },
  { field: 'location', label: 'Location', type: 'text', maxLength: 200 },
  { field: 'officeHours', label: 'Office hours', type: 'text', maxLength: 120 },
];

const SOCIAL_FIELDS = [
  { field: 'facebook', label: 'Facebook URL' },
  { field: 'instagram', label: 'Instagram URL' },
  { field: 'linkedin', label: 'LinkedIn URL' },
  { field: 'youtube', label: 'YouTube URL' },
  { field: 'tiktok', label: 'TikTok URL' },
];

export default function AcademySiteSettingsPage() {
  const [settings, setSettings] = useState(DEFAULT_ACADEMY_SITE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    fetch('/api/academy/admin/site-settings', { cache: 'no-store', credentials: 'include' })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Could not load Academy settings.');
        return result;
      })
      .then((result) => {
        if (active) setSettings(normalizeAcademySiteSettings(result.settings));
      })
      .catch((loadError) => {
        if (active) setError(loadError.message || 'Could not load Academy settings.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  function update(field, value) {
    setSettings((current) => ({ ...current, [field]: value }));
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/academy/admin/site-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(settings),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not save Academy settings.');
      setSettings(normalizeAcademySiteSettings(result.settings));
      setNotice('Academy contact details and social links have been saved.');
    } catch (saveError) {
      setError(saveError.message || 'Could not save Academy settings.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="ap-main">
      <header className="ap-page-head ap-admin-heading">
        <div>
          <h1>Academy site settings</h1>
          <p>Manage the public contact page, email, phone, and social links shown in the Academy footer.</p>
        </div>
      </header>

      {error && <div className="ap-error" role="alert">{error}</div>}
      {notice && <div className="ap-success" role="status">{notice}</div>}

      <form onSubmit={save}>
        <section className="ap-card ap-section">
          <h2>Contact details</h2>
          <p className="ap-card-sub">These details appear on the Academy contact page and footer. Contact form messages are sent to the email below.</p>
          {loading ? (
            <p className="ap-muted" role="status">Loading Academy settings…</p>
          ) : (
            <div className="ap-form-grid">
              {CONTACT_FIELDS.map(({ field, label, type, required, placeholder, maxLength }) => (
                <div className="ap-field" key={field}>
                  <label htmlFor={`academy-setting-${field}`}>{label}</label>
                  <input
                    id={`academy-setting-${field}`}
                    className="ap-input"
                    type={type}
                    maxLength={maxLength}
                    required={required}
                    placeholder={placeholder}
                    value={settings[field]}
                    onChange={(event) => update(field, event.target.value)}
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="ap-card ap-section">
          <h2>Social media</h2>
          <p className="ap-card-sub">Only configured links appear in the public footer. Use full HTTPS profile URLs.</p>
          <div className="ap-form-grid">
            {SOCIAL_FIELDS.map(({ field, label }) => (
              <div className="ap-field" key={field}>
                <label htmlFor={`academy-setting-${field}`}>{label}</label>
                <input
                  id={`academy-setting-${field}`}
                  className="ap-input"
                  type="url"
                  maxLength={500}
                  placeholder="https://"
                  value={settings[field]}
                  onChange={(event) => update(field, event.target.value)}
                />
              </div>
            ))}
          </div>
        </section>

        <button className="ap-button ap-button-primary" type="submit" disabled={loading || saving}>
          {saving ? 'Saving…' : 'Save site settings'}
        </button>
      </form>
    </main>
  );
}
