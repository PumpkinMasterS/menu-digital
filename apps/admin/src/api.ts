// Simple admin API utility using fetch
// Handles base URL, auth headers, and JSON helpers

const API_BASE = import.meta.env.VITE_API_URL || '';

function getAuthToken() {
  // Prefer JWT if present; fallback to ADMIN_TOKEN for legacy
  const jwt = localStorage.getItem('authToken');
  const legacy = localStorage.getItem('ADMIN_TOKEN');
  return { jwt, legacy };
}

function buildHeaders(extra?: Record<string, string>) {
  const { jwt, legacy } = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extra,
  };
  if (jwt) headers['Authorization'] = `Bearer ${jwt}`;
  if (legacy) headers['x-admin-token'] = legacy;
  return headers;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: buildHeaders(),
  });
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
  return res.json();
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers: buildHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PUT ${path} failed: ${res.status}`);
  return res.json();
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PATCH',
    headers: buildHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PATCH ${path} failed: ${res.status}`);
  return res.json();
}

export async function apiDelete(path: string): Promise<void> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'DELETE',
    headers: buildHeaders(),
  });
  if (!res.ok) throw new Error(`DELETE ${path} failed: ${res.status}`);
}

// Upload image using base64 string to backend endpoint
export async function uploadImage(imageBase64: string): Promise<{ imageUrl: string }>{
  const res = await fetch(`${API_BASE}/v1/admin/upload/image`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ imageBase64 }),
  });
  if (!res.ok) throw new Error(`Upload image failed: ${res.status}`);
  return res.json();
}

// Categories
export const CategoriesAPI = {
  list: () => apiGet<{ items: any[]; total: number; page: number; limit: number }>(`/v1/admin/categories`),
  create: (payload: any) => apiPost<any>(`/v1/admin/categories`, payload),
  update: (id: string, payload: any) => apiPatch<any>(`/v1/admin/categories/${id}`, payload),
  remove: (id: string) => apiDelete(`/v1/admin/categories/${id}`),
};

// Products
export const ProductsAPI = {
  list: () => apiGet<{ items: any[]; total: number; page: number; limit: number }>(`/v1/admin/products`),
  create: (payload: any) => apiPost<any>(`/v1/admin/products`, payload),
  update: (id: string, payload: any) => apiPatch<any>(`/v1/admin/products/${id}`, payload),
  remove: (id: string) => apiDelete(`/v1/admin/products/${id}`),
};

// Tables
export const TablesAPI = {
  list: () => apiGet<any[]>(`/v1/admin/tables`),
  create: (payload: any) => apiPost<any>(`/v1/admin/tables`, payload),
  update: (id: string, payload: any) => apiPatch<any>(`/v1/admin/tables/${id}`, payload),
  remove: (id: string) => apiDelete(`/v1/admin/tables/${id}`),
};