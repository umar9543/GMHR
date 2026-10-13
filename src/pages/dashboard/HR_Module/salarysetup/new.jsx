import { Helmet } from 'react-helmet-async';
import SalarySetupAddView from '../../../../sections/salarysetup/view/SalarySetup-add-view';




// ----------------------------------------------------------------------

export default function SalarySetupAddPage() {
  return (
    <>
      <Helmet>
        <title> New Salary Setup | GMS</title>
      </Helmet>

      <SalarySetupAddView />
    </>
  );
}
