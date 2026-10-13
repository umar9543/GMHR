import { Helmet } from 'react-helmet-async';
import AttendanceView from 'src/sections/HR_Attendance/view/attendance-view';

// ----------------------------------------------------------------------

export default function AttendanceViewPage() {
  return (
    <>
      <Helmet>
        <title> Daily Parade State | GMS</title>
      </Helmet>

      <AttendanceView />
    </>
  );
}
