import { Helmet } from 'react-helmet-async';
import { HRShiftListView } from '../../../../sections/HR_ShiftRoster/view';



// ----------------------------------------------------------------------

export default function HRShiftRosterListPage() {
  return (
    <>
      <Helmet>
        <title> Monthly Shift Roster: List View</title>
      </Helmet>

      <HRShiftListView />
    </>
  );
}
