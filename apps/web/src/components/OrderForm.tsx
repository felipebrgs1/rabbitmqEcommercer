import { useState } from 'react';
import { v4 as uuidv4 } from '../utils/uuid';
import type { Product, CreateOrderRequest } from '@repo/shared';

interface OrderFormProps {
  product: Product;
  onSubmit: (payload: CreateOrderRequest) => void;
  loading: boolean;
}

export function OrderForm({ product, onSubmit, loading }: OrderFormProps) {
  const [quantity, setQuantity] = useState(1);
  const [scenario, setScenario] = useState<'default' | 'declined' | 'duplicate'>('default');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      productId: product.id,
      quantity,
      idempotencyKey: uuidv4(),
      simulateScenario: scenario,
    });
  };

  return (
    <form className="order-form" onSubmit={handleSubmit}>
      <h2>Checkout: {product.name}</h2>
      <p>Preço unitário: R$ {product.price.toFixed(2)}</p>
      <p>Total: R$ {(product.price * quantity).toFixed(2)}</p>

      <label>
        Quantidade:
        <input
          type="number"
          min={1}
          max={product.stock}
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
        />
      </label>

      <label>
        Cenário de simulação:
        <select value={scenario} onChange={(e) => setScenario(e.target.value as typeof scenario)}>
          <option value="default">Padrão (sucesso)</option>
          <option value="declined">Pagamento recusado</option>
          <option value="duplicate">Duplo clique / idempotência</option>
        </select>
      </label>

      <button type="submit" disabled={loading || quantity > product.stock}>
        {loading ? 'Processando...' : 'Finalizar compra'}
      </button>

      {scenario === 'duplicate' && (
        <p className="hint">
          O backend manterá a mesma <strong>idempotencyKey</strong> para simular duas requisições
          idênticas. O resultado será o mesmo da primeira.
        </p>
      )}
    </form>
  );
}
