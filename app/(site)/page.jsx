import Reveal from '@/app/components/Reveal';
import Link from 'next/link';
import Stat from '@/app/components/Stat';
import TrustedLogos from '@/app/components/TrustedLogos';

export const metadata = {
  title: {
    absolute: 'Menos iT Consult — Empowering Your Business Through Technology',
  },
  description:
    'Menos iT Consult provides top-notch IT consulting services to small businesses in Ghana. Network design, cybersecurity, cloud solutions and more.',
};

export default function HomePage() {
  return (
    <>
      {/* HERO */}
      <section className="hero" id="home">
        <div className="hero-bg">
          <div className="hero-shape s1"></div>
          <div className="hero-shape s2"></div>
          <div className="hero-shape s3"></div>
        </div>
        <div className="container hero-content">
          <div className="hero-text">
            <Reveal as="div" className="hero-badge">Trusted IT Partner · Agona, Ghana</Reveal>
            <Reveal as="h1">
              Empowering Your Business
              <br />
              <span className="highlight">Through Technology</span>
            </Reveal>
            <Reveal as="p" className="hero-sub">
              Transform your business with expert IT consulting services. We help small
              businesses stay competitive, secure, and ahead of the curve.
            </Reveal>
            <Reveal as="div" className="hero-actions">
              <a href="tel:+233549128384" className="btn btn-primary">
                Call Now
              </a>
              <Link href="/services" className="btn btn-ghost">
                Our Services
              </Link>
            </Reveal>
            <Reveal as="div" className="hero-stats">
              <div className="hstat">
                <Stat statKey="clients" fallback={150} />
                <span>+</span>
                <p>Clients served</p>
              </div>
              <div className="hstat-div"></div>
              <div className="hstat">
                <Stat statKey="years" fallback={12} />
                <span>+</span>
                <p>Years experience</p>
              </div>
              <div className="hstat-div"></div>
              <div className="hstat">
                <Stat statKey="satisfaction" fallback={98} />
                <span>%</span>
                <p>Satisfaction rate</p>
              </div>
            </Reveal>
          </div>
          <Reveal as="div" className="hero-visual">
            <Link href="/services" className="hero-card hc-1">
              <div className="hc-icon">
                <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="8" width="40" height="28" rx="3" />
                  <path d="M16 40h16M24 36v4" />
                </svg>
              </div>
              <p className="hc-label">Network Design</p>
              <p className="hc-sub">Structured cabling &amp; Wi-Fi</p>
            </Link>
            <Link href="/services" className="hero-card hc-2">
              <div className="hc-icon">
                <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M24 4L6 12v12c0 11 8 20 18 22 10-2 18-11 18-22V12L24 4z" />
                </svg>
              </div>
              <p className="hc-label">Cybersecurity</p>
              <p className="hc-sub">Audits &amp; endpoint protection</p>
            </Link>
            <Link href="/services" className="hero-card hc-3">
              <div className="hc-icon">
                <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 20a8 8 0 0 1 8-8 8 8 0 0 1 15.6-2A8 8 0 1 1 36 28H8z" />
                </svg>
              </div>
              <p className="hc-label">Cloud Solutions</p>
              <p className="hc-sub">Migration &amp; daily backups</p>
            </Link>
            <Link href="/services" className="hero-card hc-4">
              <div className="hc-icon">
                <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="24" cy="24" r="20" />
                  <path d="M24 14v10l6 6" />
                </svg>
              </div>
              <p className="hc-label">24/7 Support</p>
              <p className="hc-sub">Remote &amp; on-site helpdesk</p>
            </Link>
          </Reveal>
        </div>
        <div className="hero-scroll">
          <span>Scroll down</span>
          <div className="scroll-dot"></div>
        </div>
      </section>

      {/* TRUSTED COMPANIES MARQUEE (managed in Admin → Settings → Trusted Companies) */}
      <section className="marquee-section">
        <span className="section-label">Trusted Partners</span>
        <TrustedLogos />
      </section>

      {/* QUICK INTRO */}
      <section className="section quick-intro">
        <div className="container">
          <Reveal as="div" className="section-label">Who We Are</Reveal>
          <Reveal as="h2" className="section-title">
            Technology that works for your business
          </Reveal>
          <Reveal as="p" className="section-sub">
            Based in Agona, Western Ghana, Menos iT Consult has been helping small
            businesses grow through smart, reliable technology since 2012.
          </Reveal>
          <div className="preview-grid">
            <Reveal as={Link} href="/about" className="preview-card">
              <div className="preview-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <h3>About Us</h3>
              <p>
                Meet our team, learn our story, and understand what drives us to deliver
                excellence every day.
              </p>
              <span className="preview-link">Learn more →</span>
            </Reveal>
            <Reveal as={Link} href="/services" className="preview-card">
              <div className="preview-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  <path d="M8 21h8M12 17v4" />
                </svg>
              </div>
              <h3>Our Services</h3>
              <p>
                From network design to cybersecurity and cloud — explore the full range of
                IT solutions we offer.
              </p>
              <span className="preview-link">Explore services →</span>
            </Reveal>
            <Reveal as={Link} href="/testimonials" className="preview-card">
              <div className="preview-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <h3>Testimonials</h3>
              <p>
                See what our clients say about working with us and the results we&apos;ve
                delivered for their businesses.
              </p>
              <span className="preview-link">Read reviews →</span>
            </Reveal>
            <Reveal as={Link} href="/portfolio" className="preview-card">
              <div className="preview-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2" />
                  <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                  <line x1="12" y1="12" x2="12" y2="16" />
                  <line x1="10" y1="14" x2="14" y2="14" />
                </svg>
              </div>
              <h3>Portfolio</h3>
              <p>
                Browse real projects we&apos;ve delivered — network upgrades, security
                rollouts, cloud migrations, and more.
              </p>
              <span className="preview-link">See our work →</span>
            </Reveal>
            <Reveal as={Link} href="/contact" className="preview-card preview-card--cta">
              <div className="preview-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </div>
              <h3>Contact Us</h3>
              <p>
                Ready to get started? Send us a message and we&apos;ll get back to you
                within one business day.
              </p>
              <span className="preview-link">Get in touch →</span>
            </Reveal>
          </div>
        </div>
      </section>

      {/* PULL QUOTE */}
      <section className="home-quote">
        <div className="container">
          <Reveal as="blockquote">
            <svg className="quote-mark" viewBox="0 0 40 28" fill="currentColor">
              <path d="M0 28V17.2C0 9.87 4.6 4.27 13.8 0l2.4 3.6C10.87 5.73 8.13 9 7.6 13.6H14V28H0zm22 0V17.2C22 9.87 26.6 4.27 35.8 0l2.4 3.6C32.87 5.73 30.13 9 29.6 13.6H36V28H22z" />
            </svg>
            <p>
              &quot;Menos iT Consult completely transformed our network infrastructure. We
              went from constant downtime to zero interruptions in six months.&quot;
            </p>
            <cite>— Baffour Kofi, Owner, KAB Enterprises</cite>
          </Reveal>
          <Reveal as={Link} href="/testimonials" className="btn btn-ghost">
            Read all testimonials
          </Reveal>
        </div>
      </section>

      {/* CTA BAND */}
      <section className="cta-band">
        <div className="container">
          <Reveal as="div" className="cta-band-inner">
            <div>
              <h2>Ready to transform your business?</h2>
              <p>Let&apos;s talk about what technology can do for you.</p>
            </div>
            <Link href="/contact" className="btn btn-white">
              Start a conversation
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
