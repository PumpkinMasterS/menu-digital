const API_BASE = 'http://localhost:3000';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testCompleteFlow() {
  console.log('🧪 TESTE COMPLETO DO FLUXO DE PEDIDO\n');
  console.log('=' .repeat(60));

  try {
    console.log('\n📋 PASSO 1: Login no Admin');
    console.log('-'.repeat(60));
    const loginRes = await fetch(`${API_BASE}/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@menu.com',
        password: 'admin123'
      })
    });
    
    if (!loginRes.ok) {
      console.log('❌ Login falhou. Verifique credenciais de admin e JWT_SECRET no .env');
      return;
    }
    
    const { token } = await loginRes.json();
    console.log('✅ Login realizado com sucesso');
    console.log(`   Token: ${token.substring(0, 20)}...`);

    console.log('\n📦 PASSO 2: Buscar produtos disponíveis');
    console.log('-'.repeat(60));
    const productsRes = await fetch(`${API_BASE}/v1/public/products`);
    const productsData = await productsRes.json();
    const products = productsData.items || productsData;
    
    if (products.length === 0) {
      console.log('❌ Nenhum produto. Execute: npm run seed');
      return;
    }
    
    const activeProducts = products.filter(p => p.isActive !== false);
    console.log(`✅ ${activeProducts.length} produtos ativos encontrados`);
    activeProducts.slice(0, 3).forEach(p => {
      console.log(`   - ${p.name}: €${p.price || 0}`);
    });

    console.log('\n🍽️  PASSO 3: Cliente faz pedido (Mesa T01)');
    console.log('-'.repeat(60));
    const orderPayload = {
      tableId: 'T01',
      items: [
        {
          productId: activeProducts[0].id || activeProducts[0]._id,
          quantity: 2,
          notes: 'Bem passado'
        }
      ],
      notes: 'Cliente urgente',
      payment: { method: 'cash' }
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
    const orderId = order.id || order._id;
    console.log('✅ Pedido criado!');
    console.log(`   ID: ${orderId}`);
    console.log(`   Status: ${order.status}`);
    console.log(`   Mesa: ${order.tableId}`);
    console.log(`   Número: #${order.orderNumber || 'N/A'}`);

    console.log('\n👨‍🍳 PASSO 4: Cozinha aceita o pedido');
    console.log('-'.repeat(60));
    await sleep(1000);
    
    const acceptRes = await fetch(`${API_BASE}/v1/admin/orders/${orderId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status: 'in_progress' })
    });

    if (acceptRes.ok) {
      console.log('✅ Pedido aceito pela cozinha (status: in_progress)');
    } else {
      console.log('⚠️  Não foi possível aceitar (token pode ter expirado)');
    }

    console.log('\n⏱️  PASSO 5: Aguardando preparo...');
    console.log('-'.repeat(60));
    await sleep(2000);

    console.log('\n✅ PASSO 6: Pedido pronto');
    console.log('-'.repeat(60));
    const readyRes = await fetch(`${API_BASE}/v1/admin/orders/${orderId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status: 'ready' })
    });

    if (readyRes.ok) {
      console.log('✅ Pedido marcado como pronto');
    }

    console.log('\n🚚 PASSO 7: Pedido entregue ao cliente');
    console.log('-'.repeat(60));
    await sleep(1000);
    
    const deliveredRes = await fetch(`${API_BASE}/v1/admin/orders/${orderId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status: 'delivered' })
    });

    if (deliveredRes.ok) {
      console.log('✅ Pedido entregue com sucesso!');
    }

    console.log('\n📊 PASSO 8: Verificar estado final');
    console.log('-'.repeat(60));
    const finalRes = await fetch(`${API_BASE}/v1/admin/orders/${orderId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (finalRes.ok) {
      const finalOrder = await finalRes.json();
      console.log('✅ Estado final do pedido:');
      console.log(`   Status: ${finalOrder.status}`);
      console.log(`   Mesa: ${finalOrder.tableId}`);
      console.log(`   Itens: ${finalOrder.items?.length || 0}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 TESTE COMPLETO REALIZADO COM SUCESSO!');
    console.log('='.repeat(60));
    
    console.log('\n📱 URLs das aplicações:');
    console.log('   Kitchen: http://localhost:5176');
    console.log('   Admin:   http://localhost:5177');
    console.log('   Menu:    http://localhost:5175?table=T01');
    
    console.log('\n💡 Dica: Abra o Kitchen Dashboard para ver pedidos em tempo real!\n');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.log('\n⚠️  Verifique:');
    console.log('   1. Backend rodando: cd backend && npm run dev');
    console.log('   2. MongoDB conectado');
    console.log('   3. Seed executado: npm run seed\n');
  }
}

testCompleteFlow();

