import { Helmet } from 'react-helmet-async';
import MonthWiseReportView from 'src/sections/HR_Attendance/view/month-wise-report-view';

// ----------------------------------------------------------------------

export default function MonthWiseReportPage() {
  return (
    <>
      <Helmet>
        <title> Dashboard: Month-Wise Report</title>
      </Helmet>

      <MonthWiseReportView />
    </>
  );
}
