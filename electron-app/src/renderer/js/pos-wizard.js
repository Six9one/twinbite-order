/**
 * POS Product Wizard - Product Customization System
 * Handles pizzas, soufflets, makloubs, and other customizable products
 */

window.POSWizard = {
  state: {
    isOpen: false,
    product: null,
    step: 1,
    customization: {
      size: null,
      selectedOptions: [],
      supplements: [],
      notes: '',
      quantity: 1
    }
  },

  // Product type configurations
  configs: {
    pizza: {
      title: 'Personnaliser votre Pizza',
      steps: [
        { id: 'size', label: 'Taille', icon: '📏' },
        { id: 'base', label: 'Base', icon: '🍅' },
        { id: 'toppings', label: 'Garniture', icon: '🧀' },
        { id: 'supplements', label: 'Suppléments', icon: '➕' },
        { id: 'notes', label: 'Remarques', icon: '📝' },
        { id: 'quantity', label: 'Quantité', icon: '🔢' }
      ],
      sizes: ['solo', 'senior', 'mega'],
      bases: ['tomate', 'creme'],
      supplementOptions: [
        { id: 'extra-cheese', name: 'Extra Fromage', price: 0.50 },
        { id: 'extra-meat', name: 'Extra Viande', price: 1.00 },
        { id: 'extra-sauce', name: 'Extra Sauce', price: 0.30 }
      ]
    },
    soufflet: {
      title: 'Personnaliser votre Soufflet',
      steps: [
        { id: 'size', label: 'Taille', icon: '📏' },
        { id: 'meat', label: 'Viande', icon: '🍖' },
        { id: 'sauce', label: 'Sauce', icon: '🥫' },
        { id: 'supplements', label: 'Suppléments', icon: '➕' },
        { id: 'notes', label: 'Remarques', icon: '📝' },
        { id: 'quantity', label: 'Quantité', icon: '🔢' }
      ],
      sizes: ['solo', 'duo', 'trio'],
      meatOptions: [
        { id: 'chicken', name: 'Poulet' },
        { id: 'beef', name: 'Bœuf' },
        { id: 'mixed', name: 'Mélangé' }
      ],
      sauceOptions: [
        { id: 'tomate', name: 'Tomate' },
        { id: 'blanche', name: 'Blanche' },
        { id: 'barbecue', name: 'BBQ' }
      ]
    },
    makloub: {
      title: 'Personnaliser votre Makloub',
      steps: [
        { id: 'size', label: 'Taille', icon: '📏' },
        { id: 'meat', label: 'Viande', icon: '🍖' },
        { id: 'notes', label: 'Remarques', icon: '📝' },
        { id: 'quantity', label: 'Quantité', icon: '🔢' }
      ],
      sizes: ['solo', 'duo']
    }
  },

  open(product, type = 'pizza') {
    this.state.isOpen = true;
    this.state.product = product;
    this.state.step = 1;
    this.state.customization = {
      size: null,
      selectedOptions: [],
      supplements: [],
      notes: '',
      quantity: 1
    };
    this.render();
  },

  close() {
    this.state.isOpen = false;
    this.render();
  },

  nextStep() {
    const config = this.configs[this.state.product.type] || this.configs.pizza;
    if (this.state.step < config.steps.length) {
      this.state.step++;
      this.render();
    }
  },

  prevStep() {
    if (this.state.step > 1) {
      this.state.step--;
      this.render();
    }
  },

  setSize(size) {
    this.state.customization.size = size;
    this.render();
  },

  toggleOption(optionId) {
    const list = this.state.customization.selectedOptions;
    if (list.includes(optionId)) {
      this.state.customization.selectedOptions = list.filter(id => id !== optionId);
    } else {
      this.state.customization.selectedOptions = [...list, optionId];
    }
    this.render();
  },

  toggleSupplement(suppId) {
    const list = this.state.customization.supplements;
    if (list.includes(suppId)) {
      this.state.customization.supplements = list.filter(id => id !== suppId);
    } else {
      this.state.customization.supplements = [...list, suppId];
    }
    this.render();
  },

  setNotes(notes) {
    this.state.customization.notes = notes;
  },

  setQuantity(qty) {
    this.state.customization.quantity = Math.max(1, parseInt(qty) || 1);
    this.render();
  },

  calculatePrice() {
    let price = this.state.product.price;
    
    // Size multiplier
    if (this.state.customization.size === 'duo') price *= 1.5;
    if (this.state.customization.size === 'trio') price *= 2;
    if (this.state.customization.size === 'mega') price *= 1.5;

    // Supplements
    const config = this.configs[this.state.product.type] || {};
    if (config.supplementOptions) {
      this.state.customization.supplements.forEach(suppId => {
        const supp = config.supplementOptions.find(s => s.id === suppId);
        if (supp) price += supp.price;
      });
    }

    return price * this.state.customization.quantity;
  },

  submit() {
    if (!this.state.customization.size && this.configs[this.state.product.type]?.sizes) {
      alert('Veuillez sélectionner une taille');
      return;
    }

    // Add to cart with customization
    const cartItem = {
      ...this.state.product,
      quantity: this.state.customization.quantity,
      options: this.state.customization.selectedOptions,
      supplements: this.state.customization.supplements,
      notes: this.state.customization.notes,
      size: this.state.customization.size,
      customizationPrice: this.calculatePrice()
    };

    // Add to app cart
    const existing = window.appState.cart.find(
      item => item.id === cartItem.id && 
               JSON.stringify(item.options) === JSON.stringify(cartItem.options)
    );

    if (existing) {
      existing.quantity += cartItem.quantity;
    } else {
      window.appState.cart.push(cartItem);
    }

    this.close();
    renderApp();
  },

  render() {
    if (!this.state.isOpen) {
      const modal = document.getElementById('wizard-modal');
      if (modal) modal.remove();
      return;
    }

    const config = this.configs[this.state.product.type] || this.configs.pizza;
    const currentStep = config.steps[this.state.step - 1];
    const totalSteps = config.steps.length;

    const html = `
      <div id="wizard-modal" class="wizard-modal">
        <div class="wizard-overlay" onclick="window.POSWizard.close()"></div>
        
        <div class="wizard-container">
          {/* Header */}
          <div class="wizard-header">
            <button class="wizard-close" onclick="window.POSWizard.close()">✕</button>
            <h2>${config.title}</h2>
            <div class="wizard-price">${this.calculatePrice().toFixed(2)}€</div>
          </div>

          {/* Progress */}
          <div class="wizard-progress">
            ${config.steps.map((step, idx) => `
              <div class="progress-step ${idx + 1 <= this.state.step ? 'active' : ''} ${idx + 1 === this.state.step ? 'current' : ''}">
                <div class="progress-icon">${step.icon}</div>
                <div class="progress-label">${step.label}</div>
              </div>
            `).join('')}
          </div>

          {/* Content */}
          <div class="wizard-content">
            ${this.renderStepContent(currentStep, config)}
          </div>

          {/* Actions */}
          <div class="wizard-actions">
            ${this.state.step > 1 ? `
              <button class="btn-wizard-secondary" onclick="window.POSWizard.prevStep()">
                ← Retour
              </button>
            ` : ''}
            
            ${this.state.step < totalSteps ? `
              <button class="btn-wizard-primary" onclick="window.POSWizard.nextStep()">
                Suivant →
              </button>
            ` : `
              <button class="btn-wizard-primary" onclick="window.POSWizard.submit()">
                Ajouter au panier (${this.state.customization.quantity})
              </button>
            `}
          </div>
        </div>
      </div>
    `;

    // Create or update modal
    let modal = document.getElementById('wizard-modal');
    if (!modal) {
      modal = document.createElement('div');
      document.body.appendChild(modal);
    }
    modal.innerHTML = html;
  },

  renderStepContent(step, config) {
    switch (step.id) {
      case 'size':
        return `
          <div class="step-content">
            <h3>Choisissez une taille</h3>
            <div class="size-grid">
              ${config.sizes.map(size => `
                <button class="size-btn ${this.state.customization.size === size ? 'selected' : ''}"
                        onclick="window.POSWizard.setSize('${size}')">
                  ${size.charAt(0).toUpperCase() + size.slice(1)}
                </button>
              `).join('')}
            </div>
          </div>
        `;

      case 'base':
        return `
          <div class="step-content">
            <h3>Choisissez une base</h3>
            <div class="option-grid">
              ${config.bases.map(base => `
                <button class="option-btn ${this.state.customization.selectedOptions.includes(base) ? 'selected' : ''}"
                        onclick="window.POSWizard.toggleOption('${base}')">
                  ${base === 'tomate' ? '🍅 Tomate' : '🤍 Crème'}
                </button>
              `).join('')}
            </div>
          </div>
        `;

      case 'supplements':
        return `
          <div class="step-content">
            <h3>Suppléments (+0.50€ chacun)</h3>
            <div class="supplements-list">
              ${config.supplementOptions?.map(supp => `
                <label class="supplement-item">
                  <input type="checkbox" 
                         ${this.state.customization.supplements.includes(supp.id) ? 'checked' : ''}
                         onchange="window.POSWizard.toggleSupplement('${supp.id}')">
                  <span>${supp.name}</span>
                  <span class="supp-price">+${supp.price.toFixed(2)}€</span>
                </label>
              `).join('')}
            </div>
          </div>
        `;

      case 'notes':
        return `
          <div class="step-content">
            <h3>Remarques spéciales</h3>
            <textarea class="notes-input" 
                      placeholder="Ex: Sans oignons, extra fromage..."
                      onchange="window.POSWizard.setNotes(this.value)">${this.state.customization.notes}</textarea>
          </div>
        `;

      case 'quantity':
        return `
          <div class="step-content">
            <h3>Quantité</h3>
            <div class="quantity-control">
              <button class="qty-btn" onclick="window.POSWizard.setQuantity(${this.state.customization.quantity - 1})">−</button>
              <span class="qty-display">${this.state.customization.quantity}</span>
              <button class="qty-btn" onclick="window.POSWizard.setQuantity(${this.state.customization.quantity + 1})">+</button>
            </div>
          </div>
        `;

      default:
        return '<div class="step-content"><p>Étape inconnue</p></div>';
    }
  }
};
