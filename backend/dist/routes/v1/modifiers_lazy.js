"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.modifiersRoutes = void 0;
const zod_1 = require("zod");
const db_1 = require("../../lib/db");
const mongodb_1 = require("mongodb");
const modifierOptionSchema = zod_1.z
    .object({
    name: zod_1.z.string().min(1),
    priceDelta: zod_1.z.number().optional().default(0),
    isAvailable: zod_1.z.boolean().optional().default(true),
})
    .strict();
const modifierGroupCreateSchema = zod_1.z
    .object({
    name: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    order: zod_1.z.number().int().optional(),
    options: zod_1.z.array(modifierOptionSchema).default([]),
    maxSelections: zod_1.z.number().int().positive().optional().default(1),
    isRequired: zod_1.z.boolean().optional().default(false),
    isActive: zod_1.z.boolean().optional().default(true),
})
    .strict();
const modifierGroupUpdateSchema = modifierGroupCreateSchema.partial();
const modifiersRoutes = async (app) => {
    // Public: list active modifier groups
    app.get('/v1/public/modifiers', async (_req, reply) => {
        try {
            const collection = await (0, db_1.getCollection)('modifier_groups');
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
                maxSelections: doc.maxSelections,
                isRequired: doc.isRequired,
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
    // Admin: list all modifier groups
    app.get('/v1/admin/modifiers', async (_req, reply) => {
        try {
            const collection = await (0, db_1.getCollection)('modifier_groups');
            const items = await collection.find({}).sort({ order: 1, name: 1 }).toArray();
            const mapped = items.map((doc) => ({
                id: doc.id ?? doc._id?.toString(),
                name: doc.name,
                description: doc.description,
                order: doc.order,
                options: doc.options ?? [],
                maxSelections: doc.maxSelections,
                isRequired: doc.isRequired,
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
    // Public: get single modifier group by id (only active)
    app.get('/v1/public/modifiers/:id', async (req, reply) => {
        try {
            const collection = await (0, db_1.getCollection)('modifier_groups');
            const { id } = req.params;
            const doc = await collection.findOne({ $or: [{ id }, { _id: new mongodb_1.ObjectId(id) }], isActive: true });
            if (!doc)
                return reply.status(404).send({ error: 'Modifier group not found' });
            return reply.send({
                id: doc.id ?? doc._id?.toString(),
                name: doc.name,
                description: doc.description,
                order: doc.order,
                options: doc.options ?? [],
                maxSelections: doc.maxSelections,
                isRequired: doc.isRequired,
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
    // Admin: create modifier group
    app.post('/v1/admin/modifiers', async (req, reply) => {
        try {
            const collection = await (0, db_1.getCollection)('modifier_groups');
            const parse = modifierGroupCreateSchema.safeParse(req.body);
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
    // Admin: update modifier group
    app.patch('/v1/admin/modifiers/:id', async (req, reply) => {
        try {
            const collection = await (0, db_1.getCollection)('modifier_groups');
            const { id } = req.params;
            const parse = modifierGroupUpdateSchema.safeParse(req.body);
            if (!parse.success)
                return reply.status(400).send({ error: 'Invalid body', details: parse.error.flatten() });
            const now = new Date().toISOString();
            const res = await collection.updateOne({ $or: [{ id }, { _id: new mongodb_1.ObjectId(id) }] }, { $set: { ...parse.data, updatedAt: now } });
            if (res.matchedCount === 0)
                return reply.status(404).send({ error: 'Modifier group not found' });
            const updated = await collection.findOne({ $or: [{ id }, { _id: new mongodb_1.ObjectId(id) }] });
            return reply.send({
                id: updated?.id ?? updated?._id?.toString(),
                name: updated?.name,
                description: updated?.description,
                order: updated?.order,
                options: updated?.options ?? [],
                maxSelections: updated?.maxSelections,
                isRequired: updated?.isRequired,
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
    // Admin: delete modifier group (soft delete)
    app.delete('/v1/admin/modifiers/:id', async (req, reply) => {
        try {
            const collection = await (0, db_1.getCollection)('modifier_groups');
            const { id } = req.params;
            const now = new Date().toISOString();
            const res = await collection.updateOne({ $or: [{ id }, { _id: new mongodb_1.ObjectId(id) }] }, { $set: { isActive: false, updatedAt: now } });
            if (res.matchedCount === 0)
                return reply.status(404).send({ error: 'Modifier group not found' });
            return reply.status(204).send();
        }
        catch (err) {
            app.log.error(err);
            return reply.status(500).send({ error: 'Database error' });
        }
    });
};
exports.modifiersRoutes = modifiersRoutes;
exports.default = exports.modifiersRoutes;
