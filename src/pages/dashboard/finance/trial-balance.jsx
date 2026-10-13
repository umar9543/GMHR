import { Helmet } from 'react-helmet-async';

import LegacyTrialBalanceView from 'src/sections/finance/legacy-trial-balance-view';

export default function FinanceTrialBalancePage() {
  return (
    <>
      <Helmet>
        <title> Finance: Trial Balance</title>
      </Helmet>

      <LegacyTrialBalanceView />
    </>
  );
}
