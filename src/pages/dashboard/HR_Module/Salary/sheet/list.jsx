import { Helmet } from 'react-helmet-async';
import { EmployeeSalaryListView } from 'src/sections/HR_EmployeeSalary/view';

// ----------------------------------------------------------------------

export default function EmployeeSalaryListPage() {
  return (
    <>
      <Helmet>
        <title> Dashboard: Salary Sheets</title>
      </Helmet>

      <EmployeeSalaryListView />
    </>
  );
}
