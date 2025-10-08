"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const jwtAuthPlugin = async (app) => {
    app.addHook('onRequest', async (req, reply) => {
        try {
            const url = req.url || '';
            if (!url.startsWith('/v1/admin'))
                return;
            // Skip auth for login endpoint
            if (url === '/v1/auth/login')
                return;
            // Get token from Authorization header or query parameter
            let token;
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                token = authHeader.split(' ')[1];
            }
            else {
                token = req.query?.token;
            }
            if (!token) {
                return reply.status(401).send({ error: 'Authentication required' });
            }
            const jwtSecret = process.env.JWT_SECRET || 'secret';
            try {
                const decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
                // Add user info to request for use in route handlers
                req.user = {
                    id: decoded.id,
                    roles: decoded.roles
                };
                // Check if user has admin role for admin routes
                if (url.startsWith('/v1/admin') && !decoded.roles.includes('admin')) {
                    return reply.status(403).send({ error: 'Forbidden: Admin access required' });
                }
            }
            catch (err) {
                return reply.status(401).send({ error: 'Invalid or expired token' });
            }
        }
        catch (err) {
            app.log.error(err);
            return reply.status(500).send({ error: 'Authentication error' });
        }
    });
};
exports.default = jwtAuthPlugin;
