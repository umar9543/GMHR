import { Helmet } from 'react-helmet-async';

import LedgerReportView from 'src/sections/finance/ledger-report-view';

export default function FinanceLedgerReportPage() {
  return (
    <>
      <Helmet>
        <title> Finance: Account Ledger</title>
      </Helmet>

      <LedgerReportView />
    </>
  );
}
