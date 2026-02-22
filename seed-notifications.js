const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany();
    if (users.length === 0) {
        console.log("No users found in the database. Please create a user first.");
        return;
    }

    // Delete existing test notifications
    await prisma.notification.deleteMany({});
    console.log("Cleared old test notifications.");

    for (const user of users) {
        console.log(`Adding test notifications for user: ${user.username} (${user.id})`);

        const notifications = [
            {
                userId: user.id,
                title: "Welcome to EduMeUp!",
                message: "Thank you for joining our platform. Start exploring courses today.",
                type: "SYSTEM",
                isRead: false,
                actionUrl: "/dashboard",
            },
            {
                userId: user.id,
                title: "New Course Available",
                message: "A new course 'Introduction to Next.js' has been added to the catalog.",
                type: "COURSE_UPDATE",
                isRead: false,
                actionUrl: "/#courses",
            },
            {
                userId: user.id,
                title: "Profile Incomplete",
                message: "Please complete your profile by adding a profile picture.",
                type: "SYSTEM",
                isRead: true, // Example of read notification
                actionUrl: "/dashboard/profile",
            }
        ];

        for (const notif of notifications) {
            await prisma.notification.create({
                data: notif
            });
        }
    }

    console.log(`Successfully added test notifications for ${users.length} users!`);
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
