import { Helmet } from 'react-helmet-async';

import { useParams } from 'src/routes/hooks';

import { BenefitEmployeeView } from 'src/sections/HR_Benefits/view';

// ----------------------------------------------------------------------

export default function EmployeeSalIncHistoryPage() {
  const { employeeId } = useParams();

  return (
    <>
      <Helmet>
        <title> Salary Increment | GMS</title>
      </Helmet>

      <BenefitEmployeeView kind="bonuses" employeeId={employeeId} />
    </>
  );
}
