const API_BASE = 'http://localhost:3000';

async function testOrder() {
  console.log('🧪 Iniciando teste de pedido...\n');

  try {
    console.log('1️⃣ Buscando categorias...');
    const categoriesRes = await fetch(`${API_BASE}/v1/public/categories`);
    const categories = await categoriesRes.json();
    console.log(`✅ ${categories.length} categorias encontradas`);
    
    if (categories.length === 0) {
      console.log('❌ Nenhuma categoria encontrada. Execute: npm run seed');
      return;
    }

    console.log('\n2️⃣ Buscando produtos...');
    const productsRes = await fetch(`${API_BASE}/v1/public/products`);
    const productsData = await productsRes.json();
    const products = productsData.items || productsData;
    console.log(`✅ ${products.length} produtos encontrados`);
    
    if (products.length === 0) {
      console.log('❌ Nenhum produto encontrado. Execute: npm run seed');
      return;
    }

    const firstProduct = products[0];
    console.log(`📦 Usando produto: ${firstProduct.name || firstProduct.id}`);

    console.log('\n3️⃣ Criando pedido...');
    const orderPayload = {
      tableId: 'T01',
      items: [
        {
          productId: firstProduct.id || firstProduct._id,
          quantity: 2,
          modifiers: [],
          variants: [],
          notes: 'Sem cebola, por favor'
        },
        {
          productId: firstProduct.id || firstProduct._id,
          quantity: 1,
          modifiers: [],
          variants: []
        }
      ],
      notes: 'Pedido de teste',
      payment: {
        method: 'cash',
        status: 'pending'
      }
    };

    const orderRes = await fetch(`${API_BASE}/v1/public/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload)
    });

    if (!orderRes.ok) {
      const error = await orderRes.text();
      console.log('❌ Erro ao criar pedido:', error);
      return;
    }

    const order = await orderRes.json();
    console.log('✅ Pedido criado com sucesso!');
    console.log(`   ID: ${order.id || order._id}`);
    console.log(`   Status: ${order.status}`);
    console.log(`   Mesa: ${order.tableId}`);
    console.log(`   Total: €${order.totals?.total || 'N/A'}`);
    console.log(`   Número: #${order.orderNumber || 'N/A'}`);

    console.log('\n4️⃣ Verificando pedido no dashboard admin...');
    const ordersRes = await fetch(`${API_BASE}/v1/admin/orders`);
    const ordersData = await ordersRes.json();
    const orders = ordersData.items || ordersData;
    console.log(`✅ ${orders.length} pedidos encontrados no sistema`);

    console.log('\n🎉 TESTE CONCLUÍDO COM SUCESSO!\n');
    console.log('📱 Acesse o Kitchen Dashboard: http://localhost:5176');
    console.log('🔧 Acesse o Admin Dashboard: http://localhost:5177');
    console.log('🍔 Acesse o Menu: http://localhost:5175?table=T01\n');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.log('\n⚠️  Verifique se o backend está rodando: npm run dev');
  }
}

testOrder();

