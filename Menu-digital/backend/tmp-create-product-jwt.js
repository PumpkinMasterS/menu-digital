const fs = require('fs');
(async () => {
  try {
    const token = fs.readFileSync('tmp-token.txt', 'utf8').trim();
    const res = await fetch('http://localhost:3000/v1/admin/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        name: 'Cheese Burger Atlas',
        description: 'Hambúrguer com queijo',
        price: 8.5,
        stockQuantity: -1,
        categoryId: 'cat-1',
        composition: { pricingStrategy: 'base_plus_modifiers', modifierGroupIds: [], variantGroupIds: [] }
      })
    });
    const text = await res.text();
    console.log(res.status, text);
  } catch (e) {
    console.error('CREATE_ERR', e.message || e);
    process.exit(1);
  }
})();
