import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const userCreateSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  roles: z.array(z.enum(['admin', 'staff'])).default(['staff']),
});

const userLoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
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
    const body = userLoginSchema.parse(req.body);

    // DEV fallback: allow login using env credentials without DB
    const devEmail = process.env.DEV_LOGIN_EMAIL;
    const devPassword = process.env.DEV_LOGIN_PASSWORD;
    const devRolesEnv = process.env.DEV_LOGIN_ROLES; // comma-separated
    // Debug minimal info to diagnose DEV fallback matching
    app.log.info(
      {
        bodyEmail: body.email,
        bodyPasswordLen: body.password?.length ?? 0,
        devEmail,
        devPasswordLen: devPassword?.length ?? 0,
      },
      'Auth login DEV check'
    );
    if (devEmail && devPassword && body.email === devEmail && body.password === devPassword) {
      const roles = devRolesEnv ? devRolesEnv.split(',').map((r) => r.trim()).filter(Boolean) : ['admin'];
      const token = jwt.sign({ id: 'dev-user', roles }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });
      return { token };
    }

    // Default: check DB user
    const users = getUsersCollection();
    const user = users ? await users.findOne({ email: body.email }) : null;
    if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user._id, roles: user.roles }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });
    return { token };
  });

};

export default usersRoutes;