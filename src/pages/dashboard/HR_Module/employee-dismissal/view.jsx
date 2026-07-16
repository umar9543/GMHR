import { Helmet } from 'react-helmet-async';
import { DismissalListView } from '../../../../sections/Hr_Employee_Dismissal/view';


// import { ProfileListView } from 'src/sections/profile/view';

// ----------------------------------------------------------------------

export default function ProfileListPage() {
  return (
    <>
      <Helmet>
        <title> Employee Dismissal : List View</title>
      </Helmet>

      <DismissalListView />
    </>
  );
}
