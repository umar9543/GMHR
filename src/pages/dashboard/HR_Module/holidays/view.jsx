import { Helmet } from 'react-helmet-async';

import { HolidayListView } from '../../../../sections/HR_Holidays/view';



// ----------------------------------------------------------------------

export default function HolidayListPage() {
  return (
    <>
      <Helmet>
        <title> Holidays | GMS</title>
      </Helmet>

      <HolidayListView />
    </>
  );
}
