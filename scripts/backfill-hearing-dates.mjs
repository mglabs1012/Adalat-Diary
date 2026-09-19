/**
 * One-off migration: give every existing matter its diary days.
 *
 * Until now a record only appeared in the diary through `nextDate`, so a
 * matter entered with a previous date and no next date — most of an imported
 * register — sat on no page at all. `hearingDates` is the array of every day
 * a matter occupies, and Mongoose only fills it on writes, so records saved
 * before v0.9 need it derived once from the dates they already carry.
 *
 * Safe to re-run: it only writes where the derived array differs.
 *
 *   npm run migrate:dates
 */
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'adalat_diary';

if (!uri || uri.includes('<user>')) {
  console.error('MONGODB_URI is not set. Copy .env.example to .env.local and fill it in.');
  process.exit(1);
}

/** Mirrors lib/utils/date#toDiaryDay — UTC midnight, matching how dates are stored. */
function toDiaryDay(value) {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** Mirrors lib/data/hearingDates#computeHearingDates. */
function computeHearingDates(doc) {
  const seen = new Map();
  const add = (value) => {
    const day = toDiaryDay(value);
    if (day) seen.set(day.getTime(), day);
  };
  add(doc.preDate);
  add(doc.nextDate);
  for (const entry of doc.history ?? []) add(entry?.date);
  return [...seen.values()].sort((a, b) => a - b);
}

const sameDays = (a, b) =>
  a.length === b.length && a.every((d, i) => new Date(b[i]).getTime() === d.getTime());

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });

try {
  await client.connect();
  const cases = client.db(dbName).collection('cases');

  const total = await cases.countDocuments({});
  console.log(`Scanning ${total} record(s)…`);

  const operations = [];
  let unchanged = 0;
  let undated = 0;

  const cursor = cases.find({}, { projection: { preDate: 1, nextDate: 1, history: 1, hearingDates: 1 } });
  for await (const doc of cursor) {
    const hearingDates = computeHearingDates(doc);
    if (!doc.nextDate) undated += 1;

    if (Array.isArray(doc.hearingDates) && sameDays(hearingDates, doc.hearingDates)) {
      unchanged += 1;
      continue;
    }
    operations.push({ updateOne: { filter: { _id: doc._id }, update: { $set: { hearingDates } } } });
  }

  if (operations.length) {
    // Chunked so a large practice does not build one enormous write command.
    for (let i = 0; i < operations.length; i += 500) {
      const chunk = operations.slice(i, i + 500);
      await cases.bulkWrite(chunk, { ordered: false });
      console.log(`  wrote ${Math.min(i + chunk.length, operations.length)}/${operations.length}`);
    }
  }

  await cases.createIndex({ ownerId: 1, hearingDates: 1 });

  console.log(`Updated ${operations.length}, already correct ${unchanged}.`);
  console.log(`${undated} record(s) carry no next date — these are the ones that were invisible.`);
  console.log('Index ownerId_1_hearingDates_1 is in place.');
} finally {
  await client.close();
}
