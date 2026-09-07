import { Helmet } from 'react-helmet-async';

import ClientInvoiceNewView from 'src/sections/finance/client-invoice-new-view';

export default function FinanceBillingNewPage() {
  return (
    <>
      <Helmet>
        <title> Finance: New Client Invoice</title>
      </Helmet>

      <ClientInvoiceNewView />
    </>
  );
}
