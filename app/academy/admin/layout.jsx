import PortalShell from '../PortalShell';

export const metadata = {
  title: 'MITA Academy Administration',
  robots: { index: false, follow: false },
};

export default function AcademyAdminLayout({ children }) {
  return <PortalShell portal="admin">{children}</PortalShell>;
}
