// Reordena categorias no MongoDB Atlas ajustando o campo `order`
// Uso: node scripts/reorder_categories.js

require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI não definido no .env');
  process.exit(1);
}

// Defina aqui a ordem desejada por nome
// Ajuste conforme necessário para o seu catálogo
const desiredOrderByName = [
  'Bebidas',
  'Hambúrgueres',
  'Acompanhamentos',
  'Sobremesas',
];

async function run() {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    const db = client.db();
    const col = db.collection('categories');

    const now = new Date().toISOString();
    const categories = await col.find({}).toArray();
    if (categories.length === 0) {
      console.log('⚠️  Nenhuma categoria encontrada. Execute: npm run seed');
      return;
    }

    console.log('📋 Ordem atual (name -> order):');
    categories
      .slice()
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || String(a.name).localeCompare(String(b.name)))
      .forEach((c) => console.log(`- ${c.name} -> ${c.order ?? '(sem order)'}`));

    const nameToCat = new Map(categories.map((c) => [c.name, c]));

    // Constrói nova lista respeitando desiredOrder e adicionando restantes ao final
    const reordered = [];
    for (const name of desiredOrderByName) {
      const cat = nameToCat.get(name);
      if (cat) reordered.push(cat);
    }

    const remaining = categories.filter((c) => !desiredOrderByName.includes(c.name));
    // Mantém ordem existente para os não mapeados, com fallback por nome
    remaining.sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || String(a.name).localeCompare(String(b.name)));
    for (const cat of remaining) reordered.push(cat);

    // Aplica novos valores de order sequenciais começando em 1
    const bulkOps = [];
    let idx = 1;
    for (const cat of reordered) {
      const newOrder = idx++;
      const oldOrder = cat.order;
      if (oldOrder === newOrder) continue; // evita update desnecessário
      const filter = cat.id ? { id: cat.id } : { _id: cat._id };
      bulkOps.push({
        updateOne: {
          filter,
          update: { $set: { order: newOrder, updatedAt: now } },
        },
      });
    }

    if (bulkOps.length === 0) {
      console.log('ℹ️  Nenhuma mudança necessária na ordenação.');
    } else {
      const res = await col.bulkWrite(bulkOps, { ordered: false });
      console.log(`✅ Ordenação atualizada. Modified: ${res.modifiedCount}`);
    }

    const after = await col.find({}).sort({ order: 1, name: 1 }).toArray();
    console.log('📦 Nova ordem (name -> order):');
    after.forEach((c) => console.log(`- ${c.name} -> ${c.order}`));
  } catch (err) {
    console.error('❌ Erro ao reordenar categorias:', err.message || err);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

run();