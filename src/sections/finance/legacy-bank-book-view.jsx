import { useSnackbar } from 'notistack';
import { useState, useEffect } from 'react';

import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Container from '@mui/material/Container';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Autocomplete from '@mui/material/Autocomplete';
import LinearProgress from '@mui/material/LinearProgress';
import TableContainer from '@mui/material/TableContainer';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

import { paths } from 'src/routes/paths';
import Iconify from 'src/components/iconify';
import { useSettingsContext } from 'src/components/settings';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';

import { getBankAccounts, getStatementBankBook } from 'src/api/finance';

import { toIso, dmyText, monthStart } from './report-dates';
import { buildBankBookLegacyPdf } from './legacy-report-pdf';

const dec2 = (v) =>
  Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const B = { fontWeight: 700 };

// ----------------------------------------------------------------------
// Bank book in the legacy layout: brought forward, each entry with cheque
// number, voucher type and code, deposit or withdrawal and running balance.
// ----------------------------------------------------------------------

export default function LegacyBankBookView() {
  const settings = useSettingsContext();
  const { enqueueSnackbar } = useSnackbar();
  const [accounts, setAccounts] = useState([]);
  const [account, setAccount] = useState(null);
  const [fromDate, setFromDate] = useState(monthStart());
  const [toDate, setToDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  useEffect(() => {
    getBankAccounts({})
      .then((res) => setAccounts(res.records || []))
      .catch(() => setAccounts([]));
  }, []);

  const run = async () => {
    if (!account) return;
    setLoading(true);
    try {
      setData(
        await getStatementBankBook({
          caCode: account.caCode,
          acCode: account.acCode,
          fromDate: toIso(fromDate),
          toDate: toIso(toDate),
        })
      );
    } catch (err) {
      enqueueSnackbar(err.message || 'Could not build the bank book', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth={settings.themeStretch ? false : 'xl'}>
      <CustomBreadcrumbs
        heading="Bank Book"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Finance', href: paths.dashboard.Finance.root },
          { name: 'Reports' },
          { name: 'Bank Book' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card sx={{ p: 3, mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
          <Autocomplete
            fullWidth
            options={accounts}
            value={account}
            onChange={(e, v) => setAccount(v)}
            getOptionLabel={(a) => `${a.caCode}-${a.acCode}  ${a.accountName}`}
            isOptionEqualToValue={(a, b) => a.caCode === b.caCode && a.acCode === b.acCode}
            renderInput={(params) => <TextField {...params} label="Bank / cash account" />}
          />
          <DatePicker
            label="From"
            value={fromDate}
            onChange={setFromDate}
            format="dd/MM/yyyy"
            slotProps={{ textField: { fullWidth: true } }}
          />
          <DatePicker
            label="To"
            value={toDate}
            onChange={setToDate}
            format="dd/MM/yyyy"
            slotProps={{ textField: { fullWidth: true } }}
          />
          <Button
            variant="contained"
            onClick={run}
            disabled={loading || !account}
            sx={{ height: 40, px: 4 }}
          >
            {loading ? 'Loading...' : 'Run'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<Iconify icon="solar:printer-minimalistic-bold" />}
            onClick={() => window.open(buildBankBookLegacyPdf(data), '_blank')}
            disabled={!data}
            sx={{ height: 40, px: 3 }}
          >
            Print
          </Button>
        </Stack>
      </Card>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {data && (
        <Card>
          <Typography variant="subtitle1" sx={{ p: 2 }}>
            {data.accountName} — Bank Book From {dmyText(data.fromDate)} To {dmyText(data.toDate)}
          </Typography>
          <TableContainer sx={{ maxHeight: 680 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  {['V / Date', 'Particulars', 'Chq.No.', 'Type', 'VCode'].map((h) => (
                    <TableCell key={h}>{h}</TableCell>
                  ))}
                  {['Deposit', 'Drawn', 'Balance'].map((h) => (
                    <TableCell key={h} align="right">
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell />
                  <TableCell sx={B}>* * * Brought Forward</TableCell>
                  <TableCell colSpan={5} />
                  <TableCell align="right" sx={B}>
                    {dec2(data.opening)}
                  </TableCell>
                </TableRow>
                {data.records.map((r, i) => (
                  <TableRow key={i} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{dmyText(r.voucherDate)}</TableCell>
                    <TableCell>{r.narration}</TableCell>
                    <TableCell>{r.chequeNo}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{r.typeName}</TableCell>
                    <TableCell>{String(r.voucherCode).padStart(6, '0')}</TableCell>
                    <TableCell align="right">{r.deposit ? dec2(r.deposit) : ''}</TableCell>
                    <TableCell align="right">{r.drawn ? dec2(r.drawn) : ''}</TableCell>
                    <TableCell align="right">{dec2(r.balance)}</TableCell>
                  </TableRow>
                ))}
                <TableRow sx={{ bgcolor: 'background.neutral' }}>
                  <TableCell />
                  <TableCell colSpan={4} sx={B}>
                    * * * {data.closing >= 0 ? 'Debit' : 'Credit'} Balance
                  </TableCell>
                  <TableCell align="right" sx={B}>
                    {dec2(data.totalDeposit)}
                  </TableCell>
                  <TableCell align="right" sx={B}>
                    {dec2(data.totalDrawn)}
                  </TableCell>
                  <TableCell align="right" sx={B}>
                    {dec2(data.closing)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}
    </Container>
  );
}
