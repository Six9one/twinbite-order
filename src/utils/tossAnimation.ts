/**
 * Utility to play a "toss to cart" micro-animation.
 * Spawns a floating emoji corresponding to the category at the click location,
 * animates it along a parabolic-like curve to the cart button, shrinks it,
 * and triggers a satisfying bump scale transition on the cart button.
 */
export function playTossAnimation(startElement: HTMLElement, category?: string) {
  // Find visible shopping cart button target
  const target = document.querySelector('.shopping-cart-btn') || 
                 document.querySelector('svg.lucide-shopping-cart')?.closest('button') ||
                 document.querySelector('.fixed.top-4.right-4') ||
                 document.querySelector('[class*="ShoppingCart"]')?.closest('button');
  
  if (!startElement || !target) return;
  
  const startRect = startElement.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  
  // Map category to a matching emoji
  const emojiMap: Record<string, string> = {
    pizzas: '🍕',
    tacos: '🌮',
    sandwiches: '🥖',
    soufflets: '🥙',
    makloub: '🌯',
    mlawi: '🫓',
    panini: '🥪',
    croques: '🧀',
    texmex: '🌶️',
    frites: '🍟',
    salades: '🥗',
    milkshakes: '🥤',
    crepes: '🥞',
    gaufres: '🧇',
    boissons: '🥤',
  };
  
  const emoji = (category && emojiMap[category]) || '🍕';
  
  // Create floating element
  const floater = document.createElement('div');
  floater.innerHTML = emoji;
  floater.style.position = 'fixed';
  floater.style.zIndex = '10000';
  floater.style.left = `${startRect.left + startRect.width / 2 - 16}px`;
  floater.style.top = `${startRect.top + startRect.height / 2 - 16}px`;
  floater.style.width = '32px';
  floater.style.height = '32px';
  floater.style.display = 'flex';
  floater.style.alignItems = 'center';
  floater.style.justifyContent = 'center';
  floater.style.pointerEvents = 'none';
  floater.style.fontSize = '26px';
  floater.style.lineHeight = '1';
  
  // Initial state
  floater.style.transform = 'scale(1.2) rotate(0deg)';
  floater.style.opacity = '1';
  floater.style.transition = 'transform 0.8s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.8s ease-in-out';
  
  document.body.appendChild(floater);
  
  // Force a reflow
  floater.getBoundingClientRect();
  
  // Animate to target
  const deltaX = (targetRect.left + targetRect.width / 2) - (startRect.left + startRect.width / 2);
  const deltaY = (targetRect.top + targetRect.height / 2) - (startRect.top + startRect.height / 2);
  
  floater.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(0.2) rotate(720deg)`;
  floater.style.opacity = '0.3';
  
  // Cleanup floater & trigger cart icon bounce
  setTimeout(() => {
    floater.remove();
    
    // Apply a scaling "bump" animation to the cart button
    const targetEl = target as HTMLElement;
    const originalTransition = targetEl.style.transition;
    const originalTransform = targetEl.style.transform;
    
    targetEl.style.transition = 'transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    targetEl.style.transform = `${originalTransform ? originalTransform + ' ' : ''}scale(1.25)`;
    
    setTimeout(() => {
      targetEl.style.transform = originalTransform;
      setTimeout(() => {
        targetEl.style.transition = originalTransition;
      }, 150);
    }, 150);
  }, 800);
}
