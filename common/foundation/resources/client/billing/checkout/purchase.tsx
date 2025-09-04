import { Navigate, useParams } from 'react-router';
import { Trans } from '@ui/i18n/trans';
import { CheckoutLayout } from './checkout-layout';
import { CheckoutProductSummary } from './checkout-product-summary';
import { StripeElementsForm } from './stripe/stripe-elements-form';
import { Fragment } from 'react';
import { FullPageLoader } from '@ui/progress/full-page-loader';
import { useSettings } from '@ui/settings/use-settings';
import { useFileEntryModel } from '@common/uploads/requests/use-file-entry-model';
import { FormattedCurrency } from '@ui/i18n/formatted-currency';
import { usePaypal } from './paypal/use-paypal';

export function Purchase() {
  const { entryId } = useParams();
  const { paypalElementRef } = usePaypal({
    entry_id: entryId,
    type: 'capture'
  });

  const entryQuery = useFileEntryModel(entryId);

  const {
    base_url,
    billing: { stripe },
  } = useSettings();

  if (entryQuery.isLoading) {
    return <FullPageLoader screen />;
  }

  const entry = entryQuery.data?.fileEntry;

  if (!entry) {
    return <Navigate to='/drive/shares' />;
  }

  const entryModel = entry.users?.length ? entry.users[0] : null;

  if (entryModel?.owns_entry || entryModel?.price === 0) {
    return <Navigate to='/drive/shares' />;
  }

  const humanFileSize = (bytes = 0, decimals = 2) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const value = bytes / Math.pow(k, i);
    return parseFloat(value.toFixed(decimals)) + ' ' + sizes[i];
  }

  return (
    <CheckoutLayout>
      <Fragment>
        <h1 className="mb-40 text-4xl">
          <Trans message="Purchse from original owner" />
        </h1>
        {stripe.enable ? (
          <Fragment>
            <StripeElementsForm
              submitLabel={<Trans message="Purchase Now" />}
              type="paymentIntent"
              returnUrl={`${base_url}/purchase/${entryId}/stripe/done?type=order`}
              amount={entryModel?.price}
            />
            <Separator />
          </Fragment>
        ) : null}
        <div ref={paypalElementRef} />
      </Fragment>
      <div>
        <h1 className="mb-40 text-4xl">
          <Trans message="Summary" />
        </h1>
        <table>
          <tbody>
            <tr>
              <td><Trans message="Filename" /></td>
              <td>:</td>
              <td><strong>{entry?.name}</strong></td>
            </tr>
            <tr>
              <td><Trans message="Filesize" /></td>
              <td>:</td>
              <td><strong>{humanFileSize(entry?.file_size)}</strong></td>
            </tr>
          </tbody>
        </table>
        <div className="flex items-center gap-6 mt-32">
          <div className="font-bold text-4xl">
            <FormattedCurrency value={entryModel?.price || 0} currency='USD' />
          </div>
        </div>
        <div className="mt-32 flex items-center justify-between gap-24 border-t pt-24 font-medium">
          <div><Trans message='Billed Today' /></div>
          <FormattedCurrency value={entryModel?.price || 0} currency='USD' />
        </div>
      </div>
    </CheckoutLayout>
  );
}

function Separator() {
  return (
    <div className="relative my-20 text-center before:absolute before:left-0 before:top-1/2 before:h-1 before:w-full before:-translate-y-1/2 before:bg-divider">
      <span className="relative z-10 bg px-10 text-sm text-muted">
        <Trans message="or" />
      </span>
    </div>
  );
}
