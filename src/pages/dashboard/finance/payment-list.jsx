import { Helmet } from 'react-helmet-async';

import CashVoucherListView from 'src/sections/finance/cash-voucher-list-view';

export default function FinancePaymentListPage() {
  return (
    <>
      <Helmet>
        <title> Finance: Payment Vouchers</title>
      </Helmet>

      <CashVoucherListView kind="payment" />
    </>
  );
}
