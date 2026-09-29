import { Helmet } from 'react-helmet-async';

import { BenefitsDeductionView } from 'src/sections/HR_Benefits/view';

// ----------------------------------------------------------------------

export default function EmployeeDeductionPage() {
  return (
    <>
      <Helmet>
        <title> Dashboard: Employee Deduction</title>
      </Helmet>

      <BenefitsDeductionView kind="deductions" />
    </>
  );
}
