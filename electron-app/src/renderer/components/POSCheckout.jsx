import React, { useState, useMemo } from 'react';

export default function POSCheckout({ cart, onBack, onComplete, status }) {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('especes');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const total = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [cart]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!customerName.trim()) {
      setError('Veuillez entrer le nom du client');
      return;
    }

    if (!customerPhone.trim()) {
      setError('Veuillez entrer le numéro de téléphone');
      return;
    }

    setIsProcessing(true);

    try {
      // Prepare order data
      const orderData = {
        customer_name: customerName,
        customer_phone: customerPhone.replace(/\s/g, ''),
        order_type: 'surplace',
        payment_method: paymentMethod,
        items: cart.map(item => ({
          product_id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
        total: total,
        notes: `Commande POS - Paiement: ${paymentMethod}`,
      };

      // Create order via IPC
      const createdOrder = await window.electronAPI.createOrder(orderData);
      console.log('Order created:', createdOrder);

      // Try to send WhatsApp notification
      if (status.whatsapp === 'connected') {
        try {
          const message = `🍕 *Commande #${createdOrder.order_number}*\nTotal: ${total.toFixed(2)}€\nMerci!`;
          await window.electronAPI.sendWhatsApp(customerPhone, message);
        } catch (waError) {
          console.warn('WhatsApp send failed:', waError);
        }
      }

      // Try to open cash drawer if payment is cash
      if (paymentMethod === 'especes') {
        try {
          await window.electronAPI.openCashDrawer();
        } catch (drawerError) {
          console.warn('Cash drawer error:', drawerError);
        }
      }

      setSuccess(true);
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (err) {
      console.error('Checkout error:', err);
      setError(err.message || 'Erreur lors de la création de la commande');
      setIsProcessing(false);
    }
  };

  if (success) {
    return (
      <div className="pos-checkout success">
        <div className="success-message">
          <div className="success-icon">✓</div>
          <h2>Commande créée!</h2>
          <p>Retour au catalogue...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pos-checkout">
      <div className="checkout-header">
        <button className="btn-back" onClick={onBack}>← Retour</button>
        <h2>Finaliser la commande</h2>
        <div className="placeholder"></div>
      </div>

      <div className="checkout-container">
        <form className="checkout-form" onSubmit={handleSubmit}>
          {/* Customer Info */}
          <div className="form-section">
            <h3>Informations client</h3>

            <div className="form-group">
              <label htmlFor="name">Nom du client</label>
              <input
                id="name"
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Ex: Jean Dupont"
                disabled={isProcessing}
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone">Téléphone</label>
              <input
                id="phone"
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Ex: 06 12 34 56 78"
                disabled={isProcessing}
              />
            </div>
          </div>

          {/* Payment Method */}
          <div className="form-section">
            <h3>Mode de paiement</h3>

            <div className="payment-options">
              <label className={`payment-option ${paymentMethod === 'especes' ? 'active' : ''}`}>
                <input
                  type="radio"
                  value="especes"
                  checked={paymentMethod === 'especes'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  disabled={isProcessing}
                />
                <span className="payment-label">
                  <span className="payment-emoji">💵</span>
                  <span className="payment-text">Espèces</span>
                </span>
              </label>

              <label className={`payment-option ${paymentMethod === 'cb' ? 'active' : ''}`}>
                <input
                  type="radio"
                  value="cb"
                  checked={paymentMethod === 'cb'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  disabled={isProcessing}
                />
                <span className="payment-label">
                  <span className="payment-emoji">💳</span>
                  <span className="payment-text">Carte Bancaire</span>
                </span>
              </label>
            </div>
          </div>

          {/* Order Summary */}
          <div className="order-summary">
            <h3>Résumé</h3>
            <div className="summary-items">
              {cart.map(item => (
                <div key={item.id} className="summary-item">
                  <span>{item.quantity}x {item.name}</span>
                  <span>{(item.price * item.quantity).toFixed(2)}€</span>
                </div>
              ))}
            </div>
            <div className="summary-total">
              <span className="label">Total à payer:</span>
              <span className="amount">{total.toFixed(2)}€</span>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="error-message">
              ⚠️ {error}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            className="btn-submit"
            disabled={isProcessing}
          >
            {isProcessing ? 'Traitement...' : `Valider la commande (${total.toFixed(2)}€)`}
          </button>
        </form>
      </div>
    </div>
  );
}
