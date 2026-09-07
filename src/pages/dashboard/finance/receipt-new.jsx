import { Helmet } from 'react-helmet-async';

import CashVoucherNewView from 'src/sections/finance/cash-voucher-new-view';

export default function FinanceReceiptNewPage() {
  return (
    <>
      <Helmet>
        <title> Finance: New Receipt Voucher</title>
      </Helmet>

      <CashVoucherNewView kind="receipt" />
    </>
  );
}
