import { Helmet } from 'react-helmet-async';

import CashVoucherListView from 'src/sections/finance/cash-voucher-list-view';

export default function FinanceReceiptListPage() {
  return (
    <>
      <Helmet>
        <title> Finance: Receipt Vouchers</title>
      </Helmet>

      <CashVoucherListView kind="receipt" />
    </>
  );
}
