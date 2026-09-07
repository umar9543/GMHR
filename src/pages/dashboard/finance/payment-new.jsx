import { Helmet } from 'react-helmet-async';

import CashVoucherNewView from 'src/sections/finance/cash-voucher-new-view';

export default function FinancePaymentNewPage() {
  return (
    <>
      <Helmet>
        <title> Finance: New Payment Voucher</title>
      </Helmet>

      <CashVoucherNewView kind="payment" />
    </>
  );
}
