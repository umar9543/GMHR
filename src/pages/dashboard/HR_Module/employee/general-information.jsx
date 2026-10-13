import { Helmet } from 'react-helmet-async';
import GeneralInformationView from 'src/sections/employee/view/general-information-view';

export default function HRGeneralInformationPage() {
  return (
    <>
      <Helmet>
        <title> Add Employee | GMS</title>
      </Helmet>

      <GeneralInformationView />
    </>
  );
}
