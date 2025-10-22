/*
Usage:
  node backend/scripts/reset-admin-password.js --email="admin@example.com" --password="NewStrongPass#2024" [--uri="mongodb+srv://..."]

Environment:
  MONGODB_URI can be set in backend/.env or as env var.

Notes:
  - Uses bcrypt to hash the new password.
  - Updates the user document { email } setting passwordHash and updatedAt.
*/

const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (const a of args) {
    const m = a.match(/^--([^=]+)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

(async () => {
  try {
    const args = parseArgs();
    const email = args.email || process.env.ADMIN_EMAIL;
    const newPassword = args.password || process.env.ADMIN_NEW_PASSWORD;
    const uri = args.uri || process.env.MONGODB_URI;

    if (!uri) {
      console.error('ERROR: MONGODB_URI not provided. Set --uri or env MONGODB_URI.');
      process.exit(1);
    }
    if (!email) {
      console.error('ERROR: admin email not provided. Set --email or env ADMIN_EMAIL.');
      process.exit(1);
    }
    if (!newPassword) {
      console.error('ERROR: new password not provided. Set --password or env ADMIN_NEW_PASSWORD.');
      process.exit(1);
    }

    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db();
    const users = db.collection('users');

    const user = await users.findOne({ email });
    if (!user) {
      console.error(`ERROR: No user found with email ${email}`);
      await client.close();
      process.exit(1);
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    const res = await users.updateOne(
      { email },
      { $set: { passwordHash, updatedAt: new Date().toISOString() } }
    );

    if (res.matchedCount === 0) {
      console.error('ERROR: Update failed, user not matched.');
      process.exit(1);
    }

    console.log(`OK: Password updated for ${email}.`);
    await client.close();
  } catch (err) {
    console.error('FATAL:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();