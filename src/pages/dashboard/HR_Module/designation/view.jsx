import { Helmet } from 'react-helmet-async';
// import { CountryListView } from 'src/sections/country/view';
import { DesignationListView } from 'src/sections/HR_Designation/view';



// ----------------------------------------------------------------------

export default function CountryListPage() {
  return (
    <>
      <Helmet>
        <title> Designation: List View</title>
      </Helmet>

      <DesignationListView />
    </>
  );
}
