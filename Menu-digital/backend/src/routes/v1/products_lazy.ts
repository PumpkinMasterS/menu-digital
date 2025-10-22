import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { getCollection } from '../../lib/db';
import { ObjectId } from 'mongodb';
import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

// DEV mode detection and in-memory store for products when DB is unavailable
const devMode = !!process.env.DEV_LOGIN_EMAIL || !process.env.MONGODB_URI;
type DevProduct = {
  id: string;
  name: string;
  description?: string;
  order?: number;
  categoryId?: string;
  imageUrl?: string;
  price?: number;
  composition?: any;
  station?: string;
  stockQuantity?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};
const DEV_PRODUCTS: DevProduct[] = [];
const DEV_PRODUCTS_PATH = path.join(__dirname, '../../../products.json');

async function loadDevProducts() {
  try {
    const content = await fs.readFile(DEV_PRODUCTS_PATH, 'utf-8');
    const json = JSON.parse(content);
    const rawItems: any[] = Array.isArray(json) ? json : Array.isArray(json?.items) ? json.items : [];
    if (rawItems.length > 0) {
      const now = new Date().toISOString();
      const mapped: DevProduct[] = rawItems.map((p: any) => ({
        id: String(p.id ?? p._id ?? `dev-${Date.now()}`),
        name: String(p.name ?? 'Produto'),
        description: p.description ?? '',
        order: typeof p.order === 'number' ? p.order : undefined,
        categoryId: p.categoryId ?? undefined,
        imageUrl: p.imageUrl ?? undefined,
        price: typeof p.price === 'number' ? p.price : undefined,
        composition: p.composition ?? undefined,
        station: p.station ?? undefined,
        stockQuantity: typeof p.stockQuantity === 'number' ? p.stockQuantity : -1,
        isActive: typeof p.isActive === 'boolean' ? p.isActive : true,
        createdAt: p.createdAt ?? now,
        updatedAt: p.updatedAt ?? now,
      }));
      DEV_PRODUCTS.splice(0, DEV_PRODUCTS.length, ...mapped);
    }
  } catch {
    // If file missing or invalid, keep current in-memory list
  }
}

async function saveDevProducts() {
  try {
    const payload = { items: DEV_PRODUCTS, page: 1, limit: Math.max(DEV_PRODUCTS.length, 20), total: DEV_PRODUCTS.length };
    await fs.writeFile(DEV_PRODUCTS_PATH, JSON.stringify(payload, null, 2), 'utf-8');
  } catch (err) {
    // Log through app if available; otherwise ignore
  }
}

// Default sample products for DEV mode (if no DB and no local file)
const DEV_SAMPLE_PRODUCTS: DevProduct[] = [
  {
    id: 'prod-1',
    categoryId: 'cat-1',
    name: 'Classic Burger',
    description: 'Hambúrguer clássico com alface, tomate e molho especial',
    price: 7.5,
    stockQuantity: -1,
    imageUrl: undefined,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-2',
    categoryId: 'cat-1',
    name: 'Cheese Burger',
    description: 'Hambúrguer com queijo cheddar derretido',
    price: 8.5,
    stockQuantity: -1,
    imageUrl: undefined,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-3',
    categoryId: 'cat-1',
    name: 'Bacon Burger',
    description: 'Hambúrguer com bacon crocante e molho barbecue',
    price: 9.5,
    stockQuantity: -1,
    imageUrl: undefined,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-4',
    categoryId: 'cat-2',
    name: 'Coca-Cola',
    description: 'Refrigerante gelado',
    price: 2.5,
    stockQuantity: -1,
    imageUrl: undefined,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function sortItems<T extends Record<string, any>>(items: T[], sort: string, dir: 'asc' | 'desc') {
  const factor = dir === 'asc' ? 1 : -1;
  return items.slice().sort((a, b) => {
    const av = a[sort];
    const bv = b[sort];
    if (av == null && bv == null) return 0;
    if (av == null) return -1 * factor;
    if (bv == null) return 1 * factor;
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * factor;
    const as = String(av).toLowerCase();
    const bs = String(bv).toLowerCase();
    if (as < bs) return -1 * factor;
    if (as > bs) return 1 * factor;
    // secondary by name asc
    const an = String(a['name'] ?? '').toLowerCase();
    const bn = String(b['name'] ?? '').toLowerCase();
    if (an < bn) return -1;
    if (an > bn) return 1;
    return 0;
  });
}

function paginate<T>(items: T[], page: number, limit: number) {
  const total = items.length;
  const start = (page - 1) * limit;
  const end = start + limit;
  return { items: items.slice(start, end), total };
}

const productCreateSchema = z
  .object({
    name: z.string().min(1),
    description: z.string().optional(),
    order: z.number().int().optional(),
    categoryId: z.string().optional(),
    imageUrl: z.string().optional().transform(val => val && val.trim() ? val : undefined),
    price: z.number().nonnegative().optional(),
    composition: z.any().optional(),
    station: z.string().optional(),
    stockQuantity: z.number().int().optional().default(-1),
    isActive: z.boolean().optional().default(true),
  })
  .passthrough();

const productUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  order: z.number().int().optional(),
  categoryId: z.string().optional(),
  imageUrl: z.string().optional().transform(val => val && val.trim() ? val : undefined),
  price: z.number().nonnegative().optional(),
  composition: z.any().optional(),
  station: z.string().optional(),
  stockQuantity: z.number().int().optional(),
  isActive: z.boolean().optional(),
}).passthrough();

export const productsRoutes: FastifyPluginAsync = async (app) => {
  // Initialize DEV products persistence when running without DB
  if (devMode) {
    await loadDevProducts();
    if (DEV_PRODUCTS.length === 0) {
      DEV_PRODUCTS.splice(0, DEV_PRODUCTS.length, ...DEV_SAMPLE_PRODUCTS);
      await saveDevProducts();
      app.log.warn('DEV mode: seeded sample products to products.json');
    }
  }
  // Public: list active products, optional filter by categoryId
  app.get('/v1/public/products', async (req, reply) => {
    const querySchema = z
      .object({
        categoryId: z.string().optional(),
        page: z.coerce.number().int().positive().optional().default(1),
        limit: z.coerce.number().int().positive().max(100).optional().default(20),
        sort: z.enum(['order', 'name', 'createdAt']).optional().default('order'),
        dir: z.enum(['asc', 'desc']).optional().default('asc'),
      })
      .strict();
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) return reply.status(400).send({ error: 'Invalid query', details: parsed.error.flatten() });
    const { categoryId, page, limit, sort, dir } = parsed.data;
    try {
      const collection = await getCollection('products');
      
      const filter: Record<string, unknown> = { isActive: true };
      if (categoryId) filter.categoryId = categoryId;

      const sortSpec: Record<string, 1 | -1> = { [sort]: dir === 'asc' ? 1 : -1, name: 1 };

      const cursor = collection.find(filter).sort(sortSpec).skip((page - 1) * limit).limit(limit);
      const items = await cursor.toArray();
      const total = await collection.countDocuments(filter);
      // In public list mapped
      const mapped = items.map((doc: any) => ({
        id: doc.id ?? doc._id?.toString(),
        name: doc.name,
        description: doc.description,
        order: doc.order,
        categoryId: doc.categoryId,
        imageUrl: doc.imageUrl,
        price: doc.price,
        composition: doc.composition,
        station: doc.station,
        stockQuantity: doc.stockQuantity,
        isAvailable: doc.stockQuantity == null || doc.stockQuantity === -1 || doc.stockQuantity > 0,
        isActive: doc.isActive,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      }));
      return reply.send({ items: mapped, page, limit, total });
    } catch (err: any) {
      app.log.warn({ err }, 'Public products GET fallback without DB');
      // DEV-friendly fallback using in-memory store
      const filtered = DEV_PRODUCTS.filter((p) => p.isActive && (!categoryId || p.categoryId === categoryId));
      const sorted = sortItems(filtered, sort, dir);
      const { items, total } = paginate(sorted, page, limit);
      const mapped = items.map((doc) => ({
        id: doc.id,
        name: doc.name,
        description: doc.description,
        order: doc.order,
        categoryId: doc.categoryId,
        imageUrl: doc.imageUrl,
        price: doc.price,
        composition: doc.composition,
        station: doc.station,
        stockQuantity: doc.stockQuantity,
        isAvailable: doc.stockQuantity == null || doc.stockQuantity === -1 || (doc.stockQuantity ?? 0) > 0,
        isActive: doc.isActive,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      }));
      return reply.send({ items: mapped, page, limit, total });
    }
  });

  // Admin: list all products
  app.get('/v1/admin/products', async (req, reply) => {
    const querySchema = z
      .object({
        page: z.coerce.number().int().positive().optional().default(1),
        limit: z.coerce.number().int().positive().max(200).optional().default(50),
        sort: z.enum(['order', 'name', 'createdAt', 'updatedAt']).optional().default('createdAt'),
        dir: z.enum(['asc', 'desc']).optional().default('desc'),
        isActive: z.enum(['true', 'false']).optional(),
        categoryId: z.string().optional(),
      })
      .strict();
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) return reply.status(400).send({ error: 'Invalid query', details: parsed.error.flatten() });
    const { page, limit, sort, dir, isActive, categoryId } = parsed.data;
    try {
      const collection = await getCollection('products');

      const filter: Record<string, unknown> = {};
      if (typeof isActive !== 'undefined') filter.isActive = isActive === 'true';
      if (categoryId) filter.categoryId = categoryId;

      const sortSpec: Record<string, 1 | -1> = { [sort]: dir === 'asc' ? 1 : -1, name: 1 };

      const cursor = collection.find(filter).sort(sortSpec).skip((page - 1) * limit).limit(limit);
      const items = await cursor.toArray();
      const total = await collection.countDocuments(filter);
      // In admin list mapped
      const mapped = items.map((doc: any) => ({
        id: doc.id ?? doc._id?.toString(),
        name: doc.name,
        description: doc.description,
        order: doc.order,
        categoryId: doc.categoryId,
        imageUrl: doc.imageUrl,
        price: doc.price,
        composition: doc.composition,
        station: doc.station,
        stockQuantity: doc.stockQuantity,
        isAvailable: doc.stockQuantity == null || doc.stockQuantity === -1 || doc.stockQuantity > 0,
        isActive: doc.isActive,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      }));
      return reply.send({ items: mapped, page, limit, total });
    } catch (err: any) {
      app.log.warn({ err }, 'Admin products GET fallback without DB');
      // DEV-friendly fallback using in-memory store
      let filtered = DEV_PRODUCTS.slice();
      if (typeof isActive !== 'undefined') filtered = filtered.filter((p) => p.isActive === (isActive === 'true'));
      if (categoryId) filtered = filtered.filter((p) => p.categoryId === categoryId);
      const sorted = sortItems(filtered, sort, dir);
      const { items, total } = paginate(sorted, page, limit);
      const mapped = items.map((doc) => ({
        id: doc.id,
        name: doc.name,
        description: doc.description,
        order: doc.order,
        categoryId: doc.categoryId,
        imageUrl: doc.imageUrl,
        price: doc.price,
        composition: doc.composition,
        station: doc.station,
        stockQuantity: doc.stockQuantity,
        isAvailable: doc.stockQuantity == null || doc.stockQuantity === -1 || (doc.stockQuantity ?? 0) > 0,
        isActive: doc.isActive,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      }));
      return reply.send({ items: mapped, page, limit, total });
    }
  });

  // Public: get single product by id (only active)
  app.get('/v1/public/products/:id', async (req, reply) => {
    try {
      const collection = await getCollection('products');
      const { id } = req.params as { id: string };
      const doc = await collection.findOne({ $or: [{ id }, { _id: new ObjectId(id) }], isActive: true });
      if (!doc) return reply.status(404).send({ error: 'Product not found' });
      // In public get reply.send
      return reply.send({
        id: doc.id ?? doc._id?.toString(),
        name: doc.name,
        description: doc.description,
        order: doc.order,
        categoryId: doc.categoryId,
        imageUrl: doc.imageUrl,
        price: doc.price,
        composition: doc.composition,
        station: doc.station,
        stockQuantity: doc.stockQuantity,
        isAvailable: doc.stockQuantity == null || doc.stockQuantity === -1 || doc.stockQuantity > 0,
        isActive: doc.isActive,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      });
    } catch (err: any) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Database error' });
    }
  });

  // Admin: create product
  app.post('/v1/admin/products', async (req, reply) => {
    try {
      const collection = await getCollection('products');
      const parse = productCreateSchema.safeParse(req.body);
      if (!parse.success) return reply.status(400).send({ error: 'Invalid body', details: parse.error.flatten() });
      const now = new Date().toISOString();
      const id = new ObjectId().toHexString();
      const doc = { id, ...parse.data, createdAt: now, updatedAt: now };
      await collection.insertOne(doc);
      return reply.status(201).send(doc);
    } catch (err: any) {
      if (devMode) {
        const parse = productCreateSchema.safeParse(req.body);
        if (!parse.success) return reply.status(400).send({ error: 'Invalid body', details: parse.error.flatten() });
        const now = new Date().toISOString();
        const id = new ObjectId().toHexString();
        const doc: DevProduct = { id, ...parse.data, createdAt: now, updatedAt: now } as DevProduct;
        DEV_PRODUCTS.push(doc);
        await saveDevProducts();
        return reply.status(201).send(doc);
      }
      app.log.error(err);
      return reply.status(500).send({ error: 'Database error' });
    }
  });

  // Admin: update product
  app.patch('/v1/admin/products/:id', async (req, reply) => {
    try {
      const collection = await getCollection('products');
      const { id } = req.params as { id: string };
      const parse = productUpdateSchema.safeParse(req.body);
      if (!parse.success) return reply.status(400).send({ error: 'Invalid body', details: parse.error.flatten() });
      const now = new Date().toISOString();
      const res = await collection.updateOne(
        { $or: [{ id }, { _id: new ObjectId(id) }] },
        { $set: { ...parse.data, updatedAt: now } }
      );
      if (res.matchedCount === 0) return reply.status(404).send({ error: 'Product not found' });
      const updated = await collection.findOne({ $or: [{ id }, { _id: new ObjectId(id) }] });
      // In update reply.send
      return reply.send({
        id: updated?.id ?? updated?._id?.toString(),
        name: updated?.name,
        description: updated?.description,
        order: updated?.order,
        categoryId: updated?.categoryId,
        imageUrl: updated?.imageUrl,
        price: updated?.price,
        composition: updated?.composition,
        station: updated?.station,
        stockQuantity: updated?.stockQuantity,
        isAvailable: updated?.stockQuantity == null || updated?.stockQuantity === -1 || updated?.stockQuantity > 0,
        isActive: updated?.isActive,
        createdAt: updated?.createdAt,
        updatedAt: updated?.updatedAt,
      });
    } catch (err: any) {
      if (devMode) {
        const { id } = req.params as { id: string };
        const parse = productUpdateSchema.safeParse(req.body);
        if (!parse.success) return reply.status(400).send({ error: 'Invalid body', details: parse.error.flatten() });
        const idx = DEV_PRODUCTS.findIndex((p) => p.id === id || (p as any)._id === id);
        if (idx === -1) return reply.status(404).send({ error: 'Product not found' });
        const now = new Date().toISOString();
        const updated = { ...DEV_PRODUCTS[idx], ...parse.data, updatedAt: now } as DevProduct;
        DEV_PRODUCTS[idx] = updated;
        await saveDevProducts();
        return reply.send({
          id: updated.id,
          name: updated.name,
          description: updated.description,
          order: updated.order,
          categoryId: updated.categoryId,
          imageUrl: updated.imageUrl,
          price: updated.price,
          composition: updated.composition,
          station: updated.station,
          stockQuantity: updated.stockQuantity,
          isAvailable: updated.stockQuantity == null || updated.stockQuantity === -1 || (updated.stockQuantity ?? 0) > 0,
          isActive: updated.isActive,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt,
        });
      }
      app.log.error(err);
      return reply.status(500).send({ error: 'Database error' });
    }
  });

  // Admin: delete product (soft delete)
  app.delete('/v1/admin/products/:id', async (req, reply) => {
    try {
      const collection = await getCollection('products');
      const { id } = req.params as { id: string };
      const now = new Date().toISOString();
      const res = await collection.updateOne(
        { $or: [{ id }, { _id: new ObjectId(id) }] },
        { $set: { isActive: false, updatedAt: now } }
      );
      if (res.matchedCount === 0) return reply.status(404).send({ error: 'Product not found' });
      return reply.status(204).send();
    } catch (err: any) {
      if (devMode) {
        const { id } = req.params as { id: string };
        const idx = DEV_PRODUCTS.findIndex((p) => p.id === id || (p as any)._id === id);
        if (idx === -1) return reply.status(404).send({ error: 'Product not found' });
        DEV_PRODUCTS[idx].isActive = false;
        DEV_PRODUCTS[idx].updatedAt = new Date().toISOString();
        await saveDevProducts();
        return reply.status(204).send();
      }
      app.log.error(err);
      return reply.status(500).send({ error: 'Database error' });
    }
  });

  // Admin: upload image
  app.post('/v1/admin/upload/image', async (req, reply) => {
    try {
      const { imageBase64 } = z.object({ imageBase64: z.string().min(1) }).parse(req.body);
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const filename = `${randomUUID()}.jpg`;
      const uploadPath = path.join(__dirname, '../../../public/images', filename);
      await fs.mkdir(path.dirname(uploadPath), { recursive: true });
      await fs.writeFile(uploadPath, buffer);
      return reply.send({ imageUrl: `/public/images/${filename}` });
    } catch (err: any) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Upload failed' });
    }
  });
};

export default productsRoutes;