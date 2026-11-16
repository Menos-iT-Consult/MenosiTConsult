import Link from 'next/link';
import Reveal from '@/app/components/Reveal';
import ContactText from '@/app/components/ContactText';
import NewsletterForm from '@/app/components/NewsletterForm';
import Faq from '@/app/components/Faq';
import ContactForm from './ContactForm';

export const metadata = {
  title: {
    absolute: 'Contact — Menos iT Consult',
  },
  description:
    "Get in touch with Menos iT Consult. We're based in Agona, Ghana and available Monday to Friday, 9am to 5pm.",
};

export default function ContactPage() {
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <Reveal as="div" className="breadcrumb">
            <Link href="/">Home</Link> <span>/</span> Contact
          </Reveal>
          <Reveal as="h1">Get In Touch</Reveal>
          <Reveal as="p">
            We read every message ourselves and reply within one business day —
            usually much sooner.
          </Reveal>
        </div>
      </section>

      {/* CONTACT GRID */}
      <section className="section">
        <div className="container">
          <div className="contact-grid">
            <Reveal className="contact-info">
              <h3>Contact details</h3>
              <div className="ci-item">
                <div className="ci-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </div>
                <div>
                  <strong>Our Location</strong>
                  <ContactText kind="location" fallback="Agona, Western Region, Ghana" />
                </div>
              </div>
              <div className="ci-item">
                <div className="ci-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </div>
                <div>
                  <strong>Email</strong>
                  <p>
                    <ContactText as="a" kind="email" fallback="menositsolutions@gmail.com" />
                  </p>
                </div>
              </div>
              <div className="ci-item">
                <div className="ci-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                  </svg>
                </div>
                <div>
                  <strong>WhatsApp</strong>
                  <p>
                    <ContactText as="a" kind="whatsapp" fallback="Message us on WhatsApp" />
                  </p>
                </div>
              </div>
              <div className="ci-item">
                <div className="ci-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <div>
                  <strong>Business Hours</strong>
                  <p>
                    Monday – Friday: 9am – 5pm
                    <br />
                    Saturday – Sunday: Closed
                  </p>
                </div>
              </div>

              <div className="newsletter">
                <h4>Stay Updated</h4>
                <p>Get practical IT tips straight to your inbox.</p>
                <NewsletterForm className="nl-form" id="nlForm" buttonLabel="Subscribe" />
              </div>
            </Reveal>

            <ContactForm />
          </div>
        </div>
      </section>

      {/* MAP & DIRECTIONS */}
      <section className="section find-us">
        <div className="container">
          <Reveal className="find-us-head center">
            <div className="section-label">Find Us</div>
            <h2 className="section-title">
              Based in <span className="highlight">Agona</span>, Western Region
            </h2>
            <p className="section-sub">
              Drop by during business hours or reach out and we&apos;ll come to you.
            </p>
          </Reveal>

          <Reveal className="map-frame">
            <iframe
              title="Menos iT Consult location map"
              src="https://maps.google.com/maps?q=4.8849265,-1.9586283&z=16&hl=en&output=embed"
              width="100%"
              height="460"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>

            <div className="map-card">
              <div className="map-card-top">
                <span className="map-card-pin">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ width: 20, height: 20 }}
                  >
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </span>
                <div>
                  <strong>Menos iT Consult</strong>
                  <ContactText kind="location" fallback="Agona, Western Region, Ghana" />
                  <p className="map-card-hours">Mon – Fri · 9am – 5pm</p>
                </div>
              </div>
              <div className="map-card-actions">
                <a
                  className="btn btn-primary btn-sm"
                  href="https://www.google.com/maps/dir/?api=1&destination=4.8849265,-1.9586283"
                  target="_blank"
                  rel="noopener"
                >
                  Get Directions
                </a>
                <a
                  className="btn btn-ghost btn-sm"
                  href="https://www.google.com/maps/search/?api=1&query=4.8849265,-1.9586283"
                  target="_blank"
                  rel="noopener"
                >
                  Open in Maps
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* FAQ */}
      <section className="section alt-bg">
        <div className="container">
          <Reveal as="div" className="section-label">FAQ</Reveal>
          <Reveal as="h2" className="section-title">Common questions</Reveal>
          <div className="faq-list">
            <Faq
              items={[
                {
                  q: 'How quickly can you start on a project?',
                  a: (
                    <p>
                      For most projects we can begin within one to two weeks of an
                      initial consultation. Urgent support needs — like a network
                      outage or security incident — are handled same day.
                    </p>
                  ),
                },
                {
                  q: 'Do you work with businesses outside of Agona?',
                  a: (
                    <p>
                      Yes. While we&apos;re based in Agona, we serve clients across
                      Ghana and can handle many services — consulting, cloud,
                      security audits, and data management — fully remotely.
                    </p>
                  ),
                },
                {
                  q: 'How is pricing structured?',
                  a: (
                    <p>
                      We price per project or on a monthly retainer for ongoing
                      support. We&apos;ll always give you a clear quote upfront — no
                      hidden fees, no surprises at invoice time.
                    </p>
                  ),
                },
                {
                  q: 'What happens after a project is completed?',
                  a: (
                    <p>
                      We don&apos;t just hand over and disappear. Every project
                      includes a handover session, documentation, and a follow-up
                      check-in. Ongoing support is also available as a retainer.
                    </p>
                  ),
                },
              ]}
            />
          </div>
        </div>
      </section>
    </>
  );
}
