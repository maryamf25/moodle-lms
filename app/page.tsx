import Link from "next/link";
import { getCategories } from "@/lib/moodle";

export const dynamic = 'force-dynamic';


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

async function getCourses(): Promise<Course[]> {
  const moodleUrl = process.env.NEXT_PUBLIC_MOODLE_URL;
  const token = process.env.MOODLE_TOKEN; // Note: Use SERVER-SIDE token for fetching public courses if possible, or client side? usually public courses need a specific token or none if open. limiting to avoid exposure.

  if (!moodleUrl || !token) {
    console.error('ERROR: Missing MOODLE_URL or MOODLE_TOKEN in .env file');
    return [];
  }

  // API Parameters
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

    return Array.isArray(data) ? data as Course[] : [];

  } catch (error) {
    console.error('Error fetching courses:', error);
    return [];
  }
}

// Helper to format date
const formatDate = (timestamp: number) => {
  if (!timestamp) return 'On-going';
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export default async function Home() {
  const courses = await getCourses();
  const token = process.env.MOODLE_TOKEN || '';
  const categories = await getCategories(token) as CourseCategory[];

  // Group courses by category
  const coursesByCategory = courses.reduce((acc: Record<string, Course[]>, course) => {
    if (course.format === 'site' || course.visible === 0) return acc;
    const cat = categories.find((c) => c.id === course.categoryid);
    const catName = cat ? cat.name : 'Other Courses';
    if (!acc[catName]) acc[catName] = [];
    acc[catName].push(course);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-50 to-white pt-16 pb-24 lg:pt-32 overflow-hidden">
        {/* ... (Hero content stays same) ... */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="lg:grid lg:grid-cols-2 lg:gap-8 items-center">
            <div className="mb-12 lg:mb-0">
              <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl lg:text-5xl xl:text-6xl">
                <span className="block xl:inline">Unlock Your Potential</span>{' '}
                <span className="block text-blue-600 xl:inline">with Online Learning</span>
              </h1>
              <p className="mt-4 text-lg text-gray-500 sm:mt-5 sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
                Access high-quality courses from top instructors. Learn at your own pace and achieve your career goals with our comprehensive learning platform.
              </p>
              <div className="mt-8 sm:max-w-lg sm:mx-auto sm:text-center lg:text-left lg:mx-0">
                <div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start">
                  <div className="rounded-md shadow">
                    <a href="#courses" className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-full text-white bg-blue-600 hover:bg-blue-700 md:py-4 md:text-lg md:px-10 transition-all shadow-blue-300 shadow-xl">
                      Explore Courses
                    </a>
                  </div>
                  <div className="mt-3 sm:mt-0 sm:ml-3">
                    <a href="/login" className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-full text-blue-700 bg-blue-100 hover:bg-blue-200 md:py-4 md:text-lg md:px-10 transition-all">
                      Join for Free
                    </a>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-blue-100 rounded-full blur-3xl opacity-50 animate-pulse"></div>
              <div className="rounded-2xl shadow-2xl overflow-hidden border-4 border-white transform rotate-2 hover:rotate-0 transition-transform duration-500">
                <img
                  src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-1.2.1&auto=format&fit=crop&w=1351&q=80"
                  alt="Students learning"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-blue-600">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
              Trusted by thousands of learners worldwide
            </h2>
            <p className="mt-3 text-xl text-blue-200 sm:mt-4">
              Our platform delivers results. Join a community committed to excellence.
            </p>
          </div>
          <dl className="mt-10 text-center sm:max-w-3xl sm:mx-auto sm:grid sm:grid-cols-3 sm:gap-8">
            <div className="flex flex-col">
              <dt className="order-2 mt-2 text-lg leading-6 font-medium text-blue-200">Courses</dt>
              <dd className="order-1 text-5xl font-extrabold text-white">100+</dd>
            </div>
            <div className="flex flex-col mt-10 sm:mt-0">
              <dt className="order-2 mt-2 text-lg leading-6 font-medium text-blue-200">Students</dt>
              <dd className="order-1 text-5xl font-extrabold text-white">50k+</dd>
            </div>
            <div className="flex flex-col mt-10 sm:mt-0">
              <dt className="order-2 mt-2 text-lg leading-6 font-medium text-blue-200">Instructors</dt>
              <dd className="order-1 text-5xl font-extrabold text-white">200+</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Courses Section */}
      <div id="courses" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-16">
          <h2 className="text-base font-semibold text-blue-600 tracking-wide uppercase">Our Catalog</h2>
          <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            Explore by Category
          </p>
        </div>

        <div className="space-y-20">
          {Object.keys(coursesByCategory).length > 0 ? (
            Object.entries(coursesByCategory).map(([categoryName, categoryCourses]) => (
              <div key={categoryName} className="scroll-mt-20">
                <div className="flex items-center gap-4 mb-8">
                  <h3 className="text-2xl font-bold text-gray-900">{categoryName}</h3>
                  <div className="flex-1 h-px bg-gray-100"></div>
                  <span className="text-sm font-medium text-gray-400 bg-gray-50 px-3 py-1 rounded-full">
                    {categoryCourses.length} {categoryCourses.length === 1 ? 'Course' : 'Courses'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                  {categoryCourses.map((course) => (
                    <div
                      key={course.id}
                      className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col border border-gray-100 group"
                    >
                      {/* --- Course Image --- */}
                      <div className="h-56 bg-gray-200 relative overflow-hidden">
                        <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors z-10"></div>
                        {course.overviewfiles && course.overviewfiles.length > 0 ? (
                          <img
                            src={`${course.overviewfiles[0].fileurl}?token=${token}`}
                            alt={course.fullname}
                            className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-blue-50">
                            <span className="text-blue-300 text-6xl font-bold opacity-50">
                              {course.shortname.toUpperCase().substring(0, 2)}
                            </span>
                          </div>
                        )}
                        <div className="absolute top-4 right-4 z-20 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-blue-600 shadow-sm">
                          {course.shortname}
                        </div>
                      </div>

                      {/* --- Course Body --- */}
                      <div className="p-8 flex-1 flex flex-col">
                        <div className="mb-4">
                          <h2 className="text-xl font-bold text-gray-900 mb-2 leading-tight group-hover:text-blue-600 transition-colors">
                            {course.fullname}
                          </h2>
                          <div className="flex items-center text-xs text-gray-500 mb-4">
                            <svg className="w-4 h-4 mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>{formatDate(course.startdate)}</span>
                          </div>
                          <div
                            className="text-gray-600 text-sm line-clamp-2 prose prose-sm"
                            dangerouslySetInnerHTML={{ __html: course.summary }}
                          />
                        </div>
                        <div className="mt-auto pt-6">
                          <Link
                            href={`/course/${course.id}`}
                            className="block w-full text-center bg-gray-50 border border-gray-200 text-gray-700 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 font-bold py-3 px-4 rounded-xl transition-all duration-200"
                          >
                            View Details
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-24 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
              <p className="text-gray-500 text-xl font-medium">No courses available in the catalog.</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <span className="text-2xl font-bold text-white">EduMeUp<span className="text-blue-400">Clone</span></span>
              <p className="mt-4 text-gray-400 text-sm">
                Empowering learners worldwide with accessible, high-quality education.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase">Links</h3>
              <ul className="mt-4 space-y-4">
                <li><a href="#" className="text-base text-gray-300 hover:text-white">About</a></li>
                <li><a href="#" className="text-base text-gray-300 hover:text-white">Blog</a></li>
                <li><a href="#" className="text-base text-gray-300 hover:text-white">Contact</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase">Legal</h3>
              <ul className="mt-4 space-y-4">
                <li><a href="#" className="text-base text-gray-300 hover:text-white">Privacy</a></li>
                <li><a href="#" className="text-base text-gray-300 hover:text-white">Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t border-gray-800 pt-8 text-center text-sm text-gray-400">
            &copy; {new Date().getFullYear()} EduMeUp Clone. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
