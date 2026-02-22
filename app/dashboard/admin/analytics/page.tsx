import { requireAppAuth } from '@/lib/auth/server-session';
import SystemAnalytics from '@/components/features/admin/SystemAnalytics';

export default async function AdminAnalyticsPage() {
    await requireAppAuth('admin');

    return (
        <div className="space-y-8">
            <SystemAnalytics />
        </div>
    );
}
