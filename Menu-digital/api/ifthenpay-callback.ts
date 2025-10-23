import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getCollection } from '../backend/src/lib/db'

// Serverless callback para IfThenPay (MB WAY)
// Endpoint final: /v1/public/payments/ifthenpay/callback (via rewrite em vercel.json)
// Requer variáveis no Vercel:
// - MONGODB_URI
// - IFTHENPAY_ANTI_PHISHING_KEY
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Validar Anti-Phishing
    -    const anti = process.env.IFTHENPAY_ANTI_PHISHING_KEY
    -    const key = (req.query.Key as string) || ''
    -    if (anti && key !== anti) {
    -      return res.status(403).send('Forbidden')
    -    }
    +    const anti = process.env.IFTHENPAY_ANTI_PHISHING_KEY
    +    const key = (req.query.Key as string) || ''
    +    if (!anti) {
    +      return res.status(500).send('Server misconfigured')
    +    }
    +    if (key !== anti) {
    +      return res.status(403).send('Forbidden')
    +    }

    // MB WAY: RequestId e Estado ("000" = pago)
    const requestId = (req.query.RequestId as string) || ''
    const estado = (req.query.Estado as string) || ''

    if (requestId) {
      const paymentsCol = await getCollection('payments')
      const ordersCol = await getCollection('orders')

      const payment = await paymentsCol.findOne({ requestId, method: 'mbway' })
      if (payment) {
        const status = estado === '000' ? 'completed' : 'failed'
        await paymentsCol.updateOne(
          { _id: (payment as any)._id },
          { $set: { status, paidAt: status === 'completed' ? new Date().toISOString() : null, callbackData: req.query } }
        )
        if (status === 'completed') {
          await ordersCol.updateOne(
            { id: (payment as any).orderId },
            { $set: { paymentStatus: 'paid', paidAt: new Date().toISOString() } }
          )
        }
      }
    }

    return res.status(200).json({ ok: true })
  } catch (err: any) {
    console.error('IfThenPay callback error:', err)
    return res.status(500).send('Internal Error')
  }
}