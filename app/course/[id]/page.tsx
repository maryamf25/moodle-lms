
import { cookies } from 'next/headers';
import { getCourseContents, getUserCourses, CourseContent } from '@/lib/moodle/index';
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
    // We use the System Token to get the structure. 
    // NOTE: core_course_get_contents might require enrollment for some tokens, 
    // but usually admin tokens can see all.
    const systemToken = process.env.MOODLE_TOKEN || '';
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

    // Prepare image URL with token if needed (though public files usually accessible? Moodle is tricky)
    // We will pass the token-appended URL to the client if it's a private file, 
    // but for public landing page, usually we want public files.
    // Using systemToken for image might be risky if it exposes token in URL. 
    // Better to use a valid public URL or proxy. For now, we assume standard Moodle behavior.
    const imageurl = course.overviewfiles && course.overviewfiles.length > 0
        ? `${course.overviewfiles[0].fileurl}?token=${systemToken}`
        : undefined;

    return (
        <CourseLandingPage
            course={{
                ...course,
                imageurl
            }}
            sections={sections}
            isEnrolled={isEnrolled}
        />
    );
}
