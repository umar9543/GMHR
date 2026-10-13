import { Helmet } from 'react-helmet-async';
import { DeptListView } from 'src/sections/HR_Department/view';



// ----------------------------------------------------------------------

export default function DepartmentListPage() {
  return (
    <>
      <Helmet>
        <title> Departments | GMS</title>
      </Helmet>

      <DeptListView />
    </>
  );
}
