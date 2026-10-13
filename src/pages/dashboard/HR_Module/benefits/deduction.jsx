import { Helmet } from 'react-helmet-async';

import { BenefitsDeductionView } from 'src/sections/HR_Benefits/view';

// ----------------------------------------------------------------------

export default function EmployeeDeductionPage() {
  return (
    <>
      <Helmet>
        <title> Employee Deduction | GMS</title>
      </Helmet>

      <BenefitsDeductionView kind="deductions" />
    </>
  );
}
