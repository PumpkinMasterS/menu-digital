"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentsIfthenpayRoutes = void 0;
const zod_1 = require("zod");
const db_1 = require("../../lib/db");
const crypto_1 = __importDefault(require("crypto"));
// Schemas de validação
const multibancoPaymentSchema = zod_1.z.object({
    orderId: zod_1.z.string(),
    amount: zod_1.z.number().positive(),
    customerName: zod_1.z.string().optional(),
    customerEmail: zod_1.z.string().email().optional(),
});
const mbwayPaymentSchema = zod_1.z.object({
    orderId: zod_1.z.string(),
    amount: zod_1.z.number().positive(),
    phoneNumber: zod_1.z.string().regex(/^9[1236]\d{7}$/), // Formato: 9XXXXXXXX
    customerEmail: zod_1.z.string().email().optional(),
});
const callbackSchema = zod_1.z.object({
    Key: zod_1.z.string(),
    Id: zod_1.z.string().optional(),
    Entidade: zod_1.z.string().optional(),
    Referencia: zod_1.z.string().optional(),
    Valor: zod_1.z.string().optional(),
    DataHoraPagamento: zod_1.z.string().optional(),
    Terminal: zod_1.z.string().optional(),
    // MB WAY específico
    RequestId: zod_1.z.string().optional(),
    Estado: zod_1.z.string().optional(),
}).passthrough();
const paymentsIfthenpayRoutes = async (app) => {
    // Criar referência Multibanco
    app.post('/v1/public/payments/multibanco', async (req, reply) => {
        const parsed = multibancoPaymentSchema.safeParse(req.body);
        if (!parsed.success) {
            return reply.status(400).send({ error: 'Invalid request', details: parsed.error });
        }
        const { orderId, amount, customerName, customerEmail } = parsed.data;
        try {
            const entidade = process.env.IFTHENPAY_MULTIBANCO_ENTIDADE;
            const subentidade = process.env.IFTHENPAY_MULTIBANCO_SUBENTIDADE || '999'; // Fallback
            if (!entidade) {
                return reply.status(500).send({
                    error: 'ifthenpay not configured',
                    message: 'Configure IFTHENPAY_MULTIBANCO_ENTIDADE in .env (obtenha em "Testar Referência" no backoffice)'
                });
            }
            // Gerar referência única
            const reference = generateMultibancoReference(orderId, amount);
            // Guardar na base de dados
            const paymentsCol = await (0, db_1.getCollection)('payments');
            const payment = {
                orderId,
                method: 'multibanco',
                status: 'pending',
                amount,
                entity: entidade,
                reference,
                customerName,
                customerEmail,
                createdAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 dias
            };
            await paymentsCol.insertOne(payment);
            return reply.send({
                success: true,
                method: 'multibanco',
                entity: entidade,
                reference,
                amount: amount.toFixed(2),
                expiresAt: payment.expiresAt,
                status: 'pending',
                instructions: {
                    pt: 'Pague esta referência em qualquer caixa Multibanco ou homebanking',
                    en: 'Pay this reference at any Multibanco ATM or homebanking'
                }
            });
        }
        catch (err) {
            app.log.error(err);
            return reply.status(500).send({ error: 'Failed to create payment' });
        }
    });
    // Criar pagamento MB WAY
    app.post('/v1/public/payments/mbway', async (req, reply) => {
        const parsed = mbwayPaymentSchema.safeParse(req.body);
        if (!parsed.success) {
            return reply.status(400).send({ error: 'Invalid request', details: parsed.error });
        }
        const { orderId, amount, phoneNumber, customerEmail } = parsed.data;
        try {
            const mbwayKey = process.env.IFTHENPAY_MBWAY_KEY;
            const backofficeKey = process.env.IFTHENPAY_BACKOFFICE_KEY;
            if (!mbwayKey || !backofficeKey) {
                return reply.status(500).send({
                    error: 'MB WAY not configured',
                    message: 'Configure IFTHENPAY_MBWAY_KEY and IFTHENPAY_BACKOFFICE_KEY in .env'
                });
            }
            // Chamar API do ifthenpay para iniciar pagamento MB WAY
            const requestId = `${orderId}-${Date.now()}`;
            // Simular chamada API (substitua pela chamada real)
            // const response = await fetch('https://ifthenpay.com/api/mbway/init', { ... });
            // Por agora, guardar como pending
            const paymentsCol = await (0, db_1.getCollection)('payments');
            const payment = {
                orderId,
                method: 'mbway',
                status: 'pending',
                amount,
                phoneNumber,
                requestId,
                customerEmail,
                createdAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutos
            };
            await paymentsCol.insertOne(payment);
            return reply.send({
                success: true,
                method: 'mbway',
                requestId,
                phoneNumber,
                amount: amount.toFixed(2),
                status: 'pending',
                expiresAt: payment.expiresAt,
                instructions: {
                    pt: `Foi enviada uma notificação para o número ${phoneNumber}. Confirme o pagamento na app MB WAY`,
                    en: `A notification was sent to ${phoneNumber}. Confirm the payment in MB WAY app`
                }
            });
        }
        catch (err) {
            app.log.error(err);
            return reply.status(500).send({ error: 'Failed to create MB WAY payment' });
        }
    });
    // Callback do ifthenpay
    app.get('/v1/public/payments/ifthenpay/callback', async (req, reply) => {
        const parsed = callbackSchema.safeParse(req.query);
        if (!parsed.success) {
            app.log.warn({ query: req.query }, 'Invalid callback data');
            return reply.status(400).send('Invalid callback');
        }
        const data = parsed.data;
        // Validar Anti-Phishing Key
        const antiPhishingKey = process.env.IFTHENPAY_ANTI_PHISHING_KEY;
        if (antiPhishingKey && data.Key !== antiPhishingKey) {
            app.log.warn({ received: data.Key }, 'Invalid anti-phishing key');
            return reply.status(403).send('Forbidden');
        }
        try {
            const paymentsCol = await (0, db_1.getCollection)('payments');
            const ordersCol = await (0, db_1.getCollection)('orders');
            // Multibanco callback
            if (data.Referencia && data.Valor) {
                const reference = data.Referencia.replace(/\s/g, '');
                const amount = parseFloat(data.Valor);
                const payment = await paymentsCol.findOne({
                    reference,
                    method: 'multibanco'
                });
                if (payment) {
                    // Atualizar pagamento
                    await paymentsCol.updateOne({ _id: payment._id }, {
                        $set: {
                            status: 'completed',
                            paidAt: new Date().toISOString(),
                            terminal: data.Terminal,
                            callbackData: data
                        }
                    });
                    // Atualizar pedido
                    await ordersCol.updateOne({ id: payment.orderId }, {
                        $set: {
                            paymentStatus: 'paid',
                            paidAt: new Date().toISOString()
                        }
                    });
                    app.log.info({ orderId: payment.orderId, reference }, 'Payment confirmed via Multibanco');
                }
            }
            // MB WAY callback
            if (data.RequestId && data.Estado) {
                const payment = await paymentsCol.findOne({
                    requestId: data.RequestId,
                    method: 'mbway'
                });
                if (payment) {
                    const status = data.Estado === '000' ? 'completed' : 'failed';
                    await paymentsCol.updateOne({ _id: payment._id }, {
                        $set: {
                            status,
                            paidAt: status === 'completed' ? new Date().toISOString() : null,
                            callbackData: data
                        }
                    });
                    if (status === 'completed') {
                        await ordersCol.updateOne({ id: payment.orderId }, {
                            $set: {
                                paymentStatus: 'paid',
                                paidAt: new Date().toISOString()
                            }
                        });
                    }
                    app.log.info({
                        orderId: payment.orderId,
                        status,
                        requestId: data.RequestId
                    }, 'Payment status via MB WAY');
                }
            }
            return reply.send('OK');
        }
        catch (err) {
            app.log.error({ err }, 'Error processing callback');
            return reply.status(500).send('Error');
        }
    });
    // Verificar status de pagamento
    app.get('/v1/public/payments/:orderId/status', async (req, reply) => {
        const { orderId } = req.params;
        try {
            const paymentsCol = await (0, db_1.getCollection)('payments');
            const payment = await paymentsCol.findOne({ orderId });
            if (!payment) {
                return reply.status(404).send({ error: 'Payment not found' });
            }
            return reply.send({
                orderId,
                method: payment.method,
                status: payment.status,
                amount: payment.amount,
                createdAt: payment.createdAt,
                paidAt: payment.paidAt,
                expiresAt: payment.expiresAt,
                // Incluir dados específicos do método
                ...payment.method === 'multibanco' && {
                    entity: payment.entity,
                    reference: payment.reference
                },
                ...payment.method === 'mbway' && {
                    phoneNumber: payment.phoneNumber,
                    requestId: payment.requestId
                }
            });
        }
        catch (err) {
            app.log.error(err);
            return reply.status(500).send({ error: 'Failed to get payment status' });
        }
    });
};
exports.paymentsIfthenpayRoutes = paymentsIfthenpayRoutes;
// Função auxiliar para gerar referência Multibanco
function generateMultibancoReference(orderId, amount) {
    // Algoritmo simples - em produção, use o algoritmo oficial do ifthenpay
    // ou chame a API deles para gerar a referência
    // Criar hash do orderId
    const hash = crypto_1.default.createHash('md5').update(orderId).digest('hex');
    // Pegar primeiros 9 dígitos do hash convertido
    const numericHash = parseInt(hash.slice(0, 8), 16).toString().slice(0, 9);
    // Formatar como XXX XXX XXX
    const ref = numericHash.padStart(9, '0');
    return `${ref.slice(0, 3)} ${ref.slice(3, 6)} ${ref.slice(6, 9)}`;
}
exports.default = exports.paymentsIfthenpayRoutes;
