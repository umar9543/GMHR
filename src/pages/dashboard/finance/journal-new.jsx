import { Helmet } from 'react-helmet-async';

import FinanceJournalNewView from 'src/sections/finance/journal-new-view';

export default function FinanceJournalNewPage() {
  return (
    <>
      <Helmet>
        <title> Finance: New Journal Voucher</title>
      </Helmet>

      <FinanceJournalNewView />
    </>
  );
}
