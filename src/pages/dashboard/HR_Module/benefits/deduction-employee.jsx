import { Helmet } from 'react-helmet-async';

import { useParams } from 'src/routes/hooks';

import { BenefitEmployeeView } from 'src/sections/HR_Benefits/view';

// ----------------------------------------------------------------------

export default function EmployeeDeductionHistoryPage() {
  const { employeeId } = useParams();

  return (
    <>
      <Helmet>
        <title> Employee Deduction | GMS</title>
      </Helmet>

      <BenefitEmployeeView kind="deductions" employeeId={employeeId} />
    </>
  );
}
