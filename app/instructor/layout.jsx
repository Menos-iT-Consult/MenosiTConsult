import '../academy/portal.css';
import PortalShell from '../academy/PortalShell';

export default function InstructorLayout({ children }) {
  return <PortalShell portal="instructor">{children}</PortalShell>;
}
