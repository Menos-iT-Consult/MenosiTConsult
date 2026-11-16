'use client';

import { useRef, useState } from 'react';
import Reveal from '@/app/components/Reveal';

export default function ContactForm() {
  const successRef = useRef(null);
  const [sending, setSending] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const success = successRef.current;

    // Serialize BEFORE disabling anything: FormData omits disabled controls,
    // so collecting values afterwards would always send an empty payload.
    const fd = new FormData(form);
    const payload = Object.fromEntries(
      [...fd.entries()].map(([k, v]) => [k, String(v).trim()])
    );

    setSending(true);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok) {
        // Vanilla edge case: when the success box has no inner p/span/div,
        // its textContent is replaced with the API message.
        if (!success.querySelector('p, span, div')) {
          success.textContent = data.message;
        }
        success.classList.add('show');
        form.reset();
        setTimeout(() => success.classList.remove('show'), 7000);
      } else {
        alert(data.error || 'Something went wrong. Please try again.');
      }
    } catch {
      alert(
        'Could not reach the server. Please email us directly at minnahmat50@gmail.com'
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <Reveal as="form" className="contact-form" id="contactForm" onSubmit={submit}>
      <h3>Send us a message</h3>
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="cf-first">First Name</label>
          <input id="cf-first" name="firstName" type="text" placeholder="John" required disabled={sending} />
        </div>
        <div className="form-group">
          <label htmlFor="cf-last">Last Name</label>
          <input id="cf-last" name="lastName" type="text" placeholder="Doe" required disabled={sending} />
        </div>
      </div>
      <div className="form-group">
        <label htmlFor="cf-email">Email Address</label>
        <input id="cf-email" name="email" type="email" placeholder="john@company.com" required disabled={sending} />
      </div>
      <div className="form-group">
        <label htmlFor="cf-phone">Phone Number</label>
        <input id="cf-phone" name="phone" type="tel" placeholder="+233 xx xxx xxxx" disabled={sending} />
      </div>
      <div className="form-group">
        <label htmlFor="cf-service">Service Interested In</label>
        <select id="cf-service" name="service" disabled={sending}>
          <option value="">Select a service</option>
          <option>Network Design &amp; Implementation</option>
          <option>Cybersecurity</option>
          <option>Cloud Solutions</option>
          <option>Web Development</option>
          <option>Software Development</option>
          <option>IT Consulting</option>
          <option>24/7 IT Support</option>
          <option>Data Management</option>
          <option>Not sure yet</option>
        </select>
      </div>
      <div className="form-group">
        <label htmlFor="cf-source">How did you hear about us?</label>
        <select id="cf-source" name="source" disabled={sending}>
          <option value="">Select an option</option>
          <option>Google Search</option>
          <option>Word of mouth / referral</option>
          <option>Social media</option>
          <option>Our website</option>
          <option>Other</option>
        </select>
      </div>
      <div className="form-group">
        <label htmlFor="cf-message">Message</label>
        <textarea
          id="cf-message"
          name="message"
          rows="5"
          placeholder="Tell us about your business and what you&apos;re looking for..."
          required
          disabled={sending}
        />
      </div>
      <button type="submit" className="btn btn-primary btn-full" disabled={sending}>
        {sending ? 'Sending…' : 'Send Message'}
      </button>
      <div className="form-success" id="formSuccess" ref={successRef}>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ width: 18, height: 18, flexShrink: 0 }}
        >
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
        Message sent! We&apos;ll get back to you within one business day.
      </div>
    </Reveal>
  );
}
