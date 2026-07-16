import { Helmet } from 'react-helmet-async';
import { useParams } from 'react-router';
import SalarySetupEdit from '../../../../sections/salarysetup/SalarySetup-edit';




// ----------------------------------------------------------------------

export default function SalarySetupEditPage() {
  const params = useParams();
  return (
    <>
      <Helmet>
        <title>Salary Setup : Edit</title>
      </Helmet>

      <SalarySetupEdit urlData={params}/>
    </>
  );
}