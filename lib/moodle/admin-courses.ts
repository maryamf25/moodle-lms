import { moodleWebservicePost } from '@/lib/moodle/client';
import {
  mapMoodleCategoryRow,
  mapMoodleCourseRow,
  MoodleCategoryRow,
  MoodleCourseRow,
} from '@/lib/moodle/mappers';

function isAccessControlException(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return message.includes('access control exception') || message.includes('not allowed');
}

function getReadTokens(): string[] {
  const tokens = [
    process.env.MOODLE_ADMIN_MANAGE,
    process.env.MOODLE_ADMIN_TOKEN,
  ].filter((token): token is string => Boolean(token && token.trim()));
  return [...new Set(tokens)];
}

function getWriteTokens(): string[] {
  const tokens = [
    process.env.MOODLE_ADMIN_UPDATE,
    process.env.MOODLE_ADMIN_TOKEN,
    process.env.MOODLE_ADMIN_MANAGE,
  ].filter((token): token is string => Boolean(token && token.trim()));
  return [...new Set(tokens)];
}

async function callMoodleAdmin(
  wsfunction: string,
  params: URLSearchParams,
  tokenCandidates: string[],
): Promise<unknown> {
  if (tokenCandidates.length === 0) {
    throw new Error('No Moodle admin token configured. Set MOODLE_ADMIN_MANAGE or MOODLE_ADMIN_TOKEN');
  }

  let lastError: Error | null = null;

  for (const token of tokenCandidates) {
    try {
      return await moodleWebservicePost(token, wsfunction, params);
    } catch (error: unknown) {
      const asError = error instanceof Error ? error : new Error(String(error));
      lastError = asError;
      if (!isAccessControlException(asError)) {
        throw asError;
      }
    }
  }

  throw new Error(
    lastError?.message ||
      `Access denied for ${wsfunction}. Ensure one token service includes this function in Moodle External Services.`,
  );
}

export async function getMoodleCategoriesAdmin(): Promise<Array<{ id: number; name: string }>> {
  try {
    const payload = await callMoodleAdmin('core_course_get_categories', new URLSearchParams(), getReadTokens());
    if (!Array.isArray(payload)) return [];

    return payload
      .map((row) => row as MoodleCategoryRow)
      .filter((row) => typeof row.id === 'number' && row.id > 0 && typeof row.name === 'string' && row.name.trim())
      .map(mapMoodleCategoryRow)
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (error: unknown) {
    if (isAccessControlException(error)) {
      return [];
    }
    throw error;
  }
}

export async function getMoodleCoursesAdmin(): Promise<
  Array<{
    id: number;
    shortname: string;
    fullname: string;
    summary: string;
    categoryId: number | null;
    visible: boolean;
    moodlePrice: number | null;
  }>
> {
  const payload = await callMoodleAdmin('core_course_get_courses', new URLSearchParams(), getReadTokens());
  if (!Array.isArray(payload)) return [];

  return payload
    .map((row) => row as MoodleCourseRow)
    .filter((row) => typeof row.id === 'number' && row.id > 0 && row.format !== 'site')
    .map(mapMoodleCourseRow);
}

export async function updateMoodleCourseCategory(courseId: number, categoryId: number): Promise<void> {
  const params = new URLSearchParams({
    'courses[0][id]': String(courseId),
    'courses[0][categoryid]': String(categoryId),
  });
  await callMoodleAdmin('core_course_update_courses', params, getWriteTokens());
}

export async function updateMoodleCourseVisibility(courseId: number, visible: boolean): Promise<void> {
  const params = new URLSearchParams({
    'courses[0][id]': String(courseId),
    'courses[0][visible]': visible ? '1' : '0',
  });
  await callMoodleAdmin('core_course_update_courses', params, getWriteTokens());
}
