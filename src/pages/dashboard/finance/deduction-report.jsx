import { Helmet } from 'react-helmet-async';

import DeductionReportView from 'src/sections/finance/deduction-report-view';

export default function FinanceDeductionReportPage() {
  return (
    <>
      <Helmet>
        <title> Finance: Deduction Report</title>
      </Helmet>

      <DeductionReportView />
    </>
  );
}
