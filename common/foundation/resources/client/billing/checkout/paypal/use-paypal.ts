import { useEffect, useRef, useState } from 'react';
import { loadScript } from '@paypal/paypal-js';
import { useProducts } from '@common/billing/pricing-table/use-products';
import { useSettings } from '@ui/settings/use-settings';

interface UsePaypalProps {
  type         : 'subscription' | 'capture';
  productId   ?: string;
  priceId     ?: string;
  entry_id    ?: string;
  entry_price ?: string;
}

export function usePaypal({ productId, priceId, type, entry_id, entry_price }: UsePaypalProps) {
  const { data } = useProducts();
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
      intent: type,
      vault: true,
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
      !data?.products.length ||
      !productId ||
      !priceId ||
      paypalButtonsRendered.current
    )
      return;

    const product = data.products.find(p => p.id === parseInt(productId));
    const price = product?.prices.find(p => p.id === parseInt(priceId));

    let buttons;

    if (type === 'subscription') {
      buttons = window.paypal
        .Buttons({
          style: {
            label: 'pay',
          },
          createSubscription: (data, actions) => {
            return actions.subscription.create({
              application_context: {
                shipping_preference: 'NO_SHIPPING',
              },
              plan_id: price?.paypal_id!,
            });
          },
          onApprove: (data, actions) => {
            actions.redirect(
              `${base_url}/checkout/${productId}/${priceId}/paypal/done?subscriptionId=${data.subscriptionID}&status=success`
            );
            return Promise.resolve();
          },
          onError: e => {
            location.href = `${base_url}/checkout/${productId}/${priceId}/paypal/done?status=error`;
          },
        });
    } else {
      buttons = window.paypal.Buttons({
        style: { label: 'pay' },
        createOrder: (data, actions) => {
          return actions.order.create({
            purchase_units: [
              {
                amount: {
                  value: entry_price ?? '0.00',
                  currency_code: 'USD',
                },
              },
            ],
            application_context: { shipping_preference: 'NO_SHIPPING' },
          });
        },
        onApprove: async (data, actions) => {
          if (!actions.order) return;
          const order = await actions.order.capture();
          location.href = `${base_url}/purchase/${entry_id}/paypal/done?orderId=${order.id}&status=success`;
        },
        onError: () => {
          location.href = `${base_url}/purchase/${entry_id}/paypal/done?status=error`;
        },
      });
    }

    buttons.render(paypalElementRef.current).then(() => {
      paypalButtonsRendered.current = true;
    });

  }, [productId, priceId, data, paypalIsLoaded, base_url]);

  return {
    paypalElementRef,
    stripeIsEnabled: public_key != null && paypalEnabled,
  };
}
