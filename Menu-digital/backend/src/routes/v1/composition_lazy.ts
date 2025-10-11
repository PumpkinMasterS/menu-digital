import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { getCollection } from '../../lib/db';
import { ObjectId } from 'mongodb';

const linkGroupsSchema = z
  .object({
    groupIds: z.array(z.string().min(1)).min(0),
  })
  .strict();

function toObjectIds(ids: string[]) {
  return ids
    .filter((id) => /^[a-f\d]{24}$/i.test(id))
    .map((id) => new ObjectId(id));
}

export const compositionRoutes: FastifyPluginAsync = async (app) => {
  // Admin: vincular grupos de modificadores ao produto
  app.put('/v1/admin/products/:id/modifiers', async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const parse = linkGroupsSchema.safeParse(req.body);
      if (!parse.success) return reply.status(400).send({ error: 'Invalid body', details: parse.error.flatten() });

      const products = await getCollection('products');
      const now = new Date().toISOString();
      const res = await products.updateOne(
        { $or: [{ id }, { _id: new ObjectId(id) }] },
        { $set: { 'composition.modifierGroupIds': parse.data.groupIds, updatedAt: now } }
      );
      if (res.matchedCount === 0) return reply.status(404).send({ error: 'Product not found' });
      const updated = await products.findOne({ $or: [{ id }, { _id: new ObjectId(id) }] });
      return reply.send(updated);
    } catch (err: any) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Database error' });
    }
  });

  // Admin: vincular grupos de variantes ao produto
  app.put('/v1/admin/products/:id/variants', async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const parse = linkGroupsSchema.safeParse(req.body);
      if (!parse.success) return reply.status(400).send({ error: 'Invalid body', details: parse.error.flatten() });

      const products = await getCollection('products');
      const now = new Date().toISOString();
      const res = await products.updateOne(
        { $or: [{ id }, { _id: new ObjectId(id) }] },
        { $set: { 'composition.variantGroupIds': parse.data.groupIds, updatedAt: now } }
      );
      if (res.matchedCount === 0) return reply.status(404).send({ error: 'Product not found' });
      const updated = await products.findOne({ $or: [{ id }, { _id: new ObjectId(id) }] });
      return reply.send(updated);
    } catch (err: any) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Database error' });
    }
  });

  // Public: obter composição expandida de um produto
  app.get('/v1/public/products/:id/composition', async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const products = await getCollection('products');
      const product = await products.findOne({ $or: [{ id }, { _id: new ObjectId(id) }], isActive: true });
      if (!product) return reply.status(404).send({ error: 'Product not found' });

      const modifierIds: string[] = product?.composition?.modifierGroupIds ?? [];
      const variantIds: string[] = product?.composition?.variantGroupIds ?? [];

      const modifierGroupsCol = await getCollection('modifier_groups');
      const variantGroupsCol = await getCollection('variant_groups');

      const modifierGroups = await modifierGroupsCol
        .find({
          $and: [
            { isActive: true },
            {
              $or: [
                { id: { $in: modifierIds } },
                { _id: { $in: toObjectIds(modifierIds) } },
              ],
            },
          ],
        })
        .sort({ order: 1, name: 1 })
        .toArray();

      const variantGroups = await variantGroupsCol
        .find({
          $and: [
            { isActive: true },
            {
              $or: [
                { id: { $in: variantIds } },
                { _id: { $in: toObjectIds(variantIds) } },
              ],
            },
          ],
        })
        .sort({ order: 1, name: 1 })
        .toArray();

      return reply.send({
        product: {
          id: product.id ?? product._id?.toString(),
          name: product.name,
          description: product.description,
          imageUrl: product.imageUrl,
          price: product.price,
        },
        modifierGroups,
        variantGroups,
      });
    } catch (err: any) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Database error' });
    }
  });
};

export default compositionRoutes;