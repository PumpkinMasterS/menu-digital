"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const rate_limit_1 = __importDefault(require("@fastify/rate-limit"));
const static_1 = __importDefault(require("@fastify/static"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
async function buildServer() {
    const server = (0, fastify_1.default)({ logger: true });
    // Plugins
    await server.register(cors_1.default, { origin: true });
    await server.register(rate_limit_1.default, { max: 100, timeWindow: '1 minute' });
    await server.register(static_1.default, {
        root: path_1.default.join(__dirname, '../public'),
        prefix: '/public/',
    });
    // Register MongoDB only if DEV login is not explicitly enabled
    if (!process.env.DEV_LOGIN_EMAIL) {
        try {
            await server.register(require('@fastify/mongodb'), {
                url: process.env.MONGODB_URI || 'mongodb://localhost:27017/menu_digital',
                forceClose: true,
            });
        }
        catch (err) {
            server.log.warn('MongoDB connection failed; continuing without DB for DEV login.');
        }
    }
    else {
        server.log.warn('DEV login enabled; skipping MongoDB plugin registration.');
    }
    // Health
    server.get('/health', async () => ({ status: 'ok' }));
    // v1 routes placeholder
    server.register(async (app) => {
        app.get('/v1', async () => ({ version: 'v1' }));
        // Protect admin routes within the same encapsulation/context
        const { default: jwtAuthPlugin } = await Promise.resolve().then(() => __importStar(require('./plugins/jwt_auth')));
        await app.register(jwtAuthPlugin);
        // Register v1 routes (lazy MongoDB connection)
        const { default: categoriesRoutes } = await Promise.resolve().then(() => __importStar(require('./routes/v1/categories_lazy')));
        await app.register(categoriesRoutes);
        const { default: productsRoutes } = await Promise.resolve().then(() => __importStar(require('./routes/v1/products_lazy')));
        await app.register(productsRoutes);
        const { default: modifiersRoutes } = await Promise.resolve().then(() => __importStar(require('./routes/v1/modifiers_lazy')));
        await app.register(modifiersRoutes);
        const { default: variantsRoutes } = await Promise.resolve().then(() => __importStar(require('./routes/v1/variants_lazy')));
        await app.register(variantsRoutes);
        const { default: compositionRoutes } = await Promise.resolve().then(() => __importStar(require('./routes/v1/composition_lazy')));
        await app.register(compositionRoutes);
        const { default: ordersRoutes } = await Promise.resolve().then(() => __importStar(require('./routes/v1/orders_lazy')));
        await app.register(ordersRoutes);
        const { default: usersRoutes } = await Promise.resolve().then(() => __importStar(require('./routes/v1/users_lazy')));
        await app.register(usersRoutes);
        const { default: settingsRoutes } = await Promise.resolve().then(() => __importStar(require('./routes/v1/settings_lazy')));
        await app.register(settingsRoutes);
        const { default: tablesRoutes } = await Promise.resolve().then(() => __importStar(require('./routes/v1/tables_lazy')));
        await app.register(tablesRoutes);
    });
    return server;
}
const port = Number(process.env.PORT || 3000);
buildServer()
    .then((server) => server.listen({ port, host: '0.0.0.0' }).then(() => {
    server.log.info(`API listening on http://localhost:${port}`);
}))
    .catch((err) => {
    // Use console.error here because server may not be built
    console.error(err);
    process.exit(1);
});
