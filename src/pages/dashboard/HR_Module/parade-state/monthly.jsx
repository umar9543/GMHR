import { Helmet } from 'react-helmet-async';

import ParadeStateMonthlyView from 'src/sections/HR_Attendance/view/parade-state-monthly-view';

export default function ParadeStateMonthlyPage() {
  return (
    <>
      <Helmet>
        <title> Attendance: Monthly Parade State</title>
      </Helmet>

      <ParadeStateMonthlyView />
    </>
  );
}
