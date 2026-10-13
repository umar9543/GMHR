import { Helmet } from 'react-helmet-async';

import ClientNewEditView from 'src/sections/HR_Client/client-new-edit-view';

export default function ClientNewPage() {
  return (
    <>
      <Helmet>
        <title> New Client | GMS</title>
      </Helmet>

      <ClientNewEditView />
    </>
  );
}
