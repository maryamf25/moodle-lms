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
  // 1. Get existing user if any
  const existingUser = await prisma.user.findUnique({
    where: { moodleUserId: input.moodleUserId },
    select: { role: true, id: true }
  });

  // 2. Check for pending registration (intent from signup)
  const pendingRegistration = await (prisma as any).registrationRole.findUnique({
    where: { username: input.username },
  });

  // 3. Resolve final role
  // Priority: 1. Pending registration intent, 2. Existing specialized role in DB, 3. Input role (from Moodle)
  let finalRole: MoodleRole = normalizeRole(input.role);

  if (pendingRegistration) {
    finalRole = pendingRegistration.role as MoodleRole;
  } else if (existingUser && existingUser.role !== 'student') {
    // Keep existing specialized role if no new intent is found
    finalRole = existingUser.role;
  }

  const user = await prisma.user.upsert({
    where: { moodleUserId: input.moodleUserId },
    create: {
      moodleUserId: input.moodleUserId,
      username: input.username,
      role: finalRole,
      email: input.email ?? null,
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
      lastLoginAt: new Date(),
    },
    update: {
      username: input.username,
      role: finalRole,
      email: input.email ?? undefined,
      firstName: input.firstName ?? undefined,
      lastName: input.lastName ?? undefined,
      lastLoginAt: new Date(),
    },
  });

  // 4. Cleanup pending registration role
  if (pendingRegistration) {
    await (prisma as any).registrationRole.delete({
      where: { id: pendingRegistration.id },
    }).catch((err: unknown) => console.error('Failed to cleanup registration role:', err));
  }

  return user;
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
