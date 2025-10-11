"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const db_1 = require("../../lib/db");
const settings = async (app) => {
    // Lazy DB access inside handlers to avoid plugin startup timeout when DB is down
    app.get('/v1/admin/settings', async (_req, reply) => {
        try {
            const settingsCol = await (0, db_1.getCollection)('settings');
            const doc = await settingsCol.findOne({ _id: 'global' });
            return reply.send(doc || { busyMode: false, delayMinutes: 0 });
        }
        catch (err) {
            app.log.warn({ err }, 'Settings GET fallback without DB');
            // Fallback defaults when DB is unavailable
            return reply.send({ busyMode: false, delayMinutes: 0 });
        }
    });
    app.patch('/v1/admin/settings', async (req, reply) => {
        const schema = zod_1.z
            .object({
            busyMode: zod_1.z.boolean().optional(),
            delayMinutes: zod_1.z.number().int().min(0).optional(),
        })
            .strict();
        const parsed = schema.safeParse(req.body);
        if (!parsed.success)
            return reply.status(400).send({ error: 'Invalid input', details: parsed.error.flatten() });
        try {
            const settingsCol = await (0, db_1.getCollection)('settings');
            const update = { $set: parsed.data };
            await settingsCol.updateOne({ _id: 'global' }, update, { upsert: true });
            const updated = await settingsCol.findOne({ _id: 'global' });
            return reply.send(updated);
        }
        catch (err) {
            app.log.error({ err }, 'Settings PATCH failed due to DB');
            return reply.status(503).send({ error: 'Database unavailable' });
        }
    });
};
exports.default = settings;
