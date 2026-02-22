import { prisma } from "@/lib/db/prisma";

export async function sendNotification({
    userId,
    title,
    message,
    type,
    actionUrl,
}: {
    userId: string;
    title: string;
    message: string;
    type: string;
    actionUrl?: string;
}) {
    try {
        await prisma.notification.create({
            data: {
                userId,
                title,
                message,
                type,
                actionUrl,
            },
        });
    } catch (error) {
        console.error("Error sending notification:", error);
    }
}
