import { Helmet } from 'react-helmet-async';

import FinancialStatementView from 'src/sections/finance/financial-statement-view';

export default function FinanceProfitLossPage() {
  return (
    <>
      <Helmet>
        <title> Finance: Profit & Loss</title>
      </Helmet>

      <FinancialStatementView kind="profit-loss" />
    </>
  );
}
