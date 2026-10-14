import PropTypes from 'prop-types';
import { useState } from 'react';
import { useSnackbar } from 'notistack';

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

import { getBankPosition } from 'src/api/finance';

import { toIso, dmyText } from './report-dates';
import FiscalYearSelect, { useFiscalYear } from './fiscal-year';
import { buildBankPositionPdf } from './legacy-report-pdf';

const dec2 = (v) =>
  Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const B = { fontWeight: 700 };

// ----------------------------------------------------------------------
// Bank position, as the legacy report: every bank with its opening, receipts,
// payments and closing for the period, then the receipts and the payments.
// ----------------------------------------------------------------------

function Detail({ title, rows, total }) {
  return (
    <Card sx={{ mt: 3 }}>
      <Typography variant="subtitle1" sx={{ p: 2, textAlign: 'center' }}>
        {title}
      </Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Party Name / Title of A/c</TableCell>
              <TableCell>V.No.</TableCell>
              <TableCell>Chq No.</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell>A/c Code</TableCell>
              <TableCell>Bank</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={i} hover>
                <TableCell>{dmyText(r.voucherDate)}</TableCell>
                <TableCell>{r.partyName}</TableCell>
                <TableCell>{r.voucherCode}</TableCell>
                <TableCell>{r.chequeNo}</TableCell>
                <TableCell align="right">{dec2(r.amount)}</TableCell>
                <TableCell>{`${r.caCode}  ${r.acCode}  ${r.subCode}`}</TableCell>
                <TableCell>{r.bankName}</TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell colSpan={4} />
              <TableCell align="right" sx={B}>
                {dec2(total)}
              </TableCell>
              <TableCell colSpan={2} />
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
}
Detail.propTypes = { rows: PropTypes.array, title: PropTypes.string, total: PropTypes.number };

export default function BankPositionView() {
  const settings = useSettingsContext();
  const { enqueueSnackbar } = useSnackbar();
  // Read by financial year: 1 July to 30 June, narrowed within it if wanted.
  const { fy, setFy, fromDate, setFromDate, toDate, setToDate, minDate, maxDate } = useFiscalYear();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  const run = async () => {
    setLoading(true);
    try {
      setData(await getBankPosition({ fromDate: toIso(fromDate), toDate: toIso(toDate) }));
    } catch (err) {
      enqueueSnackbar(err.message || 'Could not build the bank position', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const t = data?.totals;
  return (
    <Container maxWidth={settings.themeStretch ? false : 'xl'}>
      <CustomBreadcrumbs
        heading="Bank Position"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Finance', href: paths.dashboard.Finance.root },
          { name: 'Reports' },
          { name: 'Bank Position' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card sx={{ p: 3, mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
          <FiscalYearSelect
            value={fy}
            onChange={(y) => {
              setFy(y);
              setData(null);
            }}
          />
          <DatePicker
            label="From"
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
          <Button color="primary" variant="contained" onClick={run} disabled={loading} sx={{ height: 40, px: 4 }}>
            {loading ? 'Loading...' : 'Run'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<Iconify icon="solar:printer-minimalistic-bold" />}
            onClick={() => window.open(buildBankPositionPdf(data), '_blank')}
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
              From {dmyText(data.fromDate)} To {dmyText(data.toDate)}
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Code</TableCell>
                    <TableCell>Bank Name</TableCell>
                    <TableCell align="right">Opening Balance</TableCell>
                    <TableCell align="right">Receipts</TableCell>
                    <TableCell align="right">Payments</TableCell>
                    <TableCell align="right">Closing Balance</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.banks.map((b) => (
                    <TableRow key={`${b.caCode}-${b.acCode}`} hover>
                      <TableCell>{`${b.caCode}   ${b.acCode}`}</TableCell>
                      <TableCell>{b.bankName}</TableCell>
                      <TableCell align="right">{dec2(b.opening)}</TableCell>
                      <TableCell align="right">{b.receipts ? dec2(b.receipts) : ''}</TableCell>
                      <TableCell align="right">{dec2(b.payments)}</TableCell>
                      <TableCell align="right">{dec2(b.closing)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow sx={{ bgcolor: 'background.neutral' }}>
                    <TableCell colSpan={2} sx={B}>
                      Total
                    </TableCell>
                    <TableCell align="right" sx={B}>
                      {dec2(t.opening)}
                    </TableCell>
                    <TableCell align="right" sx={B}>
                      {dec2(t.receipts)}
                    </TableCell>
                    <TableCell align="right" sx={B}>
                      {dec2(t.payments)}
                    </TableCell>
                    <TableCell align="right" sx={B}>
                      {dec2(t.closing)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
          <Detail title="Receipt Detail" rows={data.receipts} total={t.receiptDetail} />
          <Detail title="Payment Detail" rows={data.payments} total={t.paymentDetail} />
        </>
      )}
    </Container>
  );
}
