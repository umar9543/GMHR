import { Helmet } from 'react-helmet-async';

import BankPositionView from 'src/sections/finance/bank-position-view';

export default function FinanceBankPositionPage() {
  return (
    <>
      <Helmet>
        <title> Finance: Bank Position</title>
      </Helmet>

      <BankPositionView />
    </>
  );
}
