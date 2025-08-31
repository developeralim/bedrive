import { StaticPageTitle } from "@common/seo/static-page-title";
import { Navbar } from "@common/ui/navigation/navbar/navbar";
import { Trans } from "@ui/i18n/trans";
import { EarningSummary } from "./earnings-summary";
import { Transactions } from "./transactions";
import { useTransactions } from "./use-earnings";
import { FullPageLoader } from "@ui/progress/full-page-loader";

export function EarningsPage() {

  const {data,isLoading} = useTransactions({perPage:100});

  if( isLoading ) {
    return <FullPageLoader />
  }

  const transactions = data?.pagination.data || [];
  
  return (
    <div className="min-h-screen bg-gray-50">
      <StaticPageTitle>
        <Trans message="My Earnings" />
      </StaticPageTitle>
      <Navbar menuPosition="account-settings-page" />

      <div className="container mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-10">
          <Trans message="My Earnings" />
        </h1>
        <EarningSummary transactions={transactions}/>

        <h1 className="text-3xl font-bold mb-6">
          <Trans message="Transactions" />
        </h1>
        <Transactions transactions={transactions}/>
      </div>
    </div>
  );
}
