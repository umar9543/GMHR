import { Helmet } from 'react-helmet-async';

import ClientInvoiceFormView from 'src/sections/finance/client-invoice-form-view';

export default function FinanceBillingNewPage() {
  return (
    <>
      <Helmet>
        <title> Finance: New Debit Invoice</title>
      </Helmet>

      <ClientInvoiceFormView />
    </>
  );
}
