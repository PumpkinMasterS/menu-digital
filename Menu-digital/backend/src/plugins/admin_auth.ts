import type { FastifyPluginAsync } from 'fastify';

const adminAuthPlugin: FastifyPluginAsync = async (app) => {
  app.addHook('onRequest', async (req, reply) => {
    try {
      const url = req.url || '';
      if (!url.startsWith('/v1/admin')) return;

      // Se já houver JWT no Authorization, deixa o plugin de JWT tratar
      const authHeader = req.headers.authorization as string | undefined;
      if (authHeader && authHeader.startsWith('Bearer ')) return;

      // Este plugin valida APENAS o token legacy via header x-admin-token
      const headerToken = req.headers['x-admin-token'] as string | undefined;
      if (!headerToken) return; // sem legacy token; ignora e deixa outros plugins tratarem

      const envToken = process.env.ADMIN_TOKEN;
      if (!envToken) {
        app.log.warn('ADMIN_TOKEN not set; denying admin access');
        return reply.status(401).send({ error: 'Unauthorized' });
      }
      if (headerToken !== envToken) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }
    } catch (err: any) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Auth error' });
    }
  });
};

export default adminAuthPlugin;