import { Helmet } from 'react-helmet-async';

import ShiftListView from 'src/sections/HR_Shift/shift-list-view';

export default function ShiftListPage() {
  return (
    <>
      <Helmet>
        <title> Shift: Setup</title>
      </Helmet>

      <ShiftListView />
    </>
  );
}
