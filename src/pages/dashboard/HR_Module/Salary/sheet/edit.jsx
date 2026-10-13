import { Helmet } from 'react-helmet-async';
import { useParams } from 'react-router-dom';
import { EmployeeSalaryAddView } from 'src/sections/HR_EmployeeSalary/view';

// ----------------------------------------------------------------------

export default function EmployeeSalaryEditPage() {
  const params = useParams();
  const { id } = params;

  return (
    <>
      <Helmet>
        <title> Edit Salary Sheet | GMS</title>
      </Helmet>

      <EmployeeSalaryAddView id={id} />
    </>
  );
}
