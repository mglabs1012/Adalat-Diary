/**
 * One-off migration: make the CRN uniqueness constraint partial.
 *
 * CRN used to be required, so `{ ownerId, crn }` could be a plain unique
 * index. Now that a matter may be opened before the registry issues a CRN,
 * that index would treat every CRN-less matter as a duplicate of the last
 * one. The replacement only applies to documents that actually carry the
 * field.
 *
 * A brand-new database does not need this — Mongoose creates the right index
 * on first connect. Run it once against any database created before v0.5.
 *
 *   node --env-file=.env.local scripts/migrate-crn-index.mjs
 */
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'adalat_diary';

if (!uri || uri.includes('<user>')) {
  console.error('MONGODB_URI is not set. Copy .env.example to .env.local and fill it in.');
  process.exit(1);
}

const WANTED = { unique: true, partialFilterExpression: { crn: { $type: 'string' } } };

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });

try {
  await client.connect();
  const cases = client.db(dbName).collection('cases');

  const existing = await cases.indexes();
  const current = existing.find((i) => i.name === 'ownerId_1_crn_1');

  if (current?.partialFilterExpression) {
    console.log('Already migrated — the CRN index is partial.');
  } else {
    if (current) {
      await cases.dropIndex('ownerId_1_crn_1');
      console.log('Dropped the old unique index.');
    }
    await cases.createIndex({ ownerId: 1, crn: 1 }, WANTED);
    console.log('Created the partial unique index.');
  }

  // Records saved with an empty-string CRN would still collide; normalise them.
  const blanked = await cases.updateMany(
    { crn: { $in: ['', null] } },
    { $unset: { crn: '' } },
  );
  if (blanked.modifiedCount) {
    console.log(`Cleared ${blanked.modifiedCount} empty CRN field(s).`);
  }

  console.log(
    'Indexes now:',
    (await cases.indexes()).map((i) => i.name).join(', '),
  );
} finally {
  await client.close();
}
