const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany();

    if (users.length === 0) {
        console.log("No users found.");
        return;
    }

    // Ensure we have a dummy course catalog entry
    let course = await prisma.courseCatalog.findFirst();

    if (!course) {
        course = await prisma.courseCatalog.create({
            data: {
                moodleCourseId: 999,
                shortname: "DEMO-101",
                fullname: "Introduction to Next.js Advanced Features",
                summary: "This is a dummy course for testing certificates.",
                isVisible: true,
                price: 0,
            }
        });
        console.log("Dummy Course created.");
    }

    for (const user of users) {
        // Enrol ALL users to this course with 100% progress
        const existingEnrollment = await prisma.userCourseEnrollment.findUnique({
            where: {
                moodleUserId_moodleCourseId: {
                    moodleUserId: user.moodleUserId,
                    moodleCourseId: course.moodleCourseId
                }
            }
        });

        if (!existingEnrollment) {
            await prisma.userCourseEnrollment.create({
                data: {
                    userId: user.id,
                    courseCatalogId: course.id,
                    moodleUserId: user.moodleUserId,
                    moodleCourseId: course.moodleCourseId,
                    isActive: true,
                    progress: 100, // Important: 100% completion for Certificates
                    grade: 'A+',
                    enrolledAt: new Date(),
                }
            });
            console.log(`Enrolled user ${user.username} in course with 100% progress.`);
        } else {
            await prisma.userCourseEnrollment.update({
                where: { id: existingEnrollment.id },
                data: { progress: 100, grade: 'A+' }
            });
            console.log(`Updated progress to 100% for user ${user.username}.`);
        }
    }

    console.log(`Successfully processed enrollments for all ${users.length} users!`);
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
