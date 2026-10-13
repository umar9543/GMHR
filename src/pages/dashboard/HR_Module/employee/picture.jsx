import { Helmet } from 'react-helmet-async';

import EmployeePictureView from 'src/sections/employee/view/employee-picture-view';

// ----------------------------------------------------------------------

export default function EmployeePicturePage() {
  return (
    <>
      <Helmet>
        <title> Employee&apos;s Picture | GMS</title>
      </Helmet>

      <EmployeePictureView />
    </>
  );
}
