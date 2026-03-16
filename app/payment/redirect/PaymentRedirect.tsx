// app/payment/redirect/PaymentRedirect.tsx
'use client';
import { useEffect } from 'react';

interface PaymentRedirectProps {
  paymentData: Record<string, string>;
}

export default function PaymentRedirect({ paymentData }: PaymentRedirectProps) {
  useEffect(() => {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = paymentData.actionUrl;

    Object.entries(paymentData).forEach(([key, value]) => {
      if (key === 'actionUrl') return; // Skip actionUrl
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = value as string;
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
  }, [paymentData]);

  return <div>Redirecting to PayFast...</div>;
}