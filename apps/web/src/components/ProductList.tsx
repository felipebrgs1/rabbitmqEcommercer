import type { Product } from '@repo/shared';

interface ProductListProps {
  products: Product[];
  onSelect: (product: Product) => void;
}

export function ProductList({ products, onSelect }: ProductListProps) {
  return (
    <div className="product-list">
      <h2>Produtos</h2>
      {products.length === 0 ? (
        <p>Carregando produtos...</p>
      ) : (
        <div className="products-grid">
          {products.map((product) => (
            <div key={product.id} className="product-card">
              <h3>{product.name}</h3>
              <p className="price">R$ {product.price.toFixed(2)}</p>
              <p className={`stock ${product.stock === 0 ? 'out-of-stock' : ''}`}>
                {product.stock === 0 ? 'Fora de estoque' : `Estoque: ${product.stock}`}
              </p>
              <button onClick={() => onSelect(product)} disabled={product.stock === 0}>
                Comprar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
