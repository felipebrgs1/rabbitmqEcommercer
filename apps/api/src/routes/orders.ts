import { Router } from 'express';
import { z } from 'zod';
import { CreateOrderRequestSchema } from '@repo/shared';
import { getOrders, getOrderById } from '../data/store';
import { processCheckoutRequest } from '../services/checkout';

const router = Router();

router.get('/', (req, res) => {
  res.json(getOrders());
});

router.get('/:id', (req, res) => {
  const order = getOrderById(req.params.id);
  if (!order) {
    return res.status(404).json({ success: false, message: 'Pedido não encontrado.' });
  }
  res.json(order);
});

router.post('/', async (req, res) => {
  try {
    const payload = CreateOrderRequestSchema.parse(req.body);
    const result = await processCheckoutRequest(payload);
    return res.status(result.success ? 202 : 400).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: 'Dados inválidos.', errors: error.issues });
    }
    console.error('Checkout error:', error);
    return res.status(500).json({ success: false, message: 'Erro interno no checkout.' });
  }
});

export default router;
