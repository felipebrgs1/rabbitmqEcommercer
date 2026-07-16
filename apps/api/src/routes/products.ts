import { Router } from 'express';
import { getProducts } from '../data/store';

const router = Router();

router.get('/', (req, res) => {
  res.json(getProducts());
});

export default router;
