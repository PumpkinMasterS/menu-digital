import { MongoClient, Db, Document } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

let client: MongoClient | null = null;
let db: Db | null = null;
let ordersIndexesEnsured = false;

const uri = process.env.MONGODB_URI || '';
const dbNameFromUri = () => {
  // crude parse: mongodb://.../<db>
  try {
    const path = new URL(uri).pathname;
    return path && path.length > 1 ? path.slice(1) : 'menu_digital';
  } catch {
    return 'menu_digital';
  }
};

export async function connect(): Promise<Db> {
  if (!uri) throw new Error('Missing MONGODB_URI in environment');
  if (db) return db;
  client = new MongoClient(uri);
  await client.connect();
  db = client.db(dbNameFromUri());
  return db;
}

export async function getDb(): Promise<Db> {
  if (db) return db;
  return connect();
}

export async function close(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}

export async function getCollection<T extends Document = any>(name: string) {
  const database = await getDb();
  const collection = database.collection<T>(name);
  if (name === 'orders' && !ordersIndexesEnsured) {
    try {
      // Índices para melhorar listagens por status e ordenação por createdAt
      await (collection as any).createIndex({ status: 1, createdAt: -1 }, { name: 'idx_status_createdAt' });
      await (collection as any).createIndex({ createdAt: -1 }, { name: 'idx_createdAt_desc' });
      await (collection as any).createIndex({ status: 1 }, { name: 'idx_status' });
      ordersIndexesEnsured = true;
    } catch (e) {
      // falha silenciosa em criação de índices para não bloquear fluxo
    }
  }
  return collection;
}