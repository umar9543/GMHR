import { Helmet } from 'react-helmet-async';

import ClientInvoiceListView from 'src/sections/finance/client-invoice-list-view';

export default function FinanceBillingListPage() {
  return (
    <>
      <Helmet>
        <title> Finance: Client Invoices</title>
      </Helmet>

      <ClientInvoiceListView />
    </>
  );
}
