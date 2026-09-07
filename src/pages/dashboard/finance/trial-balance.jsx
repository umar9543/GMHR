import { Helmet } from 'react-helmet-async';

import TrialBalanceView from 'src/sections/finance/trial-balance-view';

export default function FinanceTrialBalancePage() {
  return (
    <>
      <Helmet>
        <title> Finance: Trial Balance</title>
      </Helmet>

      <TrialBalanceView />
    </>
  );
}
