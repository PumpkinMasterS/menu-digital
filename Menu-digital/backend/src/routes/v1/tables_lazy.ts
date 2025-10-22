import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { getCollection } from '../../lib/db';
import { ObjectId } from 'mongodb';
import QRCode from 'qrcode';
import jwt from 'jsonwebtoken';

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

// Simple admin auth preHandler for admin endpoints in this module
async function requireAdmin(req: any, reply: any) {
  const authHeader = req.headers?.authorization as string | undefined;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Authentication required' });
  }
  const token = authHeader.split(' ')[1];
  const jwtSecret = process.env.JWT_SECRET || 'secret';
  try {
    const decoded = jwt.verify(token, jwtSecret) as { id: string; roles?: string[] };
    if (!decoded.roles || !decoded.roles.includes('admin')) {
      return reply.status(403).send({ error: 'Forbidden: Admin access required' });
    }
    (req as any).user = { id: decoded.id, roles: decoded.roles };
  } catch (err) {
    return reply.status(401).send({ error: 'Invalid or expired token' });
  }
}

const tablesRoutes: FastifyPluginAsync = async (app) => {
  // Admin: listar mesas
  app.get('/v1/admin/tables', { preHandler: requireAdmin }, async (req, reply) => {
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
  app.post('/v1/admin/tables', { preHandler: requireAdmin }, async (req, reply) => {
    try {
      const parse = tableCreateSchema.safeParse(req.body);
      if (!parse.success) return reply.status(400).send({ error: 'Invalid body', details: parse.error.flatten() });

      const tablesCol = await getCollection('tables');
      // Unicidade: impedir nome ou código duplicados
      const nameTrim = parse.data.name.trim();
      const codeTrim = parse.data.code.trim();
      const dup = await tablesCol.findOne({ $or: [ { name: nameTrim }, { code: codeTrim } ] });
      if (dup) return reply.status(409).send({ error: 'Duplicate table name or code' });

      const now = new Date().toISOString();
      const id = new ObjectId().toHexString();
      const doc = {
        id,
        ...parse.data,
        name: nameTrim,
        code: codeTrim,
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
  app.patch('/v1/admin/tables/:id', { preHandler: requireAdmin }, async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const parse = tableUpdateSchema.safeParse(req.body);
      if (!parse.success) return reply.status(400).send({ error: 'Invalid body', details: parse.error.flatten() });

      const tablesCol = await getCollection('tables');
      const now = new Date().toISOString();
      const filter = ObjectId.isValid(id) ? { $or: [{ id }, { _id: new ObjectId(id) }] } : { id };

      // Unicidade em update: se mudar nome/código, verificar conflito com outra mesa
      if (parse.data.name || parse.data.code) {
        const changes: any = {};
        if (parse.data.name) changes.name = parse.data.name.trim();
        if (parse.data.code) changes.code = parse.data.code.trim();
        const conflict = await tablesCol.findOne({
          $and: [
            { $or: [ changes.name ? { name: changes.name } : undefined, changes.code ? { code: changes.code } : undefined ].filter(Boolean) },
            { $nor: [ { id }, { _id: ObjectId.isValid(id) ? new ObjectId(id) : undefined } ].filter(Boolean) },
          ]
        });
        if (conflict) return reply.status(409).send({ error: 'Duplicate table name or code' });
      }

      const updated = await tablesCol.findOneAndUpdate(
        filter,
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
  app.delete('/v1/admin/tables/:id', { preHandler: requireAdmin }, async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const tablesCol = await getCollection('tables');
      const filter = ObjectId.isValid(id) ? { $or: [{ id }, { _id: new ObjectId(id) }] } : { id };
      const deleted = await tablesCol.deleteOne(filter);
      if (deleted.deletedCount === 0) return reply.status(404).send({ error: 'Table not found' });
      return reply.status(204).send();
    } catch (err: any) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Database error' });
    }
  });

  // Admin: gerar QR code para mesa
  app.get('/v1/admin/tables/:id/qrcode', { preHandler: requireAdmin, config: { rateLimit: false } }, async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const tablesCol = await getCollection('tables');
      const filter = ObjectId.isValid(id) ? { $or: [{ id }, { _id: new ObjectId(id) }] } : { id };
      const table = await tablesCol.findOne(filter);
      if (!table) return reply.status(404).send({ error: 'Table not found' });

      const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
      const qrHost = process.env.QR_BASE_HOST;
      const protocol = process.env.QR_PROTOCOL || 'https';
      const url = qrHost
        ? `${protocol}://${table.code}.${qrHost}/menu`
        : `${baseUrl}/menu?table=${table.code}`;

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

  // Admin: obter URL do QR code para mesa (JSON)
  app.get('/v1/admin/tables/:id/qrcode/url', { preHandler: requireAdmin, config: { rateLimit: false } }, async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const tablesCol = await getCollection('tables');
      const filter = ObjectId.isValid(id) ? { $or: [{ id }, { _id: new ObjectId(id) }] } : { id };
      const table = await tablesCol.findOne(filter);
      if (!table) return reply.status(404).send({ error: 'Table not found' });

      const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
      const qrHost = process.env.QR_BASE_HOST;
      const protocol = process.env.QR_PROTOCOL || 'https';
      const url = qrHost
        ? `${protocol}://${table.code}.${qrHost}/menu`
        : `${baseUrl}/menu?table=${table.code}`;

      return reply.send({ url });
    } catch (err: any) {
      app.log.error(err);
      return reply.status(500).send({ error: 'QR url generation error' });
    }
  });
};

export default tablesRoutes;