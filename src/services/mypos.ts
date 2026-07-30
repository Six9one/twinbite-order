import { supabase } from '@/integrations/supabase/client';

export interface MyPosCheckoutItem {
  name: string;
  quantity: number;
  price: number;
  customization?: unknown;
}

export interface MyPosCheckoutPayload {
  amount: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  orderNumber: string;
  items: MyPosCheckoutItem[];
  orderType: string;
  customerAddress?: string | null;
  customerNotes?: string | null;
  subtotal: number;
  tva: number;
}

export interface MyPosCheckoutResponse {
  checkout_url: string;
  params: Record<string, string>;
  orderNumber: string;
}

/**
 * Initiates myPOS Checkout by calling the Edge Function to generate the signed POST payload,
 * then creating and submitting a hidden HTML form to transfer the customer to myPOS hosted checkout.
 */
export async function initiateMyPosCheckout(payload: MyPosCheckoutPayload): Promise<void> {
  console.log('[myPOS Service] Initiating checkout for order:', payload.orderNumber);

  const { data, error } = await supabase.functions.invoke('create-mypos-checkout', {
    body: payload,
  });

  if (error) {
    console.error('[myPOS Service] Edge Function invocation error:', error);
    throw new Error(
      error.message || 'Paiement en ligne temporairement indisponible. Veuillez choisir un autre mode de paiement.'
    );
  }

  if (data?.error) {
    console.error('[myPOS Service] API returned error:', data.error);
    throw new Error(data.error);
  }

  const { checkout_url, params } = data as MyPosCheckoutResponse;

  if (!checkout_url || !params) {
    throw new Error('Paiement en ligne temporairement indisponible. Données de paiement incomplètes.');
  }

  console.log('[myPOS Service] Submitting form to myPOS hosted checkout:', checkout_url);

  // Create temporary HTML POST form
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = checkout_url;
  form.style.display = 'none';

  // Add hidden input fields for every parameter including Signature
  Object.entries(params).forEach(([key, value]) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = key;
    input.value = value != null ? String(value) : '';
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
}
