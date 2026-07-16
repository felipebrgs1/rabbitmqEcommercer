import { Router } from 'express';
import productsRouter from './products';
import ordersRouter from './orders';

const router = Router();

router.use('/products', productsRouter);
router.use('/orders', ordersRouter);

export default router;
