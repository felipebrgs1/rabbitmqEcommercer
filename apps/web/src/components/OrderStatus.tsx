import { useState } from 'react';
import type { Order } from '@repo/shared';

const productIcons: Record<string, string> = {
  '1': '💻',
  '2': '🖱️',
  '3': '⌨️',
  '4': '🖥️',
};

const statusLabels: Record<Order['status'], string> = {
  PENDING: 'Pendente',
  PROCESSING: 'Processando',
  PAYMENT_APPROVED: 'Pagamento aprovado',
  PAYMENT_DECLINED: 'Pagamento recusado',
  OUT_OF_STOCK: 'Sem estoque',
  COMPLETED: 'Concluído',
  FAILED: 'Falhou',
};

interface OrderStatusProps {
  orders: Order[];
}

export function OrderStatus({ orders }: OrderStatusProps) {
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  if (orders.length === 0) {
    return (
      <section className="orders-section">
        <h2 className="section-title">Seus pedidos</h2>
        <div className="empty-state">
          <div className="icon">📋</div>
          <p>Nenhum pedido realizado ainda.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="orders-section">
      <h2 className="section-title">Seus pedidos ({orders.length})</h2>
      <ul className="orders-list">
        {[...orders].reverse().map((order) => {
          const isExpanded = expandedOrder === order.id;

          return (
            <li key={order.id} className="order-card">
              <div className="order-card-top">
                <div className="order-card-left">
                  <div className="product-icon">{productIcons[order.productId] ?? '📦'}</div>
                  <div className="order-info">
                    <div className="order-id">Pedido #{order.id.slice(0, 8)}</div>
                    <div className="order-meta">
                      Qtd: {order.quantity} ·{' '}
                      {new Date(order.createdAt).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
                <span className={`badge ${order.status}`}>
                  {statusLabels[order.status]}
                </span>
              </div>

              <button
                className="order-history-toggle"
                onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
              >
                {isExpanded ? '▲ Ocultar' : '▼ Ver'} histórico ({order.history.length})
              </button>

              {isExpanded && (
                <ul className="history-list">
                  {order.history.map((h, i) => (
                    <li key={i}>
                      {statusLabels[h.status]}
                      <span className="history-time">
                        {new Date(h.at).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
