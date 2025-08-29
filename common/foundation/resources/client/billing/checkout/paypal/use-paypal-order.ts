import { useEffect, useRef, useState } from 'react';
import { loadScript } from '@paypal/paypal-js';
import { useSettings } from '@ui/settings/use-settings';

interface UsePaypalOrderProps {
  entryId?: string;
  amount: number;
  currency?: string;
}
export function usePaypalOrder({
  entryId,
  amount,
  currency = 'USD',
}: UsePaypalOrderProps) {
  const paypalLoadStarted = useRef<boolean>(false);
  const paypalButtonsRendered = useRef<boolean>(false);
  const [paypalIsLoaded, setPaypalIsLoaded] = useState(false);
  const paypalElementRef = useRef<HTMLDivElement>(null);
  const {
    base_url,
    billing: {
      stripe: { enable: stripeEnabled },
      paypal: { enable: paypalEnabled, public_key },
    },
  } = useSettings();

  useEffect(() => {
    if (!paypalEnabled || !public_key || paypalLoadStarted.current) return;
    loadScript({
      clientId: public_key,
      intent: 'capture',
      disableFunding: stripeEnabled ? 'card' : undefined,
    }).then(() => {
      setPaypalIsLoaded(true);
    });
    paypalLoadStarted.current = true;
  }, [public_key, paypalEnabled, stripeEnabled]);

  useEffect(() => {
    if (
      !paypalIsLoaded ||
      !window.paypal?.Buttons ||
      !paypalElementRef.current ||
      !entryId ||
      paypalButtonsRendered.current
    )
      return;

    window.paypal
      .Buttons({
        style: {
          label: 'pay',
        },
        createOrder: (data, actions) => {
          return actions.order.create({
            purchase_units: [
              {
                reference_id: entryId,
                amount: {
                  value: amount.toFixed(2),
                  currency_code: currency,
                },
              },
            ],
          });
        },
        onApprove: (data, actions) => {
          return actions.order!.capture().then(() => {
            window.location.href = `${base_url}/checkout/entry/${entryId}/paypal/done?orderId=${data.orderID}&status=success`;
          });
        },
        onError: e => {
          window.location.href = `${base_url}/checkout/entry/${entryId}/paypal/done?status=error`;
        },
      })
      .render(paypalElementRef.current)
      .then(() => {
        paypalButtonsRendered.current = true;
      });
  }, [entryId, amount, currency, paypalIsLoaded, base_url]);

  return {
    paypalElementRef,
    stripeIsEnabled: public_key != null && paypalEnabled,
  };
}
