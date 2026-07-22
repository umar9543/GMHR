import { Helmet } from 'react-helmet-async';

import EmployeeListView from 'src/sections/employee/view/employee-list-view';

// ----------------------------------------------------------------------

export default function EmployeeListPage() {
  return (
    <>
      <Helmet>
        <title> Dashboard: General Info List</title>
      </Helmet>

      <EmployeeListView />
    </>
  );
}
