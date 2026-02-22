import { NextRequest, NextResponse } from "next/server";
import { getAppAuthContext } from "@/lib/auth/server-session";
import { moodleWebserviceGet, moodleWebservicePost } from "@/lib/moodle/client";
import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";

export async function POST(request: NextRequest) {
    const auth = await getAppAuthContext();
    if (!auth) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { firstname, lastname, email, city, country, phone1, description } = body;

        const adminToken = process.env.MOODLE_ADMIN_TOKEN;
        if (!adminToken) {
            return NextResponse.json({ error: "Server Configuration Error" }, { status: 500 });
        }

        const params = new URLSearchParams();
        params.append("users[0][id]", String(auth.moodleUserId));

        if (firstname) params.append("users[0][firstname]", firstname);
        if (lastname) params.append("users[0][lastname]", lastname);
        if (email) params.append("users[0][email]", email);
        if (city) params.append("users[0][city]", city);
        if (country) params.append("users[0][country]", country);
        if (phone1) params.append("users[0][phone1]", phone1);
        if (description) params.append("users[0][description]", description);

        // Update in Moodle
        // Updating requires POST method so it bypasses fetch cache
        const moodleResponse = await moodleWebservicePost(adminToken, "core_user_update_users", params);

        // Update in Prisma
        await prisma.user.update({
            where: { moodleUserId: auth.moodleUserId },
            data: {
                firstName: firstname || undefined,
                lastName: lastname || undefined,
                email: email || undefined,
            }
        });

        // Yeh command cache clear kar degi taakay page pe new details nzar ayain!
        revalidatePath("/dashboard/profile");

        return NextResponse.json({ success: true, moodleResponse });
    } catch (error) {
        console.error("Failed to update profile", error);
        return NextResponse.json({ error: "Failed to update profile", details: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
    }
}
