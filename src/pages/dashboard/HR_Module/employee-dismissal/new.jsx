import { Helmet } from 'react-helmet-async';
import { DismissalAddView } from '../../../../sections/Hr_Employee_Dismissal/view';



// import { AccountAddView } from 'src/sections/profile/view';


// ----------------------------------------------------------------------

export default function AccountPage() {
  return (
    <>
      <Helmet>
        <title>Employee Dismissal : Add</title>
      </Helmet>

      <DismissalAddView />
    </>
  );
}
