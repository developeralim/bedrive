<?php namespace Common\Billing\Gateways\Paypal;

use App\Models\FileEntry;
use App\Models\Transaction;
use App\Models\User;
use Common\Billing\Gateways\Contracts\CommonSubscriptionGatewayActions;
use Common\Billing\Gateways\Paypal\PaypalPlans;
use Common\Billing\Gateways\Paypal\PaypalSubscriptions;
use Common\Billing\Models\Price;
use Common\Billing\Models\Product;
use Common\Billing\Subscription;
use Common\Billing\Gateways\Paypal\InteractsWithPaypalRestApi;
use Common\Settings\Settings;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class Paypal implements CommonSubscriptionGatewayActions
{
    use InteractsWithPaypalRestApi;

    public function __construct(
        protected Settings $settings,
        protected PaypalPlans $plans,
        public PaypalSubscriptions $subscriptions,
    ) {
    }

    public function isSubscriptionIncomplete(Subscription $subscription): bool
    {
        return $this->subscriptions->isIncomplete($subscription);
    }

    public function isSubscriptionPastDue(Subscription $subscription): bool
    {
        return $this->subscriptions->isPastDue($subscription);
    }

    public function isEnabled(): bool
    {
        return (bool) app(Settings::class)->get('billing.paypal.enable');
    }

    public function syncPlan(Product $product): bool
    {
        return $this->plans->sync($product);
    }

    public function deletePlan(Product $product): bool
    {
        return $this->plans->delete($product);
    }

    public function changePlan(
        Subscription $subscription,
        Product $newProduct,
        Price $newPrice,
    ): bool {
        return $this->subscriptions->changePlan(
            $subscription,
            $newProduct,
            $newPrice,
        );
    }

    public function cancelSubscription(
        Subscription $subscription,
        bool $atPeriodEnd = true,
    ): bool {
        return $this->subscriptions->cancel($subscription, $atPeriodEnd);
    }

    public function resumeSubscription(
        Subscription $subscription,
        array $gatewayParams = [],
    ): bool {
        return $this->subscriptions->resume($subscription, $gatewayParams);
    }

    public function storePurchaseDetails(string $orderId,User $user,int $entryId )
    {
        $response = $this->paypal()->get("checkout/orders/$orderId");

        if ($response->status() !== 200) {
            throw new \Exception('Could not retrieve PayPal order details.');
        }

        $order = $response->json();

        if ($order['status'] !== 'COMPLETED') {
            throw new \Exception('PayPal order is not completed.');
        }

        $entry_model = DB::table('file_entry_models')->where([
            'file_entry_id' => $entryId,
            'model_type'    => 'user',
            'model_id'      => Auth::id(),
        ])->first();

        $file_entry = FileEntry::find($entryId);

        $txn = [
            'user_id'           => $file_entry->owner_id,
            'payment_processor' => 'paypal',
            'transaction_id'    => $orderId,
            'amount'            => $order['purchase_units'][0]['amount']['value'],
            'currency'          => $order['purchase_units'][0]['amount']['currency_code'],
            'status'            => $order['status'],
        ];

        if( $entry_model && $owner = $file_entry->owner ) {
            $price = $entry_model->price - ( $entry_model->price * settings('drive.share_percentage',0) / 100 );
            $txn['amount'] = $price;

            Transaction::create($txn);

            $entry_model->update(['paid' => true]);
            $owner->balance += $price;
            $owner->save();
        }
    }
}
