import { Helmet } from 'react-helmet-async';

import BalanceSheetView from 'src/sections/finance/balance-sheet-view';

export default function FinanceBalanceSheetPage() {
  return (
    <>
      <Helmet>
        <title> Finance: Balance Sheet</title>
      </Helmet>

      <BalanceSheetView />
    </>
  );
}
