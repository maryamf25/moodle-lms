import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getAppAuthContext } from '@/lib/auth/server-session';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'application/pdf',
  'text/plain',
  'application/zip',
]);

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

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

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'support');
    await fs.mkdir(uploadsDir, { recursive: true });

    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 8);
    const safeName = sanitizeFileName(file.name);
    const storageName = `${timestamp}-${random}-${safeName}`;
    const filePath = path.join(uploadsDir, storageName);

    const arrayBuffer = await file.arrayBuffer();
    await fs.writeFile(filePath, Buffer.from(arrayBuffer));

    return NextResponse.json({
      success: true,
      storageName,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      url: `/uploads/support/${storageName}`,
    });
  } catch (error) {
    console.error('[support][upload] failed', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
