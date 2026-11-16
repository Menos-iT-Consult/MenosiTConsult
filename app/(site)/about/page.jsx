import Link from 'next/link';
import Reveal from '@/app/components/Reveal';

export const metadata = {
  title: { absolute: 'About Us — Menos iT Consult' },
  description:
    'Learn about Menos iT Consult — our mission, our team, and our story of empowering businesses through technology since 2012.',
};

export default function AboutPage() {
  return (
    <>
      {/* PAGE HERO */}
      <section className="page-hero">
        <div className="container">
          <Reveal as="div" className="breadcrumb">
            <Link href="/">Home</Link> <span>/</span> About
          </Reveal>
          <Reveal as="h1">About Menos iT Consult</Reveal>
          <Reveal as="p">
            Three (3) years of helping businesses in Ghana get the most out of their
            technology — and counting.
          </Reveal>
        </div>
      </section>

      {/* MISSION */}
      <section className="section">
        <div className="container">
          <div className="about-grid">
            <Reveal as="div" className="about-img">
              <div className="about-img-wrap">
                <div className="about-blob"></div>
                <div className="about-img-card">
                  <div className="aic-row">
                    <div className="aic-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                        <polyline points="9 22 9 12 15 12 15 22" />
                      </svg>
                    </div>
                    <div>
                      <strong>Menos iT Consult</strong>
                      <p>Est. 2023 · Agona, Ghana</p>
                    </div>
                  </div>
                  <div className="aic-row">
                    <div className="aic-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                      </svg>
                    </div>
                    <div>
                      <strong>ISO Certified</strong>
                      <p>Quality you can trust</p>
                    </div>
                  </div>
                  <div className="aic-row">
                    <div className="aic-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.41 2 2 0 0 1 3.6 1.21h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.7A16 16 0 0 0 15.3 16l.95-.95a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22.92 17z" />
                      </svg>
                    </div>
                    <div>
                      <strong>Always available</strong>
                      <p>Mon–Fri 9am–5pm</p>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
            <div className="about-text">
              <Reveal as="div" className="section-label">
                Our Mission
              </Reveal>
              <Reveal as="h2">Putting technology to work for small businesses</Reveal>
              <Reveal as="p">
                At Menos iT Consult, our mission is to provide top-notch IT consulting
                services to small businesses. We strive to help our clients optimize their
                technology solutions to improve efficiency and productivity.
              </Reveal>
              <Reveal as="p">
                Based in Agona, Western Ghana, we understand the unique challenges facing
                businesses in our region. We combine global best practices with local
                insight to deliver solutions that truly work for you — not just on paper,
                but in practice.
              </Reveal>
              <Reveal as="div" className="about-pillars">
                <div className="pillar">
                  <div className="pillar-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </div>
                  <h4>Our Mission</h4>
                  <p>Optimize technology to improve efficiency and productivity for small businesses.</p>
                </div>
                <div className="pillar">
                  <div className="pillar-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </div>
                  <h4>Our Vision</h4>
                  <p>To be the most trusted IT partner for growing businesses across West Africa.</p>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* VALUES */}
      <section className="section" style={{ background: '#f8faff' }}>
        <div className="container">
          <Reveal as="div" className="section-label">
            What We Stand For
          </Reveal>
          <Reveal as="h2" className="section-title">
            Our Core Values
          </Reveal>
          <div className="values-grid">
            <Reveal as="div" className="value-card">
              <div className="sc-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <h3>Integrity</h3>
              <p>We are transparent in everything we do — our pricing, our timelines, and our recommendations. No hidden fees, no jargon, no shortcuts.</p>
            </Reveal>
            <Reveal as="div" className="value-card">
              <div className="sc-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                  <line x1="9" y1="9" x2="9.01" y2="9" />
                  <line x1="15" y1="9" x2="15.01" y2="9" />
                </svg>
              </div>
              <h3>Client First</h3>
              <p>Your success is our measure of success. Every decision we make is driven by what is best for your business, not what is easiest for us.</p>
            </Reveal>
            <Reveal as="div" className="value-card">
              <div className="sc-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              </div>
              <h3>Excellence</h3>
              <p>We hold ourselves to a high standard. Certified, experienced, and constantly learning — so your technology stays current and competitive.</p>
            </Reveal>
            <Reveal as="div" className="value-card">
              <div className="sc-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <h3>Community</h3>
              <p>We are proud to be a Ghanaian company. We invest in local talent, support local businesses, and grow alongside the communities we serve.</p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* TIMELINE */}
      <section className="section">
        <div className="container">
          <Reveal as="div" className="section-label">
            Our Journey
          </Reveal>
          <Reveal as="h2" className="section-title">
            From a small office to a trusted partner
          </Reveal>
          <div className="timeline">
            <Reveal as="div" className="tl-item">
              <div className="tl-year">2023</div>
              <div className="tl-body">
                <h4>Founded in Agona</h4>
                <p>Menos iT Consult opens its doors with a team of three, focused on network support for local businesses.</p>
              </div>
            </Reveal>
            <Reveal as="div" className="tl-item">
              <div className="tl-year">2024</div>
              <div className="tl-body">
                <h4>Cybersecurity Practice Launched</h4>
                <p>Growing demand for digital security leads us to build a dedicated cybersecurity team and gain our first enterprise client.</p>
              </div>
            </Reveal>
            <Reveal as="div" className="tl-item">
              <div className="tl-year">2024</div>
              <div className="tl-body">
                <h4>Cloud Services Added</h4>
                <p>We help our first client migrate to AWS, cutting their infrastructure costs by 35%. Cloud becomes a cornerstone offering.</p>
              </div>
            </Reveal>
            <Reveal as="div" className="tl-item">
              <div className="tl-year">2025</div>
              <div className="tl-body">
                <h4>100+ Clients Milestone</h4>
                <p>We celebrate 100 businesses served across Ghana and begin expanding our team to meet growing regional demand.</p>
              </div>
            </Reveal>
            <Reveal as="div" className="tl-item">
              <div className="tl-year">2026</div>
              <div className="tl-body">
                <h4>Today — Still Growing</h4>
                <p>150+ clients, a full-service IT consultancy, and the same commitment to honest, practical technology solutions we started with.</p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* TEAM */}
      <section className="section" style={{ background: '#f8faff' }}>
        <div className="container">
          <Reveal as="div" className="section-label">
            The People
          </Reveal>
          <Reveal as="h2" className="section-title">
            Meet our team
          </Reveal>
          <Reveal as="p" className="section-sub">
            Certified professionals who care about your business as much as you do.
          </Reveal>
          <div className="team-grid">
            <Reveal as="div" className="team-card">
              <div className="team-av" style={{ '--h': 210 }}>
                AM
              </div>
              <h3>Matthew Essoun Minnah</h3>
              <p className="team-role">Founder &amp; Lead Consultant</p>
              <p className="team-bio">5+ years in enterprise IT. Matthew founded Menos iT Consult with one goal: to make quality IT accessible to every small business in Ghana. He leads client strategy and ensures every engagement delivers real results.</p>
              <div className="team-tags">
                <span>Strategy</span>
                <span>Consulting</span>
                <span>Leadership</span>
              </div>
            </Reveal>
            <Reveal as="div" className="team-card">
              <div className="team-av" style={{ '--h': 160 }}>
                KA
              </div>
              <h3>Nene Tei Tetteh</h3>
              <p className="team-role">CTO &amp; Cloud Architect</p>
              <p className="team-bio">AWS Certified Solutions Architect with deep expertise in cloud migrations and DevOps. Nene has moved over 40 clients to the cloud without a single major incident.</p>
              <div className="team-tags">
                <span>AWS</span>
                <span>Azure</span>
                <span>DevOps</span>
              </div>
            </Reveal>
            <Reveal as="div" className="team-card">
              <div className="team-av" style={{ '--h': 280 }}>
                EO
              </div>
              <h3>Henry Asante</h3>
              <p className="team-role">Head of Cybersecurity</p>
              <p className="team-bio">CISSP-certified with a background in government and financial sector security. Henry leads all security audits and has helped dozens of businesses achieve compliance they thought was out of reach.</p>
              <div className="team-tags">
                <span>CISSP</span>
                <span>Pen Testing</span>
                <span>Compliance</span>
              </div>
            </Reveal>
            <Reveal as="div" className="team-card">
              <div className="team-av" style={{ '--h': 30 }}>
                LA
              </div>
              <h3>Lawrence Agyemang</h3>
              <p className="team-role">Lead Network Engineer</p>
              <p className="team-bio">Specialises in network design and implementation for high-traffic environments. Lawrence has built and maintained networks for hospitals, logistics companies, and government agencies across the Western Region.</p>
              <div className="team-tags">
                <span>Cisco</span>
                <span>Network Design</span>
                <span>VPN</span>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* CTA BAND */}
      <section className="cta-band">
        <div className="container">
          <Reveal as="div" className="cta-band-inner">
            <div>
              <h2>Want to work with us?</h2>
              <p>Tell us about your business and we&apos;ll figure out how we can help.</p>
            </div>
            <Link href="/contact" className="btn btn-white">
              Get in touch
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
