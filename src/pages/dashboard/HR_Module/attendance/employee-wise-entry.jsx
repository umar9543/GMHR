import { Helmet } from 'react-helmet-async';
import EmployeeWiseEntryView from 'src/sections/HR_Attendance/view/employee-wise-entry-view';

// ----------------------------------------------------------------------

export default function EmployeeWiseEntryPage() {
  return (
    <>
      <Helmet>
        <title> Employee Wise Entry | GMS</title>
      </Helmet>

      <EmployeeWiseEntryView />
    </>
  );
}
