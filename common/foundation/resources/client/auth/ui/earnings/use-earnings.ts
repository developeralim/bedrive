import {keepPreviousData, useQuery} from '@tanstack/react-query';
import {apiClient} from '@common/http/query-client';
import {PaginationResponse} from '@common/http/backend-response/pagination-response';
import {BackendResponse} from '@common/http/backend-response/backend-response';

export interface Transaction {
  id : number;
  amount : number;
  currency : string;
  file_entry_id : number;
  model_id : number;
  payment_processor : string;
  status : string;
  transaction_id : string;
  type : 'add' | 'subtract';
  created_at : string;
  updated_at : string;
}

interface Response extends BackendResponse {
  pagination: PaginationResponse<Transaction>;
}

interface Params {
  perPage?: number;
}

export function useTransactions(params: Params) {
  return useQuery({
    queryKey: ['transactions', params],
    queryFn: () => fetchTransactions(params),
    placeholderData: keepPreviousData,
  });
}

async function fetchTransactions(params: Params) {
  return apiClient
    .get<Response>(`transactions`, {
      params: {paginate: 'simple', ...params},
    })
    .then(response => response.data);
}
