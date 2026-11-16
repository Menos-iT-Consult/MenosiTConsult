import Link from 'next/link';
import Reveal from '@/app/components/Reveal';
import TocTracker from '@/app/components/TocTracker';

export const metadata = {
  title: { absolute: 'Terms of Service — Menos iT Consult' },
  description:
    'Terms of Service for Menos iT Consult. Read the terms that govern your use of our website and IT services.',
};

export default function TermsPage() {
  return (
    <>
      {/* PAGE HERO */}
      <section className="page-hero">
        <div className="container">
          <Reveal as="div" className="breadcrumb">
            <Link href="/">Home</Link> <span>/</span>
            <a href="#">Legal</a> <span>/</span>
            Terms of Service
          </Reveal>
          <Reveal as="h1">Terms of Service</Reveal>
          <Reveal as="p">Please read these terms carefully before using our website or engaging our services.</Reveal>
        </div>
      </section>

      <div className="container">
        <div className="legal-layout">

          {/* sidebar TOC */}
          <aside className="legal-toc">
            <h4>Contents</h4>
            <ol>
              <li><a href="#t1">Acceptance of Terms</a></li>
              <li><a href="#t2">Our Services</a></li>
              <li><a href="#t3">Engagements &amp; Quotes</a></li>
              <li><a href="#t4">Payment Terms</a></li>
              <li><a href="#t5">Client Responsibilities</a></li>
              <li><a href="#t6">Intellectual Property</a></li>
              <li><a href="#t7">Confidentiality</a></li>
              <li><a href="#t8">Limitation of Liability</a></li>
              <li><a href="#t9">Termination</a></li>
              <li><a href="#t10">Governing Law</a></li>
              <li><a href="#t11">Changes to Terms</a></li>
              <li><a href="#t12">Contact</a></li>
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
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                Terms of Service
              </span>
              <span className="legal-date">Last updated: June 2025</span>
            </div>

            <div className="legal-callout">
              <span className="lc-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg></span>
              <p>These Terms of Service govern your use of the Menos iT Consult website and any services provided by <strong>Menos iT Consult</strong>, Agona, Western Region, Ghana. By using our website or engaging our services, you agree to these terms.</p>
            </div>

            <div className="legal-section" id="t1">
              <h2><span className="ls-num">01</span> Acceptance of Terms</h2>
              <p>By accessing our website at any URL operated by Menos iT Consult, or by entering into a service engagement with us, you agree to be bound by these Terms of Service and our <Link href="/privacy">Privacy Policy</Link>.</p>
              <p>If you are using our services on behalf of a business, you represent that you have the authority to bind that business to these terms.</p>
              <p>If you do not agree to these terms, please do not use our website or services.</p>
            </div>

            <div className="legal-section" id="t2">
              <h2><span className="ls-num">02</span> Our Services</h2>
              <p>Menos iT Consult provides a range of IT services to businesses, including but not limited to:</p>
              <ul>
                <li>Network design, installation, and management</li>
                <li>Cybersecurity assessments and implementation</li>
                <li>Cloud infrastructure and migration</li>
                <li>IT strategy consulting</li>
                <li>Ongoing IT support and maintenance</li>
                <li>Data management and backup solutions</li>
              </ul>
              <p>The specific scope, deliverables, timeline, and pricing for any engagement are set out in a written quote or service agreement provided to you before work commences.</p>
            </div>

            <div className="legal-section" id="t3">
              <h2><span className="ls-num">03</span> Engagements &amp; Quotes</h2>
              <p>All service engagements begin with a written quote from Menos iT Consult. A quote is valid for 30 days from the date of issue unless otherwise stated.</p>
              <p>An engagement is confirmed only when:</p>
              <ol>
                <li>You have accepted the quote in writing (including by email), and</li>
                <li>Any required deposit or initial payment has been received.</li>
              </ol>
              <p>Any changes to agreed scope must be documented in writing and may result in revised pricing and timelines. We will always obtain your approval before proceeding with work outside the agreed scope.</p>
            </div>

            <div className="legal-section" id="t4">
              <h2><span className="ls-num">04</span> Payment Terms</h2>
              <p>Payment terms are specified in each quote or service agreement. Unless otherwise agreed:</p>
              <ul>
                <li>Project work is invoiced 50% upfront and 50% on completion.</li>
                <li>Monthly retainer services are invoiced at the start of each billing period.</li>
                <li>Invoices are due within <strong>14 days</strong> of the invoice date.</li>
                <li>Late payments may incur interest at 2% per month on the outstanding balance.</li>
              </ul>
              <div className="legal-callout warn">
                <span className="lc-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg></span>
                <p>Menos iT Consult reserves the right to pause or suspend work on any engagement where payment is overdue by more than 14 days, without liability for delays caused as a result.</p>
              </div>
            </div>

            <div className="legal-section" id="t5">
              <h2><span className="ls-num">05</span> Client Responsibilities</h2>
              <p>To enable us to deliver our services effectively, you agree to:</p>
              <ul>
                <li>Provide accurate, complete, and timely information and access required for the engagement</li>
                <li>Ensure that any third-party systems, software, or licences you provide to us are legally obtained</li>
                <li>Designate a point of contact who has authority to make decisions about the project</li>
                <li>Review and provide feedback on deliverables within agreed timescales</li>
                <li>Ensure appropriate data backups are in place before we perform any infrastructure work</li>
              </ul>
              <p>Delays caused by failure to meet these responsibilities may affect project timelines and are not the liability of Menos iT Consult.</p>
            </div>

            <div className="legal-section" id="t6">
              <h2><span className="ls-num">06</span> Intellectual Property</h2>
              <p>Unless otherwise agreed in writing:</p>
              <ul>
                <li>All pre-existing intellectual property belonging to Menos iT Consult (methodologies, templates, tools) remains our property.</li>
                <li>Upon full payment, you own the deliverables specifically created for your project (e.g. network designs, configuration documents, custom scripts).</li>
                <li>We retain the right to list your business name and a general description of the project in our portfolio, unless you request otherwise in writing.</li>
              </ul>
              <p>You grant us a limited licence to use your systems, data, and materials solely to deliver the agreed services.</p>
            </div>

            <div className="legal-section" id="t7">
              <h2><span className="ls-num">07</span> Confidentiality</h2>
              <p>We understand that you may share sensitive business information with us in the course of an engagement. We treat all client information as confidential and will not disclose it to third parties except as required to deliver the service or as required by law.</p>
              <p>Where required, we are happy to sign a mutual Non-Disclosure Agreement (NDA) before an engagement begins. Please raise this with us during the initial consultation.</p>
            </div>

            <div className="legal-section" id="t8">
              <h2><span className="ls-num">08</span> Limitation of Liability</h2>
              <p>To the maximum extent permitted by applicable law:</p>
              <ul>
                <li>Menos iT Consult&apos;s total liability to you in connection with any engagement shall not exceed the total fees paid by you for that engagement in the 12 months preceding the claim.</li>
                <li>We shall not be liable for any indirect, consequential, incidental, or special losses (including loss of profit, revenue, data, or business opportunity), even if we have been advised of the possibility of such losses.</li>
                <li>We are not responsible for failures caused by third-party providers, force majeure events, or your failure to meet the client responsibilities set out in Section 5.</li>
              </ul>
              <p>Nothing in these terms excludes or limits liability for death or personal injury caused by negligence, fraud, or any other matter that cannot be excluded by law.</p>
            </div>

            <div className="legal-section" id="t9">
              <h2><span className="ls-num">09</span> Termination</h2>
              <p>Either party may terminate a service engagement by giving 30 days&apos; written notice to the other, unless the engagement agreement specifies a different notice period.</p>
              <p>We may terminate immediately (with written notice) if you:</p>
              <ul>
                <li>Fail to pay any invoice within 30 days of the due date</li>
                <li>Breach these Terms of Service in a material way and fail to remedy that breach within 14 days of being notified</li>
                <li>Become insolvent, enter administration, or are subject to winding-up proceedings</li>
              </ul>
              <p>On termination, you must pay for all work completed up to the date of termination. Any deposits paid for work not yet commenced are non-refundable unless otherwise agreed.</p>
            </div>

            <div className="legal-section" id="t10">
              <h2><span className="ls-num">10</span> Governing Law</h2>
              <p>These Terms of Service are governed by the laws of the Republic of Ghana. Any disputes arising under these terms shall be subject to the exclusive jurisdiction of the courts of Ghana.</p>
              <p>We will always attempt to resolve disputes informally and in good faith before any formal proceedings. If you have a concern, please contact us first.</p>
            </div>

            <div className="legal-section" id="t11">
              <h2><span className="ls-num">11</span> Changes to These Terms</h2>
              <p>We may update these Terms of Service from time to time. Changes will be posted on this page with an updated &quot;Last updated&quot; date. Continued use of our website or services after changes are posted constitutes acceptance of the revised terms.</p>
              <p>We will notify existing clients of material changes by email with at least 30 days&apos; notice before they take effect.</p>
            </div>

            <div className="legal-section" id="t12">
              <h2><span className="ls-num">12</span> Contact</h2>
              <p>If you have any questions about these terms, please contact us:</p>
              <ul>
                <li><strong>Email:</strong> <a href="mailto:minnahmat50@gmail.com">minnahmat50@gmail.com</a></li>
                <li><strong>Location:</strong> Agona, Western Region, Ghana</li>
                <li><strong>Business hours:</strong> Monday – Friday, 9am – 5pm GMT</li>
              </ul>
            </div>

            <div className="legal-contact-card">
              <div className="lcc-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
              </div>
              <div className="lcc-text">
                <h4>Questions about these terms?</h4>
                <p>We&apos;re happy to explain anything — get in touch and we&apos;ll respond within one business day.</p>
              </div>
              <Link href="/contact" className="lcc-btn">
                Contact us
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
              </Link>
            </div>

          </article>
        </div>
      </div>

      <TocTracker />
    </>
  );
}
