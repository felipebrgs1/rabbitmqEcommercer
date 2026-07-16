import type { Product } from '@repo/shared';

const productIcons: Record<string, string> = {
  '1': '💻',
  '2': '🖱️',
  '3': '⌨️',
  '4': '🖥️',
};

const stockLabel = (stock: number) => {
  if (stock === 0) return { text: 'Indisponível', className: 'empty' };
  if (stock <= 2) return { text: `Últimas ${stock} un.`, className: 'low' };
  return { text: `${stock} em estoque`, className: '' };
};

interface ProductListProps {
  products: Product[];
  onSelect: (product: Product) => void;
}

export function ProductList({ products, onSelect }: ProductListProps) {
  if (products.length === 0) {
    return (
      <div className="empty-state">
        <div className="icon">📦</div>
        <p>Carregando produtos...</p>
      </div>
    );
  }

  return (
    <section>
      <h2 className="section-title">Produtos em destaque</h2>
      <div className="products-grid">
        {products.map((product) => {
          const stock = stockLabel(product.stock);
          const isOut = product.stock === 0;

          return (
            <div
              key={product.id}
              className={`product-card ${isOut ? 'out-of-stock' : ''}`}
              onClick={() => !isOut && onSelect(product)}
            >
              <div className="product-icon">{productIcons[product.id] ?? '📦'}</div>
              <div className="product-name">{product.name}</div>
              <div className="product-price">
                <span className="currency">R$ </span>
                {product.price.toFixed(2).replace('.', ',')}
              </div>
              <div className={`product-stock ${stock.className}`}>{stock.text}</div>
              <button className="btn btn-primary btn-full" disabled={isOut}>
                {isOut ? 'Indisponível' : 'Comprar'}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
