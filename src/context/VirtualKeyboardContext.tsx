import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export type KeyboardLayout = 'azerty' | 'qwerty' | 'numpad' | 'symbols';

interface VirtualKeyboardContextType {
  isOpen: boolean;
  autoOpen: boolean;
  layout: KeyboardLayout;
  isCaps: boolean;
  activeElement: HTMLInputElement | HTMLTextAreaElement | null;
  activeLabel: string;
  openKeyboard: (element?: HTMLInputElement | HTMLTextAreaElement) => void;
  closeKeyboard: () => void;
  toggleKeyboard: () => void;
  setAutoOpen: (value: boolean) => void;
  setLayout: (layout: KeyboardLayout) => void;
  setIsCaps: React.Dispatch<React.SetStateAction<boolean>>;
  toggleCaps: () => void;
  typeChar: (char: string) => void;
  backspace: () => void;
  clearInput: () => void;
  submitInput: () => void;
}

const VirtualKeyboardContext = createContext<VirtualKeyboardContextType | undefined>(undefined);

const LOCAL_STORAGE_AUTO_OPEN = 'twinpizza_vk_auto_open';

export function VirtualKeyboardProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [autoOpen, setAutoOpenState] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_AUTO_OPEN);
      return stored !== null ? stored === 'true' : true;
    } catch {
      return true;
    }
  });
  const [layout, setLayout] = useState<KeyboardLayout>('azerty');
  const [isCaps, setIsCaps] = useState<boolean>(false);
  const [activeElement, setActiveElement] = useState<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const [activeLabel, setActiveLabel] = useState<string>('');

  const setAutoOpen = (value: boolean) => {
    setAutoOpenState(value);
    try {
      localStorage.setItem(LOCAL_STORAGE_AUTO_OPEN, String(value));
    } catch (_) {}
  };

  const isNumericInput = (el: HTMLInputElement | HTMLTextAreaElement): boolean => {
    if (el instanceof HTMLInputElement) {
      const type = (el.type || '').toLowerCase();
      const inputMode = (el.inputMode || '').toLowerCase();
      if (type === 'number' || type === 'tel' || inputMode === 'numeric' || inputMode === 'decimal' || inputMode === 'tel') {
        return true;
      }
    }
    const placeholder = (el.placeholder || '').toLowerCase();
    const name = (el.name || '').toLowerCase();
    const id = (el.id || '').toLowerCase();

    return (
      placeholder.includes('tél') || placeholder.includes('phone') || placeholder.includes('prix') || placeholder.includes('montant') || placeholder.includes('table') || placeholder.includes('code') || placeholder.includes('remise') ||
      name.includes('phone') || name.includes('tel') || name.includes('price') || name.includes('amount') || name.includes('table') || name.includes('discount') ||
      id.includes('phone') || id.includes('tel') || id.includes('price') || id.includes('amount')
    );
  };

  const detectLabelAndLayout = useCallback((el: HTMLInputElement | HTMLTextAreaElement) => {
    let labelText = el.placeholder || el.getAttribute('aria-label') || el.name || el.id || 'Saisie texte';
    if (!el.placeholder || el.placeholder === 'Note...' || el.placeholder === 'Notes livraison...') {
      if (el.id) {
        const labelEl = document.querySelector(`label[for="${el.id}"]`);
        if (labelEl && labelEl.textContent) {
          labelText = labelEl.textContent.trim();
        }
      }
      if (el.parentElement) {
        const labelEl = el.parentElement.querySelector('label, span, div');
        if (labelEl && labelEl.textContent && labelEl.textContent.length < 40) {
          labelText = labelEl.textContent.trim();
        }
      }
    }
    setActiveLabel(labelText);

    if (isNumericInput(el)) {
      setLayout('numpad');
    } else {
      if (layout === 'numpad') {
        setLayout('azerty');
      }
    }
  }, [layout]);

  const openKeyboard = useCallback((element?: HTMLInputElement | HTMLTextAreaElement) => {
    if (element) {
      setActiveElement(element);
      detectLabelAndLayout(element);
    } else if (document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement) {
      setActiveElement(document.activeElement);
      detectLabelAndLayout(document.activeElement);
    }
    setIsOpen(true);
  }, [detectLabelAndLayout]);

  const closeKeyboard = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggleKeyboard = useCallback(() => {
    setIsOpen(prev => {
      const next = !prev;
      if (next && !activeElement) {
        if (document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement) {
          setActiveElement(document.activeElement);
          detectLabelAndLayout(document.activeElement);
        } else {
          const firstInput = document.querySelector('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), textarea') as HTMLInputElement | HTMLTextAreaElement | null;
          if (firstInput) {
            setActiveElement(firstInput);
            detectLabelAndLayout(firstInput);
            firstInput.focus();
          }
        }
      }
      return next;
    });
  }, [activeElement, detectLabelAndLayout]);

  // Global event listener to detect any interaction with input fields
  useEffect(() => {
    const handleInputInteraction = (e: Event) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      if (target.closest('.virtual-keyboard-container') || target.closest('.virtual-keyboard-fab')) {
        return;
      }

      let inputEl: HTMLInputElement | HTMLTextAreaElement | null = null;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        inputEl = target;
      } else if (target.closest('input, textarea')) {
        inputEl = target.closest('input, textarea') as HTMLInputElement | HTMLTextAreaElement;
      } else if (document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement) {
        inputEl = document.activeElement;
      }

      if (inputEl) {
        if (inputEl instanceof HTMLInputElement) {
          const type = (inputEl.type || '').toLowerCase();
          if (['checkbox', 'radio', 'hidden', 'file', 'color', 'range', 'submit', 'button', 'reset', 'image'].includes(type)) {
            return;
          }
        }

        setActiveElement(inputEl);
        detectLabelAndLayout(inputEl);
        setIsOpen(true);
      }
    };

    window.addEventListener('focusin', handleInputInteraction, true);
    window.addEventListener('click', handleInputInteraction, true);
    window.addEventListener('pointerdown', handleInputInteraction, true);
    window.addEventListener('touchstart', handleInputInteraction, true);

    return () => {
      window.removeEventListener('focusin', handleInputInteraction, true);
      window.removeEventListener('click', handleInputInteraction, true);
      window.removeEventListener('pointerdown', handleInputInteraction, true);
      window.removeEventListener('touchstart', handleInputInteraction, true);
    };
  }, [detectLabelAndLayout]);

  const dispatchInputChange = (el: HTMLInputElement | HTMLTextAreaElement, newValue: string) => {
    const proto = el instanceof HTMLInputElement 
      ? window.HTMLInputElement.prototype 
      : window.HTMLTextAreaElement.prototype;
    const valueSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    
    if (valueSetter) {
      valueSetter.call(el, newValue);
    } else {
      el.value = newValue;
    }

    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };

  const typeChar = useCallback((char: string) => {
    let el = activeElement;
    if (!el && (document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement)) {
      el = document.activeElement;
      setActiveElement(el);
    }
    if (!el) return;

    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;

    const addedChar = isCaps ? char.toUpperCase() : char;
    const newValue = el.value.substring(0, start) + addedChar + el.value.substring(end);

    dispatchInputChange(el, newValue);

    const newPos = start + addedChar.length;
    setTimeout(() => {
      try {
        el.focus();
        el.setSelectionRange(newPos, newPos);
      } catch (err) {}
    }, 0);
  }, [activeElement, isCaps]);

  const backspace = useCallback(() => {
    let el = activeElement;
    if (!el && (document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement)) {
      el = document.activeElement;
      setActiveElement(el);
    }
    if (!el) return;

    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;

    if (start === 0 && end === 0) return;

    let newValue = '';
    let newPos = start;

    if (start !== end) {
      newValue = el.value.substring(0, start) + el.value.substring(end);
      newPos = start;
    } else {
      newValue = el.value.substring(0, start - 1) + el.value.substring(start);
      newPos = Math.max(0, start - 1);
    }

    dispatchInputChange(el, newValue);

    setTimeout(() => {
      try {
        el.focus();
        el.setSelectionRange(newPos, newPos);
      } catch (err) {}
    }, 0);
  }, [activeElement]);

  const clearInput = useCallback(() => {
    let el = activeElement;
    if (!el && (document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement)) {
      el = document.activeElement;
      setActiveElement(el);
    }
    if (!el) return;
    dispatchInputChange(el, '');
    try {
      el.focus();
    } catch (err) {}
  }, [activeElement]);

  const submitInput = useCallback(() => {
    let el = activeElement;
    if (!el && (document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement)) {
      el = document.activeElement;
      setActiveElement(el);
    }
    if (!el) return;

    const enterEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      bubbles: true,
    });
    el.dispatchEvent(enterEvent);
  }, [activeElement]);

  const toggleCaps = useCallback(() => {
    setIsCaps(prev => !prev);
  }, []);

  return (
    <VirtualKeyboardContext.Provider
      value={{
        isOpen,
        autoOpen,
        layout,
        isCaps,
        activeElement,
        activeLabel,
        openKeyboard,
        closeKeyboard,
        toggleKeyboard,
        setAutoOpen,
        setLayout,
        setIsCaps,
        toggleCaps,
        typeChar,
        backspace,
        clearInput,
        submitInput,
      }}
    >
      {children}
    </VirtualKeyboardContext.Provider>
  );
}

export function useVirtualKeyboard() {
  const context = useContext(VirtualKeyboardContext);
  if (!context) {
    throw new Error('useVirtualKeyboard must be used within a VirtualKeyboardProvider');
  }
  return context;
}
