import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getCollection } from '../backend/src/lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Healthcheck opcional neste handler (não usado pelo rewrite principal)
    if (req.query && typeof req.query.healthcheck !== 'undefined') {
      return res.status(200).json({ ok: true });
    }

    const anti = process.env.IFTHENPAY_ANTI_PHISHING_KEY || '';
    const key = (req.query?.Key as string) || '';
    if (anti && key !== anti) {
      return res.status(403).send('Forbidden');
    }

    const requestId = (req.query?.RequestId as string) || '';
    const estado = (req.query?.Estado as string) || '';

    if (requestId) {
      const paymentsCol = await getCollection('payments');
      const ordersCol = await getCollection('orders');

      const payment: any = await paymentsCol.findOne({ requestId, method: 'mbway' });
      if (payment) {
        const status = estado === '000' ? 'completed' : 'failed';
        await paymentsCol.updateOne(
          { _id: payment._id },
          { $set: { status, paidAt: status === 'completed' ? new Date().toISOString() : null, callbackData: req.query } }
        );
        if (status === 'completed') {
          await ordersCol.updateOne(
            { id: payment.orderId },
            { $set: { paymentStatus: 'paid', paidAt: new Date().toISOString() } }
          );
        }
      }
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('IfThenPay callback error:', err);
    return res.status(500).send('Internal Error');
  }
}