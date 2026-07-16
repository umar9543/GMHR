import { Helmet } from 'react-helmet-async';

import BlankView from 'src/sections/blank/view';

// ----------------------------------------------------------------------

export default function BlankPage() {
  return (
    <>
      <Helmet>
        <title>Blank</title>
      </Helmet>

      <BlankView />
    </>
  );
}
