import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { getCollection } from '../../lib/db';

// Schemas de validação

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
  
  // Multibanco removido: endpoint /v1/public/payments/multibanco desativado

  // Endpoint de diagnóstico (mascarado) das variáveis IfThenPay
  app.get('/v1/public/payments/ifthenpay/env', async (req, reply) => {
    const mbwayKey = process.env.IFTHENPAY_MBWAY_KEY || '';
    const backofficeKey = process.env.IFTHENPAY_BACKOFFICE_KEY || '';
    const antiPhishingKey = process.env.IFTHENPAY_ANTI_PHISHING_KEY || '';
    const sandbox = process.env.IFTHENPAY_SANDBOX || '';
    const apiUrl = process.env.IFTHENPAY_MBWAY_API_URL || 'https://ifthenpay.com/api/mbway';

    const mask = (v: string) => {
      if (!v) return '';
      if (v.length <= 4) return v[0] + '*'.repeat(Math.max(0, v.length - 2)) + v.slice(-1);
      return `${v.slice(0, 3)}***${v.slice(-2)}`;
    };

    const simulate = !mbwayKey; // mesma regra usada no endpoint de criação

    return reply.send({
      ok: true,
      environment: process.env.NODE_ENV || 'development',
      variables: {
        IFTHENPAY_MBWAY_KEY: { set: Boolean(mbwayKey), valueMasked: mask(mbwayKey) },
        IFTHENPAY_BACKOFFICE_KEY: { set: Boolean(backofficeKey), valueMasked: mask(backofficeKey) },
        IFTHENPAY_ANTI_PHISHING_KEY: { set: Boolean(antiPhishingKey), valueMasked: mask(antiPhishingKey) },
        IFTHENPAY_SANDBOX: { set: sandbox !== '', value: sandbox },
        IFTHENPAY_MBWAY_API_URL: { set: Boolean(apiUrl), value: apiUrl },
      },
      paymentBehavior: {
        simulationMode: simulate,
        reason: simulate ? 'IFTHENPAY_MBWAY_KEY ausente → sem envio para IfThenPay' : 'IFTHENPAY_MBWAY_KEY presente → envio real para IfThenPay'
      }
    });
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
      const simulate = !mbwayKey; // só simula se não houver MB WAY Key

      // Gerar um requestId local para simulação/fallback
      let requestId = `${orderId}-${Date.now()}`;
      
      // Se estiver configurado, chamar API real do Ifthenpay
      if (!simulate) {
        const mobileNumber = phoneNumber.includes('#') ? phoneNumber : `351#${phoneNumber}`;
        const orderId15 = orderId.substring(0, 15);
        const amountStr = Number(amount).toFixed(2);

        // Tentar API REST v2
        try {
          const apiUrl = process.env.IFTHENPAY_MBWAY_API_URL || 'https://ifthenpay.com/api/mbway';
          const res = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              mbWayKey: mbwayKey,
              orderId: orderId15,
              amount: amountStr,
              mobileNumber,
              email: customerEmail || '',
              description: `Order ${orderId15}`
            })
          });

          if (res.ok) {
            const json: any = await res.json().catch(() => ({}));
            const reqId = json.RequestId || json.requestId;
            const statusCode = json.Status || json.status;

            if (reqId && typeof reqId === 'string') {
              requestId = reqId;
            } else {
              // Falha em extrair RequestId, força fallback
              throw new Error('Missing RequestId in REST response');
            }

            app.log.info({ orderId: orderId15, requestId, statusCode }, 'MB WAY request created (REST)');
          } else {
            // Forçar fallback para SOAP
            throw new Error(`REST MB WAY request failed: ${res.status} ${res.statusText}`);
          }
        } catch (restErr) {
          app.log.warn({ error: `${restErr}` }, 'REST MB WAY failed, trying SOAP SetPedidoJson');

          // Fallback SOAP (deprecated mas funcional)
          const soapUrl = 'https://mbway.ifthenpay.com/ifthenpaymbw.asmx/SetPedidoJSON';
          const params = new URLSearchParams({
            MbWayKey: mbwayKey as string,
            canal: '03',
            referencia: orderId.substring(0, 15),
            valor: Number(amount).toFixed(2),
            nrtlm: `351${phoneNumber}`, // formato legado sem '#'
            email: customerEmail || '',
            descricao: `Order ${orderId.substring(0, 15)}`
          });

          const res = await fetch(`${soapUrl}?${params.toString()}`, { method: 'GET' });
          if (!res.ok) {
            throw new Error(`SOAP SetPedidoJSON failed: ${res.status} ${res.statusText}`);
          }
          let json: any = {};
          try {
            const text = await res.text();
            json = JSON.parse(text);
          } catch (parseErr) {
            json = await res.json().catch(() => ({} as any));
          }
          const reqId = json.IdPedido || json.idPedido;
          if (reqId && typeof reqId === 'string') {
            requestId = reqId;
            app.log.info({ orderId: orderId.substring(0, 15), requestId }, 'MB WAY request created (SOAP)');
          } else {
            throw new Error('Missing IdPedido in SOAP response');
          }
        }
      }

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
        ...(simulate ? { simulation: true } : {}),
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
        ...(simulate ? { simulation: true, message: 'MB WAY em modo simulado (sem IFTHENPAY_MBWAY_KEY)' } : {}),
        instructions: {
          pt: simulate
            ? 'Pedido registado em modo simulado. Confirme manualmente no balcão.'
            : `Foi enviada uma notificação para o número ${phoneNumber}. Confirme o pagamento na app MB WAY`,
          en: simulate
            ? 'Payment request stored in simulation mode. Confirm manually at the counter.'
            : `A notification was sent to ${phoneNumber}. Confirm the payment in MB WAY app`
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
      app.log.warn(req.query, 'Invalid callback data');
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
      const paymentsCol = await getCollection('payments');
      const ordersCol = await getCollection('orders');

      // MB WAY callback
      const reqIdCallback = (data.RequestId as string) || (data as any).idpedido || (data as any).IdPedido || (data as any).idPedido;
      const estadoRaw = ((data.Estado as string) || (data as any).estado || '').toString().trim().toUpperCase();
      if (reqIdCallback && estadoRaw) {
        const payment = await paymentsCol.findOne({ 
          requestId: reqIdCallback,
          method: 'mbway' 
        });

        if (payment) {
          const completed = estadoRaw === '000' || estadoRaw === 'PAGO' || estadoRaw === 'PAID';
          const status = completed ? 'completed' : 'failed';

          await paymentsCol.updateOne(
            { _id: payment._id },
            { 
              $set: { 
                status,
                paidAt: completed ? new Date().toISOString() : null,
                callbackData: data
              } 
            }
          );

          if (completed) {
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

          app.log.info({ 
            orderId: (payment as any).orderId, 
            status,
            requestId: reqIdCallback,
            estado: estadoRaw
          }, 'Payment status via MB WAY');
        }
      }

      return reply.send('OK');

    } catch (err) {
      app.log.error(err, 'Error processing callback');
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

export default paymentsIfthenpayRoutes;

