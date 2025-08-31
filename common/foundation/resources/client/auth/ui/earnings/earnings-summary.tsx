import { useAuth } from "@common/auth/use-auth";
import { apiClient } from "@common/http/query-client";
import { Button } from "@ui/buttons/button";
import { FormattedCurrency } from "@ui/i18n/formatted-currency";
import { Trans } from "@ui/i18n/trans";
import { toast } from "@ui/toast/toast";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { Transaction } from "./use-earnings";

interface props {
  transactions: Transaction[]
}

export function EarningSummary({ transactions }: props) {

  const [isConnecting, setIsConnecting] = useState(false);
  const [isProcessing, setisProcessing] = useState(false);
  const { user }                        = useAuth();
  const [params]                        = useSearchParams();
  const status                          = params.get('status');

  useEffect(() => {
    if (status == 'refresh') {
      apiClient.post('billing/stripe/reset-account-connect')
        .then(() => {
          window.location.href = '/earnings';
        })
    }
  }, [status]);

  const handleStripeConnect = () => {
    setIsConnecting(true);
    apiClient.post('billing/stripe/connect-account-link')
      .then(({ url }: any) => {
        window.location.href = url;
      })
      .catch(() => {
        setIsConnecting(false);
        toast.danger('Failed to connect with Stripe. Please try again.');
      });
  }

  const handleWithdraw = () => {
    setisProcessing(true);
    apiClient.post('withdraw')
      .then(() => {
        
      })
      .catch(() => {
        toast.danger('Something wrong with your withdraw request');
      })
      .finally(() => {
        setIsConnecting(false);
      });
  }

  const withdrawn = transactions
    .filter(tx => tx.type === 'subtract')
    .reduce((sum, tx) => sum + tx.amount, 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
      <div className="bg-white border rounded-xl shadow-lg p-8 flex flex-col">
        <h2 className="text-xl font-semibold mb-4">
          <Trans message="Current Balance" />
        </h2>
        <p className="text-5xl font-bold text-green-600">
          <FormattedCurrency
            value={user?.balance || 0}
            currency='USD'
          />
        </p>
        <p className="text-gray-500 mt-2">
          <Trans message="Available for withdrawal" />
        </p>

        <div className="mt-auto">
          <Button
            disabled={!user?.stripe_account_id || isProcessing}
            variant={'outline'} color={'primary'}
            className="w-full"
            onClick={(e) => user?.stripe_account_id && handleWithdraw()}
          >
            <Trans message={isProcessing ? 'Processing...' : 'Withdraw balance'} />
          </Button>
        </div>
      </div>

      <div className="bg-white border rounded-xl shadow-lg p-8 flex flex-col items-start">
        <h2 className="text-xl font-semibold mb-4">
          <Trans message="Withdrawn to date" />
        </h2>
        <p className="text-5xl font-bold text-blue-600">
          <FormattedCurrency
            value={withdrawn}
            currency='USD'
          />
        </p>
        <p className="text-gray-500 mt-2">
          <Trans message="Total amount you have withdrawn" />
        </p>
      </div>
      <div className="bg-white border rounded-xl shadow-lg p-8 flex flex-col items-start">
        <h2 className="text-xl font-semibold mb-4">
          <Trans message="Manage Payouts" />
        </h2>

        <Button
          variant={'outline'}
          className="py-2 w-full"
          onClick={(e) => !user?.stripe_account_id && handleStripeConnect()}
          disabled={isConnecting || !!user?.stripe_account_id}
          size={'xl'}
        >
          {user?.stripe_account_id && (<svg viewBox="0 0 640 640" width='20' height='20' fill="green">
            <path d="M320 576C461.4 576 576 461.4 576 320C576 178.6 461.4 64 320 64C178.6 64 64 178.6 64 320C64 461.4 178.6 576 320 576zM404.4 276.7L324.4 404.7C320.2 411.4 313 415.6 305.1 416C297.2 416.4 289.6 412.8 284.9 406.4L236.9 342.4C228.9 331.8 231.1 316.8 241.7 308.8C252.3 300.8 267.3 303 275.3 313.6L302.3 349.6L363.7 251.3C370.7 240.1 385.5 236.6 396.8 243.7C408.1 250.8 411.5 265.5 404.4 276.8z" />
          </svg>)}

          <svg width="120" height="60" fill-rule="evenodd" fill="#6772e5">
            <path d="M101.547 30.94c0-5.885-2.85-10.53-8.3-10.53-5.47 0-8.782 4.644-8.782 10.483 0 6.92 3.908 10.414 9.517 10.414 2.736 0 4.805-.62 6.368-1.494v-4.598c-1.563.782-3.356 1.264-5.632 1.264-2.23 0-4.207-.782-4.46-3.494h11.24c0-.3.046-1.494.046-2.046zM90.2 28.757c0-2.598 1.586-3.678 3.035-3.678 1.402 0 2.897 1.08 2.897 3.678zm-14.597-8.345c-2.253 0-3.7 1.057-4.506 1.793l-.3-1.425H65.73v26.805l5.747-1.218.023-6.506c.828.598 2.046 1.448 4.07 1.448 4.115 0 7.862-3.3 7.862-10.598-.023-6.667-3.816-10.3-7.84-10.3zm-1.38 15.84c-1.356 0-2.16-.483-2.713-1.08l-.023-8.53c.598-.667 1.425-1.126 2.736-1.126 2.092 0 3.54 2.345 3.54 5.356 0 3.08-1.425 5.38-3.54 5.38zm-16.4-17.196l5.77-1.24V13.15l-5.77 1.218zm0 1.747h5.77v20.115h-5.77zm-6.185 1.7l-.368-1.7h-4.966V40.92h5.747V27.286c1.356-1.77 3.655-1.448 4.368-1.195v-5.287c-.736-.276-3.425-.782-4.782 1.7zm-11.494-6.7L34.535 17l-.023 18.414c0 3.402 2.552 5.908 5.954 5.908 1.885 0 3.264-.345 4.023-.76v-4.667c-.736.3-4.368 1.356-4.368-2.046V25.7h4.368v-4.897h-4.37zm-15.54 10.828c0-.897.736-1.24 1.954-1.24a12.85 12.85 0 0 1 5.7 1.47V21.47c-1.908-.76-3.793-1.057-5.7-1.057-4.667 0-7.77 2.437-7.77 6.506 0 6.345 8.736 5.333 8.736 8.07 0 1.057-.92 1.402-2.207 1.402-1.908 0-4.345-.782-6.276-1.84v5.47c2.138.92 4.3 1.3 6.276 1.3 4.782 0 8.07-2.368 8.07-6.483-.023-6.85-8.782-5.632-8.782-8.207z" />
          </svg>
          {user?.stripe_account_id ? <Trans message="Connected" /> : <Trans message={isConnecting ? 'Connecting...' : 'Connect with Stripe'} />}
        </Button>
      </div>
    </div>
  );
}
