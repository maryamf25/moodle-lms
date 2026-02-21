'use server';

import { revalidatePath } from 'next/cache';
import { MoodleRole } from '@/lib/auth/roles';
import { requireAppAuth } from '@/lib/auth/server-session';
import { prisma } from '@/lib/db/prisma';
import {
  getMoodleCategoriesAdmin,
  updateMoodleCourseCategory,
  updateMoodleCourseVisibility,
} from '@/lib/moodle/admin-courses';
import { syncCourseCatalogFromMoodle } from '@/lib/moodle/sync-course-catalog';
import {
  assignMoodleUserRole,
  getMoodleUserById,
  resetMoodleUserPassword,
  setMoodleUserSuspended,
} from '@/lib/moodle/admin-management';

interface AdminActionResult {
  ok: boolean;
  message: string;
}

interface SuspendUserInput {
  moodleUserId: number;
  suspend: boolean;
}

interface ResetPasswordInput {
  moodleUserId: number;
  newPassword: string;
}

interface AssignRoleInput {
  moodleUserId: number;
  role: MoodleRole;
}

interface SetCoursePriceInput {
  moodleCourseId: number;
  price: number;
}

interface UpdateCourseCategoryInput {
  moodleCourseId: number;
  categoryId: number;
}

interface UpdateCourseVisibilityInput {
  moodleCourseId: number;
  visible: boolean;
}

async function ensureActingAdminUser(moodleUserId: number, username: string) {
  return prisma.user.upsert({
    where: { moodleUserId },
    create: {
      moodleUserId,
      username,
      role: 'admin',
    },
    update: {
      username,
      role: 'admin',
      lastLoginAt: new Date(),
    },
    select: {
      id: true,
      moodleUserId: true,
      username: true,
      role: true,
    },
  });
}

async function getTargetUserOrThrow(moodleUserId: number) {
  const existingTarget = await prisma.user.findUnique({
    where: { moodleUserId },
    select: { id: true, moodleUserId: true, username: true, role: true, isSuspended: true },
  });
  if (existingTarget) {
    return existingTarget;
  }

  const moodleUser = await getMoodleUserById(moodleUserId);
  if (!moodleUser) {
    throw new Error(`User with Moodle ID ${moodleUserId} not found in Moodle`);
  }

  return prisma.user.create({
    data: {
      moodleUserId: moodleUser.id,
      username: moodleUser.username,
      email: moodleUser.email ?? null,
      firstName: moodleUser.firstname ?? null,
      lastName: moodleUser.lastname ?? null,
      role: 'student',
      isSuspended: moodleUser.suspended === 1,
    },
    select: { id: true, moodleUserId: true, username: true, role: true, isSuspended: true },
  });
}

function assertValidMoodleUserId(value: number) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error('Invalid Moodle user id');
  }
}

function assertValidMoodleCourseId(value: number) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error('Invalid Moodle course id');
  }
}

export async function suspendUserAction(input: SuspendUserInput): Promise<AdminActionResult> {
  const auth = await requireAppAuth('admin');
  assertValidMoodleUserId(input.moodleUserId);
  if (input.suspend && input.moodleUserId === auth.moodleUserId) {
    return { ok: false, message: 'You cannot suspend your own admin account' };
  }

  const actingAdmin = await ensureActingAdminUser(auth.moodleUserId, auth.username);
  const targetUser = await getTargetUserOrThrow(input.moodleUserId);

  await setMoodleUserSuspended(targetUser.moodleUserId, input.suspend);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: targetUser.id },
      data: { isSuspended: input.suspend },
    }),
    prisma.adminActivityLog.create({
      data: {
        adminUserId: actingAdmin.id,
        targetUserId: targetUser.id,
        action: input.suspend ? 'USER_SUSPENDED' : 'USER_UNSUSPENDED',
        details: {
          targetMoodleUserId: targetUser.moodleUserId,
          targetUsername: targetUser.username,
        },
      },
    }),
  ]);

  revalidatePath('/dashboard/admin');
  return {
    ok: true,
    message: input.suspend
      ? `User ${targetUser.username} has been suspended`
      : `User ${targetUser.username} has been reactivated`,
  };
}

export async function resetPasswordAction(input: ResetPasswordInput): Promise<AdminActionResult> {
  const auth = await requireAppAuth('admin');
  assertValidMoodleUserId(input.moodleUserId);
  const newPassword = input.newPassword.trim();
  if (!newPassword) {
    return { ok: false, message: 'Password cannot be empty' };
  }

  const actingAdmin = await ensureActingAdminUser(auth.moodleUserId, auth.username);
  const targetUser = await getTargetUserOrThrow(input.moodleUserId);

  await resetMoodleUserPassword(targetUser.moodleUserId, newPassword);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: targetUser.id },
      data: {
        lastPasswordResetAt: new Date(),
        passwordResetCount: { increment: 1 },
      },
    }),
    prisma.adminActivityLog.create({
      data: {
        adminUserId: actingAdmin.id,
        targetUserId: targetUser.id,
        action: 'PASSWORD_RESET',
        details: {
          targetMoodleUserId: targetUser.moodleUserId,
          targetUsername: targetUser.username,
        },
      },
    }),
  ]);

  revalidatePath('/dashboard/admin');
  return {
    ok: true,
    message: `Password reset applied for ${targetUser.username}`,
  };
}

export async function assignRoleAction(input: AssignRoleInput): Promise<AdminActionResult> {
  const auth = await requireAppAuth('admin');
  assertValidMoodleUserId(input.moodleUserId);
  if (input.moodleUserId === auth.moodleUserId && input.role !== 'admin') {
    return { ok: false, message: 'You cannot remove your own admin role' };
  }

  const actingAdmin = await ensureActingAdminUser(auth.moodleUserId, auth.username);
  const targetUser = await getTargetUserOrThrow(input.moodleUserId);

  await assignMoodleUserRole(targetUser.moodleUserId, input.role);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: targetUser.id },
      data: { role: input.role },
    }),
    prisma.adminActivityLog.create({
      data: {
        adminUserId: actingAdmin.id,
        targetUserId: targetUser.id,
        action: 'ROLE_ASSIGNED',
        details: {
          targetMoodleUserId: targetUser.moodleUserId,
          targetUsername: targetUser.username,
          assignedRole: input.role,
        },
      },
    }),
  ]);

  revalidatePath('/dashboard/admin');
  return {
    ok: true,
    message: `Role for ${targetUser.username} changed to ${input.role}`,
  };
}

export async function syncCoursesFromMoodleAction(): Promise<AdminActionResult> {
  const auth = await requireAppAuth('admin');
  const actingAdmin = await ensureActingAdminUser(auth.moodleUserId, auth.username);
  const syncResult = await syncCourseCatalogFromMoodle({ actingAdminUserId: actingAdmin.id });

  revalidatePath('/dashboard/admin');
  revalidatePath('/');
  const categoryMessage =
    syncResult.categoryCount === 0
      ? ' (courses synced; category API not accessible with current token)'
      : '';
  return { ok: true, message: `${syncResult.syncedCount} courses synced from Moodle${categoryMessage}` };
}

export async function setCoursePriceAction(input: SetCoursePriceInput): Promise<AdminActionResult> {
  const auth = await requireAppAuth('admin');
  assertValidMoodleCourseId(input.moodleCourseId);
  if (!Number.isFinite(input.price) || input.price < 0) {
    return { ok: false, message: 'Price must be a non-negative number' };
  }

  const actingAdmin = await ensureActingAdminUser(auth.moodleUserId, auth.username);
  const normalizedPrice = Number(input.price.toFixed(2));
  console.log('[admin][pricing] setCoursePriceAction request', {
    moodleCourseId: input.moodleCourseId,
    inputPrice: input.price,
    normalizedPrice,
  });

  const existing = await prisma.courseCatalog.findUnique({
    where: { moodleCourseId: input.moodleCourseId },
  });
  if (!existing) {
    return { ok: false, message: 'Course not found in local catalog. Please sync courses first.' };
  }

  await prisma.$transaction([
    prisma.courseCatalog.update({
      where: { moodleCourseId: input.moodleCourseId },
      data: { price: normalizedPrice },
    }),
    prisma.adminActivityLog.create({
      data: {
        adminUserId: actingAdmin.id,
        action: 'COURSE_PRICING_UPDATED',
        details: {
          moodleCourseId: input.moodleCourseId,
          fullname: existing.fullname,
          price: normalizedPrice,
        },
      },
    }),
  ]);

  const verify = await prisma.courseCatalog.findUnique({
    where: { moodleCourseId: input.moodleCourseId },
    select: { moodleCourseId: true, fullname: true, price: true },
  });
  console.log('[admin][pricing] setCoursePriceAction stored', {
    moodleCourseId: verify?.moodleCourseId,
    fullname: verify?.fullname,
    storedPrice: verify ? Number(verify.price) : null,
  });

  revalidatePath('/dashboard/admin');
  revalidatePath(`/course/${input.moodleCourseId}`);
  return { ok: true, message: `Price updated for ${existing.fullname}` };
}

export async function updateCourseCategoryAction(input: UpdateCourseCategoryInput): Promise<AdminActionResult> {
  const auth = await requireAppAuth('admin');
  assertValidMoodleCourseId(input.moodleCourseId);
  if (!Number.isInteger(input.categoryId) || input.categoryId <= 0) {
    return { ok: false, message: 'Invalid category id' };
  }

  const actingAdmin = await ensureActingAdminUser(auth.moodleUserId, auth.username);
  const existing = await prisma.courseCatalog.findUnique({
    where: { moodleCourseId: input.moodleCourseId },
  });
  if (!existing) {
    return { ok: false, message: 'Course not found in local catalog. Please sync courses first.' };
  }

  const categories = await getMoodleCategoriesAdmin();
  if (categories.length === 0) {
    return {
      ok: false,
      message: 'Category API is not accessible for this token. Enable core_course_get_categories in Moodle External Services.',
    };
  }
  const category = categories.find((item) => item.id === input.categoryId);
  if (!category) {
    return { ok: false, message: 'Selected category was not found in Moodle' };
  }

  await updateMoodleCourseCategory(input.moodleCourseId, input.categoryId);

  await prisma.$transaction([
    prisma.courseCatalog.update({
      where: { moodleCourseId: input.moodleCourseId },
      data: {
        categoryId: category.id,
        categoryName: category.name,
        lastSyncedAt: new Date(),
      },
    }),
    prisma.adminActivityLog.create({
      data: {
        adminUserId: actingAdmin.id,
        action: 'COURSE_CATEGORY_UPDATED',
        details: {
          moodleCourseId: input.moodleCourseId,
          fullname: existing.fullname,
          categoryId: category.id,
          categoryName: category.name,
        },
      },
    }),
  ]);

  revalidatePath('/dashboard/admin');
  revalidatePath('/');
  revalidatePath(`/course/${input.moodleCourseId}`);
  return { ok: true, message: `Category updated for ${existing.fullname}` };
}

export async function updateCourseVisibilityAction(input: UpdateCourseVisibilityInput): Promise<AdminActionResult> {
  const auth = await requireAppAuth('admin');
  assertValidMoodleCourseId(input.moodleCourseId);

  const actingAdmin = await ensureActingAdminUser(auth.moodleUserId, auth.username);
  const existing = await prisma.courseCatalog.findUnique({
    where: { moodleCourseId: input.moodleCourseId },
  });
  if (!existing) {
    return { ok: false, message: 'Course not found in local catalog. Please sync courses first.' };
  }

  await updateMoodleCourseVisibility(input.moodleCourseId, input.visible);

  await prisma.$transaction([
    prisma.courseCatalog.update({
      where: { moodleCourseId: input.moodleCourseId },
      data: {
        isVisible: input.visible,
        lastSyncedAt: new Date(),
      },
    }),
    prisma.adminActivityLog.create({
      data: {
        adminUserId: actingAdmin.id,
        action: 'COURSE_VISIBILITY_UPDATED',
        details: {
          moodleCourseId: input.moodleCourseId,
          fullname: existing.fullname,
          visible: input.visible,
        },
      },
    }),
  ]);

  revalidatePath('/dashboard/admin');
  revalidatePath('/');
  revalidatePath(`/course/${input.moodleCourseId}`);
  return { ok: true, message: `Visibility updated for ${existing.fullname}` };
}
