import { NextRequest, NextResponse } from 'next/server';
import { getAppAuthContext } from '@/lib/auth/server-session';
import { uploadToS3 } from '@/lib/aws/s3'; // 👈 Import S3 utility

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'application/pdf',
  'text/plain',
  'application/zip',
]);

export async function POST(request: NextRequest) {
  const auth = await getAppAuthContext();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'File type not allowed' }, { status: 400 });
    }

    // Convert file to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // 👈 Upload to AWS S3 instead of local fs
    const fileUrl = await uploadToS3(fileBuffer, file.name, file.type, 'support-tickets');

    // Return the response with S3 URL
    return NextResponse.json({
      success: true,
      storageName: fileUrl.split('/').pop(), // Get the generated file name from URL
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      url: fileUrl, // 👈 This is now an S3 URL
    });
  } catch (error) {
    console.error('[support][upload] failed', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
