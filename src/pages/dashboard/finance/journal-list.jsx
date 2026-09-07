import { Helmet } from 'react-helmet-async';

import FinanceJournalListView from 'src/sections/finance/journal-list-view';

export default function FinanceJournalListPage() {
  return (
    <>
      <Helmet>
        <title> Finance: Journal Vouchers</title>
      </Helmet>

      <FinanceJournalListView />
    </>
  );
}
