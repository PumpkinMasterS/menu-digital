"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connect = connect;
exports.getDb = getDb;
exports.close = close;
exports.getCollection = getCollection;
const mongodb_1 = require("mongodb");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
let client = null;
let db = null;
let ordersIndexesEnsured = false;
const uri = process.env.MONGODB_URI || '';
const dbNameFromUri = () => {
    // crude parse: mongodb://.../<db>
    try {
        const path = new URL(uri).pathname;
        return path && path.length > 1 ? path.slice(1) : 'menu_digital';
    }
    catch {
        return 'menu_digital';
    }
};
async function connect() {
    if (!uri)
        throw new Error('Missing MONGODB_URI in environment');
    if (db)
        return db;
    client = new mongodb_1.MongoClient(uri);
    await client.connect();
    db = client.db(dbNameFromUri());
    return db;
}
async function getDb() {
    if (db)
        return db;
    return connect();
}
async function close() {
    if (client) {
        await client.close();
        client = null;
        db = null;
    }
}
async function getCollection(name) {
    const database = await getDb();
    const collection = database.collection(name);
    if (name === 'orders' && !ordersIndexesEnsured) {
        try {
            // Índices para melhorar listagens por status e ordenação por createdAt
            await collection.createIndexes([
                { key: { status: 1, createdAt: -1 }, name: 'idx_status_createdAt' },
                { key: { createdAt: -1 }, name: 'idx_createdAt_desc' },
                { key: { status: 1 }, name: 'idx_status' },
            ]);
            ordersIndexesEnsured = true;
        }
        catch (e) {
            // falha silenciosa em criação de índices para não bloquear fluxo
        }
    }
    return collection;
}
