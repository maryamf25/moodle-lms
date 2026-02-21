export interface MoodleCourseRow {
  id: number;
  shortname?: string;
  fullname?: string;
  summary?: string;
  category?: number;
  categoryid?: number;
  visible?: number;
  format?: string;
  customfields?: Array<{
    shortname?: string;
    value?: string;
  }>;
}

export interface MoodleCategoryRow {
  id: number;
  name: string;
}

export interface NormalizedMoodleCourse {
  id: number;
  shortname: string;
  fullname: string;
  summary: string;
  categoryId: number | null;
  visible: boolean;
  moodlePrice: number | null;
}

export interface MoodleUserRow {
  id: number;
  username?: string;
  email?: string;
  firstname?: string;
  lastname?: string;
  suspended?: number;
}

export interface NormalizedMoodleUser {
  moodleUserId: number;
  username: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  isSuspended: boolean;
}

export interface MoodleEnrolledUserRow {
  id: number;
  username?: string;
  email?: string;
  firstname?: string;
  lastname?: string;
  lastaccess?: number;
}

export function mapMoodleCategoryRow(row: MoodleCategoryRow): { id: number; name: string } {
  return {
    id: row.id,
    name: row.name.trim(),
  };
}

export function extractCoursePrice(row: MoodleCourseRow): number | null {
  const field = row.customfields?.find(
    (customField) => customField.shortname === 'price' || customField.shortname === 'course_price',
  );
  if (!field?.value) return null;
  const parsed = Number(field.value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function mapMoodleCourseRow(row: MoodleCourseRow): NormalizedMoodleCourse {
  return {
    id: row.id,
    shortname: row.shortname || `course-${row.id}`,
    fullname: row.fullname || `Course ${row.id}`,
    summary: row.summary || '',
    categoryId:
      typeof row.categoryid === 'number'
        ? row.categoryid
        : typeof row.category === 'number'
          ? row.category
          : null,
    visible: row.visible !== 0,
    moodlePrice: extractCoursePrice(row),
  };
}

export function mapMoodleUserRow(row: MoodleUserRow): NormalizedMoodleUser | null {
  if (!Number.isInteger(row.id) || row.id <= 0) return null;
  const username = (row.username || '').trim();
  if (!username) return null;

  return {
    moodleUserId: row.id,
    username,
    email: row.email?.trim() || null,
    firstName: row.firstname?.trim() || null,
    lastName: row.lastname?.trim() || null,
    isSuspended: row.suspended === 1,
  };
}
