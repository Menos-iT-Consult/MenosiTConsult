import Link from 'next/link';
import AcademyPortalLink from '../AcademyPortalLink';
import AcademyContactForm from './AcademyContactForm';
import AcademyFooter from '../AcademyFooter';

export const metadata = {
  title: 'Contact MITA IT Academy',
  description: 'Contact the MITA IT Academy admissions and support team.',
};

export default function AcademyContactPage() {
  return (
    <main className="academy-welcome academy-contact-page">
      <header className="academy-header">
        <div className="academy-container academy-header-inner">
          <Link className="academy-brand" href="/academy" aria-label="MITA Academy home">
            <img src="/assets/academy-logo-white.png" alt="" />
          </Link>
          <nav className="academy-main-nav" aria-label="Main navigation">
            <Link href="/academy#programs">Programs</Link>
            <Link href="/academy#about">About MITA</Link>
            <Link href="/academy#admissions">Admissions</Link>
          </nav>
          <div className="academy-header-actions">
            <AcademyPortalLink className="academy-login-link" />
            <Link className="academy-button academy-button-small" href="/academy/register">Apply now</Link>
          </div>
        </div>
      </header>

      <section className="academy-contact-hero">
        <div className="academy-container">
          <p className="academy-section-kicker">We&apos;re here to help</p>
          <h1>Contact the Academy</h1>
          <p>Ask us about admissions, programs, or your student account. Our team will get back to you.</p>
        </div>
      </section>

      <AcademyContactForm />
      <AcademyFooter />
    </main>
  );
}
