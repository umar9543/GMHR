import { Helmet } from 'react-helmet-async';

import FinancePartyEditView from 'src/sections/finance/party-edit-view';

export default function FinancePartyNewPage() {
  return (
    <>
      <Helmet>
        <title> Finance: New Party</title>
      </Helmet>

      <FinancePartyEditView />
    </>
  );
}
