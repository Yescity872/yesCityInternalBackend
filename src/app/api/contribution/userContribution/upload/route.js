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
    console.log('Upload API called');
    console.log('Request method:', req.method);
    console.log('Content-Type:', req.headers.get('content-type'));

    const formData = await req.formData();
    console.log('FormData received');

    // Log all form data entries
    for (const [key, value] of formData.entries()) {
      console.log(
        `FormData entry: ${key}`,
        value instanceof File ? `File: ${value.name}` : value
      );
    }

    const file = formData.get('file');
    const type = formData.get('type'); // 'image' or 'video'

    console.log('File:', file);
    console.log('Type:', type);

    if (!file) {
      console.log('No file found in formData');
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!(file instanceof File)) {
      console.log('File is not a File instance:', typeof file);
      return new Response(
        JSON.stringify({ error: 'Invalid file format' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('File details:', {
      name: file.name,
      size: file.size,
      type: file.type
    });

    // Validate file type
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

    // Validate file size
    const maxSize = type === 'video' ? 50 * 1024 * 1024 : 5 * 1024 * 1024; // 50MB for video, 5MB for image
    if (file.size > maxSize) {
      return new Response(
        JSON.stringify({
          error: `File too large. Maximum size is ${type === 'video' ? '50MB' : '5MB'}`
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('Starting Cloudinary upload...');

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    console.log('File converted to buffer, size:', buffer.length);

    // Upload to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: type === 'video' ? 'video' : 'image',
          folder: 'contributions',
          transformation:
            type === 'image'
              ? [
                  { width: 1200, height: 800, crop: 'limit' },
                  { quality: 'auto' },
                  { fetch_format: 'auto' }
                ]
              : [{ quality: 'auto' }]
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            reject(error);
          } else {
            console.log('Cloudinary upload success:', result?.secure_url);
            resolve(result);
          }
        }
      );

      uploadStream.end(buffer);
    });

    const result = uploadResult;

    return new Response(
      JSON.stringify({
        success: true,
        url: result.secure_url,
        publicId: result.public_id,
        resourceType: result.resource_type
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Upload error:', error);
    return new Response(
      JSON.stringify({
        error: 'Upload failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// OPTIONS for CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
