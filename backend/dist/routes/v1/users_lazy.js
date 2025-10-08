"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const userCreateSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8),
    roles: zod_1.z.array(zod_1.z.enum(['admin', 'staff'])).default(['staff']),
});
const userLoginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string(),
});
const usersRoutes = async (app) => {
    const getUsersCollection = () => {
        try {
            const db = app.mongo?.client?.db?.();
            return db ? db.collection('users') : null;
        }
        catch {
            return null;
        }
    };
    // Create user (admin only)
    app.post('/v1/admin/users', async (req, reply) => {
        const body = userCreateSchema.parse(req.body);
        const users = getUsersCollection();
        if (!users)
            return reply.status(503).send({ error: 'Database unavailable' });
        const hashedPassword = await bcrypt_1.default.hash(body.password, 10);
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
        if (devEmail && devPassword && body.email === devEmail && body.password === devPassword) {
            const roles = devRolesEnv ? devRolesEnv.split(',').map((r) => r.trim()).filter(Boolean) : ['admin'];
            const token = jsonwebtoken_1.default.sign({ id: 'dev-user', roles }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });
            return { token };
        }
        // Default: check DB user
        const users = getUsersCollection();
        const user = users ? await users.findOne({ email: body.email }) : null;
        if (!user || !(await bcrypt_1.default.compare(body.password, user.passwordHash))) {
            return reply.status(401).send({ error: 'Invalid credentials' });
        }
        const token = jsonwebtoken_1.default.sign({ id: user._id, roles: user.roles }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });
        return { token };
    });
};
exports.default = usersRoutes;
