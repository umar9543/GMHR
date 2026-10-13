import { Helmet } from 'react-helmet-async';

import EmployeeCardView from 'src/sections/employee/view/employee-card-view';

// ----------------------------------------------------------------------

export default function EmployeeCardPage() {
  return (
    <>
      <Helmet>
        <title> Employee Card | GMS</title>
      </Helmet>

      <EmployeeCardView />
    </>
  );
}
