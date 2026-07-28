import { Helmet } from 'react-helmet-async';

import { EmployeeSalaryAddView } from 'src/sections/HR_EmployeeSalary/view';

// ----------------------------------------------------------------------

export default function EmployeeSalaryCreatePage() {
  return (
    <>
      <Helmet>
        <title> Dashboard: Create Salary Sheet</title>
      </Helmet>

      <EmployeeSalaryAddView />
    </>
  );
}
