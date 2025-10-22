(async () => {
  try {
    const res = await fetch("http://localhost:3000/v1/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-token": "changeme_admin_token_2024" },
      body: JSON.stringify({
        name: "Classic Burger Atlas",
        description: "Hambúrguer clássico com alface, tomate e molho especial",
        price: 7.5,
        stockQuantity: -1,
        categoryId: "cat-1",
        composition: { pricingStrategy: "base_plus_modifiers", modifierGroupIds: [], variantGroupIds: [] }
      })
    });
    const text = await res.text();
    console.log(res.status, text);
  } catch (e) {
    console.error(e); process.exit(1);
  }
})();
