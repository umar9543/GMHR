import { Helmet } from 'react-helmet-async';

import ParadeStateMonthlyView from 'src/sections/HR_Attendance/view/parade-state-monthly-view';

export default function ParadeStateMonthlyPage() {
  return (
    <>
      <Helmet>
        <title> Monthly Parade State | GMS</title>
      </Helmet>

      <ParadeStateMonthlyView />
    </>
  );
}
