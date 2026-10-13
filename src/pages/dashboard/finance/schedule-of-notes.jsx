import { Helmet } from 'react-helmet-async';

import FinancialStatementView from 'src/sections/finance/financial-statement-view';

export default function FinanceNotesPage() {
  return (
    <>
      <Helmet>
        <title> Finance: Schedule of Notes</title>
      </Helmet>

      <FinancialStatementView kind="notes" />
    </>
  );
}
