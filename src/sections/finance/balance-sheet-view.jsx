import PropTypes from 'prop-types';
import { useState } from 'react';
import { useSnackbar } from 'notistack';

import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import LinearProgress from '@mui/material/LinearProgress';
import TableContainer from '@mui/material/TableContainer';

import { paths } from 'src/routes/paths';
import Iconify from 'src/components/iconify';
import { useSettingsContext } from 'src/components/settings';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';

import { getBalanceSheet } from 'src/api/finance';

import { buildBalanceSheetPdf } from './finance-report-pdf';

const fMoney = (v) => Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
const toIso = (d) => (d && !Number.isNaN(d.getTime()) ? d.toISOString().split('T')[0] : null);

/** One side of the sheet, grouped by main group with a total. */
function Side({ title, rows, total, totalLabel, extra }) {
  let group = null;
  return (
    <Card>
      <Stack sx={{ p: 2.5 }}>
        <Typography variant="subtitle1">{title}</Typography>
      </Stack>
      <Divider />
      <TableContainer sx={{ maxHeight: 560 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell>Code</TableCell>
              <TableCell>Account</TableCell>
              <TableCell align="right">Amount</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => {
              const out = [];
              if (r.mainGroupName !== group) {
                group = r.mainGroupName;
                out.push(
                  <TableRow key={`g-${r.mainGroupCode}-${r.caCode}-${r.acCode}`} sx={{ bgcolor: 'background.neutral' }}>
                    <TableCell colSpan={3} sx={{ fontWeight: 'bold' }}>
                      {r.mainGroupName || '(no group)'}
                    </TableCell>
                  </TableRow>
                );
              }
              out.push(
                <TableRow key={`${r.caCode}-${r.acCode}`} hover>
                  <TableCell>
                    {r.caCode}-{r.acCode}
                  </TableCell>
                  <TableCell>{r.accountName}</TableCell>
                  <TableCell align="right">{fMoney(Math.abs(r.balance))}</TableCell>
                </TableRow>
              );
              return out;
            })}

            {extra}

            <TableRow sx={{ bgcolor: 'background.neutral' }}>
              <TableCell colSpan={2} sx={{ fontWeight: 'bold' }}>
                {totalLabel}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                {fMoney(total)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
}

Side.propTypes = {
  title: PropTypes.string,
  rows: PropTypes.array,
  total: PropTypes.number,
  totalLabel: PropTypes.string,
  extra: PropTypes.node,
};

export default function BalanceSheetView() {
  const settings = useSettingsContext();
  const { enqueueSnackbar } = useSnackbar();

  const [asAtDate, setAsAtDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [building, setBuilding] = useState(false);
  const [data, setData] = useState(null);

  const handleRun = async () => {
    setLoading(true);
    try {
      const res = await getBalanceSheet({ asAtDate: toIso(asAtDate) });
      setData(res);
      enqueueSnackbar(`Balance sheet ready: ${res.records.length} accounts`, { variant: 'success' });
    } catch (err) {
      console.error(err);
      enqueueSnackbar(err.message || 'Could not build the balance sheet', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handlePdf = async () => {
    if (!data?.records?.length) return;
    setBuilding(true);
    try {
      window.open(await buildBalanceSheetPdf(data), '_blank');
    } catch (err) {
      console.error(err);
      enqueueSnackbar(err.message || 'Could not build the PDF', { variant: 'error' });
    } finally {
      setBuilding(false);
    }
  };

  // Debit balances are assets; credit balances are liabilities and equity.
  const assets = data?.records?.filter((r) => r.balance > 0) || [];
  const liabilities = data?.records?.filter((r) => r.balance < 0) || [];
  const summary = data?.summary;
  const balanced = summary ? Math.abs(summary.difference) < 0.005 : false;

  return (
    <Container maxWidth={settings.themeStretch ? false : 'xl'}>
      <CustomBreadcrumbs
        heading="Balance Sheet"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Finance', href: paths.dashboard.Finance.root },
          { name: 'Reports' },
          { name: 'Balance Sheet' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card sx={{ p: 3, mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
          <DatePicker
            label="As at"
            value={asAtDate}
            onChange={setAsAtDate}
            format="dd/MM/yyyy"
            slotProps={{ textField: { fullWidth: true } }}
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
            disabled={!data?.records?.length || building}
            sx={{ height: 40, px: 3, whiteSpace: 'nowrap' }}
          >
            {building ? 'Building...' : 'PDF'}
          </Button>
        </Stack>
      </Card>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {!!summary && (
        <>
          <Card sx={{ p: 2.5, mb: 3 }}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              justifyContent="space-between"
              alignItems={{ md: 'center' }}
              spacing={1}
            >
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Chip color="info" label={`Assets ${fMoney(summary.assets)}`} />
                <Chip color="warning" label={`Liabilities & Equity ${fMoney(summary.liabilities)}`} />
                <Chip
                  color={summary.profitForPeriod >= 0 ? 'success' : 'error'}
                  label={`${summary.profitForPeriod >= 0 ? 'Profit' : 'Loss'} ${fMoney(
                    Math.abs(summary.profitForPeriod)
                  )}`}
                />
              </Stack>
              <Chip
                color={balanced ? 'success' : 'error'}
                label={balanced ? 'Balanced' : `Out by ${fMoney(summary.difference)}`}
              />
            </Stack>

            {!balanced && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                The difference comes from opening balances in the chart of accounts, not from the
                vouchers — period movement balances exactly.
              </Alert>
            )}
          </Card>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Side title="Assets" rows={assets} total={summary.assets} totalLabel="TOTAL ASSETS" />
            </Grid>
            <Grid item xs={12} md={6}>
              <Side
                title="Liabilities & Equity"
                rows={liabilities}
                total={summary.liabilities + summary.profitForPeriod}
                totalLabel="TOTAL LIABILITIES, EQUITY & PROFIT"
                extra={
                  <TableRow key="pl-result">
                    <TableCell colSpan={2} sx={{ fontWeight: 'bold' }}>
                      Profit for the period
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                      {fMoney(summary.profitForPeriod)}
                    </TableCell>
                  </TableRow>
                }
              />
            </Grid>
          </Grid>
        </>
      )}

      {!data && !loading && (
        <Card sx={{ p: 5, textAlign: 'center' }}>
          <Typography variant="subtitle2" color="text.secondary">
            Choose a date and press Run.
          </Typography>
        </Card>
      )}
    </Container>
  );
}
