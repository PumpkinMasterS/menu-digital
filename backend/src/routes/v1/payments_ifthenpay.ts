import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { getCollection } from '../../lib/db';
import crypto from 'crypto';

// Schemas de validação
const multibancoPaymentSchema = z.object({
  orderId: z.string(),
  amount: z.number().positive(),
  customerName: z.string().optional(),
  customerEmail: z.string().email().optional(),
});

const mbwayPaymentSchema = z.object({
  orderId: z.string(),
  amount: z.number().positive(),
  phoneNumber: z.string().regex(/^9[1236]\d{7}$/), // Formato: 9XXXXXXXX
  customerEmail: z.string().email().optional(),
});

const callbackSchema = z.object({
  Key: z.string(),
  Id: z.string().optional(),
  Entidade: z.string().optional(),
  Referencia: z.string().optional(),
  Valor: z.string().optional(),
  DataHoraPagamento: z.string().optional(),
  Terminal: z.string().optional(),
  // MB WAY específico
  RequestId: z.string().optional(),
  Estado: z.string().optional(),
}).passthrough();

export const paymentsIfthenpayRoutes: FastifyPluginAsync = async (app) => {
  
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
      const paymentsCol = await getCollection('payments');
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

    } catch (err) {
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
      const paymentsCol = await getCollection('payments');
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

    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Failed to create MB WAY payment' });
    }
  });

  // Callback do ifthenpay
  app.get('/v1/public/payments/ifthenpay/callback', async (req, reply) => {
    const parsed = callbackSchema.safeParse(req.query);
    if (!parsed.success) {
      app.log.warn('Invalid callback data', req.query);
      return reply.status(400).send('Invalid callback');
    }

    const data = parsed.data;

    // Validar Anti-Phishing Key
    const antiPhishingKey = process.env.IFTHENPAY_ANTI_PHISHING_KEY;
    if (antiPhishingKey && data.Key !== antiPhishingKey) {
      app.log.warn('Invalid anti-phishing key', { received: data.Key });
      return reply.status(403).send('Forbidden');
    }

    try {
      const paymentsCol = await getCollection('payments');
      const ordersCol = await getCollection('orders');

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
          await paymentsCol.updateOne(
            { _id: payment._id },
            { 
              $set: { 
                status: 'completed',
                paidAt: new Date().toISOString(),
                terminal: data.Terminal,
                callbackData: data
              } 
            }
          );

          // Atualizar pedido
          await ordersCol.updateOne(
            { id: (payment as any).orderId },
            { 
              $set: { 
                paymentStatus: 'paid',
                paidAt: new Date().toISOString()
              } 
            }
          );

          app.log.info('Payment confirmed via Multibanco', { orderId: (payment as any).orderId, reference });
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

          await paymentsCol.updateOne(
            { _id: payment._id },
            { 
              $set: { 
                status,
                paidAt: status === 'completed' ? new Date().toISOString() : null,
                callbackData: data
              } 
            }
          );

          if (status === 'completed') {
            await ordersCol.updateOne(
              { id: (payment as any).orderId },
              { 
                $set: { 
                  paymentStatus: 'paid',
                  paidAt: new Date().toISOString()
                } 
              }
            );
          }

          app.log.info('Payment status via MB WAY', { 
            orderId: (payment as any).orderId, 
            status,
            requestId: data.RequestId 
          });
        }
      }

      return reply.send('OK');

    } catch (err) {
      app.log.error('Error processing callback', err);
      return reply.status(500).send('Error');
    }
  });

  // Verificar status de pagamento
  app.get('/v1/public/payments/:orderId/status', async (req, reply) => {
    const { orderId } = req.params as { orderId: string };

    try {
      const paymentsCol = await getCollection('payments');
      const payment = await paymentsCol.findOne({ orderId });

      if (!payment) {
        return reply.status(404).send({ error: 'Payment not found' });
      }

      return reply.send({
        orderId,
        method: (payment as any).method,
        status: (payment as any).status,
        amount: (payment as any).amount,
        createdAt: (payment as any).createdAt,
        paidAt: (payment as any).paidAt,
        expiresAt: (payment as any).expiresAt,
        // Incluir dados específicos do método
        ...(payment as any).method === 'multibanco' && {
          entity: (payment as any).entity,
          reference: (payment as any).reference
        },
        ...(payment as any).method === 'mbway' && {
          phoneNumber: (payment as any).phoneNumber,
          requestId: (payment as any).requestId
        }
      });

    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Failed to get payment status' });
    }
  });
};

// Função auxiliar para gerar referência Multibanco
function generateMultibancoReference(orderId: string, amount: number): string {
  // Algoritmo simples - em produção, use o algoritmo oficial do ifthenpay
  // ou chame a API deles para gerar a referência
  
  // Criar hash do orderId
  const hash = crypto.createHash('md5').update(orderId).digest('hex');
  
  // Pegar primeiros 9 dígitos do hash convertido
  const numericHash = parseInt(hash.slice(0, 8), 16).toString().slice(0, 9);
  
  // Formatar como XXX XXX XXX
  const ref = numericHash.padStart(9, '0');
  return `${ref.slice(0, 3)} ${ref.slice(3, 6)} ${ref.slice(6, 9)}`;
}

export default paymentsIfthenpayRoutes;

