import { requireAppAuth } from '@/lib/auth/server-session';
import SupportPortal from '@/components/features/support/SupportPortal';

export default async function SupportPage() {
  await requireAppAuth();
  return <SupportPortal />;
}
