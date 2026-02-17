import { BASE_URL } from '@/lib/moodle/api';

interface MoodleErrorShape {
  exception?: string;
  errorcode?: string;
  message?: string;
}

interface MoodleCourseRow {
  id: number;
  shortname?: string;
  fullname?: string;
  summary?: string;
  category?: number;
  categoryid?: number;
  visible?: number;
  format?: string;
}

interface MoodleCategoryRow {
  id: number;
  name: string;
}

function isAccessControlException(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return message.includes('access control exception') || message.includes('not allowed');
}

function getAdminTokenOrThrow(): string {
  const token = process.env.MOODLE_ADMIN_MANAGE || process.env.MOODLE_ADMIN_TOKEN;
  if (!token) {
    throw new Error('MOODLE_ADMIN_MANAGE (or MOODLE_ADMIN_TOKEN) is not configured');
  }
  return token;
}

function parseMoodleError(payload: unknown): MoodleErrorShape | null {
  if (!payload || typeof payload !== 'object') return null;
  const data = payload as Record<string, unknown>;
  const exception = typeof data.exception === 'string' ? data.exception : undefined;
  const errorcode = typeof data.errorcode === 'string' ? data.errorcode : undefined;
  const message = typeof data.message === 'string' ? data.message : undefined;
  if (!exception && !errorcode && !message) return null;
  return { exception, errorcode, message };
}

async function callMoodleAdmin(wsfunction: string, params: URLSearchParams): Promise<unknown> {
  if (!BASE_URL) {
    throw new Error('NEXT_PUBLIC_MOODLE_URL is not configured');
  }

  const body = new URLSearchParams({
    wstoken: getAdminTokenOrThrow(),
    wsfunction,
    moodlewsrestformat: 'json',
  });
  params.forEach((value, key) => body.append(key, value));

  const response = await fetch(`${BASE_URL}/webservice/rest/server.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Moodle request failed (${wsfunction}) with status ${response.status}`);
  }

  const data: unknown = await response.json();
  const moodleError = parseMoodleError(data);
  if (moodleError?.exception || moodleError?.errorcode) {
    throw new Error(moodleError.message || `Moodle returned an error in ${wsfunction}`);
  }
  return data;
}

export async function getMoodleCategoriesAdmin(): Promise<Array<{ id: number; name: string }>> {
  try {
    const payload = await callMoodleAdmin('core_course_get_categories', new URLSearchParams());
    if (!Array.isArray(payload)) return [];

    return payload
      .map((row) => row as MoodleCategoryRow)
      .filter((row) => typeof row.id === 'number' && row.id > 0 && typeof row.name === 'string' && row.name.trim())
      .map((row) => ({ id: row.id, name: row.name.trim() }))
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
  }>
> {
  const payload = await callMoodleAdmin('core_course_get_courses', new URLSearchParams());
  if (!Array.isArray(payload)) return [];

  return payload
    .map((row) => row as MoodleCourseRow)
    .filter((row) => typeof row.id === 'number' && row.id > 0 && row.format !== 'site')
    .map((row) => ({
      id: row.id,
      shortname: row.shortname || `course-${row.id}`,
      fullname: row.fullname || `Course ${row.id}`,
      summary: row.summary || '',
      categoryId: typeof row.categoryid === 'number'
        ? row.categoryid
        : typeof row.category === 'number'
          ? row.category
          : null,
      visible: row.visible !== 0,
    }));
}

export async function updateMoodleCourseCategory(courseId: number, categoryId: number): Promise<void> {
  const params = new URLSearchParams({
    'courses[0][id]': String(courseId),
    'courses[0][categoryid]': String(categoryId),
  });
  await callMoodleAdmin('core_course_update_courses', params);
}

export async function updateMoodleCourseVisibility(courseId: number, visible: boolean): Promise<void> {
  const params = new URLSearchParams({
    'courses[0][id]': String(courseId),
    'courses[0][visible]': visible ? '1' : '0',
  });
  await callMoodleAdmin('core_course_update_courses', params);
}
