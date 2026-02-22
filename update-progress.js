const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Un tamam pehli enrollments ko dhoondein aur kisi aik ki progress 100 kartate hain test ke liye
    const enrollment = await prisma.userCourseEnrollment.findFirst();

    if (!enrollment) {
        console.log("No enrollments found to update.");
        return;
    }

    const updated = await prisma.userCourseEnrollment.update({
        where: { id: enrollment.id },
        data: {
            progress: 100, // Make progress 100%
            grade: 'A',    // Assign a grade
        }
    });

    console.log(`Successfully updated progress to 100% for enrollment mapping to Course ID: ${updated.moodleCourseId} belonging to user ID: ${updated.userId}`);
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
