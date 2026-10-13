import { Helmet } from 'react-helmet-async';
import { useParams } from 'src/routes/hooks';
import { SalaryStatusEditView } from 'src/sections/salarystatus/view';

export default function SalaryStatusEditPage() {
  const params = useParams();
  const { id } = params;

  return (
    <>
      <Helmet>
        <title> Edit Salary Status | GMS</title>
      </Helmet>

      <SalaryStatusEditView id={`${id}`} />
    </>
  );
}
