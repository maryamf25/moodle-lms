import { requireAppAuth } from '@/lib/auth/server-session';
import SupportAdminPanel from '@/components/features/support/SupportAdminPanel';

export default async function AdminSupportPage() {
  await requireAppAuth('admin');
  return <SupportAdminPanel />;
}
