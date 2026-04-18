import React, { useMemo } from 'react';

export default function POSCart({ cart, onUpdateQuantity, onRemoveItem, onCheckout, onBack }) {
  const total = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [cart]);

  const itemCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  if (cart.length === 0) {
    return (
      <div className="pos-cart empty">
        <div className="empty-state">
          <div className="empty-icon">🛒</div>
          <h2>Panier vide</h2>
          <p>Ajoutez des produits depuis le catalogue</p>
          <button className="btn-primary" onClick={onBack}>
            ← Retour au catalogue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pos-cart">
      <div className="cart-header">
        <button className="btn-back" onClick={onBack}>← Retour</button>
        <h2>Panier ({itemCount} articles)</h2>
        <div className="placeholder"></div>
      </div>

      <div className="cart-items">
        {cart.map(item => (
          <CartItem
            key={item.id}
            item={item}
            onUpdateQuantity={onUpdateQuantity}
            onRemoveItem={onRemoveItem}
          />
        ))}
      </div>

      <div className="cart-summary">
        <div className="summary-row">
          <span>Sous-total:</span>
          <span>{total.toFixed(2)}€</span>
        </div>
        <div className="summary-row total">
          <span>Total:</span>
          <span className="total-amount">{total.toFixed(2)}€</span>
        </div>

        <button className="btn-checkout" onClick={onCheckout}>
          Procéder au paiement →
        </button>
      </div>
    </div>
  );
}

function CartItem({ item, onUpdateQuantity, onRemoveItem }) {
  const itemTotal = item.price * item.quantity;

  return (
    <div className="cart-item">
      <div className="item-image">
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} />
        ) : (
          <div className="item-placeholder">📦</div>
        )}
      </div>

      <div className="item-details">
        <h3>{item.name}</h3>
        <p className="item-price">{item.price.toFixed(2)}€ x {item.quantity}</p>
      </div>

      <div className="item-quantity">
        <button onClick={() => onUpdateQuantity(item.id, item.quantity - 1)} className="qty-btn">−</button>
        <span className="qty-display">{item.quantity}</span>
        <button onClick={() => onUpdateQuantity(item.id, item.quantity + 1)} className="qty-btn">+</button>
      </div>

      <div className="item-total">
        <span className="total-price">{itemTotal.toFixed(2)}€</span>
      </div>

      <button
        onClick={() => onRemoveItem(item.id)}
        className="btn-remove"
        title="Supprimer"
      >
        ✕
      </button>
    </div>
  );
}
