import { Helmet } from 'react-helmet-async';

import { useParams } from 'src/routes/hooks';
import ClientNewEditView from 'src/sections/HR_Client/client-new-edit-view';

export default function ClientEditPage() {
  const { id } = useParams();

  return (
    <>
      <Helmet>
        <title> HR: Edit Client</title>
      </Helmet>

      <ClientNewEditView id={id} />
    </>
  );
}
