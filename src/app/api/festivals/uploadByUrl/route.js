import { NextResponse } from 'next/server';
import cloudinary from '@/lib/cloudinary';
import { connectToDatabase } from '@/lib/db';

export async function POST(req) {
  try {
    await connectToDatabase();

    const body = await req.json();
    const { url, folder } = body;
    if (!url) {
      return NextResponse.json({ success: false, message: 'Missing url in request' }, { status: 400 });
    }

    // Upload by giving Cloudinary the remote URL — Cloudinary will fetch and store it.
    const uploadRes = await cloudinary.uploader.upload(url, {
      folder: folder || 'festivals',
      use_filename: true,
      unique_filename: true,
      overwrite: false,
    });

    return NextResponse.json({ success: true, data: uploadRes }, { status: 201 });
  } catch (err) {
    console.error('Error uploading image by URL:', err);
    return NextResponse.json({ success: false, message: 'Upload failed', error: err.message }, { status: 500 });
  }
}
