import { useEffect, useState } from 'react';
import { getProducts, getOrders, createOrder } from './api';
import { ProductList } from './components/ProductList';
import { OrderForm } from './components/OrderForm';
import { OrderStatus } from './components/OrderStatus';
import { v4 as uuidv4 } from './utils/uuid';
import type { CreateOrderRequest, Product, Order } from '@repo/shared';

function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [productsData, ordersData] = await Promise.all([getProducts(), getOrders()]);
      setProducts(productsData);
      setOrders(ordersData);
    } catch (error) {
      console.error(error);
      setMessage('Erro ao carregar dados.');
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateOrder = async (payload: CreateOrderRequest) => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await createOrder(payload);

      if (response.isDuplicate) {
        setMessage('Pedido idempotente detectado: mesmo resultado da requisição anterior.');
      } else {
        setMessage(response.message);
      }

      await fetchData();
      setSelectedProduct(null);
    } catch (error) {
      setMessage('Erro ao processar pedido.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrderWithDoubleClick = async (payload: CreateOrderRequest) => {
    setLoading(true);
    setMessage(null);
    try {
      const [first, second] = await Promise.all([
        createOrder(payload),
        createOrder(payload),
      ]);
      setMessage(
        `Duas requisições enviadas com a mesma chave. Resposta 1: ${first.message} | Resposta 2: ${second.message}`
      );
      await fetchData();
      setSelectedProduct(null);
    } catch (error) {
      setMessage('Erro ao processar pedido.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrderConcurrent = async (payload: CreateOrderRequest) => {
    setLoading(true);
    setMessage(null);
    try {
      const payload2 = { ...payload, idempotencyKey: uuidv4() };
      const [first, second] = await Promise.all([
        createOrder(payload),
        createOrder(payload2),
      ]);
      setMessage(
        `Duas pessoas comprando simultaneamente! Pedido 1 (${first.order?.id}): ${first.message} | Pedido 2 (${second.order?.id}): ${second.message}`
      );
      await fetchData();
      setSelectedProduct(null);
    } catch (error) {
      setMessage('Erro ao processar pedidos concorrentes.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <nav className="navbar">
        <div className="navbar-inner">
          <span className="navbar-brand">
            <span className="icon">🛒</span>
            TechStore
          </span>
          <span className="navbar-badge">
            {orders.length} pedido{orders.length !== 1 ? 's' : ''}
          </span>
        </div>
      </nav>

      <div className="app">
        {message && <div className="toast">{message}</div>}

        {selectedProduct ? (
          <OrderForm
            product={selectedProduct}
            onSubmit={(payload) =>
              payload.simulateScenario === 'duplicate'
                ? handleCreateOrderWithDoubleClick(payload)
                : payload.simulateScenario === 'concurrent_stock'
                  ? handleCreateOrderConcurrent(payload)
                  : handleCreateOrder(payload)
            }
            onBack={() => {
              setSelectedProduct(null);
              setMessage(null);
            }}
            loading={loading}
          />
        ) : (
          <ProductList products={products} onSelect={setSelectedProduct} />
        )}

        <OrderStatus orders={orders} />
      </div>

      <footer className="footer">
        <strong>TechStore</strong> — Demonstração de RabbitMQ · Checkout, Inventário, Pagamento e Notificações
      </footer>
    </>
  );
}

export default App;
