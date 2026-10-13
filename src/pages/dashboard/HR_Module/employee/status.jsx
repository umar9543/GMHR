import { Helmet } from 'react-helmet-async';

import EmployeeStatusView from 'src/sections/employee/view/employee-status-view';

// ----------------------------------------------------------------------

export default function EmployeeStatusPage() {
  return (
    <>
      <Helmet>
        <title> Employee Status | GMS</title>
      </Helmet>

      <EmployeeStatusView />
    </>
  );
}
