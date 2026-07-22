import { Helmet } from 'react-helmet-async';
import { SalaryStatusCreateView } from 'src/sections/salarystatus/view';

export default function SalaryStatusCreatePage() {
  return (
    <>
      <Helmet>
        <title> Dashboard: Create a new Salary Status</title>
      </Helmet>

      <SalaryStatusCreateView />
    </>
  );
}
