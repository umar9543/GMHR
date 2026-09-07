import { Helmet } from 'react-helmet-async';

import FinanceCoaView from 'src/sections/finance/coa-view';

export default function FinanceCoaPage() {
  return (
    <>
      <Helmet>
        <title> Finance: Chart of Accounts</title>
      </Helmet>

      <FinanceCoaView />
    </>
  );
}
