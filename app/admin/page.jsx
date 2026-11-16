import AdminApp from './AdminApp';

export const metadata = {
  title: { absolute: 'Menos iT Consult — Admin' },
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminApp />;
}
