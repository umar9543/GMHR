import { Helmet } from 'react-helmet-async';
import { SalaryStatusCreateView } from 'src/sections/salarystatus/view';

export default function SalaryStatusCreatePage() {
  return (
    <>
      <Helmet>
        <title> New Salary Status | GMS</title>
      </Helmet>

      <SalaryStatusCreateView />
    </>
  );
}
