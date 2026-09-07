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

import { getBankBook, getBankAccounts } from 'src/api/finance';

import { buildBankBookPdf, buildBankPositionPdf } from './finance-report-pdf';

const fMoney = (v) => Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
const fDate = (v) => (v ? String(v).slice(0, 10).split('-').reverse().join('/') : '-');
const toIso = (d) => (d && !Number.isNaN(d.getTime()) ? d.toISOString().split('T')[0] : null);

export default function BankBookView() {
  const settings = useSettingsContext();
  const { enqueueSnackbar } = useSnackbar();

  const [position, setPosition] = useState(null);
  const [bank, setBank] = useState(null);
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [building, setBuilding] = useState(false);
  const [book, setBook] = useState(null);

  // The position loads on open: it is the whole point of the screen, and the
  // account picker comes from it.
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        setPosition(await getBankAccounts({}));
      } catch (err) {
        console.error(err);
        enqueueSnackbar(err.message || 'Failed to load the bank position', { variant: 'error' });
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRun = async (account) => {
    const target = account || bank;
    if (!target) {
      enqueueSnackbar('Choose a bank or cash account', { variant: 'warning' });
      return;
    }
    setLoading(true);
    try {
      const res = await getBankBook({
        caCode: target.caCode,
        acCode: target.acCode,
        fromDate: toIso(fromDate),
        toDate: toIso(toDate),
      });
      setBook(res);
      if (!res.records.length) enqueueSnackbar('No movement in this period', { variant: 'info' });
    } catch (err) {
      console.error(err);
      enqueueSnackbar(err.message || 'Could not build the bank book', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handlePdf = async (which) => {
    setBuilding(true);
    try {
      const url =
        which === 'position'
          ? await buildBankPositionPdf(position)
          : await buildBankBookPdf(book);
      window.open(url, '_blank');
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
        heading="Bank Book"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Finance', href: paths.dashboard.Finance.root },
          { name: 'Reports' },
          { name: 'Bank Book' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {!!position && (
        <Card sx={{ mb: 3 }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            justifyContent="space-between"
            alignItems={{ md: 'center' }}
            spacing={1}
            sx={{ p: 2.5 }}
          >
            <Typography variant="subtitle1">
              Bank Position &nbsp;
              <Typography component="span" variant="body2" color="text.secondary">
                {position.records.length} accounts — click one to open its book
              </Typography>
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip
                color={position.total >= 0 ? 'success' : 'error'}
                label={`Total ${fMoney(position.total)}`}
              />
              <Button
                size="small"
                variant="outlined"
                startIcon={<Iconify icon="solar:printer-minimalistic-bold" />}
                onClick={() => handlePdf('position')}
                disabled={building}
              >
                PDF
              </Button>
            </Stack>
          </Stack>

          <Divider />

          <TableContainer sx={{ maxHeight: 320 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Code</TableCell>
                  <TableCell>Bank / Cash Account</TableCell>
                  <TableCell align="right">Balance</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {position.records.map((r) => (
                  <TableRow
                    key={`${r.caCode}-${r.acCode}`}
                    hover
                    selected={bank?.caCode === r.caCode && bank?.acCode === r.acCode}
                    sx={{ cursor: 'pointer' }}
                    onClick={() => {
                      setBank(r);
                      handleRun(r);
                    }}
                  >
                    <TableCell>
                      {r.caCode}-{r.acCode}
                    </TableCell>
                    <TableCell>{(r.accountName || '').trim()}</TableCell>
                    <TableCell
                      align="right"
                      sx={{ color: r.balance < 0 ? 'error.main' : undefined }}
                    >
                      {fMoney(r.balance)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow sx={{ bgcolor: 'background.neutral' }}>
                  <TableCell colSpan={2} sx={{ fontWeight: 'bold' }}>
                    TOTAL CASH &amp; BANK
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                    {fMoney(position.total)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      <Card sx={{ p: 3, mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
          <Autocomplete
            fullWidth
            options={position?.records || []}
            value={bank}
            onChange={(event, value) => setBank(value)}
            getOptionLabel={(o) => (o ? `${o.caCode}-${o.acCode}  ${o.accountName}` : '')}
            isOptionEqualToValue={(o, v) => o.caCode === v.caCode && o.acCode === v.acCode}
            renderInput={(params) => <TextField {...params} label="Bank / cash account" />}
          />
          <DatePicker
            label="From"
            value={fromDate}
            onChange={setFromDate}
            format="dd/MM/yyyy"
            slotProps={{ textField: { sx: { minWidth: 170 } } }}
          />
          <DatePicker
            label="To"
            value={toDate}
            onChange={setToDate}
            format="dd/MM/yyyy"
            slotProps={{ textField: { sx: { minWidth: 170 } } }}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={() => handleRun()}
            disabled={loading}
            sx={{ height: 40, px: 4, whiteSpace: 'nowrap' }}
          >
            {loading ? 'Loading...' : 'Run'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<Iconify icon="solar:printer-minimalistic-bold" />}
            onClick={() => handlePdf('book')}
            disabled={!book || building}
            sx={{ height: 40, px: 3, whiteSpace: 'nowrap' }}
          >
            {building ? 'Building...' : 'PDF'}
          </Button>
        </Stack>
      </Card>

      {!!book && (
        <Card>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            justifyContent="space-between"
            alignItems={{ md: 'center' }}
            spacing={1}
            sx={{ p: 2.5 }}
          >
            <Typography variant="subtitle1">
              {book.account.caCode}-{book.account.acCode} &nbsp;
              {(book.account.accountName || '').trim()}
            </Typography>
            <Stack direction="row" spacing={1}>
              <Chip size="small" label={`Opening ${fMoney(book.opening)}`} />
              <Chip size="small" color="success" label={`Received ${fMoney(book.totalIn)}`} />
              <Chip size="small" color="warning" label={`Paid ${fMoney(book.totalOut)}`} />
              <Chip size="small" color="info" label={`Closing ${fMoney(book.closing)}`} />
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
                  <TableCell>Cheque</TableCell>
                  <TableCell>Particulars</TableCell>
                  <TableCell align="right">Received</TableCell>
                  <TableCell align="right">Paid</TableCell>
                  <TableCell align="right">Balance</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow sx={{ bgcolor: 'background.neutral' }}>
                  <TableCell colSpan={7} sx={{ fontWeight: 'bold' }}>
                    Opening balance
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                    {fMoney(book.opening)}
                  </TableCell>
                </TableRow>

                {book.records.map((e, i) => (
                  <TableRow key={`${e.voucherType}-${e.voucherCode}-${i}`} hover>
                    <TableCell>{fDate(e.voucherDate)}</TableCell>
                    <TableCell>{e.voucherType}</TableCell>
                    <TableCell>{e.voucherCode}</TableCell>
                    <TableCell>{(e.chequeNo || '').trim() || '-'}</TableCell>
                    <TableCell>{(e.paidTo || e.narration || '').trim() || '-'}</TableCell>
                    <TableCell align="right">{e.dr ? fMoney(e.dr) : '-'}</TableCell>
                    <TableCell align="right">{e.cr ? fMoney(e.cr) : '-'}</TableCell>
                    <TableCell align="right">{fMoney(e.balance)}</TableCell>
                  </TableRow>
                ))}

                <TableRow sx={{ bgcolor: 'background.neutral' }}>
                  <TableCell colSpan={5} sx={{ fontWeight: 'bold' }}>
                    Total / Closing
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                    {fMoney(book.totalIn)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                    {fMoney(book.totalOut)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                    {fMoney(book.closing)}
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
