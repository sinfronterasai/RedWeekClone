// Seed escrow vendor users into the production database
// Run: DATABASE_URL=... node scripts/seed-escrow-users.mjs

import { MongoClient } from 'mongodb';

const uri = process.env.DATABASE_URL;
if (!uri) {
  console.error('DATABASE_URL not set. Source your .env file first.');
  process.exit(1);
}

const client = new MongoClient(uri);

async function main() {
  await client.connect();
  const db = client.db('redweek_clone');
  const users = db.collection('users');

  const vendors = [
    {
      username: 'concord.title',
      email: 'escrow@concordtitle.net',
      password: 'Escrow2026!',
      firstName: 'Concord',
      lastName: 'Title',
      role: 'escrow_vendor',
      createdAt: new Date(),
    },
    {
      username: 'firstam.escrow',
      email: 'escrow@firstam.com',
      password: 'Escrow2026!',
      firstName: 'First American',
      lastName: 'Title',
      role: 'escrow_vendor',
      createdAt: new Date(),
    },
  ];

  for (const user of vendors) {
    const exists = await users.findOne({ username: user.username });
    if (exists) {
      console.log('OK: ' + user.username + ' already exists');
    } else {
      await users.insertOne(user);
      console.log('CREATED: ' + user.username);
    }
  }

  console.log('Done.');
  await client.close();
}

main().catch(e => { console.error(e); process.exit(1); });
