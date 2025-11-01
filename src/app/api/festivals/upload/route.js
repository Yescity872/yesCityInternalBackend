import { NextResponse } from 'next/server';
import cloudinary from '@/lib/cloudinary';
import { connectToDatabase } from '@/lib/db';

// POST multipart/form-data with field `image` (File) and optional `folder`
export async function POST(req) {
  try {
    await connectToDatabase();

    // Use Web Request formData() to parse multipart body
    const form = await req.formData();
    const file = form.get('image');
    const folder = form.get('folder') || 'festivals';

    if (!file || typeof file === 'string') {
      return NextResponse.json({ success: false, message: 'Missing image file in form-data (field name: image)' }, { status: 400 });
    }

    // Read file as ArrayBuffer and convert to base64 data URI
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mime = file.type || 'application/octet-stream';
    const dataUri = `data:${mime};base64,${buffer.toString('base64')}`;

    const uploadRes = await cloudinary.uploader.upload(dataUri, {
      folder: folder.toString(),
      use_filename: true,
      unique_filename: true,
      overwrite: false,
    });

    return NextResponse.json({ success: true, data: uploadRes }, { status: 201 });
  } catch (err) {
    console.error('Error uploading festival image:', err);
    return NextResponse.json({ success: false, message: 'Upload failed', error: err.message }, { status: 500 });
  }
}
