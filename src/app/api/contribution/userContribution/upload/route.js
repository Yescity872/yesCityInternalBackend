// app/api/contribution/userContribution/upload/route.js
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req) {
  try {
    const formData = await req.formData();

    const file = formData.get('file');
    const type = formData.get('type'); // 'image' or 'video'

    if (!file || !(file instanceof File)) {
      return new Response(
        JSON.stringify({ error: 'Invalid or missing file' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate type
    if (type === 'image' && !file.type.startsWith('image/')) {
      return new Response(
        JSON.stringify({ error: 'Invalid image file type' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    if (type === 'video' && !file.type.startsWith('video/')) {
      return new Response(
        JSON.stringify({ error: 'Invalid video file type' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate size
    const maxSize = type === 'video' ? 50 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return new Response(
        JSON.stringify({
          error: `File too large. Maximum size is ${type === 'video' ? '50MB' : '5MB'}`,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: type === 'video' ? 'video' : 'image',
          folder: 'contributions',
          transformation:
            type === 'image'
              ? [
                  { width: 1200, height: 800, crop: 'limit' },
                  { quality: 'auto' },
                  { fetch_format: 'auto' },
                ]
              : [{ quality: 'auto' }],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(buffer);
    });

    return new Response(
      JSON.stringify({
        success: true,
        url: result.secure_url,
        publicId: result.public_id,
        resourceType: result.resource_type,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'Upload failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
