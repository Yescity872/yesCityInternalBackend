import 'dotenv/config';
import connectToDatabase from '../src/lib/db.js';
import Festival from '../src/models/Festivals.js';

function generateBaseSlug(name) {
  return name.toString().toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

async function run() {
  try {
    await connectToDatabase();
    console.log('Connected to DB — generating slugs');

    const festivals = await Festival.find({}).lean();
    let updated = 0;

    for (const f of festivals) {
      if (f.slug && f.slug.length > 0) continue;

      const base = generateBaseSlug(f.name || f._id.toString());
      let slug = base;

      const existing = await Festival.findOne({ slug });
      if (existing && existing._id.toString() !== f._id.toString()) {
        // collision: append short id
        slug = `${base}-${f._id.toString().slice(-4)}`;
      }

      await Festival.findByIdAndUpdate(f._id, { slug });
      updated++;
      console.log(`Set slug for ${f._id} (${f.name}) -> ${slug}`);
    }

    console.log(`Slug generation complete. Updated ${updated} festival(s).`);
    process.exit(0);
  } catch (err) {
    console.error('Slug generation failed:', err);
    process.exit(1);
  }
}

run();
