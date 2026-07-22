import { Helmet } from 'react-helmet-async';
import { SalaryStatusListView } from 'src/sections/salarystatus/view';

export default function SalaryStatusListPage() {
  return (
    <>
      <Helmet>
        <title> Dashboard: Salary Status List</title>
      </Helmet>

      <SalaryStatusListView />
    </>
  );
}
