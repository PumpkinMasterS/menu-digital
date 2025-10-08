import React, { useEffect, useMemo, useState } from 'react';

type Category = {
  id: string;
  name: string;
};

type Product = {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  price?: number;
  categoryId?: string;
  composition?: {
    modifierGroupIds?: string[];
    variantGroupIds?: string[];
  };
};

type ModifierOption = { id: string; label?: string; name?: string; priceDelta?: number };
type ModifierGroup = { id: string; name: string; options: ModifierOption[]; selection?: { type?: 'single' | 'multiple'; min?: number; max?: number } };
type VariantOption = { id: string; label?: string; name?: string; priceDelta?: number };
type VariantGroup = { id: string; name: string; options: VariantOption[] };

type CompositionResponse = {
  product: { id: string; name: string; description?: string; imageUrl?: string; price?: number };
  modifierGroups: ModifierGroup[];
  variantGroups: VariantGroup[];
};

type CartItem = {
  product: Product;
  quantity: number;
  modifiers: { groupId: string; optionIds: string[] }[];
  variants: { groupId: string; optionId: string }[];
  notes?: string;
};

const api = {
  categories: async (): Promise<Category[]> => {
    const res = await fetch('/v1/public/categories');
    const json = await res.json();
    return Array.isArray(json) ? json : json.items ?? [];
  },
  products: async (categoryId?: string): Promise<{ items: Product[] }> => {
    const url = new URL('/v1/public/products', window.location.origin);
    if (categoryId) url.searchParams.set('categoryId', categoryId);
    const res = await fetch(url);
    return res.json();
  },
  composition: async (productId: string): Promise<CompositionResponse> => {
    const res = await fetch(`/v1/public/products/${productId}/composition`);
    return res.json();
  },
  checkout: async (payload: any) => {
    const res = await fetch('/v1/public/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },
};

const MenuDigital: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(undefined);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [composition, setComposition] = useState<CompositionResponse | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    api.categories()
      .then(setCategories)
      .catch((err) => console.error('Failed to load categories', err));
  }, []);

  useEffect(() => {
    api.products(selectedCategoryId)
      .then((d) => setProducts(d.items ?? []))
      .catch((err) => console.error('Failed to load products', err));
  }, [selectedCategoryId]);

  useEffect(() => {
    if (!selectedProduct) return;
    api.composition(selectedProduct.id)
      .then(setComposition)
      .catch((err) => console.error('Failed to load composition', err));
  }, [selectedProduct?.id]);

  const addToCart = () => {
    if (!selectedProduct) return;
    setCart((prev) => [
      ...prev,
      {
        product: selectedProduct,
        quantity: 1,
        modifiers: [],
        variants: [],
      },
    ]);
    setMessage('Item adicionado ao carrinho');
    setTimeout(() => setMessage(null), 1500);
  };

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      const base = Number(item.product.price ?? 0);
      const modsDelta = item.modifiers.reduce((acc, m) => acc + m.optionIds.reduce((a, oid) => {
        const group = composition?.modifierGroups.find((g) => g.id === m.groupId);
        const opt = group?.options.find((o) => o.id === oid || o.name === oid);
        return a + Number(opt?.priceDelta ?? 0);
      }, 0), 0);
      const varsDelta = item.variants.reduce((acc, v) => {
        const group = composition?.variantGroups.find((g) => g.id === v.groupId);
        const opt = group?.options.find((o) => o.id === v.optionId || o.name === v.optionId);
        return acc + Number(opt?.priceDelta ?? 0);
      }, 0);
      return sum + (base + modsDelta + varsDelta) * item.quantity;
    }, 0);
  }, [cart, composition]);

  const checkout = async () => {
    setIsCheckingOut(true);
    setMessage(null);
    try {
      const payload = {
        items: cart.map((c) => ({
          productId: c.product.id,
          quantity: c.quantity,
          modifiers: c.modifiers.flatMap((m) => m.optionIds.map((oid) => ({ groupId: m.groupId, optionId: oid }))),
          variants: c.variants.map((v) => ({ groupId: v.groupId, optionId: v.optionId })),
        })),
      };
      const res = await api.checkout(payload);
      if (res?.id) {
        setCart([]);
        setMessage(`Pedido criado #${res.orderNumber ?? res.id}`);
      } else {
        setMessage(res?.error ?? 'Falha ao criar pedido');
      }
    } catch (err: any) {
      setMessage(err?.message ?? 'Erro de checkout');
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr 300px', gap: 16, padding: 16 }}>
      {/* Categorias */}
      <div>
        <h2>Categorias</h2>
        <button onClick={() => setSelectedCategoryId(undefined)} style={{ marginBottom: 8 }}>Todas</button>
        <ul>
          {categories.map((c) => (
            <li key={c.id}>
              <button onClick={() => setSelectedCategoryId(c.id)}>{c.name}</button>
            </li>
          ))}
        </ul>
      </div>

      {/* Produtos */}
      <div>
        <h2>Menu Digital</h2>
        {message && <div style={{ color: 'green' }}>{message}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          {products.map((p) => (
            <div key={p.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
              {p.imageUrl && <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 6 }} />}
              <div style={{ fontWeight: 600 }}>{p.name}</div>
              <div style={{ color: '#666', fontSize: 12 }}>{p.description}</div>
              <div style={{ marginTop: 6 }}>Preço: {(p.price ?? 0).toFixed(2)}</div>
              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                <button onClick={() => setSelectedProduct(p)}>Personalizar</button>
                <button onClick={() => { setSelectedProduct(p); addToCart(); }}>Adicionar</button>
              </div>
            </div>
          ))}
        </div>

        {/* Modal simples de composição */}
        {selectedProduct && composition && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setSelectedProduct(null)}>
            <div style={{ background: '#fff', padding: 16, borderRadius: 8, width: 600 }} onClick={(e) => e.stopPropagation()}>
              <h3>{composition.product.name}</h3>
              {composition.product.imageUrl && <img src={composition.product.imageUrl} style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 6 }} />}
              <p>{composition.product.description}</p>
              <p>Preço base: {(composition.product.price ?? 0).toFixed(2)}</p>

              {/* Modificadores */}
              {composition.modifierGroups.length > 0 && (
                <div>
                  <h4>Modificadores</h4>
                  {composition.modifierGroups.map((g) => (
                    <div key={g.id} style={{ marginBottom: 8 }}>
                      <div style={{ fontWeight: 600 }}>{g.name}</div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {g.options.map((o) => (
                          <label key={o.id ?? o.name} style={{ border: '1px solid #ddd', padding: 6, borderRadius: 6 }}>
                            <input
                              type={g.selection?.type === 'single' ? 'radio' : 'checkbox'}
                              name={`mod-${g.id}`}
                              onChange={(ev) => {
                                setCart((prev) => {
                                  const lastIndex = prev.length - 1;
                                  if (lastIndex < 0) return prev;
                                  const last = { ...prev[lastIndex] };
                                  const current = [...prev];
                                  current[lastIndex] = last;
                                  const existing = last.modifiers.find((m) => m.groupId === g.id) ?? { groupId: g.id, optionIds: [] };
                                  if (g.selection?.type === 'single') {
                                    existing.optionIds = [o.id ?? o.name ?? ''];
                                  } else {
                                    const id = o.id ?? o.name ?? '';
                                    const has = existing.optionIds.includes(id);
                                    existing.optionIds = has ? existing.optionIds.filter((x) => x !== id) : [...existing.optionIds, id];
                                  }
                                  last.modifiers = [
                                    ...last.modifiers.filter((m) => m.groupId !== g.id),
                                    existing,
                                  ];
                                  return current;
                                });
                              }}
                            />
                            {(o.label ?? o.name) || 'Opção'}
                            {typeof o.priceDelta === 'number' && (
                              <span> ({o.priceDelta >= 0 ? '+' : ''}{o.priceDelta.toFixed(2)})</span>
                            )}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Variantes */}
              {composition.variantGroups.length > 0 && (
                <div>
                  <h4>Variantes</h4>
                  {composition.variantGroups.map((g) => (
                    <div key={g.id} style={{ marginBottom: 8 }}>
                      <div style={{ fontWeight: 600 }}>{g.name}</div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {g.options.map((o) => (
                          <label key={o.id ?? o.name} style={{ border: '1px solid #ddd', padding: 6, borderRadius: 6 }}>
                            <input
                              type="radio"
                              name={`var-${g.id}`}
                              onChange={() => {
                                setCart((prev) => {
                                  const lastIndex = prev.length - 1;
                                  if (lastIndex < 0) return prev;
                                  const last = { ...prev[lastIndex] };
                                  const current = [...prev];
                                  current[lastIndex] = last;
                                  last.variants = [
                                    ...last.variants.filter((v) => v.groupId !== g.id),
                                    { groupId: g.id, optionId: o.id ?? o.name ?? '' },
                                  ];
                                  return current;
                                });
                              }}
                            />
                            {(o.label ?? o.name) || 'Opção'}
                            {typeof o.priceDelta === 'number' && (
                              <span> ({o.priceDelta >= 0 ? '+' : ''}{o.priceDelta.toFixed(2)})</span>
                            )}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                <button onClick={addToCart}>Adicionar ao carrinho</button>
                <button onClick={() => setSelectedProduct(null)}>Fechar</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Carrinho */}
      <div>
        <h2>Carrinho</h2>
        {cart.length === 0 ? (
          <div>Seu carrinho está vazio.</div>
        ) : (
          <ul>
            {cart.map((c, idx) => (
              <li key={idx} style={{ marginBottom: 8 }}>
                <div style={{ fontWeight: 600 }}>{c.product.name}</div>
                <div>Qtd: {c.quantity}</div>
                <button onClick={() => setCart((prev) => prev.filter((_, i) => i !== idx))}>Remover</button>
              </li>
            ))}
          </ul>
        )}
        <div style={{ marginTop: 8 }}>Total: {cartTotal.toFixed(2)}</div>
        <button disabled={cart.length === 0 || isCheckingOut} onClick={checkout} style={{ marginTop: 8 }}>
          {isCheckingOut ? 'Processando...' : 'Finalizar pedido'}
        </button>
      </div>
    </div>
  );
};

export default MenuDigital;