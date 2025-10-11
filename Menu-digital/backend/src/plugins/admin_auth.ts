import type { FastifyPluginAsync } from 'fastify';

const adminAuthPlugin: FastifyPluginAsync = async (app) => {
  app.addHook('onRequest', async (req, reply) => {
    try {
      const url = req.url || '';
      if (!url.startsWith('/v1/admin')) return;

      const headerToken = req.headers['x-admin-token'] as string | undefined;
      const queryToken = (req.query as any)?.token as string | undefined;
      const token = headerToken || queryToken;
      const envToken = process.env.ADMIN_TOKEN;
      if (!envToken) {
        app.log.warn('ADMIN_TOKEN not set; denying admin access');
        return reply.status(401).send({ error: 'Unauthorized' });
      }
      if (!token || token !== envToken) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }
    } catch (err: any) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Auth error' });
    }
  });
};

export default adminAuthPlugin;