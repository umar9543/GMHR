import { Helmet } from 'react-helmet-async';

import { useParams } from 'src/routes/hooks';

import FinancePartyEditView from 'src/sections/finance/party-edit-view';

export default function FinancePartyEditPage() {
  const { partyKey } = useParams();

  return (
    <>
      <Helmet>
        <title> Finance: Party {partyKey}</title>
      </Helmet>

      <FinancePartyEditView partyKey={partyKey} />
    </>
  );
}
