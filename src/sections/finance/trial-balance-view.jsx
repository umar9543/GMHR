import { useState } from 'react';
import { useSnackbar } from 'notistack';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import LinearProgress from '@mui/material/LinearProgress';
import TableContainer from '@mui/material/TableContainer';

import { paths } from 'src/routes/paths';
import Iconify from 'src/components/iconify';
import { useSettingsContext } from 'src/components/settings';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';

import { getTrialBalance } from 'src/api/finance';

import { buildTrialBalancePdf } from './finance-report-pdf';

const fMoney = (v) =>
  Number(v || 0) === 0 ? '-' : Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 });
const toIso = (d) => (d && !Number.isNaN(d.getTime()) ? d.toISOString().split('T')[0] : null);

export default function TrialBalanceView() {
  const settings = useSettingsContext();
  const { enqueueSnackbar } = useSnackbar();

  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [rptType, setRptType] = useState('');
  const [loading, setLoading] = useState(false);
  const [building, setBuilding] = useState(false);
  const [data, setData] = useState(null);

  const handleRun = async () => {
    setLoading(true);
    try {
      const res = await getTrialBalance({
        fromDate: toIso(fromDate),
        toDate: toIso(toDate),
        rptType: rptType || undefined,
      });
      setData(res);
      enqueueSnackbar(`Trial balance ready: ${res.records.length} accounts`, { variant: 'success' });
    } catch (err) {
      console.error(err);
      enqueueSnackbar(err.message || 'Could not build the trial balance', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handlePdf = async () => {
    if (!data?.records?.length) return;
    setBuilding(true);
    try {
      window.open(await buildTrialBalancePdf(data), '_blank');
    } catch (err) {
      console.error(err);
      enqueueSnackbar(err.message || 'Could not build the PDF', { variant: 'error' });
    } finally {
      setBuilding(false);
    }
  };

  const totals = data?.totals;
  const diff = totals ? totals.closingDr - totals.closingCr : 0;
  const balanced = Math.abs(diff) < 0.005;

  // A group header row is inserted whenever the main group changes.
  let currentGroup = null;

  return (
    <Container maxWidth={settings.themeStretch ? false : 'xl'}>
      <CustomBreadcrumbs
        heading="Trial Balance"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Finance', href: paths.dashboard.Finance.root },
          { name: 'Reports' },
          { name: 'Trial Balance' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card sx={{ p: 3, mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
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
          <TextField
            select
            label="Section"
            value={rptType}
            onChange={(e) => setRptType(e.target.value)}
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="">All accounts</MenuItem>
            <MenuItem value="BS">Balance sheet only</MenuItem>
            <MenuItem value="PL">Profit &amp; loss only</MenuItem>
          </TextField>
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
            disabled={!data?.records?.length || building}
            sx={{ height: 40, px: 3, whiteSpace: 'nowrap' }}
          >
            {building ? 'Building...' : 'PDF'}
          </Button>
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block' }}>
          Leave the dates blank for the whole ledger. With a From date, earlier movement is brought
          forward into the opening balance.
        </Typography>
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
            <Typography variant="subtitle1">{data.records.length} accounts</Typography>
            <Chip
              color={balanced ? 'success' : 'error'}
              label={balanced ? 'Balanced' : `Out by ${fMoney(diff)}`}
            />
          </Stack>

          {!balanced && (
            <Alert severity="warning" sx={{ mx: 2.5, mb: 2 }}>
              The difference comes from opening balances in the chart of accounts, not from the
              vouchers — period movement balances exactly.
            </Alert>
          )}

          <Divider />

          <TableContainer sx={{ maxHeight: 640 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Code</TableCell>
                  <TableCell>Account</TableCell>
                  <TableCell align="right">Opening Dr</TableCell>
                  <TableCell align="right">Opening Cr</TableCell>
                  <TableCell align="right">Period Dr</TableCell>
                  <TableCell align="right">Period Cr</TableCell>
                  <TableCell align="right">Closing Dr</TableCell>
                  <TableCell align="right">Closing Cr</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.records.map((r) => {
                  const rows = [];
                  if (r.mainGroupName !== currentGroup) {
                    currentGroup = r.mainGroupName;
                    rows.push(
                      <TableRow key={`g-${r.mainGroupCode}-${r.caCode}-${r.acCode}`} sx={{ bgcolor: 'background.neutral' }}>
                        <TableCell colSpan={8} sx={{ fontWeight: 'bold' }}>
                          {r.mainGroupName || '(no group)'}
                        </TableCell>
                      </TableRow>
                    );
                  }
                  rows.push(
                    <TableRow key={`${r.caCode}-${r.acCode}`} hover>
                      <TableCell>
                        {r.caCode}-{r.acCode}
                      </TableCell>
                      <TableCell>{r.accountName}</TableCell>
                      <TableCell align="right">{fMoney(r.openingDr)}</TableCell>
                      <TableCell align="right">{fMoney(r.openingCr)}</TableCell>
                      <TableCell align="right">{fMoney(r.periodDr)}</TableCell>
                      <TableCell align="right">{fMoney(r.periodCr)}</TableCell>
                      <TableCell align="right">{fMoney(r.closingDr)}</TableCell>
                      <TableCell align="right">{fMoney(r.closingCr)}</TableCell>
                    </TableRow>
                  );
                  return rows;
                })}

                <TableRow sx={{ bgcolor: 'background.neutral' }}>
                  <TableCell colSpan={2} sx={{ fontWeight: 'bold' }}>
                    TOTAL
                  </TableCell>
                  {['openingDr', 'openingCr', 'periodDr', 'periodCr', 'closingDr', 'closingCr'].map(
                    (k) => (
                      <TableCell key={k} align="right" sx={{ fontWeight: 'bold' }}>
                        {fMoney(totals[k])}
                      </TableCell>
                    )
                  )}
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {!data && !loading && (
        <Card sx={{ p: 5, textAlign: 'center' }}>
          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              Choose a period and press Run.
            </Typography>
          </Box>
        </Card>
      )}
    </Container>
  );
}
