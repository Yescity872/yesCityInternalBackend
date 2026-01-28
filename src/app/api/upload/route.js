import { NextResponse } from 'next/server';
import cloudinary from '@/lib/cloudinary';
import dbConnect from '@/lib/db';

export async function POST(request) {
  await dbConnect();
  try {
    const body = await request.json();
    // Expecting { files: [ { dataUrl: 'data:image/..;base64,...' }, ... ] }
    const files = Array.isArray(body.files) ? body.files : [];
    // Basic limits
    const MAX_FILES = 6;
    const MAX_BYTES = 8 * 1024 * 1024; // 8MB per file approx
    const ALLOWED = ['image/', 'video/'];
    if (files.length === 0) return NextResponse.json({ success: false, message: 'No files provided' }, { status: 400 });
    if (files.length > MAX_FILES) return NextResponse.json({ success: false, message: `Too many files. Max ${MAX_FILES}` }, { status: 400 });

    const uploaded = [];
    for (const f of files) {
      if (!f || typeof f.dataUrl !== 'string') continue;
      // dataUrl format: data:<mime>;base64,<data>
      const m = f.dataUrl.match(/^data:([^;]+);base64,(.*)$/);
      if (!m) return NextResponse.json({ success: false, message: 'Invalid dataUrl format' }, { status: 400 });
      const mime = m[1];
      const b64 = m[2] || '';
      const isAllowed = ALLOWED.some(pref => mime.startsWith(pref));
      if (!isAllowed) return NextResponse.json({ success: false, message: `Unsupported media type: ${mime}` }, { status: 400 });
      // rough size check: base64 length -> bytes = (len * 3) / 4
      const approxBytes = Math.floor((b64.length * 3) / 4);
      if (approxBytes > MAX_BYTES) return NextResponse.json({ success: false, message: `File too large (max ${MAX_BYTES} bytes)` }, { status: 413 });
      // upload
      const res = await cloudinary.uploader.upload(f.dataUrl, { resource_type: 'auto', folder: 'yescity/chat' });
      uploaded.push(res.secure_url);
    }
    return NextResponse.json({ success: true, data: uploaded });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
