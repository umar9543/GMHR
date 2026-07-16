import { Helmet } from 'react-helmet-async';
import { DeptListView } from 'src/sections/HR_Department/view';



// ----------------------------------------------------------------------

export default function DepartmentListPage() {
  return (
    <>
      <Helmet>
        <title> Department: List View</title>
      </Helmet>

      <DeptListView />
    </>
  );
}
