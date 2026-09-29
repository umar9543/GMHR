import { Helmet } from 'react-helmet-async';

import { BenefitsDeductionView } from 'src/sections/HR_Benefits/view';

// ----------------------------------------------------------------------

export default function EmployeeAllowancePage() {
  return (
    <>
      <Helmet>
        <title> Dashboard: Employee Allowance</title>
      </Helmet>

      <BenefitsDeductionView kind="allowances" />
    </>
  );
}
