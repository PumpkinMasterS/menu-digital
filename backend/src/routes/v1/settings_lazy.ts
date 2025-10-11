import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { getCollection } from '../../lib/db';

const settings: FastifyPluginAsync = async (app): Promise<void> => {
  // Lazy DB access inside handlers to avoid plugin startup timeout when DB is down
  app.get('/v1/admin/settings', async (_req, reply) => {
    try {
      const settingsCol = await getCollection('settings');
      const doc = await settingsCol.findOne({ _id: 'global' });
      return reply.send(doc || { busyMode: false, delayMinutes: 0 });
    } catch (err: any) {
      app.log.warn({ err }, 'Settings GET fallback without DB');
      // Fallback defaults when DB is unavailable
      return reply.send({ busyMode: false, delayMinutes: 0 });
    }
  });

  app.patch('/v1/admin/settings', async (req, reply) => {
    const schema = z
      .object({
        busyMode: z.boolean().optional(),
        delayMinutes: z.number().int().min(0).optional(),
      })
      .strict();

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: 'Invalid input', details: parsed.error.flatten() });

    try {
      const settingsCol = await getCollection('settings');
      const update = { $set: parsed.data };
      await settingsCol.updateOne({ _id: 'global' }, update, { upsert: true });
      const updated = await settingsCol.findOne({ _id: 'global' });
      return reply.send(updated);
    } catch (err: any) {
      app.log.error({ err }, 'Settings PATCH failed due to DB');
      return reply.status(503).send({ error: 'Database unavailable' });
    }
  });
};

export default settings;