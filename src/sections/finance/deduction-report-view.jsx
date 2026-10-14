import { useSnackbar } from 'notistack';
import { useMemo, useState } from 'react';

import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import TableContainer from '@mui/material/TableContainer';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

import { paths } from 'src/routes/paths';
import Iconify from 'src/components/iconify';
import { useSettingsContext } from 'src/components/settings';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';

import { getDeductionReport } from 'src/api/finance';

import { buildDeductionPdf } from './legacy-report-pdf';
import { toIso, dmyText } from './report-dates';
import FiscalYearSelect, { useFiscalYear } from './fiscal-year';

const int0 = (v) => Math.round(Number(v || 0)).toLocaleString('en-US');
const B = { fontWeight: 700 };
const N = { whiteSpace: 'nowrap' };

// ----------------------------------------------------------------------
// Deduction report (tax & misc): what clients withheld when paying the
// invoices posted in the period - income tax, sales tax and other deductions -
// by the invoice's province, with the summary the legacy report closes on.
// ----------------------------------------------------------------------

const COLUMNS = [
  'S. No.',
  'Inv Date',
  'Inv #',
  'Cre Date',
  'Rcpt #',
  'Primary A/c',
  'Secondary A/c',
  'Invoice Narration',
  'Invoice Amt',
  'Sales Tax',
  'Total Invoice',
  'Chq #',
  'Chq Amount',
  'Other Deduct',
  'wht Tax Ded',
  'Sales Tax Ded',
  'Sales Tax Received',
  'Net Amount after sales tax',
  'Sales Tax Paid',
];

export default function DeductionReportView() {
  const settings = useSettingsContext();
  const { enqueueSnackbar } = useSnackbar();
  // Read by financial year: 1 July to 30 June, narrowed within it if wanted.
  const { fy, setFy, fromDate, setFromDate, toDate, setToDate, minDate, maxDate } = useFiscalYear();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  const run = async () => {
    setLoading(true);
    try {
      setData(await getDeductionReport({ fromDate: toIso(fromDate), toDate: toIso(toDate) }));
    } catch (err) {
      enqueueSnackbar(err.message || 'Could not build the deduction report', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const provinces = useMemo(() => {
    const map = new Map();
    (data?.records || []).forEach((r) => {
      if (!map.has(r.province)) map.set(r.province, []);
      map.get(r.province).push(r);
    });
    return [...map.entries()];
  }, [data]);

  const t = data?.totals;
  let sl = 0;
  return (
    <Container maxWidth={false}>
      <CustomBreadcrumbs
        heading="Deduction Report (Tax & Misc)"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Finance', href: paths.dashboard.Finance.root },
          { name: 'Reports' },
          { name: 'Deduction Report' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card sx={{ p: 3, mb: 3, maxWidth: settings.themeStretch ? 'none' : 1200 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
          <FiscalYearSelect
            value={fy}
            onChange={(y) => {
              setFy(y);
              setData(null);
            }}
          />
          <DatePicker
            label="Invoices posted from"
            value={fromDate}
            onChange={setFromDate}
            minDate={minDate}
            maxDate={maxDate}
            format="dd/MM/yyyy"
            slotProps={{ textField: { fullWidth: true } }}
          />
          <DatePicker
            label="To"
            value={toDate}
            onChange={setToDate}
            minDate={minDate}
            maxDate={maxDate}
            format="dd/MM/yyyy"
            slotProps={{ textField: { fullWidth: true } }}
          />
          <Button variant="contained" onClick={run} disabled={loading} sx={{ height: 40, px: 4 }}>
            {loading ? 'Loading...' : 'Run'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<Iconify icon="solar:printer-minimalistic-bold" />}
            onClick={() => window.open(buildDeductionPdf(data), '_blank')}
            disabled={!data}
            sx={{ height: 40, px: 3 }}
          >
            Print
          </Button>
        </Stack>
      </Card>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {data && (
        <>
          <Card>
            <Typography variant="subtitle1" sx={{ p: 2 }}>
              FROM {dmyText(data.fromDate)} To {dmyText(data.toDate)} — {data.records.length}{' '}
              receipts
            </Typography>
            <TableContainer sx={{ maxHeight: 640 }}>
              <Table stickyHeader size="small" sx={{ '& td, & th': { px: 0.75, fontSize: 12 } }}>
                <TableHead>
                  <TableRow>
                    {COLUMNS.map((c) => (
                      <TableCell key={c} sx={{ fontWeight: 700 }}>
                        {c}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {provinces.map(([province, rows]) => [
                    <TableRow key={`p-${province}`} sx={{ bgcolor: 'action.selected' }}>
                      <TableCell colSpan={COLUMNS.length} align="center" sx={B}>
                        {province}
                      </TableCell>
                    </TableRow>,
                    ...rows.map((r) => {
                      sl += 1;
                      return (
                        <TableRow key={`${r.invoiceNo}-${r.receiptNo}-${sl}`} hover>
                          <TableCell>{sl}</TableCell>
                          <TableCell sx={N}>{dmyText(r.invoiceDate)}</TableCell>
                          <TableCell>{r.invoiceNo}</TableCell>
                          <TableCell sx={N}>{dmyText(r.createdDate)}</TableCell>
                          <TableCell>{r.receiptNo}</TableCell>
                          <TableCell sx={{ maxWidth: 140 }}>{r.primaryAccount}</TableCell>
                          <TableCell sx={{ maxWidth: 140 }}>{r.secondaryAccount}</TableCell>
                          <TableCell sx={{ maxWidth: 180 }}>{r.narration}</TableCell>
                          <TableCell align="right">{int0(r.invoiceAmount)}</TableCell>
                          <TableCell align="right">{int0(r.salesTax)}</TableCell>
                          <TableCell align="right">{int0(r.totalInvoice)}</TableCell>
                          <TableCell>{r.chequeNo}</TableCell>
                          <TableCell align="right">{int0(r.chequeAmount)}</TableCell>
                          <TableCell align="right">{int0(r.otherDeduction)}</TableCell>
                          <TableCell align="right">{int0(r.whtTax)}</TableCell>
                          <TableCell align="right" sx={N}>
                            {Math.round(r.salesTaxDeductedPct)}% &nbsp;{int0(r.salesTaxDeducted)}
                          </TableCell>
                          <TableCell align="right" sx={N}>
                            {100 - Math.round(r.salesTaxDeductedPct)}% &nbsp;
                            {int0(r.salesTaxReceived)}
                          </TableCell>
                          <TableCell align="right">{int0(r.netAfterSalesTax)}</TableCell>
                          <TableCell align="right">0.00</TableCell>
                        </TableRow>
                      );
                    }),
                  ])}
                  <TableRow sx={{ bgcolor: 'background.neutral' }}>
                    <TableCell colSpan={8} sx={B}>
                      Total
                    </TableCell>
                    <TableCell align="right" sx={B}>
                      {int0(t.invoiceAmount)}
                    </TableCell>
                    <TableCell align="right" sx={B}>
                      {int0(t.salesTax)}
                    </TableCell>
                    <TableCell align="right" sx={B}>
                      {int0(t.totalInvoice)}
                    </TableCell>
                    <TableCell />
                    <TableCell align="right" sx={B}>
                      {int0(t.chequeAmount)}
                    </TableCell>
                    <TableCell align="right" sx={B}>
                      {int0(t.otherDeduction)}
                    </TableCell>
                    <TableCell align="right" sx={B}>
                      {int0(t.whtTax)}
                    </TableCell>
                    <TableCell align="right" sx={B}>
                      {int0(t.salesTaxDeducted)}
                    </TableCell>
                    <TableCell align="right" sx={B}>
                      {int0(t.salesTaxReceived)}
                    </TableCell>
                    <TableCell align="right" sx={B}>
                      {int0(t.netAfterSalesTax)}
                    </TableCell>
                    <TableCell align="right" sx={B}>
                      0.00
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Card>

          <Card sx={{ mt: 3, maxWidth: 480 }}>
            <Table size="small">
              <TableBody>
                {[
                  ['Invoice Amt', t.invoiceAmount],
                  ['Sales Tax', t.salesTax],
                  ['Total Invoice', t.totalInvoice],
                  ['Chq Amount', t.chequeAmount],
                  ['Other Deductions', t.otherDeduction],
                  ['wht Tax Ded', t.whtTax],
                  ['Sales Tax Ded', t.salesTaxDeducted],
                  ['Sales Tax Received', t.salesTaxReceived],
                  ['Net Amount after sales tax', t.netAfterSalesTax],
                  ['Total Sales Tax Paid', 0],
                  ['Sales Tax Balance', t.salesTaxReceived],
                ].map(([label, v]) => (
                  <TableRow key={label}>
                    <TableCell sx={B}>{label}</TableCell>
                    <TableCell align="right">{int0(v)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </Container>
  );
}
