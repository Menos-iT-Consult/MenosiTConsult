import Link from 'next/link';
import Reveal from '@/app/components/Reveal';

export const metadata = {
  title: { absolute: 'Services — Menos iT Consult' },
  description:
    'Explore the full range of IT services from Menos iT Consult — network design, cybersecurity, cloud solutions, consulting, support and data management.',
};

export default function ServicesPage() {
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <Reveal as="div" className="breadcrumb">
            <Link href="/">Home</Link> <span>/</span> Services
          </Reveal>
          <Reveal as="h1">Our Services</Reveal>
          <Reveal as="p">
            Eight core IT disciplines. All delivered by certified professionals who stay
            around after the job is done.
          </Reveal>
        </div>
      </section>

      {/* SERVICE DETAIL: Network */}
      <section className="section srv-detail" id="network">
        <div className="container">
          <div className="srv-detail-grid">
            <Reveal as="div" className="srv-detail-icon-col">
              <div className="srv-big-icon">
                <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="10" width="56" height="38" rx="4" />
                  <path d="M20 52h24M32 48v4" />
                  <path d="M4 36h56" />
                </svg>
              </div>
              <span className="srv-num">01</span>
            </Reveal>
            <div className="srv-detail-text">
              <Reveal as="div" className="section-label">
                Service 01
              </Reveal>
              <Reveal as="h2">Network Design &amp; Implementation</Reveal>
              <Reveal as="p">
                A poorly designed network costs you in downtime, slow performance, and
                security gaps. We design networks that are built right the first time —
                fast, reliable, and scalable as your business grows.
              </Reveal>
              <Reveal as="ul" className="srv-bullets">
                <li>
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path d="M16.7 5.3a1 1 0 0 0-1.4 0L8 12.6 4.7 9.3a1 1 0 0 0-1.4 1.4l4 4a1 1 0 0 0 1.4 0l8-8a1 1 0 0 0 0-1.4z" />
                  </svg>{' '}
                  LAN, WAN, and wireless network design
                </li>
                <li>
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path d="M16.7 5.3a1 1 0 0 0-1.4 0L8 12.6 4.7 9.3a1 1 0 0 0-1.4 1.4l4 4a1 1 0 0 0 1.4 0l8-8a1 1 0 0 0 0-1.4z" />
                  </svg>{' '}
                  Hardware procurement and installation
                </li>
                <li>
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path d="M16.7 5.3a1 1 0 0 0-1.4 0L8 12.6 4.7 9.3a1 1 0 0 0-1.4 1.4l4 4a1 1 0 0 0 1.4 0l8-8a1 1 0 0 0 0-1.4z" />
                  </svg>{' '}
                  VPN and remote access configuration
                </li>
                <li>
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path d="M16.7 5.3a1 1 0 0 0-1.4 0L8 12.6 4.7 9.3a1 1 0 0 0-1.4 1.4l4 4a1 1 0 0 0 1.4 0l8-8a1 1 0 0 0 0-1.4z" />
                  </svg>{' '}
                  Network monitoring and proactive maintenance
                </li>
                <li>
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path d="M16.7 5.3a1 1 0 0 0-1.4 0L8 12.6 4.7 9.3a1 1 0 0 0-1.4 1.4l4 4a1 1 0 0 0 1.4 0l8-8a1 1 0 0 0 0-1.4z" />
                  </svg>{' '}
                  Firewall and access control setup
                </li>
              </Reveal>
              <Reveal as={Link} href="/contact" className="btn btn-primary">
                Request a network audit
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICE DETAIL: Cybersecurity */}
      <section className="section srv-detail alt-bg" id="security">
        <div className="container">
          <div className="srv-detail-grid reverse">
            <div className="srv-detail-text">
              <Reveal as="div" className="section-label">
                Service 02
              </Reveal>
              <Reveal as="h2">Cybersecurity</Reveal>
              <Reveal as="p">
                Most small businesses think they&apos;re too small to be targeted.
                They&apos;re wrong. We help you understand your real risk, fix
                vulnerabilities, and stay protected — without burying you in technical
                complexity.
              </Reveal>
              <Reveal as="ul" className="srv-bullets">
                <li>
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path d="M16.7 5.3a1 1 0 0 0-1.4 0L8 12.6 4.7 9.3a1 1 0 0 0-1.4 1.4l4 4a1 1 0 0 0 1.4 0l8-8a1 1 0 0 0 0-1.4z" />
                  </svg>{' '}
                  Vulnerability assessments and penetration testing
                </li>
                <li>
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path d="M16.7 5.3a1 1 0 0 0-1.4 0L8 12.6 4.7 9.3a1 1 0 0 0-1.4 1.4l4 4a1 1 0 0 0 1.4 0l8-8a1 1 0 0 0 0-1.4z" />
                  </svg>{' '}
                  Security policy development
                </li>
                <li>
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path d="M16.7 5.3a1 1 0 0 0-1.4 0L8 12.6 4.7 9.3a1 1 0 0 0-1.4 1.4l4 4a1 1 0 0 0 1.4 0l8-8a1 1 0 0 0 0-1.4z" />
                  </svg>{' '}
                  Staff security awareness training
                </li>
                <li>
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path d="M16.7 5.3a1 1 0 0 0-1.4 0L8 12.6 4.7 9.3a1 1 0 0 0-1.4 1.4l4 4a1 1 0 0 0 1.4 0l8-8a1 1 0 0 0 0-1.4z" />
                  </svg>{' '}
                  Regulatory compliance (GDPR, HIPAA, ISO 27001)
                </li>
                <li>
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path d="M16.7 5.3a1 1 0 0 0-1.4 0L8 12.6 4.7 9.3a1 1 0 0 0-1.4 1.4l4 4a1 1 0 0 0 1.4 0l8-8a1 1 0 0 0 0-1.4z" />
                  </svg>{' '}
                  Incident response planning and support
                </li>
              </Reveal>
              <Reveal as={Link} href="/contact" className="btn btn-primary">
                Book a security review
              </Reveal>
            </div>
            <Reveal as="div" className="srv-detail-icon-col">
              <div className="srv-big-icon">
                <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M32 4L8 14v16c0 14 10 27 24 30 14-3 24-16 24-30V14L32 4z" />
                  <path d="M22 32l6 6 14-14" />
                </svg>
              </div>
              <span className="srv-num">02</span>
            </Reveal>
          </div>
        </div>
      </section>

      {/* SERVICE DETAIL: Cloud */}
      <section className="section srv-detail" id="cloud">
        <div className="container">
          <div className="srv-detail-grid">
            <Reveal as="div" className="srv-detail-icon-col">
              <div className="srv-big-icon">
                <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 40a12 12 0 0 1 2-24 14 14 0 0 1 27-3A12 12 0 1 1 50 40z" />
                </svg>
              </div>
              <span className="srv-num">03</span>
            </Reveal>
            <div className="srv-detail-text">
              <Reveal as="div" className="section-label">
                Service 03
              </Reveal>
              <Reveal as="h2">Cloud Solutions</Reveal>
              <Reveal as="p">
                Moving to the cloud can cut costs, improve reliability, and let your team
                work from anywhere. We handle the migration, the optimisation, and the
                ongoing management — so you get the benefits without the complexity.
              </Reveal>
              <Reveal as="ul" className="srv-bullets">
                <li>
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path d="M16.7 5.3a1 1 0 0 0-1.4 0L8 12.6 4.7 9.3a1 1 0 0 0-1.4 1.4l4 4a1 1 0 0 0 1.4 0l8-8a1 1 0 0 0 0-1.4z" />
                  </svg>{' '}
                  AWS, Azure, and Google Cloud migrations
                </li>
                <li>
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path d="M16.7 5.3a1 1 0 0 0-1.4 0L8 12.6 4.7 9.3a1 1 0 0 0-1.4 1.4l4 4a1 1 0 0 0 1.4 0l8-8a1 1 0 0 0 0-1.4z" />
                  </svg>{' '}
                  Cloud cost optimisation and billing management
                </li>
                <li>
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path d="M16.7 5.3a1 1 0 0 0-1.4 0L8 12.6 4.7 9.3a1 1 0 0 0-1.4 1.4l4 4a1 1 0 0 0 1.4 0l8-8a1 1 0 0 0 0-1.4z" />
                  </svg>{' '}
                  Hybrid cloud and on-premise integration
                </li>
                <li>
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path d="M16.7 5.3a1 1 0 0 0-1.4 0L8 12.6 4.7 9.3a1 1 0 0 0-1.4 1.4l4 4a1 1 0 0 0 1.4 0l8-8a1 1 0 0 0 0-1.4z" />
                  </svg>{' '}
                  Disaster recovery and business continuity planning
                </li>
                <li>
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path d="M16.7 5.3a1 1 0 0 0-1.4 0L8 12.6 4.7 9.3a1 1 0 0 0-1.4 1.4l4 4a1 1 0 0 0 1.4 0l8-8a1 1 0 0 0 0-1.4z" />
                  </svg>{' '}
                  Microsoft 365 and Google Workspace setup
                </li>
              </Reveal>
              <Reveal as={Link} href="/contact" className="btn btn-primary">
                Discuss cloud migration
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICE DETAIL: Web Development */}
      <section className="section srv-detail alt-bg" id="webdev">
        <div className="container">
          <div className="srv-detail-grid reverse">
            <div className="srv-detail-text">
              <Reveal as="div" className="section-label">
                Service 04
              </Reveal>
              <Reveal as="h2">Web Development</Reveal>
              <Reveal as="p">
                Your website is often the first impression a customer gets of your
                business. We build fast, professional, mobile-ready websites and web
                applications that look great, work reliably, and are easy for you to
                manage — no technical knowledge required.
              </Reveal>
              <Reveal as="ul" className="srv-bullets">
                <li>
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path d="M16.7 5.3a1 1 0 0 0-1.4 0L8 12.6 4.7 9.3a1 1 0 0 0-1.4 1.4l4 4a1 1 0 0 0 1.4 0l8-8a1 1 0 0 0 0-1.4z" />
                  </svg>{' '}
                  Business websites and landing pages
                </li>
                <li>
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path d="M16.7 5.3a1 1 0 0 0-1.4 0L8 12.6 4.7 9.3a1 1 0 0 0-1.4 1.4l4 4a1 1 0 0 0 1.4 0l8-8a1 1 0 0 0 0-1.4z" />
                  </svg>{' '}
                  E-commerce stores (product listings, cart, payments)
                </li>
                <li>
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path d="M16.7 5.3a1 1 0 0 0-1.4 0L8 12.6 4.7 9.3a1 1 0 0 0-1.4 1.4l4 4a1 1 0 0 0 1.4 0l8-8a1 1 0 0 0 0-1.4z" />
                  </svg>{' '}
                  CMS-powered sites (WordPress, Webflow) with training
                </li>
                <li>
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path d="M16.7 5.3a1 1 0 0 0-1.4 0L8 12.6 4.7 9.3a1 1 0 0 0-1.4 1.4l4 4a1 1 0 0 0 1.4 0l8-8a1 1 0 0 0 0-1.4z" />
                  </svg>{' '}
                  SEO foundations and performance optimisation
                </li>
                <li>
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path d="M16.7 5.3a1 1 0 0 0-1.4 0L8 12.6 4.7 9.3a1 1 0 0 0-1.4 1.4l4 4a1 1 0 0 0 1.4 0l8-8a1 1 0 0 0 0-1.4z" />
                  </svg>{' '}
                  Hosting setup, domain management, and SSL
                </li>
                <li>
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path d="M16.7 5.3a1 1 0 0 0-1.4 0L8 12.6 4.7 9.3a1 1 0 0 0-1.4 1.4l4 4a1 1 0 0 0 1.4 0l8-8a1 1 0 0 0 0-1.4z" />
                  </svg>{' '}
                  Ongoing maintenance and content updates
                </li>
              </Reveal>
              <Reveal as={Link} href="/contact" className="btn btn-primary">
                Discuss your website
              </Reveal>
            </div>
            <Reveal as="div" className="srv-detail-icon-col">
              <div className="srv-big-icon">
                <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="8" width="56" height="42" rx="4" />
                  <path d="M4 20h56" />
                  <circle cx="14" cy="14" r="2" fill="currentColor" stroke="none" />
                  <circle cx="22" cy="14" r="2" fill="currentColor" stroke="none" />
                  <circle cx="30" cy="14" r="2" fill="currentColor" stroke="none" />
                  <path d="M20 34l-8 4 8 4M44 34l8 4-8 4M30 44l4-16" />
                </svg>
              </div>
              <span className="srv-num">04</span>
            </Reveal>
          </div>
        </div>
      </section>

      {/* SERVICE DETAIL: Software Development */}
      <section className="section srv-detail" id="softdev">
        <div className="container">
          <div className="srv-detail-grid">
            <Reveal as="div" className="srv-detail-icon-col">
              <div className="srv-big-icon">
                <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="6" y="6" width="52" height="52" rx="6" />
                  <path d="M6 22h52" />
                  <path d="M22 38l-8 6 8 6M42 38l8 6-8 6" />
                  <path d="M28 50l8-24" />
                  <circle cx="16" cy="14" r="2" fill="currentColor" stroke="none" />
                  <circle cx="24" cy="14" r="2" fill="currentColor" stroke="none" />
                </svg>
              </div>
              <span className="srv-num">05</span>
            </Reveal>
            <div className="srv-detail-text">
              <Reveal as="div" className="section-label">
                Service 05
              </Reveal>
              <Reveal as="h2">Software Development</Reveal>
              <Reveal as="p">
                Off-the-shelf software rarely fits your business perfectly. We build
                custom software solutions — desktop apps, web platforms, and internal
                tools — designed around exactly how your team works, with no unnecessary
                complexity.
              </Reveal>
              <Reveal as="ul" className="srv-bullets">
                <li>
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path d="M16.7 5.3a1 1 0 0 0-1.4 0L8 12.6 4.7 9.3a1 1 0 0 0-1.4 1.4l4 4a1 1 0 0 0 1.4 0l8-8a1 1 0 0 0 0-1.4z" />
                  </svg>{' '}
                  Custom business applications (inventory, HR, billing)
                </li>
                <li>
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path d="M16.7 5.3a1 1 0 0 0-1.4 0L8 12.6 4.7 9.3a1 1 0 0 0-1.4 1.4l4 4a1 1 0 0 0 1.4 0l8-8a1 1 0 0 0 0-1.4z" />
                  </svg>{' '}
                  Internal dashboards and reporting tools
                </li>
                <li>
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path d="M16.7 5.3a1 1 0 0 0-1.4 0L8 12.6 4.7 9.3a1 1 0 0 0-1.4 1.4l4 4a1 1 0 0 0 1.4 0l8-8a1 1 0 0 0 0-1.4z" />
                  </svg>{' '}
                  API integrations between existing systems
                </li>
                <li>
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path d="M16.7 5.3a1 1 0 0 0-1.4 0L8 12.6 4.7 9.3a1 1 0 0 0-1.4 1.4l4 4a1 1 0 0 0 1.4 0l8-8a1 1 0 0 0 0-1.4z" />
                  </svg>{' '}
                  Process automation to eliminate repetitive manual tasks
                </li>
                <li>
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path d="M16.7 5.3a1 1 0 0 0-1.4 0L8 12.6 4.7 9.3a1 1 0 0 0-1.4 1.4l4 4a1 1 0 0 0 1.4 0l8-8a1 1 0 0 0 0-1.4z" />
                  </svg>{' '}
                  Legacy system upgrades and migration
                </li>
                <li>
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path d="M16.7 5.3a1 1 0 0 0-1.4 0L8 12.6 4.7 9.3a1 1 0 0 0-1.4 1.4l4 4a1 1 0 0 0 1.4 0l8-8a1 1 0 0 0 0-1.4z" />
                  </svg>{' '}
                  Mobile app development (iOS &amp; Android)
                </li>
              </Reveal>
              <Reveal as={Link} href="/contact" className="btn btn-primary">
                Tell us what you need built
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* Services 6–8 as cards */}
      <section className="section alt-bg">
        <div className="container">
          <Reveal as="div" className="section-label">
            More Services
          </Reveal>
          <Reveal as="h2" className="section-title">
            Also in our toolkit
          </Reveal>
          <div className="services-grid">
            <Reveal as="div" className="service-card" id="consulting">
              <div className="sc-icon">
                <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="4" width="32" height="32" rx="3" />
                  <path d="M4 14h32M14 4v36" />
                </svg>
              </div>
              <h3>IT Consulting</h3>
              <p>Not sure where to start? We&apos;ll audit your current setup, identify gaps, and produce a practical roadmap — not a 100-page document nobody reads, but a clear plan you can act on.</p>
              <Link href="/contact" className="srv-link-btn">
                Get a consultation →
              </Link>
            </Reveal>
            <Reveal as="div" className="service-card" id="support">
              <div className="sc-icon">
                <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="20" cy="20" r="16" />
                  <path d="M20 12v8l5 5" />
                </svg>
              </div>
              <h3>24/7 IT Support</h3>
              <p>A helpdesk that actually picks up. We monitor your systems around the clock and respond fast when something goes wrong — because downtime costs you money every minute.</p>
              <Link href="/contact" className="srv-link-btn">
                Enquire about support →
              </Link>
            </Reveal>
            <Reveal as="div" className="service-card" id="data">
              <div className="sc-icon">
                <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <ellipse cx="20" cy="10" rx="14" ry="5" />
                  <path d="M6 10v8c0 2.8 6.3 5 14 5s14-2.2 14-5V10" />
                  <path d="M6 18v8c0 2.8 6.3 5 14 5s14-2.2 14-5v-8" />
                </svg>
              </div>
              <h3>Data Management</h3>
              <p>Automated backups, secure storage, and a recovery plan for the day something goes wrong. We also help you make sense of your data with simple, practical reporting dashboards.</p>
              <Link href="/contact" className="srv-link-btn">
                Talk to us about data →
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* CTA BAND */}
      <section className="cta-band">
        <div className="container">
          <Reveal as="div" className="cta-band-inner">
            <div>
              <h2>Not sure which service you need?</h2>
              <p>Tell us about your situation and we&apos;ll point you in the right direction — no obligation.</p>
            </div>
            <Link href="/contact" className="btn btn-white">
              Talk to us
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
