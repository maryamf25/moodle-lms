
import { cookies } from 'next/headers';
import { getCourseContents, getUserCourses, CourseContent, getCoursePriceInfo, getEnrolledUsers } from '@/lib/moodle/index';
import { getUserId } from '@/app/(auth)/login/actions';
import CourseLandingPage from '@/components/features/course/CourseLandingPage';
import { notFound } from 'next/navigation';

// Reuse the Course interface from app/page.tsx or define in lib
interface PublicCourse {
    id: number;
    fullname: string;
    shortname: string;
    summary: string;
    startdate: number;
    enddate: number;
    overviewfiles?: { fileurl: string }[];
}

// Next.js 15+ Params are Promises
interface CoursePageProps {
    params: Promise<{ id: string }>;
}

async function getPublicCourse(courseId: number): Promise<PublicCourse | null> {
    const moodleUrl = process.env.NEXT_PUBLIC_MOODLE_URL;
    const token = process.env.MOODLE_TOKEN; // SERVER-SIDE TOKEN for public access

    if (!moodleUrl || !token) return null;

    // We use core_course_get_courses but filter by ID if possible, 
    // or fetch all and find (Moodle API core_course_get_courses allows 'ids' param)
    const params = new URLSearchParams({
        wstoken: token,
        wsfunction: 'core_course_get_courses',
        moodlewsrestformat: 'json',
    });
    // Add ids param properly: ids[0]=courseId
    // params.append('options[ids][0]', courseId.toString()); // Some Moodle versions
    // Let's try fetching all and finding for now to be safe, or just append ids[0] manually in string

    try {
        // Fetch specific course to reduce load
        const res = await fetch(`${moodleUrl}/webservice/rest/server.php?${params.toString()}&options[ids][0]=${courseId}`, { cache: 'no-store' });
        const data = await res.json();

        if (data.exception || !Array.isArray(data) || data.length === 0) {
            return null;
        }
        return data[0] as PublicCourse;
    } catch (e) {
        console.error("Failed to fetch public course", e);
        return null;
    }
}

export default async function CourseLandingContainer({ params }: CoursePageProps) {
    const { id } = await params;




    const cookieStore = await cookies();
    const userToken = cookieStore.get('moodle_token')?.value;
    const courseId = parseInt(id);

    // 1. Fetch Public Course info (Server Token)
    const course = await getPublicCourse(courseId);

    if (!course) {
        return notFound();
    }

    // 2. Fetch Syllabus (Server Token - Guests can see names of modules usually)
    const systemToken = process.env.MOODLE_TOKEN || '';

    // Fetch Instructors (Enrolled users with teacher role)
    let instructors: any[] = [];
    try {
        const allEnrolled = await getEnrolledUsers(systemToken, courseId);
        // Roles: 3 = editingteacher, 4 = teacher
        instructors = allEnrolled.filter((u: any) =>
            u.roles?.some((r: any) => r.roleid === 3 || r.roleid === 4)
        );
    } catch (e) {
        console.warn("Could not fetch instructors", e);
    }

    let sections: CourseContent[] = []; // Explicit type
    try {
        sections = await getCourseContents(systemToken, courseId);
    } catch (e) {
        console.warn("Could not fetch syllabus with system token", e);
    }

    // 3. Check Enrollment (User Token)
    let isEnrolled = false;
    if (userToken) {
        try {
            const userId = await getUserId(userToken);
            const enrolledCourses = await getUserCourses(userToken, userId);
            isEnrolled = enrolledCourses.some(c => c.id === courseId);
        } catch (e) {
            console.error("Error checking enrollment", e);
        }
    }

    const priceData = await getCoursePriceInfo(Number(id));

    return (
        <CourseLandingPage
            course={course}
            price={priceData?.price ?? 0}
            isEnrolled={isEnrolled}
            sections={sections}
            isLoggedIn={!!userToken}
            instructors={instructors}
        />
    );
}
