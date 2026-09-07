import { useState, useEffect, useCallback } from 'react';
import { useSnackbar } from 'notistack';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Container from '@mui/material/Container';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import LinearProgress from '@mui/material/LinearProgress';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';
import Iconify from 'src/components/iconify';
import { useSettingsContext } from 'src/components/settings';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';

import { getJournal, getJournals, cancelJournal } from 'src/api/finance';

const fMoney = (v) => Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
const fDate = (v) => (v ? new Date(v).toLocaleDateString() : '-');

export default function FinanceJournalListView() {
  const settings = useSettingsContext();
  const { enqueueSnackbar } = useSnackbar();

  const [rows, setRows] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  // View dialog: the voucher with its lines.
  const [viewing, setViewing] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(
    async (nextPage = page, nextSize = rowsPerPage, nextSearch = search, nextStatus = statusFilter) => {
      setLoading(true);
      try {
        const res = await getJournals({
          page: nextPage + 1,
          pageSize: nextSize,
          search: nextSearch,
          status: nextStatus || undefined,
        });
        setRows(res.records || []);
        setTotalCount(res.pagination?.totalCount ?? 0);
      } catch (err) {
        console.error(err);
        enqueueSnackbar(err.message || 'Failed to load journal vouchers', { variant: 'error' });
      } finally {
        setLoading(false);
      }
    },
    [page, rowsPerPage, search, statusFilter, enqueueSnackbar]
  );

  useEffect(() => {
    load(0, 25, '', '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(0);
      load(0, rowsPerPage, searchInput.trim(), statusFilter);
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const openView = async (code) => {
    try {
      setViewing(await getJournal(code));
    } catch (err) {
      enqueueSnackbar(err.message || 'Failed to load voucher', { variant: 'error' });
    }
  };

  const handleCancel = async (code) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Cancel journal voucher ${code}? Its ledger entries drop out of all reports. This cannot be undone.`))
      return;
    setCancelling(true);
    try {
      await cancelJournal(code);
      enqueueSnackbar(`Voucher ${code} cancelled`, { variant: 'success' });
      setViewing(null);
      await load();
    } catch (err) {
      enqueueSnackbar(err.message || 'Cancel failed', { variant: 'error' });
    } finally {
      setCancelling(false);
    }
  };

  return (
    <Container maxWidth={settings.themeStretch ? false : 'xl'}>
      <CustomBreadcrumbs
        heading="Journal Vouchers"
        links={[
          { name: 'Finance', href: paths.dashboard.Finance.root },
          { name: 'Vouchers' },
          { name: 'Journal' },
        ]}
        action={
          <Button
            component={RouterLink}
            href={paths.dashboard.Finance.vouchers.journalNew}
            variant="contained"
            color="primary"
            startIcon={<Iconify icon="mingcute:add-line" />}
          >
            New Journal Voucher
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
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
              load(0, rowsPerPage, search, e.target.value);
            }}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">
              <em>All</em>
            </MenuItem>
            <MenuItem value="Live">Live</MenuItem>
            <MenuItem value="Cancel">Cancelled</MenuItem>
          </TextField>

          <TextField
            fullWidth
            size="small"
            placeholder="Search by voucher no or narration..."
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

        <TableContainer sx={{ maxHeight: 560 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell>Voucher #</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Narration</TableCell>
                <TableCell align="center">Lines</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.voucherCode} hover>
                  <TableCell>
                    <Typography variant="subtitle2">JV-{row.voucherCode}</Typography>
                  </TableCell>
                  <TableCell>{fDate(row.voucherDate)}</TableCell>
                  <TableCell sx={{ maxWidth: 360 }}>
                    <Typography variant="body2" noWrap>
                      {row.narration || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">{row.lineCount}</TableCell>
                  <TableCell align="right">{fMoney(row.totalDr)}</TableCell>
                  <TableCell align="center">
                    <Chip
                      size="small"
                      color={row.status === 'Live' ? 'success' : 'default'}
                      label={row.status}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="View lines">
                      <IconButton size="small" onClick={() => openView(row.voucherCode)}>
                        <Iconify icon="solar:eye-bold" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}

              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography variant="subtitle2" sx={{ py: 3 }}>
                      No journal vouchers found.
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
            load(p, rowsPerPage);
          }}
          onRowsPerPageChange={(e) => {
            const size = parseInt(e.target.value, 10);
            setRowsPerPage(size);
            setPage(0);
            load(0, size);
          }}
        />
      </Card>

      <Dialog open={!!viewing} onClose={() => setViewing(null)} fullWidth maxWidth="md">
        {viewing && (
          <>
            <DialogTitle>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <span>Journal Voucher JV-{viewing.voucherCode}</span>
                <Chip
                  size="small"
                  color={viewing.status === 'Live' ? 'success' : 'default'}
                  label={viewing.status}
                />
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {fDate(viewing.voucherDate)} — {viewing.narration || 'no narration'}
              </Typography>
            </DialogTitle>
            <DialogContent>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>#</TableCell>
                    <TableCell>Account</TableCell>
                    <TableCell>Party</TableCell>
                    <TableCell align="right">Debit</TableCell>
                    <TableCell align="right">Credit</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {viewing.details.map((l) => (
                    <TableRow key={l.slNo}>
                      <TableCell>{l.slNo}</TableCell>
                      <TableCell>
                        <Typography variant="body2">{l.accountName || '-'}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {`${l.caCode}-${l.acCode}${l.subCode ? `-${l.subCode}` : ''}`}
                        </Typography>
                      </TableCell>
                      <TableCell>{l.partyName || '-'}</TableCell>
                      <TableCell align="right">{l.drAmount ? fMoney(l.drAmount) : ''}</TableCell>
                      <TableCell align="right">{l.crAmount ? fMoney(l.crAmount) : ''}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={3}>
                      <Typography variant="subtitle2">Total</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="subtitle2">{fMoney(viewing.totalDr)}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="subtitle2">{fMoney(viewing.totalCr)}</Typography>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </DialogContent>
            <DialogActions>
              {viewing.status === 'Live' && (
                <Button
                  color="error"
                  onClick={() => handleCancel(viewing.voucherCode)}
                  disabled={cancelling}
                >
                  {cancelling ? 'Cancelling...' : 'Cancel Voucher'}
                </Button>
              )}
              <Box sx={{ flexGrow: 1 }} />
              <Button onClick={() => setViewing(null)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Container>
  );
}
