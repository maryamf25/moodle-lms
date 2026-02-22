import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding dummy orders...');

    // Fetch existing users (students/parents) and courses
    const users = await prisma.user.findMany({
        where: { role: { in: ['student', 'parent'] } },
        take: 5,
    });

    const courses = await prisma.courseCatalog.findMany({
        take: 5,
    });

    if (users.length === 0) {
        console.error('❌ No users found. Please ensure users exist in the database.');
        return;
    }

    if (courses.length === 0) {
        console.error('❌ No courses found. Please ensure courses exist in the database.');
        return;
    }

    console.log(`✅ Found ${users.length} users and ${courses.length} courses.`);

    const statuses = ['COMPLETED', 'REFUNDED', 'PENDING'];

    // Create 2 orders per user
    for (const user of users) {
        for (let i = 0; i < 2; i++) {
            const course = courses[Math.floor(Math.random() * courses.length)];
            const price = Number(course.price) > 0 ? Number(course.price) : 1500 + Math.floor(Math.random() * 3500);
            const status = statuses[Math.floor(Math.random() * statuses.length)];
            const daysAgo = Math.floor(Math.random() * 90); // Random date within last 90 days

            const createdAt = new Date();
            createdAt.setDate(createdAt.getDate() - daysAgo);

            try {
                const order = await prisma.order.create({
                    data: {
                        userId: user.id,
                        totalAmount: price,
                        status,
                        paymentMethod: 'SAFEPAY',
                        transactionId: `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
                        createdAt,
                        items: {
                            create: [{
                                courseId: course.id,
                                price,
                                quantity: 1,
                            }],
                        },
                    },
                });
                console.log(`  ✔ Order created: ${order.id} | User: ${user.email} | Course: ${course.fullname} | PKR ${price} | ${status}`);
            } catch (err) {
                console.warn(`  ⚠ Skipped order for user ${user.email}:`, (err as Error).message);
            }
        }
    }

    console.log('\n✅ Dummy orders seeded successfully!');
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
