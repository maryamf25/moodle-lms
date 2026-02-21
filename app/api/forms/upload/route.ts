import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large (max 10MB)' },
        { status: 400 }
      );
    }

    // Create uploads directory
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'forms');
    await fs.mkdir(uploadsDir, { recursive: true });

    // Generate unique filename
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const ext = path.extname(file.name);
    const storageName = `${timestamp}-${random}${ext}`;
    const filePath = path.join(uploadsDir, storageName);

    // Save file
    const buffer = await file.arrayBuffer();
    await fs.writeFile(filePath, Buffer.from(buffer));

    return NextResponse.json({
      success: true,
      storageName,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      url: `/uploads/forms/${storageName}`,
    });
  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
}
