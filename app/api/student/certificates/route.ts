import { NextRequest, NextResponse } from 'next/server';
import { getAppAuthContext } from '@/lib/auth/server-session';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
    const auth = await getAppAuthContext();

    if (!auth) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // 1. User ke saare enrolled courses fetch karein (Progress ki koi shart nahi)
        const enrollments = await prisma.userCourseEnrollment.findMany({
            where: { user: { moodleUserId: auth.moodleUserId } },
            include: { courseCatalog: true },
        });

        const availableCertificates = [];

        // Aapki .env me base URL aur token mojood hain, unko sahi field names se fetch kiya hai
        const baseUrl = process.env.NEXT_PUBLIC_MOODLE_URL || 'https://moodle.edumeup.com';
        const token = process.env.MOODLE_TOKEN;

        // 2. Har course ke liye Moodle API call karein aur check karein
        for (const enrollment of enrollments) {
            try {
                // Moodle se is course ka poora content mangwayen
                const url = `${baseUrl}/webservice/rest/server.php?wstoken=${token}&wsfunction=core_course_get_contents&moodlewsrestformat=json&courseid=${enrollment.moodleCourseId}`;
                const res = await fetch(url);

                if (res.ok) {
                    const contents = await res.json();

                    // Error handling agar API response galat ho
                    if (!Array.isArray(contents)) continue;

                    // Course ke har section aur module ko check karein
                    for (const section of contents) {
                        for (const module of section.modules) {

                            // Agar module "customcert" hai aur Moodle ne usay "uservisible" (Unlock) kar diya hai
                            if (module.modname === 'customcert' && module.uservisible === true) {
                                availableCertificates.push({
                                    id: module.id.toString(), // Ye cmid (Course Module ID) hai jo Moodle ko chahiye hoti hai
                                    courseName: enrollment.courseCatalog.fullname,
                                    completedAt: new Date().toISOString(),
                                    grade: enrollment.grade || 'A+',
                                    // Moodle se direct PDF download karne ka link
                                    downloadUrl: `${baseUrl}/mod/customcert/view.php?id=${module.id}&downloadown=1`
                                });
                            }

                        }
                    }
                }
            } catch (err) {
                console.error(`Failed to fetch Moodle contents for course ${enrollment.moodleCourseId}`, err);
            }
        }

        return NextResponse.json({ success: true, certificates: availableCertificates });
    } catch (error) {
        console.error('[certificates][get] error:', error);
        return NextResponse.json({ error: 'Failed to fetch certificates' }, { status: 500 });
    }
}
