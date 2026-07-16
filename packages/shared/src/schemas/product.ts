import { z } from 'zod';

export const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number().positive(),
  stock: z.number().int().min(0),
});

export const ProductListResponseSchema = z.array(ProductSchema);
