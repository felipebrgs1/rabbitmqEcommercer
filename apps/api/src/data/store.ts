import { v4 as uuidv4 } from 'uuid';
import type { Order, Product, OrderStatus, PaymentStatus } from '@repo/shared';

type OrderHistory = { status: OrderStatus; at: string };

const products: Product[] = [
  { id: '1', name: 'Notebook Gamer', price: 7500.0, stock: 5 },
  { id: '2', name: 'Mouse Sem Fio', price: 120.0, stock: 20 },
  { id: '3', name: 'Teclado Mecânico', price: 450.0, stock: 0 },
  { id: '4', name: 'Monitor 27"', price: 1800.0, stock: 2 },
];

const orders: Order[] = [];
const idempotencyStore = new Map<string, { result: unknown; createdAt: number }>();
const paymentResults = new Map<string, unknown>();

export function getProducts(): Product[] {
  return products.map((p) => ({ ...p }));
}

export function getProductById(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}

export function createOrder(
  productId: string,
  quantity: number,
  idempotencyKey: string
): Order {
  const order: Order = {
    id: uuidv4(),
    productId,
    quantity,
    idempotencyKey,
    status: 'PENDING',
    paymentStatus: 'PENDING',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    history: [{ status: 'PENDING', at: new Date().toISOString() }],
  };
  orders.push(order);
  return order;
}

export function getOrders(): Order[] {
  return orders.map((o) => ({ ...o }));
}

export function getOrderById(id: string): Order | undefined {
  return orders.find((o) => o.id === id);
}

export function updateOrderStatus(
  id: string,
  status: OrderStatus,
  paymentStatus?: PaymentStatus
): Order | undefined {
  const order = orders.find((o) => o.id === id);
  if (!order) return undefined;

  order.status = status;
  if (paymentStatus) order.paymentStatus = paymentStatus;
  order.updatedAt = new Date().toISOString();
  order.history.push({ status, at: new Date().toISOString() });
  return order;
}

export function decrementStock(productId: string, quantity: number): boolean {
  const product = products.find((p) => p.id === productId);
  if (!product) return false;
  if (product.stock < quantity) return false;
  product.stock -= quantity;
  return true;
}

export function setIdempotencyResult<T>(key: string, result: T): void {
  idempotencyStore.set(key, {
    result,
    createdAt: Date.now(),
  });
}

export function getIdempotencyResult<T>(key: string): T | undefined {
  return idempotencyStore.get(key)?.result as T | undefined;
}

export function hasIdempotencyKey(key: string): boolean {
  return idempotencyStore.has(key);
}

export function setPaymentResult<T>(orderId: string, result: T): void {
  paymentResults.set(orderId, result);
}

export function getPaymentResult<T>(orderId: string): T | undefined {
  return paymentResults.get(orderId) as T | undefined;
}
