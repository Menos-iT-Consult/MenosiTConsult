'use client';

import { useState } from 'react';
import useAcademySiteSettings from '../useAcademySiteSettings';

export default function AcademyContactForm() {
  const { settings, error: settingsError } = useAcademySiteSettings();
  const [values, setValues] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
    company: '',
  });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function update(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setSending(true);
    setError('');
    setSuccess('');
    try {
      const response = await fetch('/api/academy/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not send your message.');
      setSuccess(result.message || 'Your message has been sent to the Academy.');
      setValues({ name: '', email: '', phone: '', subject: '', message: '', company: '' });
    } catch (submitError) {
      setError(submitError.message || 'Could not reach the Academy. Please email us directly.');
    } finally {
      setSending(false);
    }
  }

  const whatsapp = settings.whatsapp.replace(/\D/g, '');

  return (
    <section className="academy-section academy-contact-content">
      <div className="academy-container academy-contact-grid">
        <div className="academy-contact-details">
          <p className="academy-section-kicker">Get in touch</p>
          <h2>How can we help?</h2>
          <p>Contact us directly or send a message using the form.</p>
          <dl>
            <div>
              <dt>Email</dt>
              <dd><a href={`mailto:${settings.email}`}>{settings.email}</a></dd>
            </div>
            {settings.phone && (
              <div>
                <dt>Phone</dt>
                <dd><a href={`tel:${settings.phone.replace(/[^\d+]/g, '')}`}>{settings.phone}</a></dd>
              </div>
            )}
            {whatsapp && (
              <div>
                <dt>WhatsApp</dt>
                <dd><a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer">Chat with the Academy</a></dd>
              </div>
            )}
            {settings.location && (
              <div>
                <dt>Location</dt>
                <dd>{settings.location}</dd>
              </div>
            )}
            {settings.officeHours && (
              <div>
                <dt>Office hours</dt>
                <dd>{settings.officeHours}</dd>
              </div>
            )}
          </dl>
          {settingsError && <p className="academy-contact-settings-error" role="status">{settingsError}</p>}
        </div>

        <form className="academy-contact-form" onSubmit={submit}>
          <h2>Send us a message</h2>
          <p>We&apos;ll reply to the email address you provide.</p>
          {error && <p className="academy-contact-error" role="alert">{error}</p>}
          {success && <p className="academy-contact-success" role="status">{success}</p>}
          <div className="academy-contact-honeypot" aria-hidden="true">
            <label htmlFor="academy-company">Company</label>
            <input
              id="academy-company"
              name="company"
              autoComplete="off"
              tabIndex="-1"
              value={values.company}
              onChange={(event) => update('company', event.target.value)}
            />
          </div>
          <label htmlFor="academy-contact-name">Name</label>
          <input
            id="academy-contact-name"
            className="academy-contact-input"
            autoComplete="name"
            maxLength={120}
            required
            value={values.name}
            onChange={(event) => update('name', event.target.value)}
          />
          <label htmlFor="academy-contact-email">Email</label>
          <input
            id="academy-contact-email"
            className="academy-contact-input"
            type="email"
            autoComplete="email"
            maxLength={254}
            required
            value={values.email}
            onChange={(event) => update('email', event.target.value)}
          />
          <label htmlFor="academy-contact-phone">Phone <span>(optional)</span></label>
          <input
            id="academy-contact-phone"
            className="academy-contact-input"
            type="tel"
            autoComplete="tel"
            maxLength={40}
            value={values.phone}
            onChange={(event) => update('phone', event.target.value)}
          />
          <label htmlFor="academy-contact-subject">Subject</label>
          <input
            id="academy-contact-subject"
            className="academy-contact-input"
            maxLength={160}
            required
            value={values.subject}
            onChange={(event) => update('subject', event.target.value)}
          />
          <label htmlFor="academy-contact-message">Message</label>
          <textarea
            id="academy-contact-message"
            className="academy-contact-input academy-contact-textarea"
            minLength={10}
            maxLength={5000}
            rows={6}
            required
            value={values.message}
            onChange={(event) => update('message', event.target.value)}
          />
          <button className="academy-button" type="submit" disabled={sending}>
            {sending ? 'Sending…' : 'Send message'}
          </button>
        </form>
      </div>
    </section>
  );
}
