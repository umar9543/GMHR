import { Helmet } from 'react-helmet-async';

import ParadeStateView from 'src/sections/HR_Attendance/view/parade-state-view';

export default function ParadeStatePage() {
  return (
    <>
      <Helmet>
        <title> Daily Parade State | GMS</title>
      </Helmet>

      <ParadeStateView />
    </>
  );
}
