import { Helmet } from 'react-helmet-async';

import BankBookView from 'src/sections/finance/bank-book-view';

export default function FinanceBankBookPage() {
  return (
    <>
      <Helmet>
        <title> Finance: Bank Book</title>
      </Helmet>

      <BankBookView />
    </>
  );
}
