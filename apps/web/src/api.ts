import type { CreateOrderRequest, CreateOrderResponse, Order, Product } from '@repo/shared';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export async function getProducts(): Promise<Product[]> {
  const res = await fetch(`${API_URL}/products`);
  if (!res.ok) throw new Error('Erro ao buscar produtos');
  return res.json();
}

export async function getOrders(): Promise<Order[]> {
  const res = await fetch(`${API_URL}/orders`);
  if (!res.ok) throw new Error('Erro ao buscar pedidos');
  return res.json();
}

export async function createOrder(payload: CreateOrderRequest): Promise<CreateOrderResponse> {
  const res = await fetch(`${API_URL}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Erro ao criar pedido');
  return res.json();
}

export async function getOrder(id: string): Promise<Order> {
  const res = await fetch(`${API_URL}/orders/${id}`);
  if (!res.ok) throw new Error('Erro ao buscar pedido');
  return res.json();
}
