import {CheckoutLayout} from '../checkout-layout';
import {useParams, useSearchParams} from 'react-router';
import {loadStripe, PaymentIntent} from '@stripe/stripe-js';
import {useEffect, useRef, useState} from 'react';
import {message} from '@ui/i18n/message';
import {CheckoutProductSummary} from '../checkout-product-summary';
import {
  BillingRedirectMessage,
  BillingRedirectMessageConfig,
} from '../../billing-redirect-message';
import {useNavigate} from '@common/ui/navigation/use-navigate';
import {apiClient} from '@common/http/query-client';
import {useSettings} from '@ui/settings/use-settings';

export function CheckoutStripeDone() {
  const {productId, priceId,type,entryId} = useParams();
  const navigate = useNavigate();
  const {
    billing: {stripe_public_key},
  } = useSettings();

  const [params] = useSearchParams();
  const clientSecret = params.get('payment_intent_client_secret');

  const [messageConfig, setMessageConfig] =
    useState<BillingRedirectMessageConfig>();

  const stripeInitiated = useRef<boolean>();

  useEffect(() => {
    if (stripeInitiated.current) return;
    loadStripe(stripe_public_key!).then(async stripe => {
      if (!stripe || !clientSecret) {
        setMessageConfig(getRedirectMessageConfig());
        return;
      }

      const payment = stripe.retrievePaymentIntent(clientSecret)
      if( type === 'subscription'){
        payment.then(async ({paymentIntent}) => {
          if (paymentIntent?.status === 'succeeded') {
            await storeSubscriptionDetailsLocally(paymentIntent.id);
            setMessageConfig(
              getRedirectMessageConfig('succeeded', productId, priceId),
            );
            window.location.href = '/billing';
          } else {
            setMessageConfig(
              getRedirectMessageConfig(
                paymentIntent?.status,
                productId,
                priceId,
              ),
            );
          }
        });
      }

      if( type === 'order'){
        payment.then(async ({paymentIntent}) => {
          if (paymentIntent?.status === 'succeeded') {
            await storePurchaseDetailsLocally(paymentIntent.id,entryId);
            setMessageConfig(
              getRedirectMessageConfig('purchased_succeeded', entryId),
            );
            window.location.href = '/billing';
          } else {
            setMessageConfig(
              getRedirectMessageConfig(
                paymentIntent?.status,
                entryId
              ),
            );
          }
        });
      }
    });
    stripeInitiated.current = true;
  }, [stripe_public_key, clientSecret, priceId, productId,entryId,type]);

  if (!clientSecret) {
    navigate('/');
    return null;
  }

  return (
    <CheckoutLayout>
      <BillingRedirectMessage config={messageConfig} />
      <CheckoutProductSummary showBillingLine={false} />
    </CheckoutLayout>
  );
}

function getRedirectMessageConfig(
  status?: PaymentIntent.Status,
  productId?: string,
  priceId?: string,
  entryId?: string,
): BillingRedirectMessageConfig {
  switch (status) {
    case 'succeeded':
      return {
        message: message('Subscription successful!'),
        status: 'success',
        buttonLabel: message('Return to site'),
        link: entryId ? '/drive/shares' : '/billing',
      };
    case 'processing':
      return {
        message: message(
          "Payment processing. We'll update you when payment is received.",
        ),
        status: 'success',
        buttonLabel: message('Return to site'),
        link: entryId ? '/drive/shares' : '/billing',
      };
    case 'requires_payment_method':
      return {
        message: message('Payment failed. Please try another payment method.'),
        status: 'error',
        buttonLabel: message('Go back'),
        link: entryId ? purchaseErrorLink(entryId) : errorLink(productId, priceId),
      };
    case 'purchased_succeeded':
      return {
        message: message('Payment failed. Please try another payment method.'),
        status: 'error',
        buttonLabel: message('Go back'),
        link: purchaseErrorLink(entryId),
      };
    default:
      return {
        message: message('Something went wrong'),
        status: 'error',
        buttonLabel: message('Go back'),
        link: entryId ? purchaseErrorLink(entryId) : errorLink(productId, priceId),
      };
  }
}

function purchaseErrorLink(entryId?: string): string {
  return entryId ? `/purchase/${entryId}` : '/';
}

function errorLink(productId?: string, priceId?: string): string {
  return productId && priceId ? `/checkout/${productId}/${priceId}` : '/';
}

function storeSubscriptionDetailsLocally(paymentIntentId: string) {
  return apiClient.post('billing/stripe/store-subscription-details-locally', {
    payment_intent_id: paymentIntentId,
  });
}

function storePurchaseDetailsLocally(paymentIntentId: string,entryId?: string) {
  return apiClient.post('billing/stripe/store-purchase-details-locally', {
    payment_intent_id: paymentIntentId,
    entry_id: entryId
  });
}
