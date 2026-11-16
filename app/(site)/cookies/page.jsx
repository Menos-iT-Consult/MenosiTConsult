import Link from 'next/link';
import Reveal from '@/app/components/Reveal';
import TocTracker from '@/app/components/TocTracker';

export const metadata = {
  title: { absolute: 'Cookie Policy — Menos iT Consult' },
  description:
    'Cookie Policy for Menos iT Consult. Find out what cookies we use and how to control them.',
};

export default function CookiesPage() {
  return (
    <>
      {/* PAGE HERO */}
      <section className="page-hero">
        <div className="container">
          <Reveal as="div" className="breadcrumb">
            <Link href="/">Home</Link> <span>/</span>
            <a href="#">Legal</a> <span>/</span>
            Cookie Policy
          </Reveal>
          <Reveal as="h1">Cookie Policy</Reveal>
          <Reveal as="p">What cookies we use, why we use them, and how you can control them.</Reveal>
        </div>
      </section>

      <div className="container">
        <div className="legal-layout">

          {/* sidebar TOC */}
          <aside className="legal-toc">
            <h4>Contents</h4>
            <ol>
              <li><a href="#c1">What Are Cookies?</a></li>
              <li><a href="#c2">Cookies We Use</a></li>
              <li><a href="#c3">Third-Party Cookies</a></li>
              <li><a href="#c4">Managing Cookies</a></li>
              <li><a href="#c5">Changes to This Policy</a></li>
              <li><a href="#c6">Contact Us</a></li>
            </ol>
            <Link className="toc-back" href="/">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
              Back to Home
            </Link>
          </aside>

          {/* prose body */}
          <article className="legal-body">

            <div className="legal-meta">
              <span className="legal-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" /><path d="M8.5 8.5v.01" /><path d="M16 15.5v.01" /><path d="M12 12v.01" /><path d="M11 17v.01" /><path d="M7 14v.01" /></svg>
                Cookie Policy
              </span>
              <span className="legal-date">Last updated: June 2025</span>
            </div>

            <div className="legal-callout">
              <span className="lc-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg></span>
              <p>This Cookie Policy explains how <strong>Menos iT Consult</strong> uses cookies and similar technologies on our website. We keep cookie use to a minimum — we do <strong>not</strong> use advertising or cross-site tracking cookies.</p>
            </div>

            <div className="legal-section" id="c1">
              <h2><span className="ls-num">01</span> What Are Cookies?</h2>
              <p>Cookies are small text files that are placed on your device (computer, tablet, or phone) when you visit a website. They are widely used to make websites work correctly, remember your preferences, and provide anonymised information to site owners about how visitors use the site.</p>
              <p>Cookies set by the website you are visiting are called <strong>first-party cookies</strong>. Cookies set by third-party services (such as embedded maps or fonts) are called <strong>third-party cookies</strong>.</p>
              <p>Cookies can be:</p>
              <ul>
                <li><strong>Session cookies</strong> — temporary files that are deleted when you close your browser.</li>
                <li><strong>Persistent cookies</strong> — files that remain on your device for a set period or until you delete them.</li>
              </ul>
            </div>

            <div className="legal-section" id="c2">
              <h2><span className="ls-num">02</span> Cookies We Use</h2>
              <p>The table below describes the cookies set directly by the Menos iT Consult website.</p>

              <div className="legal-table-wrap">
                <table className="legal-table">
                  <thead>
                    <tr>
                      <th>Cookie name</th>
                      <th>Type</th>
                      <th>Duration</th>
                      <th>Purpose</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><code>mit_session</code></td>
                      <td>Strictly necessary</td>
                      <td>Session</td>
                      <td>Maintains basic site functionality and form security during your visit. Deleted when you close your browser.</td>
                    </tr>
                    <tr>
                      <td><code>mit_prefs</code></td>
                      <td>Functional</td>
                      <td>1 year</td>
                      <td>Remembers any display preferences you set (e.g. reduced motion). Not used for tracking.</td>
                    </tr>
                    <tr>
                      <td><code>mit_analytics</code></td>
                      <td>Analytics</td>
                      <td>26 months</td>
                      <td>Anonymised page-view data used to understand which content is most useful. No personally identifiable information is stored.</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p>We do <strong>not</strong> use cookies for:</p>
              <ul>
                <li>Targeted or retargeting advertising</li>
                <li>Cross-site tracking or behavioural profiling</li>
                <li>Selling data to third parties</li>
              </ul>
            </div>

            <div className="legal-section" id="c3">
              <h2><span className="ls-num">03</span> Third-Party Cookies</h2>
              <p>Some features of our website involve third-party content that may set their own cookies. We have limited control over these cookies. They include:</p>

              <div className="legal-table-wrap">
                <table className="legal-table">
                  <thead>
                    <tr>
                      <th>Third party</th>
                      <th>Purpose</th>
                      <th>Their privacy policy</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Google Fonts</td>
                      <td>Loads the Inter typeface used across the site. Google may log the request.</td>
                      <td><a href="https://policies.google.com/privacy" target="_blank" rel="noopener">policies.google.com/privacy</a></td>
                    </tr>
                    <tr>
                      <td>Google Maps</td>
                      <td>Embedded map on the Contact page showing our location in Agona.</td>
                      <td><a href="https://policies.google.com/privacy" target="_blank" rel="noopener">policies.google.com/privacy</a></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="legal-callout warn">
                <span className="lc-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg></span>
                <p>The Google Maps embed only loads when you visit the <Link href="/contact">Contact page</Link>. If you prefer not to load third-party content, you can browse to our address directly in Google Maps without visiting that page.</p>
              </div>
            </div>

            <div className="legal-section" id="c4">
              <h2><span className="ls-num">04</span> Managing Cookies</h2>
              <p>You have full control over cookies through your browser settings. You can choose to block or delete all cookies, or configure your browser to alert you before accepting a cookie. Please note that blocking strictly necessary cookies will prevent parts of the website from working correctly.</p>
              <p>How to manage cookies in common browsers:</p>
              <ul>
                <li><strong>Google Chrome:</strong> Settings → Privacy and security → Cookies and other site data</li>
                <li><strong>Mozilla Firefox:</strong> Settings → Privacy &amp; Security → Cookies and Site Data</li>
                <li><strong>Microsoft Edge:</strong> Settings → Cookies and site permissions → Manage and delete cookies</li>
                <li><strong>Safari:</strong> Preferences → Privacy → Manage Website Data</li>
              </ul>
              <p>For more information about cookies and how to manage them, visit <a href="https://www.allaboutcookies.org" target="_blank" rel="noopener">allaboutcookies.org</a>.</p>
            </div>

            <div className="legal-section" id="c5">
              <h2><span className="ls-num">05</span> Changes to This Policy</h2>
              <p>We may update this Cookie Policy from time to time — for example, if we add or remove cookies. Any changes will be reflected on this page with an updated &quot;Last updated&quot; date.</p>
              <p>We encourage you to review this page periodically to stay informed about how we use cookies.</p>
            </div>

            <div className="legal-section" id="c6">
              <h2><span className="ls-num">06</span> Contact Us</h2>
              <p>If you have any questions about our use of cookies, please contact us:</p>
              <ul>
                <li><strong>Email:</strong> <a href="mailto:menositsolutions@gmail.com">menositsolutions@gmail.com</a></li>
                <li><strong>Location:</strong> Agona, Western Region, Ghana</li>
                <li><strong>Business hours:</strong> Monday – Friday, 9am – 5pm GMT</li>
              </ul>
              <p>For broader questions about how we handle your personal data, please read our <Link href="/privacy">Privacy Policy</Link>.</p>
            </div>

            <div className="legal-contact-card">
              <div className="lcc-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" /><path d="M8.5 8.5v.01" /><path d="M16 15.5v.01" /><path d="M12 12v.01" /></svg>
              </div>
              <div className="lcc-text">
                <h4>Questions about cookies?</h4>
                <p>Reach out and we&apos;ll explain exactly what we use and why.</p>
              </div>
              <a href="mailto:minnahmat50@gmail.com" className="lcc-btn">
                Email us
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
              </a>
            </div>

          </article>
        </div>
      </div>

      <TocTracker />
    </>
  );
}
