import { Helmet } from 'react-helmet-async';

import ExpenseBillNewView from 'src/sections/finance/expense-bill-new-view';

export default function FinanceExpenseNewPage() {
  return (
    <>
      <Helmet>
        <title> Finance: New Expense Bill</title>
      </Helmet>

      <ExpenseBillNewView />
    </>
  );
}
