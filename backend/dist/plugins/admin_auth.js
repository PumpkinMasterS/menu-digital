"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const adminAuthPlugin = async (app) => {
    app.addHook('onRequest', async (req, reply) => {
        try {
            const url = req.url || '';
            if (!url.startsWith('/v1/admin'))
                return;
            const headerToken = req.headers['x-admin-token'];
            const queryToken = req.query?.token;
            const token = headerToken || queryToken;
            const envToken = process.env.ADMIN_TOKEN;
            if (!envToken) {
                app.log.warn('ADMIN_TOKEN not set; denying admin access');
                return reply.status(401).send({ error: 'Unauthorized' });
            }
            if (!token || token !== envToken) {
                return reply.status(401).send({ error: 'Unauthorized' });
            }
        }
        catch (err) {
            app.log.error(err);
            return reply.status(500).send({ error: 'Auth error' });
        }
    });
};
exports.default = adminAuthPlugin;
