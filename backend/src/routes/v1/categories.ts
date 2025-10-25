import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { getCollection } from '../../lib/db';
import { ObjectId } from 'mongodb';

const categoryCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  order: z.number().int().optional(),
  parentCategoryId: z.string().optional(),
  imageUrl: z.string().url().optional(),
  isActive: z.boolean().optional().default(true),
});

const categoryUpdateSchema = categoryCreateSchema.partial();

export const categoriesRoutes: FastifyPluginAsync = async (app) => {
  const collection = await getCollection<any>('categories');

  // Public: list active categories
  app.get('/v1/public/categories', async (_req, reply) => {
    const items = await collection
      .find({ isActive: true })
      .sort({ order: 1, name: 1 })
      .toArray();

    const mapped = items.map((doc: any) => ({
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
  });

  // Admin: list all categories
  app.get('/v1/admin/categories', async (_req, reply) => {
    const items = await collection.find({}).sort({ order: 1, name: 1 }).toArray();
    const mapped = items.map((doc: any) => ({
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
  });

  // Public: get single category by id (only active)
  app.get('/v1/public/categories/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const doc = await collection.findOne({ $or: [{ id }, { _id: new ObjectId(id) }], isActive: true });
    if (!doc) return reply.status(404).send({ error: 'Category not found' });
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
  });

  // Admin: create category
  app.post('/v1/admin/categories', async (req, reply) => {
    const parse = categoryCreateSchema.safeParse(req.body);
    if (!parse.success) return reply.status(400).send({ error: 'Invalid body', details: parse.error.flatten() });
    const now = new Date().toISOString();
    const id = new ObjectId().toHexString();
    const doc = { id, ...parse.data, createdAt: now, updatedAt: now };
    await collection.insertOne(doc);
    return reply.status(201).send(doc);
  });

  // Admin: update category
  app.patch('/v1/admin/categories/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const parse = categoryUpdateSchema.safeParse(req.body);
    if (!parse.success) return reply.status(400).send({ error: 'Invalid body', details: parse.error.flatten() });
    const now = new Date().toISOString();
    const res = await collection.updateOne(
      { $or: [{ id }, { _id: new ObjectId(id) }] },
      { $set: { ...parse.data, updatedAt: now } }
    );
    if (res.matchedCount === 0) return reply.status(404).send({ error: 'Category not found' });
    const updated = await collection.findOne({ $or: [{ id }, { _id: new ObjectId(id) }] });
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
  });

  // Admin: delete category (soft delete)
  app.delete('/v1/admin/categories/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const now = new Date().toISOString();
    const res = await collection.updateOne(
      { $or: [{ id }, { _id: new ObjectId(id) }] },
      { $set: { isActive: false, updatedAt: now } }
    );
    if (res.matchedCount === 0) return reply.status(404).send({ error: 'Category not found' });
    return reply.status(204).send();
  });
};

export default categoriesRoutes;