<?php namespace Common\Billing\Gateways\Stripe;

use App\Models\FileEntry;
use App\Models\Transaction;
use Common\Billing\Models\Product;
use Common\Billing\Subscription;
use Common\Billing\Gateways\Stripe\Stripe;
use Common\Core\BaseController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class StripeController extends BaseController
{
    public function __construct(
        protected Request $request,
        protected Subscription $subscription,
        protected Stripe $stripe,
    ) {
        $this->middleware('auth');
    }

    public function createPartialSubscription(): Response|JsonResponse
    {
        $data = $this->validate($this->request, [
            'product_id' => 'required|integer|exists:products,id',
            'price_id' => 'integer|exists:prices,id',
            'start_date' => 'string',
        ]);

        $product = Product::findOrFail($data['product_id']);
        $clientSecret = $this->stripe->subscriptions->createPartial(
            $product,
            Auth::user(),
            $data['price_id'] ?? null,
        );

        return $this->success(['clientSecret' => $clientSecret]);
    }

    public function createSetupIntent(): Response|JsonResponse
    {
        $clientSecret = $this->stripe->createSetupIntent(Auth::user());
        return $this->success(['clientSecret' => $clientSecret]);
    }

    public function changeDefaultPaymentMethod(): Response|JsonResponse
    {
        $data = $this->validate($this->request, [
            'payment_method_id' => 'required|string',
        ]);

        $this->stripe->changeDefaultPaymentMethod(
            $this->request->user(),
            $data['payment_method_id'],
        );

        return $this->success();
    }

    public function storeSubscriptionDetailsLocally(): Response|JsonResponse
    {
        $data = $this->validate($this->request, [
            'payment_intent_id' => 'required|string',
        ]);

        $paymentIntent = $this->stripe->client->paymentIntents->retrieve(
            $data['payment_intent_id'],
            ['expand' => ['invoice']],
        );

        $this->stripe->subscriptions->sync(
            $paymentIntent->invoice->subscription,
        );

        return $this->success();
    }

    public function createPaymentIntent(): Response|JsonResponse
    {
        $data = $this->validate($this->request, [
            'amount' => 'required|numeric|min:0.5',
        ]);

        $client_secret = $this->stripe->createPaymentIntent($data['amount'], Auth::user());

        return $this->success([
            'clientSecret' => $client_secret,
        ]);
    }

    public function storePurchaseDetailsLocally(): Response|JsonResponse
    {
        $data = $this->validate($this->request, [
            'payment_intent_id' => 'required|string',
            'entry_id'          => 'required|string|exists:file_entries,id'
        ]);

        $paymentIntent = $this->stripe->client->paymentIntents->retrieve(
            $data['payment_intent_id'],
        );

        if ($paymentIntent->status !== 'succeeded') {
            return $this->error();
        }

        $entry_model = DB::table('file_entry_models')->where([
            'file_entry_id' => $data['entry_id'],
            'model_type'    => 'user',
            'model_id'      => Auth::id(),
        ])->first();

        $file_entry = FileEntry::find($data['entry_id']);

        $txn = [
            'user_id'           => $file_entry->owner_id,
            'payment_processor' => 'stripe',
            'transaction_id'    => $paymentIntent->id,
            'amount'            => $paymentIntent->amount,
            'currency'          => $paymentIntent->currency,
            'status'            => $paymentIntent->status,
        ];

        if( $entry_model && $owner = $file_entry->owner ) {
            $price = $entry_model->price - ( $entry_model->price * settings('drive.share_percentage',0) / 100 );

            $txn['amount'] = $price;
            Transaction::create($txn);

            DB::table('file_entry_models')->where('id',$entry_model->id)->update([
                'paid' => true
            ]);

            $owner->balance += $price;
            $owner->save();
        }

        return $this->success();
    }

    public function connectStripeAccount(): Response|JsonResponse
    {
        $accountLink = $this->stripe->createConnectAccountLink(Auth::user());
        return $this->success(['url' => $accountLink->url]);
    }

    public function resetAccountConnect() : Response|JsonResponse
    {
        $user                    = Auth::user();
        $user->stripe_account_id = null;
        $user->save();

        return $this->success();
    }
}
