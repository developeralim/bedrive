<?php

namespace Common\Billing;

use App\Models\Transaction;
use Common\Core\BaseController;
use Common\Database\Datasource\Datasource;

class TransactionController extends BaseController
{
    public function index()
    {
        // $this->authorize('index', Transaction::class);

        $builder = Transaction::query();

        $dataSource = new Datasource($builder, request()->all());

        $pagination = $dataSource->paginate();

        return $this->success(['pagination' => $pagination]);
    }
}
