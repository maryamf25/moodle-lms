import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getUserSessionContext } from '@/lib/moodle/user';
import { getDashboardPathForRole, MoodleRole } from '@/lib/auth/roles';
import { syncUserFromMoodleSession } from '@/lib/auth/user-store';

export interface AppAuthContext {
  token: string;
  moodleUserId: number;
  username: string;
  role: MoodleRole;
}

export async function getAppAuthContext(): Promise<AppAuthContext | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('moodle_token')?.value;

  if (!token) return null;

  const moodleSession = await getUserSessionContext(token);
  const dbUser = await syncUserFromMoodleSession({
    moodleUserId: moodleSession.userid,
    username: moodleSession.username,
    role: moodleSession.role,
  });

  return {
    token,
    moodleUserId: moodleSession.userid,
    username: moodleSession.username,
    role: dbUser.role,
  };
}

export async function requireAppAuth(expectedRole?: MoodleRole): Promise<AppAuthContext> {
  const auth = await getAppAuthContext();

  if (!auth) {
    redirect('/login');
  }

  if (expectedRole && auth.role !== expectedRole) {
    redirect(getDashboardPathForRole(auth.role));
  }

  return auth;
}
