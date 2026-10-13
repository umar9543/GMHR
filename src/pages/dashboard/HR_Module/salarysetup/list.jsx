import { Helmet } from 'react-helmet-async';
import SalarySetupListView from '../../../../sections/salarysetup/view/SalarySetup-main-view';



// ----------------------------------------------------------------------

export default function SalarySetupListPage() {
  return (
    <>
      <Helmet>
        <title> Salary Setup | GMS</title>
      </Helmet>

      <SalarySetupListView />
    </>
  );
}
