"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoriesRoutes = void 0;
const zod_1 = require("zod");
const db_1 = require("../../lib/db");
const mongodb_1 = require("mongodb");
const categoryCreateSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    order: zod_1.z.number().int().optional(),
    parentCategoryId: zod_1.z.string().optional(),
    imageUrl: zod_1.z.string().url().optional(),
    isActive: zod_1.z.boolean().optional().default(true),
});
const categoryUpdateSchema = categoryCreateSchema.partial();
const categoriesRoutes = async (app) => {
    // Public: list active categories
    app.get('/v1/public/categories', async (_req, reply) => {
        try {
            const collection = await (0, db_1.getCollection)('categories');
            const items = await collection
                .find({ isActive: true })
                .sort({ order: 1, name: 1 })
                .toArray();
            const mapped = items.map((doc) => ({
                id: doc.id ?? doc._id?.toString(),
                name: doc.name,
                description: doc.description,
                order: doc.order,
                parentCategoryId: doc.parentCategoryId,
                imageUrl: doc.imageUrl,
                isActive: doc.isActive,
                createdAt: doc.createdAt,
                updatedAt: doc.updatedAt,
            }));
            return reply.send(mapped);
        }
        catch (err) {
            app.log.error(err);
            return reply.status(500).send({ error: 'Database error' });
        }
    });
    // Admin: list all categories
    app.get('/v1/admin/categories', async (_req, reply) => {
        try {
            const collection = await (0, db_1.getCollection)('categories');
            const items = await collection.find({}).sort({ order: 1, name: 1 }).toArray();
            const mapped = items.map((doc) => ({
                id: doc.id ?? doc._id?.toString(),
                name: doc.name,
                description: doc.description,
                order: doc.order,
                parentCategoryId: doc.parentCategoryId,
                imageUrl: doc.imageUrl,
                isActive: doc.isActive,
                createdAt: doc.createdAt,
                updatedAt: doc.updatedAt,
            }));
            return reply.send(mapped);
        }
        catch (err) {
            app.log.error(err);
            return reply.status(500).send({ error: 'Database error' });
        }
    });
    // Public: get single category by id (only active)
    app.get('/v1/public/categories/:id', async (req, reply) => {
        try {
            const collection = await (0, db_1.getCollection)('categories');
            const { id } = req.params;
            const doc = await collection.findOne({ $or: [{ id }, { _id: new mongodb_1.ObjectId(id) }], isActive: true });
            if (!doc)
                return reply.status(404).send({ error: 'Category not found' });
            return reply.send({
                id: doc.id ?? doc._id?.toString(),
                name: doc.name,
                description: doc.description,
                order: doc.order,
                parentCategoryId: doc.parentCategoryId,
                imageUrl: doc.imageUrl,
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
    // Admin: create category
    app.post('/v1/admin/categories', async (req, reply) => {
        try {
            const collection = await (0, db_1.getCollection)('categories');
            const parse = categoryCreateSchema.safeParse(req.body);
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
            return reply.status(500).send({ error: 'Database error' });
        }
    });
    // Admin: update category
    app.patch('/v1/admin/categories/:id', async (req, reply) => {
        try {
            const collection = await (0, db_1.getCollection)('categories');
            const { id } = req.params;
            const parse = categoryUpdateSchema.safeParse(req.body);
            if (!parse.success)
                return reply.status(400).send({ error: 'Invalid body', details: parse.error.flatten() });
            const now = new Date().toISOString();
            const res = await collection.updateOne({ $or: [{ id }, { _id: new mongodb_1.ObjectId(id) }] }, { $set: { ...parse.data, updatedAt: now } });
            if (res.matchedCount === 0)
                return reply.status(404).send({ error: 'Category not found' });
            const updated = await collection.findOne({ $or: [{ id }, { _id: new mongodb_1.ObjectId(id) }] });
            return reply.send({
                id: updated?.id ?? updated?._id?.toString(),
                name: updated?.name,
                description: updated?.description,
                order: updated?.order,
                parentCategoryId: updated?.parentCategoryId,
                imageUrl: updated?.imageUrl,
                isActive: updated?.isActive,
                createdAt: updated?.createdAt,
                updatedAt: updated?.updatedAt,
            });
        }
        catch (err) {
            app.log.error(err);
            return reply.status(500).send({ error: 'Database error' });
        }
    });
    // Admin: delete category (soft delete)
    app.delete('/v1/admin/categories/:id', async (req, reply) => {
        try {
            const collection = await (0, db_1.getCollection)('categories');
            const { id } = req.params;
            const now = new Date().toISOString();
            const res = await collection.updateOne({ $or: [{ id }, { _id: new mongodb_1.ObjectId(id) }] }, { $set: { isActive: false, updatedAt: now } });
            if (res.matchedCount === 0)
                return reply.status(404).send({ error: 'Category not found' });
            return reply.status(204).send();
        }
        catch (err) {
            app.log.error(err);
            return reply.status(500).send({ error: 'Database error' });
        }
    });
};
exports.categoriesRoutes = categoriesRoutes;
exports.default = exports.categoriesRoutes;
