// utils/handlePost.js
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';

export async function handlePost(Model, request) {
  try {
    await connectToDatabase();
    const body = await request.json();

    let savedDocs;

    if (Array.isArray(body)) {
      // If array of objects → insert many
      savedDocs = await Model.insertMany(body);
    } else {
      // If single object → create one
      const newDocument = new Model(body);
      savedDocs = await newDocument.save();
    }

    return NextResponse.json(savedDocs, { status: 201 });
  } catch (error) {
    console.error('Error in POST:', error);
    return NextResponse.json(
      { error: 'Failed to create document' },
      { status: 500 }
    );
  }
}
