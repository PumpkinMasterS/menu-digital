"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.productsRoutes = void 0;
const zod_1 = require("zod");
const db_1 = require("../../lib/db");
const mongodb_1 = require("mongodb");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const crypto_1 = require("crypto");
function sortItems(items, sort, dir) {
    const factor = dir === 'asc' ? 1 : -1;
    return items.slice().sort((a, b) => {
        const av = a[sort];
        const bv = b[sort];
        if (av == null && bv == null)
            return 0;
        if (av == null)
            return -1 * factor;
        if (bv == null)
            return 1 * factor;
        if (typeof av === 'number' && typeof bv === 'number')
            return (av - bv) * factor;
        const as = String(av).toLowerCase();
        const bs = String(bv).toLowerCase();
        if (as < bs)
            return -1 * factor;
        if (as > bs)
            return 1 * factor;
        // secondary by name asc
        const an = String(a['name'] ?? '').toLowerCase();
        const bn = String(b['name'] ?? '').toLowerCase();
        if (an < bn)
            return -1;
        if (an > bn)
            return 1;
        return 0;
    });
}
function paginate(items, page, limit) {
    const total = items.length;
    const start = (page - 1) * limit;
    const end = start + limit;
    return { items: items.slice(start, end), total };
}
const productCreateSchema = zod_1.z
    .object({
    name: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    order: zod_1.z.number().int().optional(),
    categoryId: zod_1.z.string().optional(),
    imageUrl: zod_1.z.string().optional().transform(val => val && val.trim() ? val : undefined),
    price: zod_1.z.number().nonnegative().optional(),
    composition: zod_1.z.any().optional(),
    station: zod_1.z.string().optional(),
    stockQuantity: zod_1.z.number().int().optional().default(-1),
    isActive: zod_1.z.boolean().optional().default(true),
})
    .passthrough();
const productUpdateSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).optional(),
    description: zod_1.z.string().optional(),
    order: zod_1.z.number().int().optional(),
    categoryId: zod_1.z.string().optional(),
    imageUrl: zod_1.z.string().optional().transform(val => val && val.trim() ? val : undefined),
    price: zod_1.z.number().nonnegative().optional(),
    composition: zod_1.z.any().optional(),
    station: zod_1.z.string().optional(),
    stockQuantity: zod_1.z.number().int().optional(),
    isActive: zod_1.z.boolean().optional(),
}).passthrough();
const productsRoutes = async (app) => {
    // Public: list active products, optional filter by categoryId
    app.get('/v1/public/products', async (req, reply) => {
        const querySchema = zod_1.z
            .object({
            categoryId: zod_1.z.string().optional(),
            page: zod_1.z.coerce.number().int().positive().optional().default(1),
            limit: zod_1.z.coerce.number().int().positive().max(100).optional().default(20),
            sort: zod_1.z.enum(['order', 'name', 'createdAt']).optional().default('order'),
            dir: zod_1.z.enum(['asc', 'desc']).optional().default('asc'),
        })
            .strict();
        const parsed = querySchema.safeParse(req.query);
        if (!parsed.success)
            return reply.status(400).send({ error: 'Invalid query', details: parsed.error.flatten() });
        const { categoryId, page, limit, sort, dir } = parsed.data;
        try {
            const collection = await (0, db_1.getCollection)('products');
            const filter = { isActive: true };
            if (categoryId)
                filter.categoryId = categoryId;
            const sortSpec = { [sort]: dir === 'asc' ? 1 : -1, name: 1 };
            const cursor = collection.find(filter).sort(sortSpec).skip((page - 1) * limit).limit(limit);
            const items = await cursor.toArray();
            const total = await collection.countDocuments(filter);
            // In public list mapped
            const mapped = items.map((doc) => ({
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
        }
        catch (err) {
            app.log.error({ err }, 'Public products GET failed due to DB');
            return reply.status(503).send({ error: 'Database unavailable' });
        }
    });
    // Admin: list all products
    app.get('/v1/admin/products', async (req, reply) => {
        const querySchema = zod_1.z
            .object({
            page: zod_1.z.coerce.number().int().positive().optional().default(1),
            limit: zod_1.z.coerce.number().int().positive().max(200).optional().default(50),
            sort: zod_1.z.enum(['order', 'name', 'createdAt', 'updatedAt']).optional().default('createdAt'),
            dir: zod_1.z.enum(['asc', 'desc']).optional().default('desc'),
            isActive: zod_1.z.enum(['true', 'false']).optional(),
            categoryId: zod_1.z.string().optional(),
        })
            .strict();
        const parsed = querySchema.safeParse(req.query);
        if (!parsed.success)
            return reply.status(400).send({ error: 'Invalid query', details: parsed.error.flatten() });
        const { page, limit, sort, dir, isActive, categoryId } = parsed.data;
        try {
            const collection = await (0, db_1.getCollection)('products');
            const filter = {};
            if (typeof isActive !== 'undefined')
                filter.isActive = isActive === 'true';
            if (categoryId)
                filter.categoryId = categoryId;
            const sortSpec = { [sort]: dir === 'asc' ? 1 : -1, name: 1 };
            const cursor = collection.find(filter).sort(sortSpec).skip((page - 1) * limit).limit(limit);
            const items = await cursor.toArray();
            const total = await collection.countDocuments(filter);
            // In admin list mapped
            const mapped = items.map((doc) => ({
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
        }
        catch (err) {
            app.log.error({ err }, 'Admin products GET failed due to DB');
            return reply.status(503).send({ error: 'Database unavailable' });
        }
    });
    // Public: get single product by id (only active)
    app.get('/v1/public/products/:id', async (req, reply) => {
        try {
            const collection = await (0, db_1.getCollection)('products');
            const { id } = req.params;
            const doc = await collection.findOne({ $or: [{ id }, { _id: new mongodb_1.ObjectId(id) }], isActive: true });
            if (!doc)
                return reply.status(404).send({ error: 'Product not found' });
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
        }
        catch (err) {
            app.log.error(err);
            return reply.status(500).send({ error: 'Database error' });
        }
    });
    // Admin: create product
    app.post('/v1/admin/products', async (req, reply) => {
        try {
            const collection = await (0, db_1.getCollection)('products');
            const parse = productCreateSchema.safeParse(req.body);
            if (!parse.success)
                return reply.status(400).send({ error: 'Invalid body', details: parse.error.flatten() });
            const now = new Date().toISOString();
            const id = new mongodb_1.ObjectId().toHexString();
            const doc = { id, ...parse.data, createdAt: now, updatedAt: now };
            await collection.insertOne(doc);
            return reply.status(201).send(doc);
        }
        catch (err) {
            app.log.error(err);
            return reply.status(503).send({ error: 'Database unavailable' });
        }
    });
    // Admin: update product
    app.patch('/v1/admin/products/:id', async (req, reply) => {
        try {
            const collection = await (0, db_1.getCollection)('products');
            const { id } = req.params;
            const parse = productUpdateSchema.safeParse(req.body);
            if (!parse.success)
                return reply.status(400).send({ error: 'Invalid body', details: parse.error.flatten() });
            const now = new Date().toISOString();
            const res = await collection.updateOne({ $or: [{ id }, { _id: new mongodb_1.ObjectId(id) }] }, { $set: { ...parse.data, updatedAt: now } });
            if (res.matchedCount === 0)
                return reply.status(404).send({ error: 'Product not found' });
            const updated = await collection.findOne({ $or: [{ id }, { _id: new mongodb_1.ObjectId(id) }] });
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
        }
        catch (err) {
            app.log.error(err);
            return reply.status(503).send({ error: 'Database unavailable' });
        }
    });
    // Admin: delete product (soft delete)
    app.delete('/v1/admin/products/:id', async (req, reply) => {
        try {
            const collection = await (0, db_1.getCollection)('products');
            const { id } = req.params;
            const now = new Date().toISOString();
            const res = await collection.updateOne({ $or: [{ id }, { _id: new mongodb_1.ObjectId(id) }] }, { $set: { isActive: false, updatedAt: now } });
            if (res.matchedCount === 0)
                return reply.status(404).send({ error: 'Product not found' });
            return reply.status(204).send();
        }
        catch (err) {
            app.log.error(err);
            return reply.status(503).send({ error: 'Database unavailable' });
        }
    });
    // Admin: upload image
    app.post('/v1/admin/upload/image', async (req, reply) => {
        try {
            const { imageBase64 } = zod_1.z.object({ imageBase64: zod_1.z.string().min(1) }).parse(req.body);
            const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');
            const filename = `${(0, crypto_1.randomUUID)()}.jpg`;
            const uploadPath = path_1.default.join(__dirname, '../../../public/images', filename);
            await promises_1.default.mkdir(path_1.default.dirname(uploadPath), { recursive: true });
            await promises_1.default.writeFile(uploadPath, buffer);
            return reply.send({ imageUrl: `/public/images/${filename}` });
        }
        catch (err) {
            app.log.error(err);
            return reply.status(500).send({ error: 'Upload failed' });
        }
    });
};
exports.productsRoutes = productsRoutes;
exports.default = exports.productsRoutes;
