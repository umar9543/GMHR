import { Helmet } from 'react-helmet-async';
import GeneralInformationView from 'src/sections/employee/view/general-information-view';

export default function HRGeneralInformationPage() {
  return (
    <>
      <Helmet>
        <title> Dashboard: HR General Information Form</title>
      </Helmet>

      <GeneralInformationView />
    </>
  );
}
