import { Helmet } from 'react-helmet-async';

import { BenefitsDeductionView } from 'src/sections/HR_Benefits/view';

// ----------------------------------------------------------------------

export default function EmployeeSalIncPage() {
  return (
    <>
      <Helmet>
        <title> Salary Increment | GMS</title>
      </Helmet>

      <BenefitsDeductionView kind="bonuses" />
    </>
  );
}
