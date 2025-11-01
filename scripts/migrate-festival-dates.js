import 'dotenv/config';
import connectToDatabase from '../src/lib/db.js';
import Festival from '../src/models/Festivals.js';

async function migrate() {
  try {
    await connectToDatabase();
    console.log('Connected to DB — starting festival date migration');

    const festivals = await Festival.find({}).lean();
    let updated = 0;

    for (const f of festivals) {
      const current = f.date;
      // If it's already a Date object (ISO stored), skip
      if (!current) continue;

      // If stored as a string, convert
      if (typeof current === 'string') {
        const parsed = new Date(current);
        if (!Number.isNaN(parsed.getTime())) {
          await Festival.findByIdAndUpdate(f._id, { date: parsed }, { new: true });
          updated++;
          console.log(`Updated festival ${f._id} (${f.name}) -> ${parsed.toISOString()}`);
        } else {
          console.warn(`Skipping ${f._id} (${f.name}): unparseable date value:`, current);
        }
      } else {
        // If it's already a Date instance or stored as BSON Date, nothing to do
      }
    }

    console.log(`Migration complete. Updated ${updated} festival(s).`);
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
