import { Helmet } from 'react-helmet-async';

import FinancialStatementView from 'src/sections/finance/financial-statement-view';

export default function FinanceBalanceSheetPage() {
  return (
    <>
      <Helmet>
        <title> Finance: Balance Sheet</title>
      </Helmet>

      <FinancialStatementView kind="balance-sheet" />
    </>
  );
}
