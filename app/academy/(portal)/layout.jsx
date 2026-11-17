import StudentPortalNav from './StudentPortalNav';

export const metadata = {
  title: 'MITA Student Portal',
  description: 'Student portal for the Menos iT Consult IT Academy.',
  robots: { index: false, follow: false },
};

function AcademyRootLayout({ children }) {
  return (
    <div className="ap">
      <StudentPortalNav />
      {children}
    </div>
  );
}

export default AcademyRootLayout;