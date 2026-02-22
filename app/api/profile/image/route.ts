import { NextRequest, NextResponse } from 'next/server';
import { getAppAuthContext } from '@/lib/auth/server-session';
import { uploadToS3 } from '@/lib/aws/s3';
import { prisma } from '@/lib/db/prisma';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB Limit

export async function POST(request: NextRequest) {
    const auth = await getAppAuthContext();

    // Agar user logged in nahi hai to error dein
    if (!auth || !auth.moodleUserId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
        }

        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({ error: 'Image must be less than 5MB' }, { status: 400 });
        }

        // File ko Buffer mein convert karna taake S3 pe upload ho sakay
        const arrayBuffer = await file.arrayBuffer();
        const fileBuffer = Buffer.from(arrayBuffer);

        // AWS S3 Utility function call karein
        const imageUrl = await uploadToS3(fileBuffer, file.name, file.type, 'profile-images');

        // Database mein user ka record update karein nayi image URL ke sath
        await prisma.user.update({
            where: {
                moodleUserId: auth.moodleUserId
            },
            data: {
                profileImage: imageUrl
            }
        });

        return NextResponse.json({ success: true, url: imageUrl });

    } catch (error) {
        console.error('[profile][image-upload] error:', error);
        return NextResponse.json({ error: 'Failed to upload profile picture' }, { status: 500 });
    }
}
