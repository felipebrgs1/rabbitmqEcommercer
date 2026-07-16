import { z } from 'zod';

export const OrderStatusSchema = z.enum([
  'PENDING',
  'PROCESSING',
  'PAYMENT_APPROVED',
  'PAYMENT_DECLINED',
  'OUT_OF_STOCK',
  'COMPLETED',
  'FAILED',
]);

export const PaymentStatusSchema = z.enum([
  'PENDING',
  'APPROVED',
  'DECLINED',
  'REFUNDED',
]);

export const OrderHistorySchema = z.object({
  status: OrderStatusSchema,
  at: z.string().datetime(),
});

export const OrderSchema = z.object({
  id: z.string(),
  productId: z.string(),
  quantity: z.number().int().positive(),
  idempotencyKey: z.string(),
  status: OrderStatusSchema,
  paymentStatus: PaymentStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  history: z.array(OrderHistorySchema),
});

export const CreateOrderRequestSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().positive(),
  idempotencyKey: z.string().min(1),
  simulateScenario: z.enum(['default', 'declined', 'duplicate', 'concurrent_stock']).optional(),
});

export const CreateOrderResponseSchema = z.object({
  success: z.boolean(),
  order: OrderSchema.optional(),
  message: z.string(),
  isDuplicate: z.boolean().optional(),
});

export const OrderListResponseSchema = z.array(OrderSchema);
