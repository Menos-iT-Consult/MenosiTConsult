import Link from 'next/link';
import ProgramCards from './ProgramCards';

export const metadata = {
  title: 'MITA IT Academy | Practical Technology Training',
  description:
    'Start learning technology with MITA, Menos iT Consult Academy. Explore network engineering, cybersecurity, and cloud computing programs.',
};

const benefits = [
  {
    number: '01',
    title: 'Learn by doing',
    description:
      'Build your understanding through practical topics and technology challenges grounded in real IT work.',
  },
  {
    number: '02',
    title: 'Follow a clear path',
    description:
      'Choose a program and progress through a structured course of study, one semester at a time.',
  },
  {
    number: '03',
    title: 'Keep your progress close',
    description:
      'Once admitted, use the student portal to follow your courses, schedule, assignments, and results.',
  },
];

const steps = [
  {
    number: '1',
    title: 'Choose a program',
    description: 'Explore the available IT programs and select the area you want to study.',
  },
  {
    number: '2',
    title: 'Send your application',
    description: 'Complete the short application form with your contact details and program choice.',
  },
  {
    number: '3',
    title: 'Hear from admissions',
    description: 'The academy will review your application and contact you with the next steps.',
  },
];

export default function AcademyWelcomePage() {
  return (
    <main className="academy-welcome">
      <header className="academy-header">
        <div className="academy-container academy-header-inner">
          <Link className="academy-brand" href="/academy" aria-label="MITA Academy home">
            <img src="/assets/logo-black.png" alt="" />
            <span>
              <strong>MITA</strong>
              <small>IT Academy</small>
            </span>
          </Link>
          <nav className="academy-main-nav" aria-label="Main navigation">
            <a href="#programs">Programs</a>
            <a href="#about">About MITA</a>
            <a href="#admissions">Admissions</a>
          </nav>
          <div className="academy-header-actions">
            <Link className="academy-login-link" href="/academy/login">Student login</Link>
            <Link className="academy-button academy-button-small" href="/academy/register">Apply now</Link>
          </div>
        </div>
      </header>

      <section className="academy-hero">
        <div className="academy-hero-orb academy-hero-orb-one" />
        <div className="academy-hero-orb academy-hero-orb-two" />
        <div className="academy-container academy-hero-grid">
          <div className="academy-hero-copy">
            <p className="academy-eyebrow"><span /> Menos iT Consult · Ghana</p>
            <h1>Build skills for a future in <em>technology.</em></h1>
            <p className="academy-hero-lead">
              Explore practical IT training designed to help you understand technology,
              solve problems, and keep growing.
            </p>
            <div className="academy-hero-actions">
              <Link className="academy-button" href="/academy/register">
                Start your application <span aria-hidden="true">→</span>
              </Link>
              <a className="academy-text-link" href="#programs">Explore programs</a>
            </div>
            <div className="academy-hero-note">
              <span className="academy-note-mark" aria-hidden="true">✓</span>
              <span>Applications are reviewed by the academy admissions team.</span>
            </div>
          </div>

          <div className="academy-hero-art" aria-label="Network, security, and cloud technology">
            <div className="academy-art-grid" />
            <div className="academy-art-center">
              <div className="academy-art-ring academy-art-ring-outer" />
              <div className="academy-art-ring academy-art-ring-inner" />
              <div className="academy-art-core">
                <svg viewBox="0 0 64 64" aria-hidden="true">
                  <path d="M32 7 11 18v15c0 12.5 8.5 22 21 25 12.5-3 21-12.5 21-25V18L32 7Z" />
                  <path d="m23 32 6 6 13-14" />
                </svg>
              </div>
              <span className="academy-art-label academy-art-label-top">Learn</span>
              <span className="academy-art-label academy-art-label-bottom">Build</span>
              <span className="academy-art-dot academy-art-dot-one" />
              <span className="academy-art-dot academy-art-dot-two" />
            </div>
            <div className="academy-float-card academy-float-card-one">
              <span className="academy-float-icon">01</span>
              <span><strong>Network engineering</strong><small>Connect what matters</small></span>
            </div>
            <div className="academy-float-card academy-float-card-two">
              <span className="academy-float-icon academy-float-icon-green">02</span>
              <span><strong>Cybersecurity</strong><small>Protect the digital world</small></span>
            </div>
            <div className="academy-float-card academy-float-card-three">
              <span className="academy-float-icon academy-float-icon-gold">03</span>
              <span><strong>Cloud computing</strong><small>Make ideas scale</small></span>
            </div>
          </div>
        </div>
        <div className="academy-hero-bottom">
          <div className="academy-container academy-hero-bottom-inner">
            <span>Explore. Learn. Grow.</span>
            <a href="#about">Discover the MITA approach <span aria-hidden="true">↓</span></a>
          </div>
        </div>
      </section>

      <section className="academy-section academy-programs" id="programs">
        <div className="academy-container">
          <div className="academy-section-heading">
            <div>
              <p className="academy-section-kicker">Find your direction</p>
              <h2>Choose where to begin.</h2>
            </div>
            <p>
              Explore our available programs and find the technology path that interests you.
            </p>
          </div>
          <ProgramCards />
        </div>
      </section>

      <section className="academy-section academy-about" id="about">
        <div className="academy-container academy-about-grid">
          <div className="academy-about-intro">
            <p className="academy-section-kicker">The MITA approach</p>
            <h2>Technology is learned by doing.</h2>
            <p>
              MITA — Menos iT Consult Academy — helps learners build a strong foundation
              in today’s technology fields through focused programs and guided learning.
            </p>
            <Link className="academy-text-link" href="/academy/register">
              Take the first step <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="academy-benefits">
            {benefits.map((benefit) => (
              <article className="academy-benefit" key={benefit.number}>
                <span>{benefit.number}</span>
                <div>
                  <h3>{benefit.title}</h3>
                  <p>{benefit.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="academy-section academy-admissions" id="admissions">
        <div className="academy-container">
          <div className="academy-admissions-heading">
            <p className="academy-section-kicker">A simple start</p>
            <h2>Your next step starts here.</h2>
            <p>Submit an application and the admissions team will guide you from there.</p>
          </div>
          <div className="academy-steps">
            {steps.map((step) => (
              <article className="academy-step" key={step.number}>
                <span className="academy-step-number">{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
          <div className="academy-admissions-cta">
            <div>
              <h3>Ready to get started?</h3>
              <p>Tell us what you want to study. We’ll take it from there.</p>
            </div>
            <Link className="academy-button academy-button-light" href="/academy/register">
              Apply to MITA <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="academy-portal-cta">
        <div className="academy-container academy-portal-cta-inner">
          <div>
            <p className="academy-section-kicker">Already a student?</p>
            <h2>Your learning, all in one place.</h2>
            <p>Sign in to see your courses, upcoming work, grades, and class schedule.</p>
          </div>
          <Link className="academy-button" href="/academy/login">
            Open student portal <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      <footer className="academy-footer">
        <div className="academy-container academy-footer-inner">
          <Link className="academy-brand academy-brand-footer" href="/academy">
            <img src="/assets/logo-black.png" alt="" />
            <span><strong>MITA</strong><small>IT Academy</small></span>
          </Link>
          <p>Building practical skills for a connected world.</p>
          <div>
            <Link href="/contact">Contact us</Link>
            <Link href="/academy/terms">Terms</Link>
            <Link href="/academy/privacy">Privacy</Link>
            <a href="tel:+233549128384">+233 54 912 8384</a>
          </div>
          <small>© {new Date().getFullYear()} Menos iT Consult. All rights reserved.</small>
        </div>
      </footer>
    </main>
  );
}
