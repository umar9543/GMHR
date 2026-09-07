import { Helmet } from 'react-helmet-async';

import FinancePartyView from 'src/sections/finance/party-view';

export default function FinancePartiesPage() {
  return (
    <>
      <Helmet>
        <title> Finance: Parties</title>
      </Helmet>

      <FinancePartyView />
    </>
  );
}
