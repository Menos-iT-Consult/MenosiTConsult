import Link from 'next/link';

export const metadata = {
  title: 'MITA Academy Privacy Policy',
  description: 'How MITA Academy collects and uses applicant and student information.',
};

export default function AcademyPrivacyPage() {
  return (
    <main className="academy-application academy-policy">
      <header className="academy-application-header">
        <div className="academy-container academy-application-header-inner">
          <Link className="academy-brand" href="/academy">
            <img src="/assets/logo-black.png" alt="" />
            <span><strong>MITA</strong><small>IT Academy</small></span>
          </Link>
          <Link href="/academy/register" className="academy-back-link">Back to application</Link>
        </div>
      </header>

      <div className="academy-container academy-policy-layout">
        <article className="academy-application-card academy-policy-card">
          <p className="academy-section-kicker">MITA IT Academy</p>
          <h1>Privacy Policy</h1>
          <p className="academy-policy-updated">Last updated: November 18, 2026</p>
          <p>
            This policy explains how MITA IT Academy, operated by Menos iT
            Consult in Ghana, handles information submitted through the Academy
            application and student portal. It should be read with the{' '}
            <Link href="/academy/terms">Academy Terms and Conditions</Link>.
          </p>

          <section>
            <h2>1. Information we collect</h2>
            <p>
              Application information may include your name, date of birth,
              country, gender, email, phone number, residential address, optional
              emergency contact details, education history, selected program,
              your statement about why you want to study, and a required passport
              photo. The photo is used to prepare and display your Academy student
              identification card. If admitted, we
              also create student account details and maintain learning records
              such as course participation, attendance, assignments, and grades.
            </p>
            <p>
              If you provide another person&apos;s details as an emergency contact,
              please make sure they know you have shared those details with the
              Academy.
            </p>
          </section>

          <section>
            <h2>2. How we use information</h2>
            <ul>
              <li>To review, verify, and respond to your application.</li>
              <li>To make admission decisions and create student accounts.</li>
              <li>To provide instruction, manage courses, and maintain academic records.</li>
              <li>To contact you about admissions, account access, and Academy activities.</li>
              <li>To protect the Academy, students, staff, and learning systems and to meet legal obligations.</li>
            </ul>
            <p>
              Admission and account messages may be sent by email or SMS. We do
              not use application consent as consent to unrelated marketing.
            </p>
          </section>

          <section>
            <h2>3. When information is shared</h2>
            <p>
              Access is limited to Academy administrators and staff who need the
              information to review applications or provide Academy services.
              Passport photos are stored in private file storage and served only
              to the signed-in student and authorised Academy administrators.
              We use service providers for infrastructure and communications;
              for example, mNotify processes phone numbers and message content
              when an admission SMS is sent. Providers receive only information
              needed for their service and may process it in locations outside
              your country.
            </p>
            <p>
              We do not sell applicant or student personal information. We may
              disclose information where required by law or where reasonably
              necessary to protect people, rights, or Academy systems.
            </p>
          </section>

          <section>
            <h2>4. Retention</h2>
            <p>
              We keep application and student records for as long as needed to
              review applications, provide Academy services, maintain academic
              and administrative records, resolve disputes, and meet legal
              obligations. When information is no longer needed, we will take
              reasonable steps to delete or de-identify it, subject to required
              recordkeeping.
            </p>
          </section>

          <section>
            <h2>5. Security</h2>
            <p>
              We use access controls and other reasonable technical and
              organisational safeguards to protect information. No online
              service can guarantee absolute security. Please protect your
              account credentials and contact us promptly if you suspect
              unauthorised access.
            </p>
          </section>

          <section>
            <h2>6. Your choices and rights</h2>
            <p>
              You may contact us to request access to or correction of your
              information, ask a question about its use, or withdraw consent
              where processing is based on consent. Some records may need to be
              retained to complete an application, provide education, or meet
              legal obligations. We will handle requests in accordance with
              applicable law.
            </p>
          </section>

          <section>
            <h2>7. Changes and contact</h2>
            <p>
              We may update this policy as Academy services or legal
              requirements change. The current version and its update date will
              be posted on this page. For privacy requests or questions, email{' '}
              <a href="mailto:academy@menositconsult.com">academy@menositconsult.com</a>.
            </p>
          </section>

          <p className="academy-policy-footer">
            Read the <Link href="/academy/terms">MITA Academy Terms and Conditions</Link> or
            return to the <Link href="/academy/register">application form</Link>.
          </p>
        </article>
      </div>
    </main>
  );
}
