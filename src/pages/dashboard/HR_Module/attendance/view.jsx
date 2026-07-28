import { Helmet } from 'react-helmet-async';
import AttendanceView from 'src/sections/HR_Attendance/view/attendance-view';

// ----------------------------------------------------------------------

export default function AttendanceViewPage() {
  return (
    <>
      <Helmet>
        <title> HR: Attendance Sheet </title>
      </Helmet>

      <AttendanceView />
    </>
  );
}
