import { Helmet } from 'react-helmet-async';

import AgingReportView from 'src/sections/finance/aging-report-view';

export default function FinancePayablesAgingPage() {
  return (
    <>
      <Helmet>
        <title> Finance: Payables Aging</title>
      </Helmet>

      <AgingReportView side="payable" />
    </>
  );
}
