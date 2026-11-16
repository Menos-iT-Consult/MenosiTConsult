import Link from 'next/link';
import Reveal from '@/app/components/Reveal';
import TocTracker from '@/app/components/TocTracker';

export const metadata = {
  title: { absolute: 'Privacy Policy — Menos iT Consult' },
  description:
    'Privacy Policy for Menos iT Consult. Learn how we collect, use, and protect your personal information.',
};

export default function PrivacyPage() {
  return (
    <>
      {/* PAGE HERO */}
      <section className="page-hero">
        <div className="container">
          <Reveal as="div" className="breadcrumb">
            <Link href="/">Home</Link> <span>/</span>
            <a href="#">Legal</a> <span>/</span>
            Privacy Policy
          </Reveal>
          <Reveal as="h1">Privacy Policy</Reveal>
          <Reveal as="p">How we collect, use, and protect your personal information.</Reveal>
        </div>
      </section>

      <div className="container">
        <div className="legal-layout">

          {/* sidebar TOC */}
          <aside className="legal-toc">
            <h4>Contents</h4>
            <ol>
              <li><a href="#s1">Information We Collect</a></li>
              <li><a href="#s2">How We Use Your Information</a></li>
              <li><a href="#s3">Sharing Your Information</a></li>
              <li><a href="#s4">Data Retention</a></li>
              <li><a href="#s5">Cookies &amp; Tracking</a></li>
              <li><a href="#s6">Your Rights</a></li>
              <li><a href="#s7">Data Security</a></li>
              <li><a href="#s8">Children&apos;s Privacy</a></li>
              <li><a href="#s9">Changes to This Policy</a></li>
              <li><a href="#s10">Contact Us</a></li>
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
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                Privacy Policy
              </span>
              <span className="legal-date">Last updated: June 2025</span>
            </div>

            <div className="legal-callout">
              <span className="lc-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg></span>
              <p>This policy applies to <strong>Menos iT Consult</strong>, based in Agona, Western Region, Ghana. We are committed to protecting your privacy and handling your data in a transparent and lawful manner.</p>
            </div>

            <div className="legal-section" id="s1">
              <h2><span className="ls-num">01</span> Information We Collect</h2>
              <p>We collect information you provide directly to us, information gathered automatically when you use our website, and information from third-party sources where applicable.</p>
              <p><strong>Information you give us:</strong></p>
              <ul>
                <li>Name and contact details (email address, phone number)</li>
                <li>Business name and your role within that business</li>
                <li>Details of the service you are enquiring about</li>
                <li>Any messages, attachments, or other content you send us via our contact form</li>
                <li>Your email address if you subscribe to our newsletter</li>
              </ul>
              <p><strong>Information collected automatically:</strong></p>
              <ul>
                <li>Browser type, operating system, and device type</li>
                <li>Pages visited, time spent on each page, and referring URL</li>
                <li>IP address (anonymised where technically possible)</li>
                <li>Cookie identifiers (see Section 5)</li>
              </ul>
            </div>

            <div className="legal-section" id="s2">
              <h2><span className="ls-num">02</span> How We Use Your Information</h2>
              <p>We use the information we collect for the following purposes:</p>
              <ul>
                <li>To respond to your enquiries and provide the IT services you request</li>
                <li>To send you service-related communications, quotes, and updates on your project</li>
                <li>To send you our newsletter (only if you have opted in — you may unsubscribe at any time)</li>
                <li>To improve our website, content, and service offerings based on how visitors use the site</li>
                <li>To comply with our legal and regulatory obligations</li>
                <li>To protect the rights and safety of Menos iT Consult and our clients</li>
              </ul>
              <p>We will never use your information for automated decision-making that produces legal or significant effects on you without your explicit consent.</p>
            </div>

            <div className="legal-section" id="s3">
              <h2><span className="ls-num">03</span> Sharing Your Information</h2>
              <p>We do not sell, rent, or trade your personal data. We may share your information only in the following limited circumstances:</p>
              <ul>
                <li><strong>Service providers:</strong> Trusted third-party tools we use to operate our business (e.g. email service providers, cloud storage). These providers are bound by confidentiality obligations and may not use your data for their own purposes.</li>
                <li><strong>Legal requirements:</strong> If required to do so by law, a court order, or governmental authority in Ghana or another applicable jurisdiction.</li>
                <li><strong>Business transfers:</strong> In the unlikely event that Menos iT Consult is acquired or merged, your data may be transferred to the new owner under the same privacy protections described in this policy.</li>
              </ul>
              <div className="legal-callout warn">
                <span className="lc-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg></span>
                <p>We never sell your personal data to advertisers or data brokers. Your information is used solely to provide and improve our services.</p>
              </div>
            </div>

            <div className="legal-section" id="s4">
              <h2><span className="ls-num">04</span> Data Retention</h2>
              <p>We retain your personal data only for as long as necessary to fulfil the purposes for which it was collected:</p>
              <ul>
                <li><strong>Enquiry and project data:</strong> Retained for up to 5 years after the end of a client relationship, to comply with legal and accounting obligations.</li>
                <li><strong>Newsletter subscribers:</strong> Retained until you unsubscribe.</li>
                <li><strong>Website analytics data:</strong> Anonymised or deleted after 26 months.</li>
                <li><strong>Inactive enquiries:</strong> Data from contacts who did not proceed to become clients is deleted within 12 months.</li>
              </ul>
              <p>At the end of any retention period, data is securely deleted or anonymised so it can no longer be linked to you.</p>
            </div>

            <div className="legal-section" id="s5">
              <h2><span className="ls-num">05</span> Cookies &amp; Tracking</h2>
              <p>Our website uses cookies — small text files stored on your device — to make the site function correctly and to help us understand how visitors use it. For full details on the cookies we use, see our <Link href="/cookies">Cookie Policy</Link>.</p>
              <p>In summary:</p>
              <ul>
                <li><strong>Strictly necessary cookies</strong> are always active as they are essential for the website to work.</li>
                <li><strong>Analytics cookies</strong> help us understand traffic patterns — we use only privacy-respecting, anonymised analytics.</li>
                <li>We do not use advertising or cross-site tracking cookies.</li>
              </ul>
            </div>

            <div className="legal-section" id="s6">
              <h2><span className="ls-num">06</span> Your Rights</h2>
              <p>Depending on your location, you may have the following rights regarding your personal data:</p>
              <ul>
                <li><strong>Access:</strong> Request a copy of the personal data we hold about you.</li>
                <li><strong>Correction:</strong> Ask us to correct inaccurate or incomplete data.</li>
                <li><strong>Deletion:</strong> Request that we erase your personal data, subject to legal retention requirements.</li>
                <li><strong>Restriction:</strong> Ask us to restrict how we process your data in certain circumstances.</li>
                <li><strong>Objection:</strong> Object to our processing of your data where we rely on legitimate interests as our legal basis.</li>
                <li><strong>Portability:</strong> Receive your data in a structured, machine-readable format.</li>
                <li><strong>Withdraw consent:</strong> Where processing is based on consent (e.g. newsletter), you may withdraw it at any time without affecting the lawfulness of prior processing.</li>
              </ul>
              <p>To exercise any of these rights, email us at <a href="mailto:minnahmat50@gmail.com">minnahmat50@gmail.com</a>. We will respond within 30 days.</p>
            </div>

            <div className="legal-section" id="s7">
              <h2><span className="ls-num">07</span> Data Security</h2>
              <p>We take the security of your personal data seriously and implement appropriate technical and organisational measures to protect it against unauthorised access, loss, or disclosure. These measures include:</p>
              <ul>
                <li>Encrypted transmission of data using HTTPS/TLS</li>
                <li>Restricted access to personal data on a need-to-know basis</li>
                <li>Regular review of our security practices</li>
                <li>Use of reputable, security-audited service providers</li>
              </ul>
              <p>While we take all reasonable precautions, no method of transmission over the internet is 100% secure. If you become aware of any security issue related to your data, please contact us immediately.</p>
            </div>

            <div className="legal-section" id="s8">
              <h2><span className="ls-num">08</span> Children&apos;s Privacy</h2>
              <p>Our website and services are directed at businesses and individuals aged 18 and over. We do not knowingly collect personal data from children under the age of 18. If you believe we have inadvertently collected such data, please contact us and we will delete it promptly.</p>
            </div>

            <div className="legal-section" id="s9">
              <h2><span className="ls-num">09</span> Changes to This Policy</h2>
              <p>We may update this Privacy Policy from time to time to reflect changes in our practices or applicable law. When we do, we will update the &quot;Last updated&quot; date at the top of this page. For significant changes, we will notify active clients by email.</p>
              <p>We encourage you to review this page periodically to stay informed about how we protect your information.</p>
            </div>

            <div className="legal-section" id="s10">
              <h2><span className="ls-num">10</span> Contact Us</h2>
              <p>If you have any questions about this Privacy Policy, wish to exercise your rights, or want to make a complaint, please reach out:</p>
              <ul>
                <li><strong>Email:</strong> <a href="mailto:minnahmat50@gmail.com">minnahmat50@gmail.com</a></li>
                <li><strong>Location:</strong> Agona, Western Region, Ghana</li>
                <li><strong>Business hours:</strong> Monday – Friday, 9am – 5pm GMT</li>
              </ul>
            </div>

            <div className="legal-contact-card">
              <div className="lcc-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
              </div>
              <div className="lcc-text">
                <h4>Have a question about your data?</h4>
                <p>We&apos;re here to help — email us and we&apos;ll respond within one business day.</p>
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
