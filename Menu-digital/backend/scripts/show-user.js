/*
Usage:
  node backend/scripts/show-user.js --email="whiswher@gmail.com" [--uri="mongodb+srv://..."]
*/
const { MongoClient } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

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
    const uri = args.uri || process.env.MONGODB_URI;
    if (!uri) { console.error('ERROR: MONGODB_URI não fornecida'); process.exit(1); }
    if (!email) { console.error('ERROR: email não fornecido'); process.exit(1); }

    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db();
    const users = db.collection('users');
    const u = await users.findOne({ email });
    if (!u) { console.log('not found'); process.exit(0); }
    const out = { _id: String(u._id), email: u.email, roles: u.roles, createdAt: u.createdAt, updatedAt: u.updatedAt };
    console.log(JSON.stringify(out, null, 2));
    await client.close();
  } catch (err) {
    console.error('FATAL:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();