'use server';

import { prisma } from '@/lib/db/prisma';

interface Course {
  id: number;
  fullname: string;
  shortname: string;
  summary: string;
  startdate: number;
  enddate: number;
  format: string;
  visible?: number;
  categoryid?: number;
  overviewfiles?: { fileurl: string }[];
}

interface CourseCategory {
  id: number;
  name: string;
}

interface FilteredCoursesResponse {
  courses: Course[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Fetch courses from Moodle
async function getCourses(): Promise<Course[]> {
  const moodleUrl = process.env.NEXT_PUBLIC_MOODLE_URL;
  const token = process.env.MOODLE_TOKEN;

  if (!moodleUrl || !token) {
    console.error('ERROR: Missing MOODLE_URL or MOODLE_TOKEN in .env file');
    return [];
  }

  const params = new URLSearchParams({
    wstoken: token,
    wsfunction: 'core_course_get_courses',
    moodlewsrestformat: 'json',
  });

  try {
    const res = await fetch(`${moodleUrl}/webservice/rest/server.php?${params}`, { cache: 'no-store' });

    if (!res.ok) {
      throw new Error(`Failed to fetch data: ${res.status} ${res.statusText}`);
    }

    const text = await res.text();
    let data: unknown;
    
    try {
      data = JSON.parse(text);
    } catch {
      console.error("Invalid JSON received:", text);
      return [];
    }

    if (typeof data === 'object' && data !== null && 'exception' in data) {
      const apiError = data as { message?: string; errorcode?: string };
      console.error(`Moodle API Error: ${apiError.message} (${apiError.errorcode})`);
      return [];
    }

    return Array.isArray(data) ? (data as Course[]) : [];

  } catch (error) {
    console.error('Error fetching courses:', error);
    return [];
  }
}

export async function fetchFilteredCourses(
  searchQuery: string = '',
  categoryId: string = '',
  sortBy: string = 'name',
  page: number = 1,
  pageSize: number = 12
): Promise<FilteredCoursesResponse> {
  const courses = await getCourses();
  const token = process.env.MOODLE_TOKEN || '';

  // Fetch categories
  const categories = await fetchCategories(token);
  const categoryMap = new Map(categories.map(c => [c.id, c.name]));

  // Filter courses
  let filtered = courses.filter(course => {
    // Skip site courses and hidden courses
    if (course.format === 'site' || course.visible === 0) return false;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        course.fullname.toLowerCase().includes(query) ||
        course.shortname.toLowerCase().includes(query) ||
        (course.summary && course.summary.toLowerCase().includes(query));
      if (!matchesSearch) return false;
    }

    // Category filter
    if (categoryId) {
      const catId = parseInt(categoryId);
      if (course.categoryid !== catId) return false;
    }

    return true;
  });

  // Sort courses
  switch (sortBy) {
    case 'name':
      filtered.sort((a, b) => a.fullname.localeCompare(b.fullname));
      break;
    case 'name-desc':
      filtered.sort((a, b) => b.fullname.localeCompare(a.fullname));
      break;
    case 'date-newest':
      filtered.sort((a, b) => (b.startdate || 0) - (a.startdate || 0));
      break;
    case 'date-oldest':
      filtered.sort((a, b) => (a.startdate || 0) - (b.startdate || 0));
      break;
    default:
      // Keep original order
      break;
  }

  // Pagination
  const total = filtered.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  const paginatedCourses = filtered.slice(start, start + pageSize);

  return {
    courses: paginatedCourses,
    total,
    page,
    pageSize,
    totalPages,
  };
}

export async function fetchCategories(token?: string): Promise<CourseCategory[]> {
  const moodleUrl = process.env.NEXT_PUBLIC_MOODLE_URL;
  const effectiveToken = token || process.env.MOODLE_TOKEN;

  if (!moodleUrl || !effectiveToken) {
    console.error('ERROR: Missing MOODLE_URL or MOODLE_TOKEN in .env file');
    return [];
  }

  const params = new URLSearchParams({
    wstoken: effectiveToken,
    wsfunction: 'core_course_get_categories',
    moodlewsrestformat: 'json',
  });

  try {
    const res = await fetch(`${moodleUrl}/webservice/rest/server.php?${params}`, { cache: 'no-store' });

    if (!res.ok) {
      throw new Error(`Failed to fetch categories: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();

    if (data.exception) {
      console.error(`Moodle API Error: ${data.message}`);
      return [];
    }

    return Array.isArray(data) ? (data as CourseCategory[]) : [];

  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}
