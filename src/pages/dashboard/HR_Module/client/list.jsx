import { Helmet } from 'react-helmet-async';

import ClientListView from 'src/sections/HR_Client/client-list-view';

export default function ClientListPage() {
  return (
    <>
      <Helmet>
        <title> Clients | GMS</title>
      </Helmet>

      <ClientListView />
    </>
  );
}
