export type ID = string;

// Category
export interface Category {
  id: ID;
  name: string;
  description?: string;
  order?: number;
  isActive: boolean;
  parentCategoryId?: ID;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// Modifier Option
export interface ModifierOption {
  id: ID;
  label: string;
  priceDelta?: number; // can be negative/positive
  isDefault?: boolean;
  isAvailable?: boolean;
}

// Modifier Group
export interface ModifierGroupSelection {
  type: 'single' | 'multiple';
  required?: boolean;
  min?: number;
  max?: number;
}

export interface ModifierGroup {
  id: ID;
  name: string;
  description?: string;
  isActive: boolean;
  selection: ModifierGroupSelection;
  options: ModifierOption[];
}

// Variant Group
export interface VariantOption {
  id: ID;
  label: string;
  priceDelta?: number;
  isDefault?: boolean;
}

export interface VariantGroup {
  id: ID;
  name: string;
  description?: string;
  isActive: boolean;
  options: VariantOption[];
}

// Product Composition
export type PricingStrategy =
  | 'base_plus_modifiers'
  | 'combo_fixed_with_modifiers';

export interface ProductComposition {
  pricingStrategy: PricingStrategy;
  includedItems?: { productId: ID; quantity?: number }[];
  modifierGroupIds?: ID[];
  variantGroupIds?: ID[];
}

// Product
export interface Product {
  id: ID;
  categoryId: ID;
  name: string;
  description?: string;
  basePrice?: number; // optional for combos
  isActive: boolean;
  imageUrl?: string;
  composition?: ProductComposition;
  createdAt: string;
  updatedAt: string;
}

// Order
export interface OrderItemModifierSelection {
  groupId: ID;
  optionIds: ID[]; // selected modifiers
}

export interface OrderItemVariantSelection {
  groupId: ID;
  optionId: ID; // single variant selection
}

export interface OrderItem {
  productId: ID;
  quantity: number;
  modifiers?: OrderItemModifierSelection[];
  variants?: OrderItemVariantSelection[];
}

export interface OrderTotals {
  subtotal: number;
  discounts?: number;
  taxes?: number;
  total: number;
  currency: string;
}

export interface Order {
  id: ID;
  items: OrderItem[];
  totals?: OrderTotals;
  status: 'pending' | 'confirmed' | 'preparing' | 'delivered' | 'cancelled';
  nif?: string;
  createdAt: string;
  updatedAt: string;
}

// Payment
export interface Payment {
  id: ID;
  orderId: ID;
  amount: number;
  currency: string;
  status: 'authorized' | 'captured' | 'refunded' | 'failed';
  provider?: string;
  createdAt: string;
  updatedAt: string;
}