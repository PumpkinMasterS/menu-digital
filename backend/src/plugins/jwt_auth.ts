import type { FastifyPluginAsync } from 'fastify';
import jwt from 'jsonwebtoken';

interface JWTPayload {
  id: string;
  roles: string[];
}

const jwtAuthPlugin: FastifyPluginAsync = async (app) => {
  app.addHook('onRequest', async (req, reply) => {
    try {
      const url = req.url || '';
      if (!url.startsWith('/v1/admin')) return;
      
      // Skip auth for login endpoint
      if (url === '/v1/auth/login') return;

      // If an admin token header is present, let other auth plugins handle it
      const adminHeaderToken = req.headers['x-admin-token'] as string | undefined;
      if (adminHeaderToken) return;

      // Get token from Authorization header or query parameter
      let token: string | undefined;
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      } else {
        token = (req.query as any)?.token;
      }
      if (!token) {
        return reply.status(401).send({ error: 'Authentication required' });
      }
      const jwtSecret = process.env.JWT_SECRET || 'secret';
      
      try {
        const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
        
        // Add user info to request for use in route handlers
        req.user = {
          id: decoded.id,
          roles: decoded.roles
        };
        
        // Check if user has admin role for admin routes
        if (url.startsWith('/v1/admin') && !decoded.roles.includes('admin')) {
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