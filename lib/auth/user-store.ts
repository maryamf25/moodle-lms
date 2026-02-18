import { prisma } from '@/lib/db/prisma';
import { MoodleRole, normalizeRole } from '@/lib/auth/roles';

export interface SyncUserInput {
  moodleUserId: number;
  username: string;
  role: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}

export async function syncUserFromMoodleSession(input: SyncUserInput) {
  const role: MoodleRole = normalizeRole(input.role);

  return prisma.user.upsert({
    where: { moodleUserId: input.moodleUserId },
    create: {
      moodleUserId: input.moodleUserId,
      username: input.username,
      role,
      email: input.email ?? null,
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
      lastLoginAt: new Date(),
    },
    update: {
      username: input.username,
      role,
      email: input.email ?? undefined,
      firstName: input.firstName ?? undefined,
      lastName: input.lastName ?? undefined,
      lastLoginAt: new Date(),
    },
  });
}

export async function getStoredRoleByMoodleUserId(moodleUserId: number): Promise<MoodleRole | null> {
  const user = await prisma.user.findUnique({
    where: { moodleUserId },
    select: { role: true },
  });

  return user?.role ?? null;
}

export async function setStoredRoleByMoodleUserId(moodleUserId: number, role: MoodleRole) {
  return prisma.user.update({
    where: { moodleUserId },
    data: { role },
    select: { moodleUserId: true, role: true, username: true },
  });
}
