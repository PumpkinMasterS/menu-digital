import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { getCollection } from '../../lib/db';
import { ObjectId } from 'mongodb';

const variantOptionSchema = z
  .object({
    name: z.string().min(1),
    priceDelta: z.number().optional().default(0),
    isDefault: z.boolean().optional().default(false),
  })
  .strict();

const variantGroupCreateSchema = z
  .object({
    name: z.string().min(1),
    description: z.string().optional(),
    order: z.number().int().optional(),
    options: z.array(variantOptionSchema).default([]),
    isActive: z.boolean().optional().default(true),
  })
  .strict();

const variantGroupUpdateSchema = variantGroupCreateSchema.partial();

export const variantsRoutes: FastifyPluginAsync = async (app) => {
  // Public: list active variant groups
  app.get('/v1/public/variants', async (_req, reply) => {
    try {
      const collection = await getCollection<any>('variant_groups');
      const items = await collection
        .find({ isActive: true })
        .sort({ order: 1, name: 1 })
        .toArray();
      const mapped = items.map((doc: any) => ({
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
    } catch (err: any) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Database error' });
    }
  });

  // Admin: list all variant groups
  app.get('/v1/admin/variants', async (_req, reply) => {
    try {
      const collection = await getCollection<any>('variant_groups');
      const items = await collection.find({}).sort({ order: 1, name: 1 }).toArray();
      const mapped = items.map((doc: any) => ({
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
    } catch (err: any) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Database error' });
    }
  });

  // Public: get single variant group by id (only active)
  app.get('/v1/public/variants/:id', async (req, reply) => {
    try {
      const collection = await getCollection<any>('variant_groups');
      const { id } = req.params as { id: string };
      const doc = await collection.findOne({ $or: [{ id }, { _id: new ObjectId(id) }], isActive: true });
      if (!doc) return reply.status(404).send({ error: 'Variant group not found' });
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
    } catch (err: any) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Database error' });
    }
  });

  // Admin: create variant group
  app.post('/v1/admin/variants', async (req, reply) => {
    try {
      const collection = await getCollection<any>('variant_groups');
      const parse = variantGroupCreateSchema.safeParse(req.body);
      if (!parse.success) return reply.status(400).send({ error: 'Invalid body', details: parse.error.flatten() });
      const now = new Date().toISOString();
      const id = new ObjectId().toHexString();
      const doc = { id, ...parse.data, createdAt: now, updatedAt: now };
      await collection.insertOne(doc);
      return reply.status(201).send(doc);
    } catch (err: any) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Database error' });
    }
  });

  // Admin: update variant group
  app.patch('/v1/admin/variants/:id', async (req, reply) => {
    try {
      const collection = await getCollection<any>('variant_groups');
      const { id } = req.params as { id: string };
      const parse = variantGroupUpdateSchema.safeParse(req.body);
      if (!parse.success) return reply.status(400).send({ error: 'Invalid body', details: parse.error.flatten() });
      const now = new Date().toISOString();
      const res = await collection.updateOne(
        { $or: [{ id }, { _id: new ObjectId(id) }] },
        { $set: { ...parse.data, updatedAt: now } }
      );
      if (res.matchedCount === 0) return reply.status(404).send({ error: 'Variant group not found' });
      const updated = await collection.findOne({ $or: [{ id }, { _id: new ObjectId(id) }] });
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
    } catch (err: any) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Database error' });
    }
  });

  // Admin: delete variant group (soft delete)
  app.delete('/v1/admin/variants/:id', async (req, reply) => {
    try {
      const collection = await getCollection<any>('variant_groups');
      const { id } = req.params as { id: string };
      const now = new Date().toISOString();
      const res = await collection.updateOne(
        { $or: [{ id }, { _id: new ObjectId(id) }] },
        { $set: { isActive: false, updatedAt: now } }
      );
      if (res.matchedCount === 0) return reply.status(404).send({ error: 'Variant group not found' });
      return reply.status(204).send();
    } catch (err: any) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Database error' });
    }
  });
};

export default variantsRoutes;