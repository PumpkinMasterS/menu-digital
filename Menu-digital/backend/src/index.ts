import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import staticPlugin from '@fastify/static';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

async function buildServer() {
  const server = Fastify({ logger: true });

  // Plugins
  await server.register(cors, { origin: true });
  await server.register(rateLimit, { max: 100, timeWindow: '1 minute' });
  await server.register(staticPlugin, {
    root: path.join(__dirname, '../public'),
    prefix: '/public/',
  });
  // Registar MongoDB quando existir URI; caso contrário, falha controlada
  const hasUri = !!process.env.MONGODB_URI;
  if (hasUri) {
    try {
      await server.register(require('@fastify/mongodb'), {
        url: process.env.MONGODB_URI,
        forceClose: true,
      });
    } catch (err) {
      server.log.warn('MongoDB connection failed; continuing without DB.');
    }
  }

  // Health
  server.get('/health', async () => ({ status: 'ok' }));

  // v1 routes placeholder
  server.register(async (app) => {
    app.get('/v1', async () => ({ version: 'v1' }));
    // Protect admin routes within the same encapsulation/context
    const { default: jwtAuthPlugin } = await import('./plugins/jwt_auth');
    await app.register(jwtAuthPlugin);
    // Register v1 routes (lazy MongoDB connection)
    const { default: categoriesRoutes } = await import('./routes/v1/categories_lazy');
    await app.register(categoriesRoutes);
    const { default: productsRoutes } = await import('./routes/v1/products_lazy');
    await app.register(productsRoutes);
    const { default: modifiersRoutes } = await import('./routes/v1/modifiers_lazy');
    await app.register(modifiersRoutes);
    const { default: variantsRoutes } = await import('./routes/v1/variants_lazy');
    await app.register(variantsRoutes);
    const { default: compositionRoutes } = await import('./routes/v1/composition_lazy');
    await app.register(compositionRoutes);
    const { default: ordersRoutes } = await import('./routes/v1/orders_lazy');
    await app.register(ordersRoutes);
    const { default: usersRoutes } = await import('./routes/v1/users_lazy');
    await app.register(usersRoutes);
    const { default: settingsRoutes } = await import('./routes/v1/settings_lazy');
    await app.register(settingsRoutes);
    const { default: tablesRoutes } = await import('./routes/v1/tables_lazy');
    await app.register(tablesRoutes);
    const { paymentsIfthenpayRoutes } = await import('./routes/v1/payments_ifthenpay');
    await app.register(paymentsIfthenpayRoutes);
  });

  return server;
}

const port = Number(process.env.PORT || 3000);

buildServer()
  .then((server) =>
    server.listen({ port, host: '0.0.0.0' }).then(() => {
      server.log.info(`API listening at http://localhost:${port}`);
    })
  )
  .catch((err) => {
    // Use console.error here because server may not be built
    console.error(err);
    process.exit(1);
  });