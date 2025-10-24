/*
Usage:
  node backend/scripts/delete-user.js --email="admin@menu.com" [--uri="mongodb+srv://..."]

Environment:
  MONGODB_URI pode ser definido em backend/.env ou como env var.

Descrição:
  - Remove um utilizador pelo campo { email } na coleção 'users'.
  - Imprime o número de documentos removidos.
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

    if (!uri) {
      console.error('ERROR: MONGODB_URI não fornecida. Use --uri ou defina env MONGODB_URI.');
      process.exit(1);
    }
    if (!email) {
      console.error('ERROR: email não fornecido. Use --email ou defina env ADMIN_EMAIL.');
      process.exit(1);
    }

    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db();
    const users = db.collection('users');

    const res = await users.deleteOne({ email });
    console.log(`Removidos: ${res.deletedCount} documento(s) com email ${email}.`);

    await client.close();
    process.exit(0);
  } catch (err) {
    console.error('FATAL:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();