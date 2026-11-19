import Link from 'next/link';

export const metadata = {
  title: 'MITA Academy Terms and Conditions',
  description: 'Terms and conditions for applying to and using the MITA IT Academy.',
};

export default function AcademyTermsPage() {
  return (
    <main className="academy-application academy-policy">
      <header className="academy-application-header">
        <div className="academy-container academy-application-header-inner">
          <Link className="academy-brand" href="/academy">
            <img src="/assets/academy-logo-white.png" alt="MITA IT Academy" />
            <span><strong>MITA</strong><small>IT Academy</small></span>
          </Link>
          <Link href="/academy/register" className="academy-back-link">Back to application</Link>
        </div>
      </header>

      <div className="academy-container academy-policy-layout">
        <article className="academy-application-card academy-policy-card">
          <p className="academy-section-kicker">MITA IT Academy</p>
          <h1>Terms and Conditions</h1>
          <p className="academy-policy-updated">Last updated: November 18, 2026</p>
          <p>
            These terms apply to applications for and use of the MITA IT Academy
            (the “Academy”), operated by Menos iT Consult in Ghana. By submitting
            an application or using the student portal, you agree to these terms
            and our <Link href="/academy/privacy">Privacy Policy</Link>.
          </p>

          <section>
            <h2>1. Applications and admission</h2>
            <p>
              You must provide accurate, complete, and current information. The
              Academy may contact you to verify your application or request
              additional information. Submitting an application does not guarantee
              admission. Admission is confirmed only when the Academy approves
              your application and issues your student account.
            </p>
            <p>
              If your information changes or you discover an error, contact the
              Academy so your application or student record can be corrected.
              Materially false or misleading information may result in an
              application being declined or an account being reviewed.
            </p>
          </section>

          <section>
            <h2>2. Student accounts</h2>
            <p>
              Approved students receive login credentials through the contact
              details supplied in their application. Keep credentials
              confidential, do not share access, and notify the Academy promptly
              if you believe an account has been accessed without permission.
              Change any temporary password when prompted and keep your contact
              information current.
            </p>
          </section>

          <section>
            <h2>3. Learning conduct and acceptable use</h2>
            <p>
              Students are expected to participate respectfully, follow
              instructor directions, submit their own work, and comply with
              course-specific assessment rules. Do not use Academy systems to
              disrupt services, access another person&apos;s account or data, or
              engage in unlawful, harassing, deceptive, or unsafe activity.
            </p>
            <p>
              The Academy may investigate reported conduct and may restrict or
              suspend portal access where reasonably necessary to protect
              students, staff, systems, or the integrity of learning and
              assessment. Where appropriate, the student will be given an
              opportunity to respond.
            </p>
          </section>

          <section>
            <h2>4. Course materials and intellectual property</h2>
            <p>
              Course materials, lessons, assignments, and other Academy content
              are provided for your personal learning unless a separate written
              permission says otherwise. Do not publish, sell, distribute, or
              modify protected materials without permission. You retain rights
              to work you create, subject to any course assessment rules and
              applicable law.
            </p>
          </section>

          <section>
            <h2>5. Fees and course information</h2>
            <p>
              Any applicable fees, payment arrangements, course dates, and
              cancellation or refund conditions will be communicated separately
              by the Academy. Those written notices form part of the relevant
              course arrangement. Do not rely on an application submission as a
              confirmation of a place, fee, or course schedule.
            </p>
          </section>

          <section>
            <h2>6. Communications and service availability</h2>
            <p>
              The Academy may use the email address and phone number you provide
              for application, admission, account, and course-related
              communications, including SMS. Your mobile carrier may charge for
              messages. Online services may occasionally be unavailable for
              maintenance or reasons outside the Academy&apos;s control.
            </p>
          </section>

          <section>
            <h2>7. Changes and governing law</h2>
            <p>
              The Academy may update these terms when its services or legal
              obligations change. The updated version will be posted here with a
              revised date. These terms are governed by the laws of the Republic
              of Ghana, subject to any rights that cannot be limited by law.
            </p>
          </section>

          <section>
            <h2>8. Contact</h2>
            <p>
              Questions about these terms can be sent to{' '}
              <a href="mailto:academy@menositconsult.com">academy@menositconsult.com</a>.
            </p>
          </section>

          <p className="academy-policy-footer">
            Read the <Link href="/academy/privacy">MITA Academy Privacy Policy</Link> or
            return to the <Link href="/academy/register">application form</Link>.
          </p>
        </article>
      </div>
    </main>
  );
}
