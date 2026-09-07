import { Helmet } from 'react-helmet-async';

import ParadeStateView from 'src/sections/HR_Attendance/view/parade-state-view';

export default function ParadeStatePage() {
  return (
    <>
      <Helmet>
        <title> Attendance: Daily Parade State</title>
      </Helmet>

      <ParadeStateView />
    </>
  );
}
