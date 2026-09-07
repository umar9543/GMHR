import PropTypes from 'prop-types';
import { useState } from 'react';
import { useSnackbar } from 'notistack';

import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import LinearProgress from '@mui/material/LinearProgress';
import TableContainer from '@mui/material/TableContainer';

import { paths } from 'src/routes/paths';
import Iconify from 'src/components/iconify';
import { useSettingsContext } from 'src/components/settings';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';

import { getAging, getOutstanding } from 'src/api/finance';

import { buildAgingPdf, buildOutstandingPdf } from './finance-report-pdf';

const fMoney = (v) =>
  Number(v || 0) === 0 ? '-' : Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 });
const fDate = (v) => (v ? String(v).slice(0, 10).split('-').reverse().join('/') : '-');
const toIso = (d) => (d && !Number.isNaN(d.getTime()) ? d.toISOString().split('T')[0] : null);

/**
 * Aging for either side. Receivables and payables are the same report with the
 * parties and the direction swapped, so one screen serves both.
 */
export default function AgingReportView({ side = 'receivable' }) {
  const settings = useSettingsContext();
  const { enqueueSnackbar } = useSnackbar();

  const payable = side === 'payable';
  const heading = payable ? 'Payables Aging' : 'Receivables Aging';
  const partyLabel = payable ? 'Supplier' : 'Customer';
  const docLabel = payable ? 'bills' : 'invoices';
  const receivedLabel = payable ? 'Paid' : 'Received';

  const [asAtDate, setAsAtDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [building, setBuilding] = useState(false);
  const [data, setData] = useState(null);

  const [detail, setDetail] = useState(null);
  const [detailFor, setDetailFor] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const handleRun = async () => {
    setLoading(true);
    try {
      const res = await getAging({ asAtDate: toIso(asAtDate), side });
      setData(res);
      enqueueSnackbar(
        `${res.records.length} ${payable ? 'suppliers' : 'customers'}, ${res.totals.openInvoices} open ${docLabel}`,
        { variant: 'success' }
      );
    } catch (err) {
      console.error(err);
      enqueueSnackbar(err.message || 'Could not build the aging report', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDetail = async (row) => {
    setDetailFor(row);
    setDetail(null);
    setDetailLoading(true);
    try {
      setDetail(
        await getOutstanding({
          asAtDate: toIso(asAtDate),
          side,
          caCode: row.caCode,
          acCode: row.acCode,
          subCode: row.subCode,
        })
      );
    } catch (err) {
      enqueueSnackbar(err.message || `Could not load the ${docLabel}`, { variant: 'error' });
    } finally {
      setDetailLoading(false);
    }
  };

  const handlePdf = async (which) => {
    setBuilding(true);
    try {
      const url =
        which === 'detail'
          ? await buildOutstandingPdf(detail, detailFor?.subDescription)
          : await buildAgingPdf(data);
      window.open(url, '_blank');
    } catch (err) {
      console.error(err);
      enqueueSnackbar(err.message || 'Could not build the PDF', { variant: 'error' });
    } finally {
      setBuilding(false);
    }
  };

  const b = data?.buckets;
  const t = data?.totals;

  return (
    <Container maxWidth={settings.themeStretch ? false : 'xl'}>
      <CustomBreadcrumbs
        heading={heading}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Finance', href: paths.dashboard.Finance.root },
          { name: 'Reports' },
          { name: heading },
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
            onClick={() => handlePdf('aging')}
            disabled={!data?.records?.length || building}
            sx={{ height: 40, px: 3, whiteSpace: 'nowrap' }}
          >
            {building ? 'Building...' : 'PDF'}
          </Button>
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block' }}>
          Buckets are calendar months, not 30/60/90 day windows — the same way the existing system
          ages. A {payable ? 'bill' : 'invoice'} counts as settled by allocated{' '}
          {payable ? 'payments' : 'receipts'} and journal entries.
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
            <Typography variant="subtitle1">
              {data.records.length} {payable ? 'suppliers' : 'customers'} &middot; {t.openInvoices}{' '}
              open {docLabel}
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip color="error" label={`Outstanding ${fMoney(t.balanceNet)}`} />
              <Chip
                size="small"
                color={t.balRest > 0 ? 'warning' : 'default'}
                label={`${b.older} ${fMoney(t.balRest)}`}
              />
            </Stack>
          </Stack>

          <Divider />

          <TableContainer sx={{ maxHeight: 640 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{partyLabel}</TableCell>
                  <TableCell align="center">{payable ? 'Bills' : 'Inv'}</TableCell>
                  <TableCell align="right">Outstanding</TableCell>
                  <TableCell align="right">{b.current}</TableCell>
                  <TableCell align="right">{b.month1}</TableCell>
                  <TableCell align="right">{b.month2}</TableCell>
                  <TableCell align="right">{b.month3}</TableCell>
                  <TableCell align="right">{b.older}</TableCell>
                  <TableCell align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {data.records.map((r) => (
                  <TableRow key={`${r.caCode}-${r.acCode}-${r.subCode}`} hover>
                    <TableCell>{r.subDescription || '-'}</TableCell>
                    <TableCell align="center">{r.openInvoices}</TableCell>
                    <TableCell align="right">
                      <Typography variant="subtitle2">{fMoney(r.balanceNet)}</Typography>
                    </TableCell>
                    <TableCell align="right">{fMoney(r.bal0)}</TableCell>
                    <TableCell align="right">{fMoney(r.bal1)}</TableCell>
                    <TableCell align="right">{fMoney(r.bal2)}</TableCell>
                    <TableCell align="right">{fMoney(r.bal3)}</TableCell>
                    <TableCell align="right" sx={{ color: r.balRest > 0 ? 'error.main' : undefined }}>
                      {fMoney(r.balRest)}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title={`Show the ${docLabel}`}>
                        <IconButton size="small" onClick={() => handleDetail(r)}>
                          <Iconify icon="solar:eye-bold" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}

                <TableRow sx={{ bgcolor: 'background.neutral' }}>
                  <TableCell sx={{ fontWeight: 'bold' }}>TOTAL</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                    {t.openInvoices}
                  </TableCell>
                  {['balanceNet', 'bal0', 'bal1', 'bal2', 'bal3', 'balRest'].map((k) => (
                    <TableCell key={k} align="right" sx={{ fontWeight: 'bold' }}>
                      {fMoney(t[k])}
                    </TableCell>
                  ))}
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {!data && !loading && (
        <Card sx={{ p: 5, textAlign: 'center' }}>
          <Typography variant="subtitle2" color="text.secondary">
            Choose a date and press Run.
          </Typography>
        </Card>
      )}

      <Dialog open={!!detailFor} onClose={() => setDetailFor(null)} fullWidth maxWidth="lg">
        <DialogTitle>{detailFor?.subDescription}</DialogTitle>
        <DialogContent>
          {detailLoading && <LinearProgress />}
          {!!detail && (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>{payable ? 'Bill' : 'Invoice'}</TableCell>
                  <TableCell align="right">Billed</TableCell>
                  <TableCell align="right">{receivedLabel}</TableCell>
                  <TableCell align="right">Outstanding</TableCell>
                  <TableCell align="center">Days</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {detail.records.map((r) => (
                  <TableRow key={`${r.voucherType}-${r.voucherCode}`}>
                    <TableCell>{fDate(r.voucherDate)}</TableCell>
                    <TableCell>#{r.voucherCode}</TableCell>
                    <TableCell align="right">{fMoney(r.amount)}</TableCell>
                    <TableCell align="right">{fMoney(r.paid)}</TableCell>
                    <TableCell align="right">
                      <Typography variant="subtitle2">{fMoney(r.outstanding)}</Typography>
                    </TableCell>
                    <TableCell align="center">{r.daysOld}</TableCell>
                  </TableRow>
                ))}
                <TableRow sx={{ bgcolor: 'background.neutral' }}>
                  <TableCell colSpan={2} sx={{ fontWeight: 'bold' }}>
                    TOTAL
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                    {fMoney(detail.totals.amount)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                    {fMoney(detail.totals.paid)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                    {fMoney(detail.totals.outstanding)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            startIcon={<Iconify icon="solar:printer-minimalistic-bold" />}
            onClick={() => handlePdf('detail')}
            disabled={!detail?.records?.length || building}
          >
            PDF
          </Button>
          <Button onClick={() => setDetailFor(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

AgingReportView.propTypes = {
  side: PropTypes.oneOf(['receivable', 'payable']),
};
