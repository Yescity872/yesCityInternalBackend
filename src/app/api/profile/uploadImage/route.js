import { NextResponse } from 'next/server';
import cloudinary from '@/lib/cloudinary';
import { withAuth } from '@/middleware/auth';
import { connectToDatabase } from '@/lib/db';
import User from '@/models/User';

// Helper function to extract public_id from Cloudinary URL
const getPublicIdFromUrl = (url) => {
  if (!url) return null;
  const parts = url.split('/');
  const filename = parts[parts.length - 1];
  const publicId = filename.split('.')[0];
  return `user_profiles/${publicId}`;
};

// Helper function to compress image if needed
const compressImage = async (buffer, originalSize) => {
  // If file is already small enough, return as is
  if (originalSize < 1024 * 1024) { // Less than 1MB
    return buffer;
  }

  // For larger files, you might want to implement client-side compression
  // or use a library like 'sharp' for server-side compression
  return buffer;
};

// Cloudinary upload with retry logic and timeout handling
const uploadToCloudinary = async (buffer, uploadOptions, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Upload attempt ${attempt}/${maxRetries}`);
      
      const result = await new Promise((resolve, reject) => {
        // Set a timeout for the upload (30 seconds)
        const timeoutId = setTimeout(() => {
          reject(new Error(`Upload timeout after 30 seconds (attempt ${attempt})`));
        }, 30000);

        cloudinary.uploader.upload_stream(
          {
            ...uploadOptions,
            // Reduce timeout-sensitive options for reliability
            timeout: 60000, // 60 seconds timeout
            resource_type: "auto",
            // Use eager transformation to process immediately
            eager: [
              { width: 400, height: 400, crop: "fill", gravity: "face", quality: "auto" }
            ],
            eager_async: false, // Synchronous processing
          },
          (error, result) => {
            clearTimeout(timeoutId);
            if (error) {
              console.error(`Cloudinary upload error (attempt ${attempt}):`, error);
              reject(error);
            } else {
              console.log(`Upload successful on attempt ${attempt}`);
              resolve(result);
            }
          }
        ).end(buffer);
      });

      return result;
    } catch (error) {
      console.error(`Upload attempt ${attempt} failed:`, error);
      
      // If it's the last attempt, throw the error
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
      console.log(`Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

export const POST = withAuth(async (req) => {
  try {
    const { userId } = req.user;
    const formData = await req.formData();
    const file = formData.get("file");

    // Validate file exists and is actually a File object
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No valid file uploaded" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: "Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed." 
      }, { status: 400 });
    }

    // Reduced file size limit to prevent timeouts (2MB instead of 5MB)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: "File too large. Maximum size is 2MB. Please compress your image." 
      }, { status: 413 });
    }

    console.log(`Processing file: ${file.name}, size: ${file.size} bytes`);

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    let buffer = Buffer.from(arrayBuffer);
    
    // Compress if needed
    buffer = await compressImage(buffer, file.size);

    // Connect to database and find user
    await connectToDatabase();
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Store old image URL for cleanup
    const oldImageUrl = user.profileImage;

    // Upload options optimized to prevent timeouts
    const uploadOptions = {
      folder: "user_profiles",
      public_id: `user_${userId}_${Date.now()}`,
      // Simplified transformation to reduce processing time
      transformation: [
        { width: 400, height: 400, crop: "fill", gravity: "face" },
        { quality: "auto:good" }, // Good quality but faster processing
        { fetch_format: "auto" }
      ],
      overwrite: true,
      // Additional options to improve reliability
      use_filename: false,
      unique_filename: true,
      invalidate: true, // Clear CDN cache
    };

    console.log('Starting Cloudinary upload...');
    const result = await uploadToCloudinary(buffer, uploadOptions);
    console.log('Upload completed successfully');

    // Update user's profile image in database
    user.profileImage = result.secure_url;
    if(! user.firstProfile){
      user.firstProfile = true;
      user.contributionPoints += 3;
    } 
    
    await user.save();

    // Clean up old image from Cloudinary (run in background)
    if (oldImageUrl) {
      // Don't await this to avoid blocking the response
      setImmediate(async () => {
        try {
          const oldPublicId = getPublicIdFromUrl(oldImageUrl);
          if (oldPublicId) {
            await cloudinary.uploader.destroy(oldPublicId);
            console.log('Old image cleaned up successfully');
          }
        } catch (cleanupError) {
          console.warn("Failed to cleanup old image:", cleanupError);
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: "Profile image updated successfully",
      imageUrl: result.secure_url,
      user: {
        id: user._id,
        profileImage: result.secure_url
      }
    });

  } catch (error) {
    console.error("Upload error:", error);
    
    // Handle timeout errors specifically
    if (error.name === 'TimeoutError' || error.message?.includes('timeout') || error.message?.includes('Request Timeout')) {
      return NextResponse.json({ 
        error: "Upload timed out. Please try with a smaller image or check your connection.",
        code: "UPLOAD_TIMEOUT"
      }, { status: 408 });
    }
    
    // Handle specific Cloudinary errors
    if (error.http_code === 413 || error.message?.includes('File size too large')) {
      return NextResponse.json({ 
        error: "File too large for upload. Please compress your image." 
      }, { status: 413 });
    }
    
    if (error.message?.includes('Invalid image file')) {
      return NextResponse.json({ 
        error: "Invalid or corrupted image file" 
      }, { status: 400 });
    }

    // Handle network/connection errors
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNRESET') {
      return NextResponse.json({ 
        error: "Network error. Please check your connection and try again.",
        code: "NETWORK_ERROR"
      }, { status: 503 });
    }

    // Generic error response
    return NextResponse.json({ 
      error: "Upload failed. Please try again.",
      code: "UPLOAD_ERROR",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
});

// Health check endpoint
export const GET = async () => {
  return NextResponse.json({ 
    status: "ok", 
    message: "Image upload endpoint is available",
    maxFileSize: "2MB",
    allowedTypes: ["JPEG", "PNG", "WebP", "GIF"]
  });
};