import { Helmet } from 'react-helmet-async';

import ExpenseBillListView from 'src/sections/finance/expense-bill-list-view';

export default function FinanceExpenseListPage() {
  return (
    <>
      <Helmet>
        <title> Finance: Expense Bills</title>
      </Helmet>

      <ExpenseBillListView />
    </>
  );
}
