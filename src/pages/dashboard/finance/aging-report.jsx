import { Helmet } from 'react-helmet-async';

import AgingReportView from 'src/sections/finance/aging-report-view';

export default function FinanceAgingReportPage() {
  return (
    <>
      <Helmet>
        <title> Finance: Receivables Aging</title>
      </Helmet>

      <AgingReportView />
    </>
  );
}
