"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compositionRoutes = void 0;
const zod_1 = require("zod");
const db_1 = require("../../lib/db");
const mongodb_1 = require("mongodb");
const linkGroupsSchema = zod_1.z
    .object({
    groupIds: zod_1.z.array(zod_1.z.string().min(1)).min(0),
})
    .strict();
function toObjectIds(ids) {
    return ids
        .filter((id) => /^[a-f\d]{24}$/i.test(id))
        .map((id) => new mongodb_1.ObjectId(id));
}
const compositionRoutes = async (app) => {
    // Admin: vincular grupos de modificadores ao produto
    app.put('/v1/admin/products/:id/modifiers', async (req, reply) => {
        try {
            const { id } = req.params;
            const parse = linkGroupsSchema.safeParse(req.body);
            if (!parse.success)
                return reply.status(400).send({ error: 'Invalid body', details: parse.error.flatten() });
            const products = await (0, db_1.getCollection)('products');
            const now = new Date().toISOString();
            const res = await products.updateOne({ $or: [{ id }, { _id: new mongodb_1.ObjectId(id) }] }, { $set: { 'composition.modifierGroupIds': parse.data.groupIds, updatedAt: now } });
            if (res.matchedCount === 0)
                return reply.status(404).send({ error: 'Product not found' });
            const updated = await products.findOne({ $or: [{ id }, { _id: new mongodb_1.ObjectId(id) }] });
            return reply.send(updated);
        }
        catch (err) {
            app.log.error(err);
            return reply.status(500).send({ error: 'Database error' });
        }
    });
    // Admin: vincular grupos de variantes ao produto
    app.put('/v1/admin/products/:id/variants', async (req, reply) => {
        try {
            const { id } = req.params;
            const parse = linkGroupsSchema.safeParse(req.body);
            if (!parse.success)
                return reply.status(400).send({ error: 'Invalid body', details: parse.error.flatten() });
            const products = await (0, db_1.getCollection)('products');
            const now = new Date().toISOString();
            const res = await products.updateOne({ $or: [{ id }, { _id: new mongodb_1.ObjectId(id) }] }, { $set: { 'composition.variantGroupIds': parse.data.groupIds, updatedAt: now } });
            if (res.matchedCount === 0)
                return reply.status(404).send({ error: 'Product not found' });
            const updated = await products.findOne({ $or: [{ id }, { _id: new mongodb_1.ObjectId(id) }] });
            return reply.send(updated);
        }
        catch (err) {
            app.log.error(err);
            return reply.status(500).send({ error: 'Database error' });
        }
    });
    // Public: obter composição expandida de um produto
    app.get('/v1/public/products/:id/composition', async (req, reply) => {
        try {
            const { id } = req.params;
            const products = await (0, db_1.getCollection)('products');
            const product = await products.findOne({ $or: [{ id }, { _id: new mongodb_1.ObjectId(id) }], isActive: true });
            if (!product)
                return reply.status(404).send({ error: 'Product not found' });
            const modifierIds = product?.composition?.modifierGroupIds ?? [];
            const variantIds = product?.composition?.variantGroupIds ?? [];
            const modifierGroupsCol = await (0, db_1.getCollection)('modifier_groups');
            const variantGroupsCol = await (0, db_1.getCollection)('variant_groups');
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
        }
        catch (err) {
            app.log.error(err);
            return reply.status(500).send({ error: 'Database error' });
        }
    });
};
exports.compositionRoutes = compositionRoutes;
exports.default = exports.compositionRoutes;
