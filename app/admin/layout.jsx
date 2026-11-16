import './admin.css';
import './admin-body.css';

export const metadata = {
  title: { absolute: 'Admin — Menos iT Consult' },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }) {
  return <div className="admin-root">{children}</div>;
}
