<?php

namespace Common\Billing;

use App\Models\Transaction;
use Common\Core\BaseController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Stripe\StripeClient;
use Illuminate\Support\Str;

class WithdrawController extends BaseController
{
    public StripeClient $client;

    public function __construct()
    {
        $this->client = new StripeClient([
            'api_key'           => config('services.stripe.secret'),
            'stripe_version'    => '2022-08-01',
        ]);
    }

    public function withdraw( Request $request )
    {
        $user = Auth::user();
        $txn  = Str::uuid();

        $transfer = $this->client->transfers->create([
            'amount'         => ($user->balance * 100),
            'currency'       => 'usd',
            'destination'    => $user->stripe_account_id,
            'transfer_group' => $txn
        ]);

        if ($transfer && $transfer->id) {
            $transaction =  Transaction::create([
                'user_id'           => $user->id,
                'payment_processor' => 'stripe',
                'transaction_id'    => $transfer->id,
                'amount'            => $transfer->amount/100,
                'currency'          => $transfer->currency,
                'status'            => 'success',
            ]);

            $user->balance -= $transaction->amount;
            $user->save();

            return response()->json(['success' => true]);
        } else {
            return response()->json(['success' => false],400);
        }
    }
}
