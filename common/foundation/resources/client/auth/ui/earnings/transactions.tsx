import { FormattedCurrency } from "@ui/i18n/formatted-currency";
import { Transaction } from "./use-earnings";

interface Props {
  transactions: Transaction[]
}

export function Transactions({ transactions }: Props) {

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);

    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }


  return (
    <div className="space-y-4">
      {transactions.map((txn) => (
        <div
          key={txn.id}
          className="bg-white border rounded-xl shadow-md p-6 flex justify-between items-center hover:shadow-lg transition"
        >
          <div>
            <p className="text-sm text-gray-500">{formatDate(txn.created_at)}</p>
            <p className="text-lg font-semibold text-gray-800">
              {txn.payment_processor}
            </p>
            <p className="text-xs text-gray-400">ID: {txn.id}</p>
          </div>

          <div className="text-right">
            <p
              className={`text-xl font-bold ${txn.type == 'add'
                ? "text-green-600"
                : "text-red-600"
                }`}
            >
              <FormattedCurrency currency="USD" value={txn.amount} />
            </p>
            <span
              className={`inline-block mt-2 px-3 py-1 text-xs rounded-full font-semibold ${txn.status === "completed"
                ? "bg-green-100 text-green-600"
                : txn.status === "Withdrawn"
                  ? "bg-blue-100 text-blue-600"
                  : "bg-gray-100 text-gray-600"
                }`}
            >
              {txn.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
