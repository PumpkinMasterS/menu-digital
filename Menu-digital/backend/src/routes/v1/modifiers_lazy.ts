import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { getCollection } from '../../lib/db';
import { ObjectId } from 'mongodb';

// DEV mode detection and in-memory store for modifiers when DB is unavailable
const devMode = !!process.env.DEV_LOGIN_EMAIL || !process.env.MONGODB_URI;
type DevModifierOption = {
  name: string;
  priceDelta: number;
  isAvailable: boolean;
};

type DevModifierGroup = {
  id: string;
  name: string;
  description?: string;
  order?: number;
  options: DevModifierOption[];
  maxSelections: number;
  isRequired: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

const DEV_MODIFIER_GROUPS: DevModifierGroup[] = [
  {
    id: 'mod-1',
    name: 'Opcionais de Hambúrguer',
    description: 'Adicionais para o seu hambúrguer',
    order: 1,
    options: [
      { name: 'Queijo Cheddar', priceDelta: 1.5, isAvailable: true },
      { name: 'Bacon', priceDelta: 2, isAvailable: true },
      { name: 'Cebola Caramelizada', priceDelta: 1, isAvailable: true },
      { name: 'Picles', priceDelta: 0.5, isAvailable: true }
    ],
    maxSelections: 3,
    isRequired: false,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'mod-2',
    name: 'Acompanhamentos',
    description: 'Escolha seu acompanhamento',
    order: 2,
    options: [
      { name: 'Batatas Fritas', priceDelta: 0, isAvailable: true },
      { name: 'Onion Rings', priceDelta: 1.5, isAvailable: true },
      { name: 'Salada', priceDelta: 0, isAvailable: true }
    ],
    maxSelections: 1,
    isRequired: true,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'mod-3',
    name: 'Molhos Extras',
    description: 'Adicione molhos extras',
    order: 3,
    options: [
      { name: 'Molho Barbecue', priceDelta: 0.5, isAvailable: true },
      { name: 'Molho Especial', priceDelta: 0.5, isAvailable: true },
      { name: 'Maionese', priceDelta: 0, isAvailable: true },
      { name: 'Ketchup', priceDelta: 0, isAvailable: true }
    ],
    maxSelections: 2,
    isRequired: false,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const modifierOptionSchema = z
  .object({
    name: z.string().min(1),
    priceDelta: z.number().optional().default(0),
    isAvailable: z.boolean().optional().default(true),
  })
  .strict();

const modifierGroupCreateSchema = z
  .object({
    name: z.string().min(1),
    description: z.string().optional(),
    order: z.number().int().optional(),
    options: z.array(modifierOptionSchema).default([]),
    // Permitir zero para seleção ilimitada (0 = sem limite)
    maxSelections: z.number().int().nonnegative().optional().default(1),
    isRequired: z.boolean().optional().default(false),
    isActive: z.boolean().optional().default(true),
  })
  .strict();

const modifierGroupUpdateSchema = modifierGroupCreateSchema.partial();

export const modifiersRoutes: FastifyPluginAsync = async (app) => {
  // Public: list active modifier groups
  app.get('/v1/public/modifiers', async (_req, reply) => {
    try {
      if (devMode) {
        const activeModifiers = DEV_MODIFIER_GROUPS.filter(mod => mod.isActive);
        return reply.send(activeModifiers);
      }
      
      const collection = await getCollection('modifier_groups');
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
        maxSelections: doc.maxSelections,
        isRequired: doc.isRequired,
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

  // Admin: list all modifier groups
  app.get('/v1/admin/modifiers', async (_req, reply) => {
    try {
      if (devMode) {
        return reply.send(DEV_MODIFIER_GROUPS);
      }
      
      const collection = await getCollection('modifier_groups');
      const items = await collection.find({}).sort({ order: 1, name: 1 }).toArray();
      const mapped = items.map((doc: any) => ({
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
    } catch (err: any) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Database error' });
    }
  });

  // Public: get single modifier group by id (only active)
  app.get('/v1/public/modifiers/:id', async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      
      if (devMode) {
        const modifier = DEV_MODIFIER_GROUPS.find(mod => (mod.id === id) && mod.isActive);
        if (!modifier) return reply.status(404).send({ error: 'Modifier group not found' });
        return reply.send(modifier);
      }
      
      const collection = await getCollection('modifier_groups');
      const doc = await collection.findOne({ $or: [{ id }, { _id: new ObjectId(id) }], isActive: true });
      if (!doc) return reply.status(404).send({ error: 'Modifier group not found' });
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
    } catch (err: any) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Database error' });
    }
  });

  // Admin: create modifier group
  app.post('/v1/admin/modifiers', async (req, reply) => {
    try {
      const parse = modifierGroupCreateSchema.safeParse(req.body);
      if (!parse.success) return reply.status(400).send({ error: 'Invalid body', details: parse.error.flatten() });
      
      if (devMode) {
        const now = new Date().toISOString();
        const id = `mod-${Date.now()}`;
        const newModifier: DevModifierGroup = {
          id,
          ...parse.data,
          createdAt: now,
          updatedAt: now
        };
        DEV_MODIFIER_GROUPS.push(newModifier);
        return reply.status(201).send(newModifier);
      }
      
      const collection = await getCollection('modifier_groups');
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

  // Admin: update modifier group
  app.patch('/v1/admin/modifiers/:id', async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const parse = modifierGroupUpdateSchema.safeParse(req.body);
      if (!parse.success) return reply.status(400).send({ error: 'Invalid body', details: parse.error.flatten() });
      
      if (devMode) {
        const idx = DEV_MODIFIER_GROUPS.findIndex(mod => mod.id === id);
        if (idx === -1) return reply.status(404).send({ error: 'Modifier group not found' });
        const now = new Date().toISOString();
        const updated = { ...DEV_MODIFIER_GROUPS[idx], ...parse.data, updatedAt: now };
        DEV_MODIFIER_GROUPS[idx] = updated;
        return reply.send(updated);
      }
      
      const collection = await getCollection('modifier_groups');
      const now = new Date().toISOString();
      const res = await collection.updateOne(
        { $or: [{ id }, { _id: new ObjectId(id) }] },
        { $set: { ...parse.data, updatedAt: now } }
      );
      if (res.matchedCount === 0) return reply.status(404).send({ error: 'Modifier group not found' });
      const updated = await collection.findOne({ $or: [{ id }, { _id: new ObjectId(id) }] });
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
    } catch (err: any) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Database error' });
    }
  });

  // Admin: delete modifier group (soft delete)
  app.delete('/v1/admin/modifiers/:id', async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      
      if (devMode) {
        const idx = DEV_MODIFIER_GROUPS.findIndex(mod => mod.id === id);
        if (idx === -1) return reply.status(404).send({ error: 'Modifier group not found' });
        DEV_MODIFIER_GROUPS[idx].isActive = false;
        DEV_MODIFIER_GROUPS[idx].updatedAt = new Date().toISOString();
        return reply.status(204).send();
      }
      
      const collection = await getCollection('modifier_groups');
      const now = new Date().toISOString();
      const res = await collection.updateOne(
        { $or: [{ id }, { _id: new ObjectId(id) }] },
        { $set: { isActive: false, updatedAt: now } }
      );
      if (res.matchedCount === 0) return reply.status(404).send({ error: 'Modifier group not found' });
      return reply.status(204).send();
    } catch (err: any) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Database error' });
    }
  });
};

export default modifiersRoutes;