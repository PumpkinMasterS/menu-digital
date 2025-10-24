// Inserir documentos de teste em MongoDB Atlas para validar o callback IfThenPay
// - Cria um Order (id: ORD123)
// - Cria um Payment (requestId: REQ123, method: 'mbway', orderId: ORD123)

const path = require('path')
const { MongoClient } = require('mongodb')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

async function main() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.error('MONGODB_URI não encontrado no backend/.env')
    process.exit(1)
  }

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 })

  try {
    await client.connect()
    const dbNameFromUri = (() => {
      try {
        const afterSlash = uri.split('mongodb.net/')[1]
        if (!afterSlash) return 'menu_digital'
        const name = afterSlash.split('?')[0]
        return name || 'menu_digital'
      } catch {
        return 'menu_digital'
      }
    })()
    const db = client.db(dbNameFromUri)

    const orders = db.collection('orders')
    const payments = db.collection('payments')

    const now = new Date().toISOString()

    const orderDoc = {
      id: 'ORD123',
      items: [],
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    }

    const paymentDoc = {
      requestId: 'REQ123',
      method: 'mbway',
      orderId: 'ORD123',
      amount: 12.34,
      currency: 'EUR',
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    }

    // Upsert para evitar duplicados em execuções repetidas
    const orderResult = await orders.updateOne(
      { id: orderDoc.id },
      { $setOnInsert: orderDoc },
      { upsert: true }
    )

    const paymentResult = await payments.updateOne(
      { requestId: paymentDoc.requestId, method: paymentDoc.method },
      { $setOnInsert: paymentDoc },
      { upsert: true }
    )

    console.log('Order upserted:', JSON.stringify(orderResult.result || orderResult, null, 2))
    console.log('Payment upserted:', JSON.stringify(paymentResult.result || paymentResult, null, 2))
    console.log('\nDocs prontos. Agora chame o callback com:')
    console.log('RequestId=REQ123 & Estado=000')
  } catch (err) {
    console.error('Erro ao inserir documentos de teste:', err)
    process.exitCode = 1
  } finally {
    await client.close()
  }
}

main()