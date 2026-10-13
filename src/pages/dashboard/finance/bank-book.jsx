import { Helmet } from 'react-helmet-async';

import LegacyBankBookView from 'src/sections/finance/legacy-bank-book-view';

export default function FinanceBankBookPage() {
  return (
    <>
      <Helmet>
        <title> Finance: Bank Book</title>
      </Helmet>

      <LegacyBankBookView />
    </>
  );
}
