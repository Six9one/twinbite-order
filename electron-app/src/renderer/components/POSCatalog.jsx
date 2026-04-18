import React, { useMemo } from 'react';

export default function POSCatalog({ products, categories, selectedCategory, onSelectCategory, onAddToCart, cartCount, onGoToCart }) {
  const filteredProducts = useMemo(() => {
    if (!selectedCategory) return products;
    return products.filter(p => p.category_id === selectedCategory);
  }, [products, selectedCategory]);

  return (
    <div className="pos-catalog">
      {/* Categories sidebar */}
      <aside className="pos-categories">
        <div className="categories-header">
          <h2>Catégories</h2>
        </div>
        <div className="categories-list">
          {categories.map(cat => (
            <button
              key={cat.id}
              className={`category-btn ${selectedCategory === cat.id ? 'active' : ''}`}
              onClick={() => onSelectCategory(cat.id)}
            >
              <span className="cat-emoji">{cat.emoji || '📦'}</span>
              <span className="cat-name">{cat.name}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* Products grid */}
      <section className="pos-products">
        <div className="products-header">
          <h2>{categories.find(c => c.id === selectedCategory)?.name || 'Produits'}</h2>
          {cartCount > 0 && (
            <button className="cart-floating-btn" onClick={onGoToCart}>
              🛒 Panier ({cartCount})
            </button>
          )}
        </div>

        {filteredProducts.length === 0 ? (
          <div className="no-products">
            <p>Aucun produit dans cette catégorie</p>
          </div>
        ) : (
          <div className="products-grid">
            {filteredProducts.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={onAddToCart}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ProductCard({ product, onAddToCart }) {
  const handleClick = () => {
    onAddToCart(product);
  };

  return (
    <div className="product-card" onClick={handleClick}>
      <div className="product-image">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} />
        ) : (
          <div className="product-placeholder">📦</div>
        )}
      </div>
      <div className="product-info">
        <h3 className="product-name">{product.name}</h3>
        {product.description && (
          <p className="product-desc">{product.description}</p>
        )}
        <div className="product-footer">
          <span className="product-price">{parseFloat(product.price).toFixed(2)}€</span>
          <button className="add-btn">+ Ajouter</button>
        </div>
      </div>
    </div>
  );
}
