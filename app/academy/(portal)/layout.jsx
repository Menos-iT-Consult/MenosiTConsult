import PortalShell from '../PortalShell';

export const metadata = {
  title: 'MITA Student Portal',
  description: 'Student portal for the Menos iT Consult IT Academy.',
  robots: { index: false, follow: false },
};

function AcademyRootLayout({ children }) {
  return <PortalShell portal="student">{children}</PortalShell>;
}

export default AcademyRootLayout;