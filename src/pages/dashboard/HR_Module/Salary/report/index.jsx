import { Helmet } from 'react-helmet-async';

import SalaryReportView from 'src/sections/HR_EmployeeSalary/view/salary-report-view';

// ----------------------------------------------------------------------

export default function SalaryReportPage() {
  return (
    <>
      <Helmet>
        <title> Dashboard: Salary Report</title>
      </Helmet>

      <SalaryReportView />
    </>
  );
}
