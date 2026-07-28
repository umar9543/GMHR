import { Helmet } from 'react-helmet-async';
import PayrollReportView from 'src/sections/HR_EmployeeSalary/view/payroll-report-view';

// ----------------------------------------------------------------------

export default function PayrollReportPage() {
  return (
    <>
      <Helmet>
        <title> Dashboard: Payroll Report</title>
      </Helmet>

      <PayrollReportView />
    </>
  );
}
