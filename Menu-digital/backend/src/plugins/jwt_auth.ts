import type { FastifyPluginAsync } from 'fastify';
import jwt from 'jsonwebtoken';

interface JWTPayload {
  id: string;
  roles: string[];
}

const jwtAuthPlugin: FastifyPluginAsync = async (app) => {
  app.log.info('auth:admin:hook-registered');
  app.addHook('onRequest', async (req, reply) => {
    try {
      const url = req.url || '';
      if (!url.startsWith('/v1/admin')) return; // só protege /v1/admin/*
      app.log.info({ url }, 'auth:admin:check');

      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({ error: 'Authentication required' });
      }

      const token = authHeader.split(' ')[1];
      const jwtSecret = process.env.JWT_SECRET || 'secret';

      try {
        const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
        req.user = { id: decoded.id, roles: decoded.roles };

        if (!decoded.roles || !decoded.roles.includes('admin')) {
          return reply.status(403).send({ error: 'Forbidden: Admin access required' });
        }
      } catch (err) {
        return reply.status(401).send({ error: 'Invalid or expired token' });
      }
    } catch (err: any) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Authentication error' });
    }
  });
};

export default jwtAuthPlugin;

// Extend FastifyRequest to include user property
declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      roles: string[];
    };
  }
}