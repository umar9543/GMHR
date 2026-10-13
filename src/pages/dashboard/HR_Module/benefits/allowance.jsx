import { Helmet } from 'react-helmet-async';

import { BenefitsDeductionView } from 'src/sections/HR_Benefits/view';

// ----------------------------------------------------------------------

export default function EmployeeAllowancePage() {
  return (
    <>
      <Helmet>
        <title> Employee Allowance | GMS</title>
      </Helmet>

      <BenefitsDeductionView kind="allowances" />
    </>
  );
}
