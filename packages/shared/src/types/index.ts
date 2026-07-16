import { z } from 'zod';
import {
  ProductSchema,
  ProductListResponseSchema,
  OrderSchema,
  OrderStatusSchema,
  PaymentStatusSchema,
  CreateOrderRequestSchema,
  CreateOrderResponseSchema,
  OrderListResponseSchema,
} from '../schemas';

export type Product = z.infer<typeof ProductSchema>;
export type ProductListResponse = z.infer<typeof ProductListResponseSchema>;

export type OrderStatus = z.infer<typeof OrderStatusSchema>;
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;
export type Order = z.infer<typeof OrderSchema>;
export type CreateOrderRequest = z.infer<typeof CreateOrderRequestSchema>;
export type CreateOrderResponse = z.infer<typeof CreateOrderResponseSchema>;
export type OrderListResponse = z.infer<typeof OrderListResponseSchema>;

export * from './rabbitmq';
