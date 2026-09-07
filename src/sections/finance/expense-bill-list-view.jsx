import { useState, useEffect, useCallback } from 'react';
import { useSnackbar } from 'notistack';

import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Collapse from '@mui/material/Collapse';
import Container from '@mui/material/Container';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import LinearProgress from '@mui/material/LinearProgress';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';
import Iconify from 'src/components/iconify';
import { useSettingsContext } from 'src/components/settings';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';

import {
  getExpenseBill,
  getExpenseBills,
  cancelExpenseBill,
  getExpenseLocations,
} from 'src/api/finance';

const fMoney = (v) => Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
const fDate = (v) => (v ? String(v).slice(0, 10).split('-').reverse().join('/') : '-');
const toIso = (d) => (d && !Number.isNaN(d.getTime()) ? d.toISOString().split('T')[0] : null);

export default function ExpenseBillListView() {
  const settings = useSettingsContext();
  const { enqueueSnackbar } = useSnackbar();

  const [rows, setRows] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [status, setStatus] = useState('Live');
  const [locCode, setLocCode] = useState('');
  const [locations, setLocations] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [loading, setLoading] = useState(false);

  const [expanded, setExpanded] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(
    async (overrides = {}) => {
      setLoading(true);
      try {
        const res = await getExpenseBills({
          page: (overrides.page ?? page) + 1,
          pageSize: overrides.pageSize ?? rowsPerPage,
          search: overrides.search ?? searchInput.trim(),
          status: overrides.status ?? status,
          locCode: overrides.locCode ?? locCode,
          fromDate: toIso(overrides.fromDate ?? fromDate),
          toDate: toIso(overrides.toDate ?? toDate),
        });
        setRows(res.records || []);
        setTotalCount(res.pagination?.totalCount ?? 0);
      } catch (err) {
        console.error(err);
        enqueueSnackbar(err.message || 'Failed to load expense bills', { variant: 'error' });
      } finally {
        setLoading(false);
      }
    },
    [page, rowsPerPage, searchInput, status, locCode, fromDate, toDate, enqueueSnackbar]
  );

  useEffect(() => {
    (async () => {
      try {
        setLocations(await getExpenseLocations());
      } catch (err) {
        console.error(err);
      }
    })();
    load({ page: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(0);
      load({ page: 0, search: searchInput.trim() });
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const handleExpand = async (row) => {
    if (expanded === row.billCode) {
      setExpanded(null);
      return;
    }
    setExpanded(row.billCode);
    setDetail(null);
    setDetailLoading(true);
    try {
      setDetail(await getExpenseBill(row.billCode));
    } catch (err) {
      enqueueSnackbar(err.message || 'Failed to load the bill', { variant: 'error' });
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCancel = async (row) => {
    // eslint-disable-next-line no-alert
    if (
      !window.confirm(
        `Cancel expense bill #${row.billCode}? It stays in the books as cancelled and the number is not reused.`
      )
    )
      return;
    try {
      await cancelExpenseBill(row.billCode);
      enqueueSnackbar('Expense bill cancelled', { variant: 'success' });
      await load();
    } catch (err) {
      enqueueSnackbar(err.message || 'Cancel failed', { variant: 'error' });
    }
  };

  return (
    <Container maxWidth={settings.themeStretch ? false : 'xl'}>
      <CustomBreadcrumbs
        heading="Expense Bills"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Finance', href: paths.dashboard.Finance.root },
          { name: 'Vouchers' },
          { name: 'Expense Bills' },
        ]}
        action={
          <Button
            component={RouterLink}
            href={paths.dashboard.Finance.vouchers.expenseNew}
            variant="contained"
            color="primary"
            startIcon={<Iconify icon="mingcute:add-line" />}
          >
            New Expense Bill
          </Button>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card>
        {loading && <LinearProgress />}

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ p: 2.5 }}>
          <TextField
            select
            size="small"
            label="Status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(0);
              load({ page: 0, status: e.target.value });
            }}
            sx={{ minWidth: 130 }}
          >
            <MenuItem value="Live">Live</MenuItem>
            <MenuItem value="Cancel">Cancelled</MenuItem>
            <MenuItem value="all">All</MenuItem>
          </TextField>

          <TextField
            select
            size="small"
            label="Branch"
            value={locCode}
            onChange={(e) => {
              setLocCode(e.target.value);
              setPage(0);
              load({ page: 0, locCode: e.target.value });
            }}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="">All branches</MenuItem>
            {locations.map((l) => (
              <MenuItem key={l.locCode} value={l.locCode}>
                {l.description}
              </MenuItem>
            ))}
          </TextField>

          <DatePicker
            label="From"
            value={fromDate}
            onChange={(d) => {
              setFromDate(d);
              setPage(0);
              load({ page: 0, fromDate: d });
            }}
            format="dd/MM/yyyy"
            slotProps={{ textField: { size: 'small', sx: { minWidth: 150 } } }}
          />
          <DatePicker
            label="To"
            value={toDate}
            onChange={(d) => {
              setToDate(d);
              setPage(0);
              load({ page: 0, toDate: d });
            }}
            format="dd/MM/yyyy"
            slotProps={{ textField: { size: 'small', sx: { minWidth: 150 } } }}
          />

          <TextField
            fullWidth
            size="small"
            placeholder="Search bill no, supplier, invoice or narration..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            InputProps={{
              startAdornment: (
                <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled', mr: 1 }} />
              ),
            }}
          />
        </Stack>

        <Divider />

        <TableContainer sx={{ maxHeight: 620 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 44 }} />
                <TableCell>Bill</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Supplier</TableCell>
                <TableCell>Narration</TableCell>
                <TableCell>Invoice</TableCell>
                <TableCell>Branch</TableCell>
                <TableCell align="right">Bill Value</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => {
                const isOpen = expanded === row.billCode;
                return [
                  <TableRow key={row.billCode} hover>
                    <TableCell>
                      <IconButton size="small" onClick={() => handleExpand(row)}>
                        <Iconify
                          icon={isOpen ? 'eva:arrow-ios-upward-fill' : 'eva:arrow-ios-downward-fill'}
                        />
                      </IconButton>
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2">#{row.billCode}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {row.lineCount} line{row.lineCount === 1 ? '' : 's'}
                      </Typography>
                    </TableCell>
                    <TableCell>{fDate(row.voucherDate)}</TableCell>
                    <TableCell>
                      {(row.supplierName || '').trim() ||
                        (row.supplierAccountName || '').trim() ||
                        '-'}
                    </TableCell>
                    <TableCell>{(row.narration || '').trim() || '-'}</TableCell>
                    <TableCell>
                      {(row.invoiceNo || '').trim() || '-'}
                      {row.invoiceDate && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {fDate(row.invoiceDate)}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{(row.locationName || '').trim() || '-'}</TableCell>
                    <TableCell align="right">
                      <Typography variant="subtitle2">{fMoney(row.purchaseValue)}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        size="small"
                        color={row.status === 'Cancel' ? 'default' : 'success'}
                        label={row.status}
                      />
                    </TableCell>
                    <TableCell align="right">
                      {row.status !== 'Cancel' && (
                        <Tooltip title="Cancel bill">
                          <IconButton size="small" color="error" onClick={() => handleCancel(row)}>
                            <Iconify icon="solar:close-circle-bold" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>,

                  <TableRow key={`${row.billCode}-detail`}>
                    <TableCell colSpan={10} sx={{ py: 0, border: isOpen ? undefined : 0 }}>
                      <Collapse in={isOpen} unmountOnExit>
                        {detailLoading && <LinearProgress sx={{ my: 1 }} />}
                        {!!detail && isOpen && (
                          <Stack sx={{ py: 2 }} spacing={1}>
                            <Typography variant="subtitle2">
                              Expense lines &mdash; debited against{' '}
                              {(detail.supplierName || detail.supplierAccountName || '').trim()}
                            </Typography>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell>#</TableCell>
                                  <TableCell>Account</TableCell>
                                  <TableCell>Party</TableCell>
                                  <TableCell align="right">Amount</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {detail.lines.map((l) => (
                                  <TableRow key={l.slNo}>
                                    <TableCell>{l.slNo}</TableCell>
                                    <TableCell>
                                      {(l.accountName || '').trim() || `${l.caCode}-${l.acCode}`}
                                      <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                        {l.caCode}-{l.acCode}-{l.subCode}
                                      </Typography>
                                    </TableCell>
                                    <TableCell>{(l.partyName || '').trim() || '-'}</TableCell>
                                    <TableCell align="right">{fMoney(l.amount)}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </Stack>
                        )}
                      </Collapse>
                    </TableCell>
                  </TableRow>,
                ];
              })}

              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} align="center">
                    <Typography variant="subtitle2" sx={{ py: 3 }}>
                      No expense bills found.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={[25, 50, 100]}
          onPageChange={(e, p) => {
            setPage(p);
            setExpanded(null);
            load({ page: p });
          }}
          onRowsPerPageChange={(e) => {
            const size = parseInt(e.target.value, 10);
            setRowsPerPage(size);
            setPage(0);
            load({ page: 0, pageSize: size });
          }}
        />
      </Card>
    </Container>
  );
}
