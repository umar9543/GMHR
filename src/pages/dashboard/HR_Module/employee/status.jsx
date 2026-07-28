import { Helmet } from 'react-helmet-async';

import EmployeeStatusView from 'src/sections/employee/view/employee-status-view';

// ----------------------------------------------------------------------

export default function EmployeeStatusPage() {
  return (
    <>
      <Helmet>
        <title> Dashboard: Employee Status</title>
      </Helmet>

      <EmployeeStatusView />
    </>
  );
}
