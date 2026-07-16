import { Helmet } from 'react-helmet-async';
import { useParams } from 'react-router';
import { DismissalEditView } from '../../../../sections/Hr_Employee_Dismissal/view';



// import { AccountView } from 'src/sections/profile/view';


// ----------------------------------------------------------------------

export default function AccountPage() {
  const params = useParams();
  return (
    <>
      <Helmet>
        <title>Employee Dismissal : Edit</title>
      </Helmet>

      <DismissalEditView urlData={params}/>
    </>
  );
}