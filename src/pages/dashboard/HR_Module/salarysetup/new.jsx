import { Helmet } from 'react-helmet-async';
import SalarySetupAddView from '../../../../sections/salarysetup/view/SalarySetup-add-view';




// ----------------------------------------------------------------------

export default function SalarySetupAddPage() {
  return (
    <>
      <Helmet>
        <title>Salary Setup : Add</title>
      </Helmet>

      <SalarySetupAddView />
    </>
  );
}
