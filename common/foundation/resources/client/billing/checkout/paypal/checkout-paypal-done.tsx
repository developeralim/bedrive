import { CheckoutLayout } from '../checkout-layout';
import { useParams, useSearchParams } from 'react-router';
import { useEffect, useRef, useState } from 'react';
import { message } from '@ui/i18n/message';
import { CheckoutProductSummary } from '../checkout-product-summary';
import {
  BillingRedirectMessage,
  BillingRedirectMessageConfig,
} from '../../billing-redirect-message';
import { apiClient } from '@common/http/query-client';

export function CheckoutPaypalDone() {
  const { productId, priceId,entry_id:entryId } = useParams();
  const [params] = useSearchParams();
  const alreadyStoredLocally = useRef(false);

  const [messageConfig, setMessageConfig] =
    useState<BillingRedirectMessageConfig>();

  useEffect(() => {
    const subscriptionId = params.get('subscriptionId');
    const orderId        = params.get('orderId');
    const status         = params.get('status');

    if (alreadyStoredLocally.current) {
      return;
    }

    if (subscriptionId && status === 'success') {
      storeSubscriptionDetailsLocally(subscriptionId).then(() => {
        setMessageConfig(
          getRedirectMessageConfig('success', productId, priceId),
        );
        window.location.href = '/billing';
      });
    } else if(orderId && status === 'success' && entryId){
      storePurchaseDetailsLocally(orderId).then(() => {
        setMessageConfig(
          getRedirectMessageConfig('purchase_success', entryId),
        );
        window.location.href = 'drive/shares';
      });
    } else {
      setMessageConfig(getRedirectMessageConfig(status, productId, priceId));
    }
    alreadyStoredLocally.current = true;
  }, [priceId, productId, params,entryId]);

  return (
    <CheckoutLayout>
      <BillingRedirectMessage config={messageConfig} />
      <CheckoutProductSummary showBillingLine={false} />
    </CheckoutLayout>
  );
}

function getRedirectMessageConfig(
  status?: 'success' | 'error' | string | null,
  productId?: string,
  priceId?: string,
  entryId?: string
): BillingRedirectMessageConfig {
  switch (status) {
    case 'success':
      return {
        message: message('Subscription successful!'),
        status: 'success',
        buttonLabel: message('Return to site'),
        link: '/billing',
      };
    case 'purchase_success':
      return {
        message: message('Purchase successful!'),
        status: 'success',
        buttonLabel: message('Return to site'),
        link: 'drive/shares',
      };
    default:
      return {
        message: message('Something went wrong. Please try again.'),
        status: 'error',
        buttonLabel: message('Go back'),
        link: errorLink(productId, priceId),
      };
  }
}

function errorLink(productId?: string, priceId?: string): string {
  return productId && priceId ? `/checkout/${productId}/${priceId}` : '/';
}

function storeSubscriptionDetailsLocally(subscriptionId: string) {
  return apiClient.post('billing/paypal/store-subscription-details-locally', {
    paypal_subscription_id: subscriptionId,
  });
}

function storePurchaseDetailsLocally(orderId: string,entryId?: string) {
  return apiClient.post('billing/paypal/store-purchase-details-locally', {
    paypal_order_id : orderId,
    entry_id        : entryId
  });
}
