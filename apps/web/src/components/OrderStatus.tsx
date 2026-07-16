import type { Order } from '@repo/shared';

interface OrderStatusProps {
  orders: Order[];
}

const statusLabels: Record<Order['status'], string> = {
  PENDING: 'Pendente',
  PROCESSING: 'Processando',
  PAYMENT_APPROVED: 'Pagamento aprovado',
  PAYMENT_DECLINED: 'Pagamento recusado',
  OUT_OF_STOCK: 'Sem estoque',
  COMPLETED: 'Concluído',
  FAILED: 'Falhou',
};

export function OrderStatus({ orders }: OrderStatusProps) {
  return (
    <div className="order-status">
      <h2>Pedidos</h2>
      {orders.length === 0 ? (
        <p>Nenhum pedido ainda.</p>
      ) : (
        <ul>
          {orders.map((order) => (
            <li key={order.id} className={`order-card ${order.status.toLowerCase()}`}>
              <div className="order-header">
                <strong>Pedido #{order.id.slice(0, 8)}</strong>
                <span className={`badge ${order.status.toLowerCase()}`}>
                  {statusLabels[order.status]}
                </span>
              </div>
              <p>Produto: {order.productId}</p>
              <p>Quantidade: {order.quantity}</p>
              <p>Pagamento: {order.paymentStatus}</p>
              <details>
                <summary>Histórico</summary>
                <ul className="history">
                  {order.history.map((h: Order['history'][number], i: number) => (
                    <li key={i}>
                      {statusLabels[h.status]} — {new Date(h.at).toLocaleTimeString()}
                    </li>
                  ))}
                </ul>
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
