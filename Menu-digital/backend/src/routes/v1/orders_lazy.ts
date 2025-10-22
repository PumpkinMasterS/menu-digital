import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { getCollection, getDb } from '../../lib/db';
import { ObjectId, ChangeStream } from 'mongodb';
import { EventEmitter } from 'events'

const sseEmitter = new EventEmitter();
let changeStream: ChangeStream | null = null;

const selectedOptionSchema = z
  .object({
    groupId: z.string().min(1),
    optionId: z.string().min(1),
  })
  .strict();

const orderItemSchema = z
  .object({
    productId: z.string().min(1),
    quantity: z.number().int().positive(),
    modifiers: z.array(selectedOptionSchema).optional().default([]),
    variants: z.array(selectedOptionSchema).optional().default([]),
    notes: z.string().optional(),
  })
  .strict();

const orderCreateSchema = z
  .object({
    tableId: z.string().optional(),
    items: z.array(orderItemSchema).min(1),
    notes: z.string().optional(),
    nif: z.string().optional(),
    payment: z
      .object({
        method: z.enum(['cash', 'card']).optional(),
        status: z.enum(['pending', 'paid', 'refunded']).optional(),
        transactionId: z.string().optional(),
      })
      .optional(),
  })
  .strict();

const orderUpdateSchema = z
  .object({
    status: z.enum(['pending', 'preparing', 'ready', 'delivered', 'cancelled']).optional(),
    notes: z.string().optional(),
    payment: z
      .object({
        method: z.enum(['cash', 'card']).optional(),
        status: z.enum(['pending', 'paid', 'refunded']).optional(),
        transactionId: z.string().optional(),
      })
      .optional(),
  })
  .strict()
  .partial();

async function calculateTotals(items: Array<z.infer<typeof orderItemSchema>>) {
  const productsCol = await getCollection('products');
  const modifierGroupsCol = await getCollection('modifier_groups');
  const variantGroupsCol = await getCollection('variant_groups');

  let subtotal = 0;
  const detailedItems = [] as any[];

  for (const item of items) {
    const product = await productsCol.findOne({
      $or: [{ id: item.productId }, { _id: new ObjectId(item.productId) }],
      isActive: true,
    });
    if (!product) throw new Error(`Product not found: ${item.productId}`);
    if (product.stockQuantity >= 0 && product.stockQuantity < item.quantity) {
      throw new Error(`Insufficient stock for product ${product.name}: only ${product.stockQuantity} available`);
    }

    let unitPrice = Number(product.price ?? 0);
    const mods: any[] = [];
    const vars: any[] = [];

    for (const sel of item.modifiers ?? []) {
      const group = await modifierGroupsCol.findOne({
        $or: [{ id: sel.groupId }, { _id: new ObjectId(sel.groupId) }],
        isActive: true,
      });
      const opt = group?.options?.find((o: any) => o.id === sel.optionId || o._id?.toString() === sel.optionId || o.name === sel.optionId);
      const delta = Number(opt?.priceDelta ?? 0);
      unitPrice += delta;
      mods.push({ groupId: sel.groupId, groupName: group?.name, optionId: sel.optionId, optionName: opt?.name, priceDelta: delta });
    }

    for (const sel of item.variants ?? []) {
      const group = await variantGroupsCol.findOne({
        $or: [{ id: sel.groupId }, { _id: new ObjectId(sel.groupId) }],
        isActive: true,
      });
      const opt = group?.options?.find((o: any) => o.id === sel.optionId || o._id?.toString() === sel.optionId || o.name === sel.optionId);
      const delta = Number(opt?.priceDelta ?? 0);
      unitPrice += delta;
      vars.push({ groupId: sel.groupId, groupName: group?.name, optionId: sel.optionId, optionName: opt?.name, priceDelta: delta });
    }

    const lineTotal = unitPrice * item.quantity;
    subtotal += lineTotal;
    detailedItems.push({
      product: {
        id: product.id ?? product._id?.toString(),
        name: product.name,
      },
      quantity: item.quantity,
      unitPrice,
      lineTotal,
      modifiers: mods,
      variants: vars,
      notes: item.notes,
    });
  }

  const tax = 0;
  const total = subtotal + tax;
  return { subtotal, tax, total, items: detailedItems };
}

async function initializeChangeStream() {
  if (changeStream) return;
  
  try {
    const ordersCol = await getCollection('orders');
    
    changeStream = ordersCol.watch([], { 
      fullDocument: 'updateLookup'
    });
    
    changeStream.on('change', (change) => {
      sseEmitter.emit('order-change', change);
    });
    
    changeStream.on('error', (error) => {
      console.error('Change stream error:', error);
      changeStream = null;
      setTimeout(initializeChangeStream, 5000);
    });
    
    console.log('MongoDB Change Stream initialized for orders collection');
  } catch (error) {
    console.error('Failed to initialize change stream:', error);
    changeStream = null;
  }
}

const ordersRoutes = async (app) => {
  await initializeChangeStream();
  // Public: criar pedido
  app.post('/v1/public/orders', async (req, reply) => {
    try {
      const parse = orderCreateSchema.safeParse(req.body);
      if (!parse.success) return reply.status(400).send({ error: 'Invalid body', details: parse.error.flatten() });

      const totals = await calculateTotals(parse.data.items);

      const db = await getDb();
      let insertedDoc;
      const productsCol = await getCollection('products');
      const ordersCol = await getCollection('orders');

      for (const ditem of totals.items) {
        const pid = ditem.product.id;
        const qty = ditem.quantity;

        const updated = await productsCol.findOneAndUpdate(
          { id: pid, stockQuantity: { $ne: -1, $gte: qty } },
          { $inc: { stockQuantity: -qty } }
        );
        if (!updated || !updated.value) {
          const prod = await productsCol.findOne(
            { id: pid },
            { projection: { stockQuantity: 1, name: 1 } }
          );
          if (prod && prod.stockQuantity >= 0) {
            throw new Error(`Produto sem stock suficiente: ${prod.name}`);
          }
        }
      }

      const now = new Date().toISOString();
      const doc = {
        id: (Math.random().toString(36).slice(2)),
        tableId: parse.data.tableId,
        nif: parse.data.nif,
        status: 'pending',
        items: totals.items.map((it) => ({
          quantity: it.quantity,
          productId: it.product.id,
          name: it.product.name,
          modifiers: it.modifiers,
          variants: it.variants,
          notes: it.notes,
        })),
        totals: { subtotal: totals.subtotal, tax: totals.tax, total: totals.total },
        createdAt: now,
        updatedAt: now,
      };

      const insertResult = await ordersCol.insertOne(doc);
      if (!insertResult.acknowledged) {
        throw new Error('Failed to insert order');
      }
      insertedDoc = { ...doc, _id: insertResult.insertedId };

      return reply.status(201).send(insertedDoc);
    } catch (err: any) {
      app.log.error(err);
      return reply.status(400).send({ error: err?.message ?? 'Order creation error' });
    }
  });

  // Public: obter pedido por id (formato reduzido para o app de menu)
  app.get('/v1/public/orders/:id', async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const ordersCol = await getCollection('orders');
      const filter = ObjectId.isValid(id) ? { $or: [{ id }, { _id: new ObjectId(id) }] } : { id };
      const doc = await ordersCol.findOne(filter);
      if (!doc) return reply.status(404).send({ error: 'Order not found' });

      const items = Array.isArray((doc as any).items)
        ? (doc as any).items.map((it: any) => ({
            quantity: it.quantity,
            name: it?.name ?? it?.product?.name,
            productId: it?.productId ?? it?.product?.id,
          }))
        : [];

      return reply.send({
        id: (doc as any).id ?? (doc as any)._id?.toString(),
        status: ((doc as any).status === 'preparing' ? 'in_progress' : (doc as any).status),
        tableId: (doc as any).tableId,
        items,
        total: (doc as any).totals?.total ?? (doc as any).total,
        createdAt: (doc as any).createdAt,
      });
    } catch (err: any) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Database error' });
    }
  });

  // Admin: listar pedidos com paginação e filtro por status
  app.get('/v1/admin/orders', async (req, reply) => {
    try {
      const querySchema = z
        .object({
          page: z.coerce.number().int().positive().optional().default(1),
          limit: z.coerce.number().int().positive().max(200).optional().default(50),
          status: z.enum(['pending', 'accepted', 'in_progress', 'ready', 'delivered', 'cancelled']).optional(),
        })
        .strict();
      const parsed = querySchema.safeParse(req.query);
      if (!parsed.success) return reply.status(400).send({ error: 'Invalid query', details: parsed.error.flatten() });
      const { page, limit, status } = parsed.data;

      const ordersCol = await getCollection('orders');
      const filter: any = {};
      if (status) filter.status = status;
      const cursor = ordersCol.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit);
      const items = await cursor.toArray();
      const total = await ordersCol.countDocuments(filter);
      return reply.send({
        items: items.map((o: any) => ({
          id: o.id ?? o._id?.toString(),
          orderNumber: o.orderNumber,
          status: o.status,
          totals: o.totals,
          tableId: o.tableId,
          isActive: o.isActive,
          items: o.items || [],
          notes: o.notes,
          nif: o.nif,
          createdAt: o.createdAt,
          updatedAt: o.updatedAt,
        })),
        page,
        limit,
        total,
      });
    } catch (err: any) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Database error' });
    }
  });

  // Admin: obter pedido
  app.get('/v1/admin/orders/:id', async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const ordersCol = await getCollection('orders');
      const filter = ObjectId.isValid(id) ? { $or: [{ id }, { _id: new ObjectId(id) }] } : { id };
      const doc = await ordersCol.findOne(filter);
      if (!doc) return reply.status(404).send({ error: 'Order not found' });
      return reply.send(doc);
    } catch (err: any) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Database error' });
    }
  });

  // Admin: atualizar pedido
  app.patch('/v1/admin/orders/:id', async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const parse = orderUpdateSchema.safeParse(req.body);
      if (!parse.success) return reply.status(400).send({ error: 'Invalid body', details: parse.error.flatten() });
      const ordersCol = await getCollection('orders');
      const now = new Date().toISOString();
      const filter = ObjectId.isValid(id) ? { $or: [{ id }, { _id: new ObjectId(id) }] } : { id };
      const res = await ordersCol.updateOne(
        filter,
        { $set: { ...parse.data, updatedAt: now } }
      );
      if (res.matchedCount === 0) return reply.status(404).send({ error: 'Order not found' });
      const updated = await ordersCol.findOne(filter);

      return reply.send(updated);
    } catch (err: any) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Database error' });
    }
  });

  // Admin: cancelar (soft delete)
  app.delete('/v1/admin/orders/:id', async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const ordersCol = await getCollection('orders');
      const now = new Date().toISOString();
      const filter = ObjectId.isValid(id) ? { $or: [{ id }, { _id: new ObjectId(id) }] } : { id };
      const res = await ordersCol.updateOne(
        filter,
        { $set: { status: 'cancelled', isActive: false, updatedAt: now } }
      );
      if (res.matchedCount === 0) return reply.status(404).send({ error: 'Order not found' });
      return reply.status(204).send();
    } catch (err: any) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Database error' });
    }
  });

  // Admin: SSE stream for order changes
  app.get('/v1/admin/orders/stream', async (req, reply) => {
    // Definir headers diretamente no socket para garantir MIME correto
    try {
      reply.raw.setHeader('Content-Type', 'text/event-stream');
      reply.raw.setHeader('Cache-Control', 'no-cache');
      reply.raw.setHeader('Connection', 'keep-alive');
    } catch {}

    // Ensure headers are flushed and start stream immediately
    try { (reply.raw as any).flushHeaders?.(); } catch {}
    try { reply.raw.write(':connected\n\n'); } catch {}

    // keep-alive/heartbeat para evitar timeouts
    const heartbeat = setInterval(() => {
      try { reply.raw.write(':keep-alive\n\n'); } catch {}
    }, 30000);

    const listener = (change: any) => {
      try {
        reply.raw.write(`data: ${JSON.stringify(change)}\n\n`);
      } catch {}
    };

    sseEmitter.on('order-change', listener);

    req.raw.on('close', () => {
      clearInterval(heartbeat);
      sseEmitter.off('order-change', listener);
      try { reply.raw.end(); } catch {}
    });
  });
};

export default ordersRoutes;