import Link from 'next/link';

export const metadata = {
  title: { absolute: 'Page Not Found — Menos iT Consult' },
  robots: { index: false },
};

export default function NotFound() {
  return (
    <>
      {/* Page-specific styles ported verbatim from 404.html's inline <style> block
          (the .err-* rules are not part of the global stylesheets). */}
      <style>{`
        .err-wrap {
          min-height: 100vh; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          text-align: center; padding: clamp(40px, 8vw, 80px) var(--pad);
          background: linear-gradient(160deg, #f0f7ff 0%, #fff 60%);
        }
        .err-code {
          font-size: clamp(6rem, 20vw, 12rem); font-weight: 900;
          line-height: 1; letter-spacing: -.06em; color: var(--blue);
          opacity: .12; position: absolute; user-select: none;
          pointer-events: none;
        }
        .err-icon {
          width: 80px; height: 80px; border-radius: 20px; margin: 0 auto 28px;
          background: linear-gradient(135deg, var(--blue), var(--blue-l));
          display: grid; place-items: center; position: relative; z-index: 1;
          box-shadow: 0 12px 32px rgba(0,119,182,.3);
        }
        .err-icon svg   { width: 38px; height: 38px; color: #fff; }
        .err-wrap h1    { font-size: clamp(1.8rem, 4vw, 2.8rem); font-weight: 800; color: var(--dark); margin-bottom: 14px; position: relative; }
        .err-wrap p     { font-size: 1rem; color: var(--muted); max-width: 44ch; margin: 0 auto 36px; line-height: 1.7; }
        .err-links      { display: flex; gap: 14px; flex-wrap: wrap; justify-content: center; margin-bottom: 56px; }
        .err-suggestions { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; max-width: 680px; margin: 0 auto; }
        .err-card {
          background: #fff; border: 1px solid var(--border); border-radius: 14px;
          padding: 20px; text-align: left; transition: transform .3s, box-shadow .3s, border-color .3s;
        }
        .err-card:hover { transform: translateY(-4px); box-shadow: 0 10px 28px rgba(0,119,182,.1); border-color: var(--blue-mid); }
        .err-card svg   { width: 22px; height: 22px; color: var(--blue); margin-bottom: 10px; display: block; }
        .err-card strong { font-size: .88rem; color: var(--dark); display: block; margin-bottom: 4px; }
        .err-card span  { font-size: .78rem; color: var(--muted); }
        @media (max-width: 600px) { .err-suggestions { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 400px) { .err-suggestions { grid-template-columns: 1fr; } }
      `}</style>

      <div className="err-wrap">
        <div className="err-code" aria-hidden="true">404</div>
        <div className="err-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" /></svg>
        </div>
        <h1>Page not found</h1>
        <p>The page you&apos;re looking for doesn&apos;t exist or may have moved. Here are a few places to head next.</p>
        <div className="err-links">
          <Link href="/" className="btn btn-primary">Go home</Link>
          <Link href="/contact" className="btn btn-ghost">Contact us</Link>
        </div>
        <div className="err-suggestions">
          <Link href="/services" className="err-card">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" /></svg>
            <strong>Services</strong>
            <span>What we offer</span>
          </Link>
          <Link href="/portfolio" className="err-card">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /></svg>
            <strong>Portfolio</strong>
            <span>Our past projects</span>
          </Link>
          <Link href="/about" className="err-card">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
            <strong>About us</strong>
            <span>Our story and team</span>
          </Link>
        </div>
      </div>
    </>
  );
}
