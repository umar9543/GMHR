import { Helmet } from 'react-helmet-async';

import BlackListView from 'src/sections/employee/view/blacklist-view';

// ----------------------------------------------------------------------

export default function BlackListPage() {
  return (
    <>
      <Helmet>
        <title> Black List | GMS</title>
      </Helmet>

      <BlackListView />
    </>
  );
}
