import { useState, useEffect } from 'react';
import { useSnackbar } from 'notistack';

import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Autocomplete from '@mui/material/Autocomplete';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import LinearProgress from '@mui/material/LinearProgress';
import TableContainer from '@mui/material/TableContainer';

import { paths } from 'src/routes/paths';
import Iconify from 'src/components/iconify';
import { useSettingsContext } from 'src/components/settings';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';

import { getParties, getAccounts, getAccountLedger } from 'src/api/finance';

import { buildLedgerPdf } from './finance-report-pdf';

const fMoney = (v) => Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
const fDate = (v) => (v ? String(v).slice(0, 10).split('-').reverse().join('/') : '-');
const toIso = (d) => (d && !Number.isNaN(d.getTime()) ? d.toISOString().split('T')[0] : null);

export default function LedgerReportView() {
  const settings = useSettingsContext();
  const { enqueueSnackbar } = useSnackbar();

  const [account, setAccount] = useState(null);
  const [party, setParty] = useState(null);
  const [partyOptions, setPartyOptions] = useState([]);
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [building, setBuilding] = useState(false);
  const [data, setData] = useState(null);

  // Server-searched list; the search only moves while the user is typing.
  const [accountOptions, setAccountOptions] = useState([]);
  const [accountSearch, setAccountSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await getAccounts({ page: 1, pageSize: 50, search: accountSearch });
        if (!cancelled) setAccountOptions(res.records || []);
      } catch (err) {
        console.error(err);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [accountSearch]);

  const handleAccount = async (event, value) => {
    setAccount(value);
    setParty(null);
    setPartyOptions([]);
    if (!value?.partyCount) return;
    try {
      const res = await getParties({
        page: 1,
        pageSize: 200,
        caCode: value.caCode,
        acCode: value.acCode,
      });
      setPartyOptions(res.records || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRun = async () => {
    if (!account) {
      enqueueSnackbar('Choose an account first', { variant: 'warning' });
      return;
    }
    setLoading(true);
    try {
      const res = await getAccountLedger({
        caCode: account.caCode,
        acCode: account.acCode,
        subCode: party?.subCode,
        fromDate: toIso(fromDate),
        toDate: toIso(toDate),
      });
      setData(res);
      if (!res.records.length) {
        enqueueSnackbar('No entries in this period', { variant: 'info' });
      } else {
        enqueueSnackbar(`${res.records.length} entries`, { variant: 'success' });
      }
    } catch (err) {
      console.error(err);
      enqueueSnackbar(err.message || 'Could not build the ledger', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handlePdf = async () => {
    if (!data) return;
    setBuilding(true);
    try {
      window.open(await buildLedgerPdf(data), '_blank');
    } catch (err) {
      console.error(err);
      enqueueSnackbar(err.message || 'Could not build the PDF', { variant: 'error' });
    } finally {
      setBuilding(false);
    }
  };

  return (
    <Container maxWidth={settings.themeStretch ? false : 'xl'}>
      <CustomBreadcrumbs
        heading="Account Ledger"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Finance', href: paths.dashboard.Finance.root },
          { name: 'Reports' },
          { name: 'Account Ledger' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card sx={{ p: 3, mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
          <Autocomplete
            fullWidth
            options={accountOptions}
            filterOptions={(x) => x}
            value={account}
            onChange={handleAccount}
            onInputChange={(event, value, reason) => {
              if (reason === 'input') setAccountSearch(value);
            }}
            getOptionLabel={(o) => (o ? `${o.caCode}-${o.acCode}  ${o.description}` : '')}
            isOptionEqualToValue={(o, v) => o.caCode === v.caCode && o.acCode === v.acCode}
            renderInput={(params) => <TextField {...params} label="Account" />}
          />
          <Autocomplete
            fullWidth
            options={partyOptions}
            value={party}
            onChange={(event, value) => setParty(value)}
            disabled={!partyOptions.length}
            getOptionLabel={(o) => (o ? `${o.subCode}  ${o.description}` : '')}
            isOptionEqualToValue={(o, v) => o.subCode === v.subCode}
            renderInput={(params) => (
              <TextField {...params} label={partyOptions.length ? 'Party (optional)' : 'No parties'} />
            )}
          />
          <DatePicker
            label="From"
            value={fromDate}
            onChange={setFromDate}
            format="dd/MM/yyyy"
            slotProps={{ textField: { sx: { minWidth: 160 } } }}
          />
          <DatePicker
            label="To"
            value={toDate}
            onChange={setToDate}
            format="dd/MM/yyyy"
            slotProps={{ textField: { sx: { minWidth: 160 } } }}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={handleRun}
            disabled={loading}
            sx={{ height: 40, px: 4, whiteSpace: 'nowrap' }}
          >
            {loading ? 'Loading...' : 'Run'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<Iconify icon="solar:printer-minimalistic-bold" />}
            onClick={handlePdf}
            disabled={!data || building}
            sx={{ height: 40, px: 3, whiteSpace: 'nowrap' }}
          >
            {building ? 'Building...' : 'PDF'}
          </Button>
        </Stack>
      </Card>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {!!data && (
        <Card>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            justifyContent="space-between"
            alignItems={{ md: 'center' }}
            spacing={1}
            sx={{ p: 2.5 }}
          >
            <Typography variant="subtitle1">
              {data.account.caCode}-{data.account.acCode} &nbsp;{data.account.accountName}
              {data.account.partyName ? ` — ${data.account.partyName}` : ''}
            </Typography>
            <Stack direction="row" spacing={1}>
              <Chip size="small" label={`Opening ${fMoney(data.opening)}`} />
              <Chip size="small" color="info" label={`Dr ${fMoney(data.totalDr)}`} />
              <Chip size="small" color="warning" label={`Cr ${fMoney(data.totalCr)}`} />
              <Chip size="small" color="success" label={`Closing ${fMoney(data.closing)}`} />
            </Stack>
          </Stack>

          <Divider />

          <TableContainer sx={{ maxHeight: 620 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Voucher</TableCell>
                  <TableCell>Particulars</TableCell>
                  <TableCell align="right">Debit</TableCell>
                  <TableCell align="right">Credit</TableCell>
                  <TableCell align="right">Balance</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow sx={{ bgcolor: 'background.neutral' }}>
                  <TableCell colSpan={6} sx={{ fontWeight: 'bold' }}>
                    Opening balance
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                    {fMoney(data.opening)}
                  </TableCell>
                </TableRow>

                {data.records.map((e, i) => (
                  <TableRow key={`${e.voucherType}-${e.voucherCode}-${i}`} hover>
                    <TableCell>{fDate(e.voucherDate)}</TableCell>
                    <TableCell>{e.voucherType}</TableCell>
                    <TableCell>{e.voucherCode}</TableCell>
                    <TableCell>{(e.partyName || e.narration || '').trim() || '-'}</TableCell>
                    <TableCell align="right">{e.dr ? fMoney(e.dr) : '-'}</TableCell>
                    <TableCell align="right">{e.cr ? fMoney(e.cr) : '-'}</TableCell>
                    <TableCell align="right">{fMoney(e.balance)}</TableCell>
                  </TableRow>
                ))}

                <TableRow sx={{ bgcolor: 'background.neutral' }}>
                  <TableCell colSpan={4} sx={{ fontWeight: 'bold' }}>
                    Total / Closing
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                    {fMoney(data.totalDr)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                    {fMoney(data.totalCr)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                    {fMoney(data.closing)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {!data && !loading && (
        <Card sx={{ p: 5, textAlign: 'center' }}>
          <Typography variant="subtitle2" color="text.secondary">
            Choose an account and press Run.
          </Typography>
        </Card>
      )}
    </Container>
  );
}
