import { Helmet } from 'react-helmet-async';

import { useParams } from 'src/routes/hooks';

import { BenefitEmployeeView } from 'src/sections/HR_Benefits/view';

// ----------------------------------------------------------------------

export default function EmployeeAllowanceHistoryPage() {
  const { employeeId } = useParams();

  return (
    <>
      <Helmet>
        <title> Dashboard: Employee Allowance</title>
      </Helmet>

      <BenefitEmployeeView kind="allowances" employeeId={employeeId} />
    </>
  );
}
