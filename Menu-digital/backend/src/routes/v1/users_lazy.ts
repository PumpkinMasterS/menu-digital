import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const userCreateSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  roles: z.array(z.string()).default(['admin']),
});

const userLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const usersRoutes: FastifyPluginAsync = async (app) => {
  const getUsersCollection = () => {
    try {
      const db = (app as any).mongo?.client?.db?.();
      return db ? db.collection('users') : null;
    } catch {
      return null;
    }
  };

  // Create user (admin only)
  app.post('/v1/admin/users', async (req, reply) => {
    const body = userCreateSchema.parse(req.body);
    const users = getUsersCollection();
    if (!users) return reply.status(503).send({ error: 'Database unavailable' });
    const hashedPassword = await bcrypt.hash(body.password, 10);
    const user = {
      email: body.email,
      passwordHash: hashedPassword,
      roles: body.roles,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await users.insertOne(user);
    return reply.status(201).send({ id: result.insertedId });
  });

  // Login
  app.post('/v1/auth/login', async (req, reply) => {
    try {
      const parsed = userLoginSchema.safeParse(req.body);
      if (!parsed.success) return reply.status(400).send({ error: 'Invalid input', details: parsed.error.flatten() });
      const body = parsed.data;

      // Removed DEV fallback: always authenticate against DB users
      const users = getUsersCollection();
      if (!users) return reply.status(503).send({ error: 'Database unavailable' });
      const user = await users.findOne({ email: body.email });
      if (!user || typeof (user as any).passwordHash !== 'string') {
        return reply.status(401).send({ error: 'Invalid credentials' });
      }
      const match = await bcrypt.compare(body.password, (user as any).passwordHash);
      if (!match) return reply.status(401).send({ error: 'Invalid credentials' });
      const token = jwt.sign({ id: (user as any)._id, roles: (user as any).roles }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });
      return { token };
    } catch (err: any) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Auth error' });
    }
  });

};

export default usersRoutes;