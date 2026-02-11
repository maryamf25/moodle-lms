// app/api/webhook/safepay/route.ts
import { enrolUser } from "@/lib/moodle/courses";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        
        // Safepay nesting: data -> notification -> metadata
        const notification = body?.data?.notification;
        const metadata = notification?.metadata;

        // Safepay sometimes sends metadata as an array or an object
        // This helper extracts the value regardless of the format
        const courseId = metadata?.courseId || metadata?.course_id;
        const userId = metadata?.userId || metadata?.user_id;

        console.log("--- SAFEPAY WEBHOOK RECEIVED ---");
        console.log("Full Metadata received:", metadata);
        console.log(`Parsed -> Course: ${courseId}, User: ${userId}`);

        if (notification?.state === "PAID" && courseId && userId) {
            console.log("✅ Data valid. Enrolling in Moodle...");
            await enrolUser(Number(userId), Number(courseId));
            return NextResponse.json({ message: "Enrollment Successful" });
        }

        return NextResponse.json({ message: "Metadata missing or unpaid" });
    } catch (err: any) {
        console.error("Webhook error:", err.message);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}