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
        <title> Dashboard: Edit Salary Sheet</title>
      </Helmet>

      <EmployeeSalaryAddView id={id} />
    </>
  );
}
