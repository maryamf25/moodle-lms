'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  setCoursePriceAction,
  syncCoursesFromMoodleAction,
  updateCourseCategoryAction,
  updateCourseVisibilityAction,
} from '@/app/dashboard/admin/actions';

interface CourseRow {
  moodleCourseId: number;
  shortname: string;
  fullname: string;
  categoryId: number | null;
  categoryName: string | null;
  isVisible: boolean;
  price: string;
  lastSyncedAt: string;
}

interface CategoryRow {
  id: number;
  name: string;
}

interface CourseManagementPanelProps {
  courses: CourseRow[];
  categories: CategoryRow[];
}

export default function CourseManagementPanel({ courses, categories }: CourseManagementPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState('');
  const [priceDrafts, setPriceDrafts] = useState<Record<number, string>>({});
  const [courseSearch, setCourseSearch] = useState('');

  const filteredCourses = useMemo(() => {
    const needle = courseSearch.trim().toLowerCase();
    if (!needle) return courses;
    return courses.filter((course) =>
      `${course.fullname} ${course.shortname} ${course.moodleCourseId}`.toLowerCase().includes(needle)
    );
  }, [courseSearch, courses]);

  const onSyncCourses = () => {
    console.log('[admin][courses][client] sync click');
    startTransition(async () => {
      try {
        const result = await syncCoursesFromMoodleAction();
        console.log('[admin][courses][client] sync result', result);
        setStatusMessage(result.message);
        if (result.ok) router.refresh();
      } catch (error: unknown) {
        console.error('[admin][courses][client] sync error', error);
        setStatusMessage(error instanceof Error ? error.message : 'Failed to sync courses');
      }
    });
  };

  const onSetPrice = (moodleCourseId: number) => {
    const raw = (priceDrafts[moodleCourseId] || '').trim();
    const parsed = Number(raw);
    if (raw.length === 0 || Number.isNaN(parsed) || parsed < 0) {
      setStatusMessage('Enter a valid non-negative price.');
      return;
    }

    startTransition(async () => {
      try {
        const result = await setCoursePriceAction({ moodleCourseId, price: parsed });
        setStatusMessage(result.message);
        if (result.ok) router.refresh();
      } catch (error: unknown) {
        setStatusMessage(error instanceof Error ? error.message : 'Failed to update price');
      }
    });
  };

  const onUpdateCategory = (moodleCourseId: number, categoryId: number) => {
    startTransition(async () => {
      try {
        const result = await updateCourseCategoryAction({ moodleCourseId, categoryId });
        setStatusMessage(result.message);
        if (result.ok) router.refresh();
      } catch (error: unknown) {
        setStatusMessage(error instanceof Error ? error.message : 'Failed to update category');
      }
    });
  };

  const onToggleVisibility = (moodleCourseId: number, visible: boolean) => {
    startTransition(async () => {
      try {
        const result = await updateCourseVisibilityAction({ moodleCourseId, visible });
        setStatusMessage(result.message);
        if (result.ok) router.refresh();
      } catch (error: unknown) {
        setStatusMessage(error instanceof Error ? error.message : 'Failed to update visibility');
      }
    });
  };

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Course Management</h2>
          <p className="text-sm text-slate-600">Sync courses, set pricing, manage categories, and control visibility.</p>
        </div>
        <button
          type="button"
          disabled={isPending}
          onClick={onSyncCourses}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          Sync Courses from Moodle
        </button>
      </div>

      {statusMessage && (
        <p className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
          {statusMessage}
        </p>
      )}

      <div className="mb-4">
        <input
          type="text"
          value={courseSearch}
          onChange={(event) => setCourseSearch(event.target.value)}
          placeholder="Search by course name, shortname, or ID"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead>
            <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              <th className="py-3 pr-4">Course</th>
              <th className="py-3 pr-4">Price (PKR)</th>
              <th className="py-3 pr-4">Category</th>
              <th className="py-3 pr-4">Visibility</th>
              <th className="py-3">Synced</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredCourses.map((course) => (
              <tr key={course.moodleCourseId}>
                <td className="py-3 pr-4 align-top">
                  <p className="font-medium text-slate-900">{course.fullname}</p>
                  <p className="text-xs text-slate-500">
                    {course.shortname} | Moodle ID: {course.moodleCourseId}
                  </p>
                </td>
                <td className="py-3 pr-4 align-top">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={priceDrafts[course.moodleCourseId] ?? course.price}
                      onChange={(event) =>
                        setPriceDrafts((prev) => ({ ...prev, [course.moodleCourseId]: event.target.value }))
                      }
                      disabled={isPending}
                      className="w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-700 disabled:opacity-60"
                    />
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => onSetPrice(course.moodleCourseId)}
                      className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-900 disabled:opacity-60"
                    >
                      Save
                    </button>
                  </div>
                </td>
                <td className="py-3 pr-4 align-top">
                  <select
                    value={course.categoryId ?? ''}
                    disabled={isPending}
                    onChange={(event) => {
                      const categoryId = Number(event.target.value);
                      if (!Number.isNaN(categoryId) && categoryId > 0) {
                        onUpdateCategory(course.moodleCourseId, categoryId);
                      }
                    }}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 disabled:opacity-60"
                  >
                    <option value="">Select Category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-3 pr-4 align-top">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => onToggleVisibility(course.moodleCourseId, !course.isVisible)}
                    className={`rounded-lg px-3 py-2 text-xs font-semibold text-white disabled:opacity-60 ${
                      course.isVisible ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                  >
                    {course.isVisible ? 'Hide Course' : 'Show Course'}
                  </button>
                </td>
                <td className="py-3 text-sm text-slate-600 align-top">
                  {new Date(course.lastSyncedAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredCourses.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-500">
            No courses found. Use "Sync Courses from Moodle" first.
          </p>
        )}
      </div>
    </section>
  );
}
