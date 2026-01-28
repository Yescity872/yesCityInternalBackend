import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db'; // Utility to connect to MongoDB
import Blog from '@/models/Blog';

// Fetch a single blog by ID
export async function GET(req, { params }) {
  await connectToDatabase();
  const { id } = params;

  try {
    const blog = await Blog.findById(id);
    if (!blog) {
      return NextResponse.json({ message: 'Blog not found' }, { status: 404 });
    }
    return NextResponse.json(blog);
  } catch (error) {
    console.error('Error fetching blog:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
