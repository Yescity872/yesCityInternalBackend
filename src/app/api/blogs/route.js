import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db'; // Utility to connect to MongoDB
import Blog from '@/models/Blog';

// Fetch all blogs
export async function GET() {
  try {
    await connectToDatabase();
    const blogs = await Blog.find();
    return NextResponse.json(blogs);
  } catch (error) {
    console.error('Error fetching blogs:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
