import { useState } from 'react';
import { v4 as uuidv4 } from '../utils/uuid';
import type { Product, CreateOrderRequest } from '@repo/shared';

const productIcons: Record<string, string> = {
  '1': '💻',
  '2': '🖱️',
  '3': '⌨️',
  '4': '🖥️',
};

interface OrderFormProps {
  product: Product;
  onSubmit: (payload: CreateOrderRequest) => void;
  onBack: () => void;
  loading: boolean;
}

const scenarioLabels: Record<string, string> = {
  default: 'Padrão (sucesso)',
  declined: 'Pagamento recusado',
  duplicate: 'Duplo clique / idempotência',
  concurrent_stock: 'Compra concorrente (estoque)',
  api_crash: 'API fora do ar (retry)',
};

const scenarioHints: Record<string, string> = {
  duplicate:
    'Mesma chave de idempotência. O backend retorna o resultado da primeira requisição, evitando duplicidade.',
  concurrent_stock:
    'Duas pessoas diferentes comprando o mesmo produto ao mesmo tempo. A segunda compra pode falhar por falta de estoque.',
  api_crash:
    'Simula a queda da API durante o processamento. A mensagem vai para a fila de retry com TTL de 5s e é reprocessada automaticamente quando a API "volta".',
};

export function OrderForm({ product, onSubmit, onBack, loading }: OrderFormProps) {
  const [quantity, setQuantity] = useState(1);
  const [scenario, setScenario] = useState<'default' | 'declined' | 'duplicate' | 'concurrent_stock' | 'api_crash'>('default');

  const total = product.price * quantity;

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
    <div className="checkout">
      <div className="checkout-header">
        <button className="checkout-back" onClick={onBack} title="Voltar para produtos">
          ←
        </button>
        <span className="checkout-title">Finalizar compra</span>
      </div>

      <form className="checkout-body" onSubmit={handleSubmit}>
        <div className="checkout-summary">
          <div className="checkout-product-card">
            <div className="product-icon">{productIcons[product.id] ?? '📦'}</div>
            <div className="checkout-product-info">
              <span className="name">{product.name}</span>
              <span className="unit-price">
                R$ {product.price.toFixed(2).replace('.', ',')} / unidade
              </span>
            </div>
          </div>

          <div className="checkout-total">
            <span>Total</span>
            <span>R$ {total.toFixed(2).replace('.', ',')}</span>
          </div>
        </div>

        <div className="checkout-form-fields">
          <div className="form-group">
            <label>Quantidade</label>
            <input
              type="number"
              min={1}
              max={product.stock}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
          </div>

          <div className="form-group">
            <label>Cenário de simulação</label>
            <select
              value={scenario}
              onChange={(e) => setScenario(e.target.value as typeof scenario)}
            >
              {Object.entries(scenarioLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {scenarioHints[scenario] && (
            <div className="scenario-hint">{scenarioHints[scenario]}</div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={loading || quantity > product.stock}
          >
            {loading ? 'Processando...' : 'Finalizar compra'}
          </button>
        </div>
      </form>
    </div>
  );
}
