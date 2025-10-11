import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { getCollection } from '../../lib/db';
import { ObjectId } from 'mongodb';
import QRCode from 'qrcode';

const tableCreateSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  type: z.enum(['table', 'takeaway']).optional().default('table'),
  isActive: z.boolean().optional().default(true),
}).passthrough();

const tableUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  type: z.enum(['table', 'takeaway']).optional(),
  isActive: z.boolean().optional(),
}).passthrough();

const tablesRoutes: FastifyPluginAsync = async (app) => {
  // Admin: listar mesas
  app.get('/v1/admin/tables', async (req, reply) => {
    try {
      const tablesCol = await getCollection('tables');
      const items = await tablesCol.find({}).toArray();
      return reply.send({ items });
    } catch (err: any) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Database error' });
    }
  });

  // Admin: criar mesa
  app.post('/v1/admin/tables', async (req, reply) => {
    try {
      const parse = tableCreateSchema.safeParse(req.body);
      if (!parse.success) return reply.status(400).send({ error: 'Invalid body', details: parse.error.flatten() });

      const tablesCol = await getCollection('tables');
      const now = new Date().toISOString();
      const id = new ObjectId().toHexString();
      const doc = {
        id,
        ...parse.data,
        createdAt: now,
        updatedAt: now,
      };
      await tablesCol.insertOne(doc);
      return reply.status(201).send(doc);
    } catch (err: any) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Database error' });
    }
  });

  // Admin: atualizar mesa
  app.patch('/v1/admin/tables/:id', async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const parse = tableUpdateSchema.safeParse(req.body);
      if (!parse.success) return reply.status(400).send({ error: 'Invalid body', details: parse.error.flatten() });

      const tablesCol = await getCollection('tables');
      const now = new Date().toISOString();
      const updated = await tablesCol.findOneAndUpdate(
        { id },
        { $set: { ...parse.data, updatedAt: now } },
        { returnDocument: 'after' }
      );
      if (!updated.value) return reply.status(404).send({ error: 'Table not found' });
      return reply.send(updated.value);
    } catch (err: any) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Database error' });
    }
  });

  // Admin: deletar mesa
  app.delete('/v1/admin/tables/:id', async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const tablesCol = await getCollection('tables');
      const deleted = await tablesCol.deleteOne({ id });
      if (deleted.deletedCount === 0) return reply.status(404).send({ error: 'Table not found' });
      return reply.status(204).send();
    } catch (err: any) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Database error' });
    }
  });

  // Admin: gerar QR code para mesa
  app.get('/v1/admin/tables/:id/qrcode', async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const tablesCol = await getCollection('tables');
      const table = await tablesCol.findOne({ id });
      if (!table) return reply.status(404).send({ error: 'Table not found' });

      const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
      const url = `${baseUrl}/menu?table=${table.code}`;

      const svg = await new Promise<string>((resolve, reject) => {
        QRCode.toString(url, { type: 'svg' }, (err, data) => {
          if (err) reject(err);
          else resolve(data);
        });
      });

      return reply.type('image/svg+xml').send(svg);
    } catch (err: any) {
      app.log.error(err);
      return reply.status(500).send({ error: 'QR generation error' });
    }
  });
};

export default tablesRoutes;