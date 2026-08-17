import { Helmet } from 'react-helmet-async';

import { LocationListView } from 'src/sections/location/view';

export default function LocationListPage() {
  return (
    <>
      <Helmet>
        <title> Location: List View</title>
      </Helmet>

      <LocationListView />
    </>
  );
}
