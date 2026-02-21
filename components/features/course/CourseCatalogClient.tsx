'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchFilteredCourses, fetchCategories } from '@/app/actions/catalog';

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

interface Category {
  id: number;
  name: string;
}

interface CatalogState {
  courses: Course[];
  categories: Category[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  searchQuery: string;
  selectedCategory: string;
  sortBy: string;
  isLoading: boolean;
  token: string;
}

const formatDate = (timestamp: number) => {
  if (!timestamp) return 'On-going';
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export default function CourseCatalogClient({ token }: { token: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [state, setState] = useState<CatalogState>({
    courses: [],
    categories: [],
    total: 0,
    page: 1,
    pageSize: 12,
    totalPages: 0,
    searchQuery: searchParams.get('search') || '',
    selectedCategory: searchParams.get('category') || '',
    sortBy: searchParams.get('sort') || 'name',
    isLoading: true,
    token,
  });

  // Fetch categories on mount
  useEffect(() => {
    const loadCategories = async () => {
      const categories = await fetchCategories(token);
      setState(prev => ({ ...prev, categories }));
    };
    loadCategories();
  }, [token]);

  // Fetch courses when filters change
  useEffect(() => {
    const loadCourses = async () => {
      setState(prev => ({ ...prev, isLoading: true }));
      const result = await fetchFilteredCourses(
        state.searchQuery,
        state.selectedCategory,
        state.sortBy,
        state.page,
        state.pageSize
      );
      setState(prev => ({
        ...prev,
        courses: result.courses,
        total: result.total,
        totalPages: result.totalPages,
        isLoading: false,
      }));
    };
    loadCourses();
  }, [state.searchQuery, state.selectedCategory, state.sortBy, state.page]);

  const handleSearch = useCallback((query: string) => {
    setState(prev => ({ ...prev, searchQuery: query, page: 1 }));
    const params = new URLSearchParams();
    if (query) params.set('search', query);
    if (state.selectedCategory) params.set('category', state.selectedCategory);
    if (state.sortBy !== 'name') params.set('sort', state.sortBy);
    router.push(`?${params.toString()}`);
  }, [state.selectedCategory, state.sortBy, router]);

  const handleCategoryChange = useCallback((categoryId: string) => {
    setState(prev => ({ ...prev, selectedCategory: categoryId, page: 1 }));
    const params = new URLSearchParams();
    if (state.searchQuery) params.set('search', state.searchQuery);
    if (categoryId) params.set('category', categoryId);
    if (state.sortBy !== 'name') params.set('sort', state.sortBy);
    router.push(`?${params.toString()}`);
  }, [state.searchQuery, state.sortBy, router]);

  const handleSortChange = useCallback((sortOption: string) => {
    setState(prev => ({ ...prev, sortBy: sortOption, page: 1 }));
    const params = new URLSearchParams();
    if (state.searchQuery) params.set('search', state.searchQuery);
    if (state.selectedCategory) params.set('category', state.selectedCategory);
    if (sortOption !== 'name') params.set('sort', sortOption);
    router.push(`?${params.toString()}`);
  }, [state.searchQuery, state.selectedCategory, router]);

  const handlePageChange = useCallback((newPage: number) => {
    setState(prev => ({ ...prev, page: newPage }));
    // Scroll to results section smoothly instead of top
    const element = document.getElementById('course-results');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const handleReset = useCallback(() => {
    setState(prev => ({
      ...prev,
      searchQuery: '',
      selectedCategory: '',
      sortBy: 'name',
      page: 1,
    }));
    router.push('?');
  }, [router]);

  return (
    <div className="space-y-6">
      {/* Filters Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sticky top-20 z-40">
        <div className="space-y-3">
          {/* Search */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Search
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="By name, code, description..."
                value={state.searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
              <svg
                className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {/* Category Filter */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Category
              </label>
              <select
                value={state.selectedCategory}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              >
                <option value="">All</option>
                {state.categories.map(cat => (
                  <option key={cat.id} value={cat.id.toString()}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Sort
              </label>
              <select
                value={state.sortBy}
                onChange={(e) => handleSortChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              >
                <option value="name">A-Z</option>
                <option value="name-desc">Z-A</option>
                <option value="date-newest">Newest</option>
                <option value="date-oldest">Oldest</option>
              </select>
            </div>

            {/* Reset Button */}
            {(state.searchQuery || state.selectedCategory || state.sortBy !== 'name') && (
              <div className="col-span-2 lg:col-span-2 flex items-end">
                <button
                  onClick={handleReset}
                  className="w-full px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
                >
                  Reset
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Results Info */}
      <div id="course-results" className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-600">
            Showing <span className="font-semibold">{state.courses.length > 0 ? (state.page - 1) * state.pageSize + 1 : 0}</span>-<span className="font-semibold">
              {Math.min(state.page * state.pageSize, state.total)}
            </span> of <span className="font-semibold">{state.total}</span>
          </p>
        </div>
      </div>

      {/* Loading State */}
      {state.isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-gray-200 rounded-lg h-64 animate-pulse" />
          ))}
        </div>
      )}

      {/* Courses Grid */}
      {!state.isLoading && state.courses.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {state.courses.map(course => (
            <div
              key={course.id}
              className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 flex flex-col border border-gray-100 group"
            >
              {/* Course Image */}
              <div className="h-40 bg-gray-200 relative overflow-hidden">
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors z-10"></div>
                {course.overviewfiles && course.overviewfiles.length > 0 ? (
                  <img
                    src={`${course.overviewfiles[0].fileurl}?token=${state.token}`}
                    alt={course.fullname}
                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-blue-50">
                    <span className="text-blue-300 text-4xl font-bold opacity-50">
                      {course.shortname.toUpperCase().substring(0, 2)}
                    </span>
                  </div>
                )}
                <div className="absolute top-2 right-2 z-20 bg-white/90 backdrop-blur-md px-2 py-0.5 rounded-full text-xs font-bold text-blue-600 shadow-sm">
                  {course.shortname}
                </div>
              </div>

              {/* Course Body */}
              <div className="p-4 flex-1 flex flex-col">
                <div className="mb-3">
                  <h2 className="text-base font-bold text-gray-900 mb-1.5 leading-tight group-hover:text-blue-600 transition-colors line-clamp-2">
                    {course.fullname}
                  </h2>
                  <div className="flex items-center text-xs text-gray-500 mb-2">
                    <svg className="w-3.5 h-3.5 mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs">{formatDate(course.startdate)}</span>
                  </div>
                  <div
                    className="text-gray-600 text-xs line-clamp-2"
                    dangerouslySetInnerHTML={{ __html: course.summary }}
                  />
                </div>
                <div className="mt-auto pt-3">
                  <Link
                    href={`/course/${course.id}`}
                    className="block w-full text-center bg-gray-50 border border-gray-200 text-gray-700 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 font-semibold py-2 px-3 text-sm rounded-lg transition-all duration-200"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No Results */}
      {!state.isLoading && state.courses.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <svg
            className="mx-auto h-10 w-10 text-gray-400 mb-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-gray-600 text-sm font-medium">No courses match your search.</p>
          <button
            onClick={handleReset}
            className="mt-3 inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Pagination */}
      {!state.isLoading && state.totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 mt-8">
          <button
            onClick={() => handlePageChange(Math.max(1, state.page - 1))}
            disabled={state.page === 1}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
          >
            ← Prev
          </button>

          <div className="flex gap-0.5 mx-2">
            {Array.from({ length: state.totalPages }, (_, i) => i + 1).map(pageNum => (
              <button
                key={pageNum}
                onClick={() => handlePageChange(pageNum)}
                className={`px-2.5 py-1.5 text-xs rounded-lg transition-colors ${
                  state.page === pageNum
                    ? 'bg-blue-600 text-white'
                    : 'border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {pageNum}
              </button>
            ))}
          </div>

          <button
            onClick={() => handlePageChange(Math.min(state.totalPages, state.page + 1))}
            disabled={state.page === state.totalPages}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
