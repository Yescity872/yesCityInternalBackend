// api/chat/uploadMedia/route.js

import { v2 as cloudinary } from 'cloudinary';
import { withAuth } from '@/middleware/auth';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const POST = withAuth(async (req) => {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const messageType = formData.get('messageType'); // 'image' or 'video'

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate file type and size
    const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    const allowedVideoTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv', 'video/webm'];
    
    if (messageType === 'image' && !allowedImageTypes.includes(file.type)) {
      return new Response(JSON.stringify({ error: 'Invalid image file type' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    if (messageType === 'video' && !allowedVideoTypes.includes(file.type)) {
      return new Response(JSON.stringify({ error: 'Invalid video file type' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const maxSize = messageType === 'image' ? 5 * 1024 * 1024 : 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return new Response(JSON.stringify({ 
        error: `File size must be less than ${messageType === 'image' ? '5MB' : '50MB'}` 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Convert file to buffer for Cloudinary
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: messageType === 'video' ? 'video' : 'image',
          folder: 'chat-media', // Organize uploads in a folder
          quality: 'auto:good', // Optimize quality
          fetch_format: 'auto', // Auto-optimize format
          ...(messageType === 'video' && {
            video_codec: 'h264', // Ensure compatibility
            audio_codec: 'aac',
          }),
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            reject(error);
          } else {
            resolve(result);
          }
        }
      );
      
      uploadStream.end(buffer);
    });

    return new Response(JSON.stringify({ 
      success: true,
      mediaUrl: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      resourceType: uploadResult.resource_type,
      format: uploadResult.format,
      bytes: uploadResult.bytes
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error uploading media:', error);
    return new Response(JSON.stringify({ error: 'Failed to upload media' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});