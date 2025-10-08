"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.variantsRoutes = void 0;
const zod_1 = require("zod");
const db_1 = require("../../lib/db");
const mongodb_1 = require("mongodb");
const variantOptionSchema = zod_1.z
    .object({
    name: zod_1.z.string().min(1),
    priceDelta: zod_1.z.number().optional().default(0),
    isDefault: zod_1.z.boolean().optional().default(false),
})
    .strict();
const variantGroupCreateSchema = zod_1.z
    .object({
    name: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    order: zod_1.z.number().int().optional(),
    options: zod_1.z.array(variantOptionSchema).default([]),
    isActive: zod_1.z.boolean().optional().default(true),
})
    .strict();
const variantGroupUpdateSchema = variantGroupCreateSchema.partial();
const variantsRoutes = async (app) => {
    // Public: list active variant groups
    app.get('/v1/public/variants', async (_req, reply) => {
        try {
            const collection = await (0, db_1.getCollection)('variant_groups');
            const items = await collection
                .find({ isActive: true })
                .sort({ order: 1, name: 1 })
                .toArray();
            const mapped = items.map((doc) => ({
                id: doc.id ?? doc._id?.toString(),
                name: doc.name,
                description: doc.description,
                order: doc.order,
                options: doc.options ?? [],
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
    // Admin: list all variant groups
    app.get('/v1/admin/variants', async (_req, reply) => {
        try {
            const collection = await (0, db_1.getCollection)('variant_groups');
            const items = await collection.find({}).sort({ order: 1, name: 1 }).toArray();
            const mapped = items.map((doc) => ({
                id: doc.id ?? doc._id?.toString(),
                name: doc.name,
                description: doc.description,
                order: doc.order,
                options: doc.options ?? [],
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
    // Public: get single variant group by id (only active)
    app.get('/v1/public/variants/:id', async (req, reply) => {
        try {
            const collection = await (0, db_1.getCollection)('variant_groups');
            const { id } = req.params;
            const doc = await collection.findOne({ $or: [{ id }, { _id: new mongodb_1.ObjectId(id) }], isActive: true });
            if (!doc)
                return reply.status(404).send({ error: 'Variant group not found' });
            return reply.send({
                id: doc.id ?? doc._id?.toString(),
                name: doc.name,
                description: doc.description,
                order: doc.order,
                options: doc.options ?? [],
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
    // Admin: create variant group
    app.post('/v1/admin/variants', async (req, reply) => {
        try {
            const collection = await (0, db_1.getCollection)('variant_groups');
            const parse = variantGroupCreateSchema.safeParse(req.body);
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
    // Admin: update variant group
    app.patch('/v1/admin/variants/:id', async (req, reply) => {
        try {
            const collection = await (0, db_1.getCollection)('variant_groups');
            const { id } = req.params;
            const parse = variantGroupUpdateSchema.safeParse(req.body);
            if (!parse.success)
                return reply.status(400).send({ error: 'Invalid body', details: parse.error.flatten() });
            const now = new Date().toISOString();
            const res = await collection.updateOne({ $or: [{ id }, { _id: new mongodb_1.ObjectId(id) }] }, { $set: { ...parse.data, updatedAt: now } });
            if (res.matchedCount === 0)
                return reply.status(404).send({ error: 'Variant group not found' });
            const updated = await collection.findOne({ $or: [{ id }, { _id: new mongodb_1.ObjectId(id) }] });
            return reply.send({
                id: updated?.id ?? updated?._id?.toString(),
                name: updated?.name,
                description: updated?.description,
                order: updated?.order,
                options: updated?.options ?? [],
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
    // Admin: delete variant group (soft delete)
    app.delete('/v1/admin/variants/:id', async (req, reply) => {
        try {
            const collection = await (0, db_1.getCollection)('variant_groups');
            const { id } = req.params;
            const now = new Date().toISOString();
            const res = await collection.updateOne({ $or: [{ id }, { _id: new mongodb_1.ObjectId(id) }] }, { $set: { isActive: false, updatedAt: now } });
            if (res.matchedCount === 0)
                return reply.status(404).send({ error: 'Variant group not found' });
            return reply.status(204).send();
        }
        catch (err) {
            app.log.error(err);
            return reply.status(500).send({ error: 'Database error' });
        }
    });
};
exports.variantsRoutes = variantsRoutes;
exports.default = exports.variantsRoutes;
