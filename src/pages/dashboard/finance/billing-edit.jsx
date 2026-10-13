import { Helmet } from 'react-helmet-async';

import { useParams } from 'src/routes/hooks';

import ClientInvoiceFormView from 'src/sections/finance/client-invoice-form-view';

export default function FinanceBillingEditPage() {
  const { invoiceNo } = useParams();

  return (
    <>
      <Helmet>
        <title> Finance: Debit Invoice {invoiceNo}</title>
      </Helmet>

      <ClientInvoiceFormView invoiceNo={invoiceNo} />
    </>
  );
}
