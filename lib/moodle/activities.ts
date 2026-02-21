import { BASE_URL } from './api';
import { getUserCourses } from './courses';

export interface ActivityTimelineItem {
    id: number;
    courseId: number;
    courseName: string;
    moduleName: string;
    modName: string; // quiz, resource, etc.
    timeCompleted: number;
    status: number; // 1 = complete, etc.
}

export interface UserCertificate {
    id: number;
    courseId: number;
    courseName: string;
    name: string;
    url: string;
    timeCreated: number;
}

/**
 * Fetches the recent activities completed by a student across all their enrolled courses.
 */
export async function getStudentActivityTimeline(token: string, userId: number): Promise<ActivityTimelineItem[]> {
    try {
        const adminToken = process.env.MOODLE_ADMIN_TOKEN;
        const effectiveToken = token || adminToken;

        const courses = await getUserCourses(effectiveToken!, userId);
        const timeline: ActivityTimelineItem[] = [];

        const completionPromises = courses.map(async (course) => {
            // 1. Fetch completion statuses
            const statusParams = new URLSearchParams({
                wstoken: effectiveToken!,
                wsfunction: 'core_completion_get_activities_completion_status',
                moodlewsrestformat: 'json',
                courseid: String(course.id),
                userid: String(userId),
            });

            // 2. Also fetch course contents to get real module names
            const contentsParams = new URLSearchParams({
                wstoken: token,
                wsfunction: 'core_course_get_contents',
                moodlewsrestformat: 'json',
                courseid: String(course.id),
            });

            const [statusRes, contentsRes] = await Promise.all([
                fetch(`${BASE_URL}/webservice/rest/server.php?${statusParams.toString()}`),
                fetch(`${BASE_URL}/webservice/rest/server.php?${contentsParams.toString()}`)
            ]);

            const statusData = await statusRes.json();
            const contentsData = await contentsRes.json();

            // Create a map for module names
            const moduleNameMap: Record<number, string> = {};
            if (Array.isArray(contentsData)) {
                contentsData.forEach((section: any) => {
                    if (section.modules) {
                        section.modules.forEach((mod: any) => {
                            moduleNameMap[mod.id] = mod.name;
                        });
                    }
                });
            }

            if (statusData && statusData.statuses && Array.isArray(statusData.statuses)) {
                statusData.statuses.forEach((status: any) => {
                    // Include any activity that is "In Progress" or "Complete" (state > 0)
                    if (status.state > 0) {
                        timeline.push({
                            id: status.cmid,
                            courseId: course.id,
                            courseName: course.fullname,
                            moduleName: moduleNameMap[status.cmid] || status.modname || 'Lesson Module',
                            modName: status.modname,
                            // Use timecompleted, or fallback to current time if Moodle hasn't set it yet
                            timeCompleted: status.timecompleted > 0 ? status.timecompleted : Math.floor(Date.now() / 1000),
                            status: status.state
                        });
                    }
                });
            }
        });

        await Promise.all(completionPromises);
        return timeline.sort((a, b) => b.timeCompleted - a.timeCompleted);
    } catch (error) {
        console.error('Error fetching activity timeline:', error);
        return [];
    }
}

/**
 * Fetches available certificates for a student.
 * Note: This depends on the specific certificate plugins installed in Moodle.
 * Common ones: mod_customcert, mod_certificate.
 * We also check for 'badge' completion as a proxy if certificates aren't found.
 */
export async function getStudentCertificates(token: string, userId: number): Promise<UserCertificate[]> {
    try {
        const courses = await getUserCourses(token, userId);
        const certificates: UserCertificate[] = [];

        // Method 1: Check for mod_customcert (if the service function exists)
        // Method 2: Fallback to scanning course contents for certificate modules

        for (const course of courses) {
            // Check badges as a fallback for "completion evidence"
            const badgeParams = new URLSearchParams({
                wstoken: token,
                wsfunction: 'core_badges_get_user_badges',
                moodlewsrestformat: 'json',
                userid: String(userId),
                courseid: String(course.id),
            });

            try {
                const badgeRes = await fetch(`${BASE_URL}/webservice/rest/server.php?${badgeParams.toString()}`);
                const badgeData = await badgeRes.json();

                if (badgeData && badgeData.badges && Array.isArray(badgeData.badges)) {
                    badgeData.badges.forEach((badge: any) => {
                        certificates.push({
                            id: badge.id,
                            courseId: course.id,
                            courseName: course.fullname,
                            name: badge.name,
                            url: badge.badgeurl,
                            timeCreated: badge.dateissued || Date.now() / 1000
                        });
                    });
                }
            } catch (e) {
                // Ignore badge fetch errors
            }
        }

        return certificates;
    } catch (error) {
        console.error('Error fetching certificates:', error);
        return [];
    }
}
