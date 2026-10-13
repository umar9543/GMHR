import { useState, useEffect, useCallback } from 'react';
import { useSnackbar } from 'notistack';

import Box from '@mui/material/Box';
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
import Menu from '@mui/material/Menu';
import Typography from '@mui/material/Typography';
import ListItemText from '@mui/material/ListItemText';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import LinearProgress from '@mui/material/LinearProgress';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';
import Iconify from 'src/components/iconify';
import { useSettingsContext } from 'src/components/settings';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';

import {
  getParties,
  getFbrSettings,
  getFbrStatuses,
  getClientInvoice,
  getClientInvoices,
  cancelClientInvoice,
  getBillingProvinces,
} from 'src/api/finance';

import { FbrStatusChip } from './fbr-invoice-panel';
import { buildSalesTaxInvoicePdf } from './sales-tax-invoice-pdf';

const fMoney = (v) => Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
const fDate = (v) => (v ? String(v).slice(0, 10).split('-').reverse().join('/') : '-');
const toIso = (d) => (d && !Number.isNaN(d.getTime()) ? d.toISOString().split('T')[0] : null);

export default function ClientInvoiceListView() {
  const settings = useSettingsContext();
  const { enqueueSnackbar } = useSnackbar();
  const router = useRouter();

  const [rows, setRows] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  // Only live invoices are listed; a cancelled one is no longer owed.
  const status = 'Live';
  const [province, setProvince] = useState('');
  // '' is every live invoice, receivable first; or just one side of it.
  const [collection, setCollection] = useState('');
  const [provinces, setProvinces] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [loading, setLoading] = useState(false);
  // FBR standing of the invoices on the page, by number, and the provinces
  // whose invoices go to FBR - only those show it.
  const [fbr, setFbr] = useState({});
  const [fbrProvinces, setFbrProvinces] = useState([]);

  const [expanded, setExpanded] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(
    async (overrides = {}) => {
      setLoading(true);
      try {
        const res = await getClientInvoices({
          page: (overrides.page ?? page) + 1,
          pageSize: overrides.pageSize ?? rowsPerPage,
          search: overrides.search ?? searchInput.trim(),
          status: overrides.status ?? status,
          province: overrides.province ?? province,
          collection: overrides.collection ?? collection,
          fromDate: toIso(overrides.fromDate ?? fromDate),
          toDate: toIso(overrides.toDate ?? toDate),
        });
        setRows(res.records || []);
        setTotalCount(res.pagination?.totalCount ?? 0);
        getFbrStatuses((res.records || []).map((r) => r.invoiceNo))
          .then((list) => setFbr(Object.fromEntries(list.map((x) => [x.invoiceNo, x]))))
          .catch(() => setFbr({}));
      } catch (err) {
        console.error(err);
        enqueueSnackbar(err.message || 'Failed to load invoices', { variant: 'error' });
      } finally {
        setLoading(false);
      }
    },
    [page, rowsPerPage, searchInput, status, province, collection, fromDate, toDate, enqueueSnackbar]
  );

  useEffect(() => {
    (async () => {
      try {
        setProvinces(await getBillingProvinces());
      } catch (err) {
        console.error(err);
      }
    })();
    getFbrSettings()
      .then((s) => setFbrProvinces(s.reportProvinces ?? []))
      .catch(() => setFbrProvinces([]));
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
    if (expanded === row.invoiceNo) {
      setExpanded(null);
      return;
    }
    setExpanded(row.invoiceNo);
    setDetail(null);
    setDetailLoading(true);
    try {
      setDetail(await getClientInvoice(row.invoiceNo));
    } catch (err) {
      enqueueSnackbar(err.message || 'Failed to load the invoice', { variant: 'error' });
    } finally {
      setDetailLoading(false);
    }
  };

  // Which invoice the print menu is open for, and which format it is asked for.
  const [printFor, setPrintFor] = useState(null);
  const [printing, setPrinting] = useState(false);

  const handlePrint = async (format) => {
    const row = printFor?.row;
    setPrintFor(null);
    if (!row) return;

    setPrinting(true);
    try {
      // The list carries the figures; the voucher needs the client's details
      // and the lines, so it is fetched whole.
      const invoice = await getClientInvoice(row.invoiceNo);

      // An older API does not carry the addressee on the invoice, which left
      // the top-left block blank. The party record holds all of it and that
      // endpoint is already live, so it is filled from there instead.
      if (!invoice.customerAddress1 && !invoice.contactPerson && invoice.caCode) {
        try {
          const parties = await getParties({
            caCode: invoice.caCode,
            acCode: invoice.acCode,
            pageSize: 200,
          });
          const party = (parties.records || parties.Records || []).find(
            (p) => Number(p.subCode) === Number(invoice.subCode)
          );
          if (party) {
            invoice.customerAddress1 = party.address1;
            invoice.customerAddress2 = party.address2;
            invoice.customerPhone = party.telephone;
            invoice.customerNtn = party.ntn;
            invoice.contactPerson = party.contactPerson;
            invoice.contactDesignation = party.designation;
          }
        } catch (err) {
          console.error('Could not read the client details', err);
        }
      }

      // A live FBR report puts FBR's number and QR code on it.
      const fbrReport =
        fbr[row.invoiceNo]?.status === 'Reported' && fbr[row.invoiceNo]?.environment === 'Production'
          ? fbr[row.invoiceNo]
          : null;
      const url = await buildSalesTaxInvoicePdf(invoice, { format, fbr: fbrReport });
      window.open(url, '_blank');
    } catch (err) {
      console.error(err);
      enqueueSnackbar(err.message || 'Could not build the invoice', { variant: 'error' });
    } finally {
      setPrinting(false);
    }
  };

  const handleCancel = async (row) => {
    // eslint-disable-next-line no-alert
    if (
      !window.confirm(
        `Cancel invoice #${row.invoiceNo}? It stays in the books as cancelled and the number is not reused.`
      )
    )
      return;
    try {
      await cancelClientInvoice(row.invoiceNo);
      enqueueSnackbar('Invoice cancelled', { variant: 'success' });
      await load();
    } catch (err) {
      enqueueSnackbar(err.message || 'Cancel failed', { variant: 'error' });
    }
  };

  return (
    <Container maxWidth={settings.themeStretch ? false : 'xl'}>
      <CustomBreadcrumbs
        heading="Client Invoices"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Finance', href: paths.dashboard.Finance.root },
          { name: 'Vouchers' },
          { name: 'Client Invoices' },
        ]}
        action={
          <Button
            component={RouterLink}
            href={paths.dashboard.Finance.vouchers.billingNew}
            variant="contained"
            color="primary"
            startIcon={<Iconify icon="mingcute:add-line" />}
          >
            New Invoice
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
            label="Show"
            value={collection}
            onChange={(e) => {
              setCollection(e.target.value);
              setPage(0);
              load({ page: 0, collection: e.target.value });
            }}
            sx={{ minWidth: 170 }}
          >
            <MenuItem value="">All invoices</MenuItem>
            <MenuItem value="receivable">Receivable</MenuItem>
            <MenuItem value="received">Received</MenuItem>
          </TextField>

          <TextField
            select
            size="small"
            label="Province"
            value={province}
            onChange={(e) => {
              setProvince(e.target.value);
              setPage(0);
              load({ page: 0, province: e.target.value });
            }}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">All provinces</MenuItem>
            {provinces.map((p) => (
              <MenuItem key={p.province} value={p.province}>
                {p.province}
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
            placeholder="Search invoice no, client, billing reference or narration..."
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
                <TableCell>Invoice</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Client</TableCell>
                <TableCell>Narration</TableCell>
                <TableCell>Reference</TableCell>
                <TableCell>Province</TableCell>
                <TableCell align="right">Sales</TableCell>
                <TableCell align="right">Tax</TableCell>
                <TableCell align="right">Adj</TableCell>
                <TableCell align="right">Net</TableCell>
                <TableCell align="center">Balance</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => {
                const isOpen = expanded === row.invoiceNo;
                return [
                  <TableRow key={row.invoiceNo} hover>
                    <TableCell>
                      <IconButton size="small" onClick={() => handleExpand(row)}>
                        <Iconify
                          icon={isOpen ? 'eva:arrow-ios-upward-fill' : 'eva:arrow-ios-downward-fill'}
                        />
                      </IconButton>
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2">#{row.invoiceNo}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {row.lineCount} line{row.lineCount === 1 ? '' : 's'}
                      </Typography>
                    </TableCell>
                    <TableCell>{fDate(row.invoiceDate)}</TableCell>
                    <TableCell>
                      {(row.customerName || '').trim() ||
                        (row.customerAccountName || '').trim() ||
                        '-'}
                    </TableCell>
                    <TableCell>{(row.narration || '').trim() || '-'}</TableCell>
                    <TableCell>{(row.billingRef || '').trim() || '-'}</TableCell>
                    <TableCell>
                      {(row.province || '').trim() || '-'}
                      {fbrProvinces.includes((row.province || '').trim()) && row.status === 'Live' && (
                        <Box sx={{ mt: 0.5 }}>
                          <FbrStatusChip
                            status={fbr[row.invoiceNo]?.status}
                            environment={fbr[row.invoiceNo]?.environment}
                            fbrInvoiceNumber={fbr[row.invoiceNo]?.fbrInvoiceNumber}
                          />
                        </Box>
                      )}
                    </TableCell>
                    <TableCell align="right">{fMoney(row.salesValue)}</TableCell>
                    <TableCell align="right">{fMoney(row.taxAmount)}</TableCell>
                    <TableCell align="right">
                      {row.transportation ? fMoney(row.transportation) : '-'}
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="subtitle2">{fMoney(row.netAmount)}</Typography>
                    </TableCell>
                    <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                      {(() => {
                        // Receivable invoices are listed first; this says how much
                        // of each is still to come in.
                        const balance = Number(row.balance) || 0;
                        const received = Number(row.received) || 0;
                        if (balance <= 1) {
                          return <Chip size="small" color="success" variant="soft" label="Received" />;
                        }
                        return (
                          <Tooltip
                            title={
                              received > 0
                                ? `Part received: ${fMoney(received)} of ${fMoney(row.netAmount)}`
                                : 'Nothing received yet'
                            }
                          >
                            <Chip
                              size="small"
                              color={received > 0 ? 'warning' : 'error'}
                              variant="soft"
                              label={`${received > 0 ? 'Due' : 'Receivable'} ${fMoney(balance)}`}
                            />
                          </Tooltip>
                        );
                      })()}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Open the invoice">
                        <IconButton
                          size="small"
                          onClick={() =>
                            router.push(paths.dashboard.Finance.vouchers.billingEdit(row.invoiceNo))
                          }
                        >
                          <Iconify icon="solar:pen-bold" />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Print the sales tax invoice">
                        <span>
                          <IconButton
                            size="small"
                            disabled={printing}
                            onClick={(event) =>
                              setPrintFor({ row, anchor: event.currentTarget })
                            }
                          >
                            <Iconify icon="solar:printer-minimalistic-bold" />
                          </IconButton>
                        </span>
                      </Tooltip>

                      {row.status !== 'Cancel' && (
                        <Tooltip title="Cancel invoice">
                          <IconButton size="small" color="error" onClick={() => handleCancel(row)}>
                            <Iconify icon="solar:close-circle-bold" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>,

                  <TableRow key={`${row.invoiceNo}-detail`}>
                    <TableCell colSpan={13} sx={{ py: 0, border: isOpen ? undefined : 0 }}>
                      <Collapse in={isOpen} unmountOnExit>
                        {detailLoading && <LinearProgress sx={{ my: 1 }} />}
                        {!!detail && isOpen && (
                          <Stack sx={{ py: 2 }} spacing={1}>
                            <Typography variant="subtitle2">
                              Billed to {(detail.customerName || detail.customerAccountName || '').trim()}
                              {detail.salesAccountName
                                ? ` — revenue booked to ${detail.salesAccountName.trim()}`
                                : ''}
                            </Typography>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell>#</TableCell>
                                  <TableCell>Item</TableCell>
                                  <TableCell>Description</TableCell>
                                  <TableCell align="center">Qty</TableCell>
                                  <TableCell align="right">Rate</TableCell>
                                  <TableCell align="right">Amount</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {detail.lines.map((l) => (
                                  <TableRow key={l.slNo}>
                                    <TableCell>{l.slNo}</TableCell>
                                    <TableCell>
                                      {(l.itemDescription || '').trim() || l.itemName}
                                      <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                        {l.itemName}
                                      </Typography>
                                    </TableCell>
                                    <TableCell>{(l.description || '').trim() || '-'}</TableCell>
                                    <TableCell align="center">{l.qty}</TableCell>
                                    <TableCell align="right">{fMoney(l.rate)}</TableCell>
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
                  <TableCell colSpan={13} align="center">
                    <Typography variant="subtitle2" sx={{ py: 3 }}>
                      No invoices found.
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
      <Menu
        open={Boolean(printFor)}
        anchorEl={printFor?.anchor}
        onClose={() => setPrintFor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem onClick={() => handlePrint('letterhead')}>
          <ListItemText
            primary="With letterhead"
            secondary="Soft copy, to email"
          />
        </MenuItem>
        <MenuItem onClick={() => handlePrint('plain')}>
          <ListItemText
            primary="Without letterhead"
            secondary="For the printed letterhead paper"
          />
        </MenuItem>
      </Menu>
    </Container>
  );
}
