import PropTypes from 'prop-types';
import { useSnackbar } from 'notistack';
import { memo, useRef, useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Select from '@mui/material/Select';
import Tooltip from '@mui/material/Tooltip';
import Checkbox from '@mui/material/Checkbox';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import LinearProgress from '@mui/material/LinearProgress';
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';

import { paths } from 'src/routes/paths';
import Iconify from 'src/components/iconify';
import { useSettingsContext } from 'src/components/settings';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';

import { getAllClientOptions } from 'src/api/hr-client';
import { refreshSalarySheetMonth } from 'src/api/benefits';
import { downloadSalarySlip } from 'src/sections/salarystatus/salary-slip-pdf';
import {
  getSalaryHistory,
  getSalarySheetMonth,
  saveSalarySheetRows,
  getEmployeeSalarySheet,
} from 'src/api/employee-salary';

// ----------------------------------------------------------------------
// The salary sheet and the salary status, in one screen, as the legacy system
// keeps them: a month of SALARYSHEET rows, edited in place, with Paid/UnPaid
// and Remarks as columns rather than a separate module.
//
//   Gross   = TOTAL + ALLOW + OTDAYS x OTRATE
//   Net     = Gross - ADVANCE - ITAX - LOAN - VERIFICATION - FINE
//
// Both are worked out on screen as figures are typed, and the same arithmetic
// is what the server returns for past months.
// ----------------------------------------------------------------------

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// A few years either side of now is all a payroll screen ever needs.
const THIS_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 8 }, (_, i) => THIS_YEAR + 1 - i);

const clientFilter = createFilterOptions({
  limit: 50,
  stringify: (o) => `${o.clientId} ${o.name ?? ''}`,
});

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const money = (v) =>
  num(v).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

const grossOf = (row) => num(row.actualBSalary) + num(row.allow) + num(row.otDays) * num(row.otRate);

// EOBI is the guard's own contribution and comes off the salary, which is
// how the printed voucher totals it.
const netOf = (row) =>
  grossOf(row) -
  num(row.advance) -
  num(row.iTax) -
  num(row.loan) -
  num(row.verification) -
  num(row.fine) -
  num(row.eobi);

// Earnings, in the legacy grid's order. Worked out from the employee's defined
// salary and the month's attendance, so they are shown, never typed.
const EARNINGS = [
  { key: 'basicSalary', label: 'BASIC', width: 90 },
  { key: 'wDays', label: 'WDAYS', width: 70 },
  { key: 'actualBSalary', label: 'TOTAL', width: 90 },
  { key: 'allow', label: 'ALLOW', width: 80 },
  { key: 'otDays', label: 'OTDAYS', width: 75 },
  { key: 'otRate', label: 'otrate', width: 80 },
];
// Likewise deductions: they arrive with the generated sheet.
const DEDUCTIONS = [
  { key: 'advance', label: 'Advance', width: 90 },
  { key: 'iTax', label: 'ITAX', width: 80 },
  { key: 'loan', label: 'LOAN', width: 80 },
  { key: 'verification', label: 'VERIFIC.', width: 85 },
  { key: 'fine', label: 'FINE', width: 80 },
  { key: 'totWDays', label: 'totwdays', width: 80 },
  { key: 'eobi', label: 'EOBI', width: 75 },
];

const SalaryRow = memo(({
  row,
  rowKey,
  edited,
  picked,
  onToggle,
  onPatch,
  onHistory,
  onSlip,
  slipBusy,
}) => {
  const figure = (f) => (
    <TableCell key={f.key} align="right" sx={{ whiteSpace: 'nowrap' }}>
      {money(row[f.key])}
    </TableCell>
  );

  return (
    <TableRow hover selected={picked || edited}>
      <TableCell padding="checkbox">
        <Checkbox size="small" checked={picked} onChange={() => onToggle(rowKey)} />
      </TableCell>
      <TableCell>{row.fkEmployeeId}</TableCell>
      <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.employeeName || row.firstName || '-'}</TableCell>
      <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.rank || '-'}</TableCell>

      {EARNINGS.map(figure)}

      <TableCell align="right" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>
        {money(grossOf(row))}
      </TableCell>

      {DEDUCTIONS.map(figure)}

      <TableCell align="right" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>
        {money(netOf(row))}
      </TableCell>

      <TableCell align="center">{row.clientId ?? '-'}</TableCell>
      <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.clientName || '-'}</TableCell>
      <TableCell sx={{ whiteSpace: 'nowrap' }}>
        {String(row.salaryDate ?? '').slice(0, 10) || '-'}
      </TableCell>

      <TableCell sx={{ py: 0.5 }}>
        <Select
          size="small"
          variant="outlined"
          displayEmpty
          value={row.paid === 'Paid' || row.paid === 'UnPaid' ? row.paid : ''}
          onChange={(e) => onPatch(rowKey, { paid: e.target.value })}
          sx={{ width: 118, '& .MuiSelect-select': { py: 0.5, fontSize: 13 } }}
        >
          <MenuItem value="">
            <em>-</em>
          </MenuItem>
          <MenuItem value="Paid">Paid</MenuItem>
          <MenuItem value="UnPaid">UnPaid</MenuItem>
        </Select>
      </TableCell>

      <TableCell sx={{ py: 0.5 }}>
        <TextField
          size="small"
          variant="outlined"
          placeholder="Remarks"
          value={row.remarks ?? ''}
          onChange={(e) => onPatch(rowKey, { remarks: e.target.value })}
          sx={{ minWidth: 170, '& .MuiInputBase-input': { py: 0.75, fontSize: 13 } }}
        />
      </TableCell>

      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
        <Tooltip title="Previous salaries">
          <IconButton size="small" onClick={() => onHistory(row)}>
            <Iconify icon="solar:history-bold" width={18} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Salary slip (PDF)">
          <span>
            <IconButton size="small" onClick={() => onSlip(row)} disabled={slipBusy}>
              <Iconify icon="solar:printer-minimalistic-bold" width={18} />
            </IconButton>
          </span>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
});

SalaryRow.displayName = 'SalaryRow';

SalaryRow.propTypes = {
  row: PropTypes.object,
  rowKey: PropTypes.string,
  edited: PropTypes.bool,
  picked: PropTypes.bool,
  onToggle: PropTypes.func,
  onPatch: PropTypes.func,
  onHistory: PropTypes.func,
  onSlip: PropTypes.func,
  slipBusy: PropTypes.bool,
};

export default function SalarySheetView() {
  const settings = useSettingsContext();
  const { enqueueSnackbar } = useSnackbar();

  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [client, setClient] = useState(null);
  const [paid, setPaid] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const [clientOptions, setClientOptions] = useState([]);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  // Rows waiting to be saved, keyed the same way the grid keys them. Held
  // apart from the page so a mark made on page 1 is still there on page 3.
  const [pending, setPending] = useState(() => new Map());
  const [selected, setSelected] = useState(() => new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [historyFor, setHistoryFor] = useState(null);
  const [slipBusy, setSlipBusy] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    getAllClientOptions()
      .then((list) => {
        if (!cancelled) {
          setClientOptions((list || []).map((c) => ({ ...c, label: `${c.clientId} - ${c.name}` })));
        }
      })
      .catch((err) => console.error('Could not load the clients', err));
    return () => {
      cancelled = true;
    };
  }, []);

  const rowKey = (row) => `${row.id}-${row.slNo}`;

  const rowsRef = useRef([]);
  const pendingRef = useRef(pending);
  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);
  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);

  // Everything that decides which rows the month shows.
  const filterSig = `${month}|${year}|${client?.clientId ?? ''}|${paid}|${search}`;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getSalarySheetMonth({
        month,
        year,
        clientId: client?.clientId,
        paid: paid || undefined,
        search: search || undefined,
        page: page + 1,
        pageSize: rowsPerPage,
      });
      // A row already marked keeps its mark when its page is fetched again.
      setRows(
        (res.records || []).map((r) => pendingRef.current.get(`${r.id}-${r.slNo}`) || r)
      );
      setTotal(res.totalCount || 0);
    } catch (err) {
      console.error(err);
      enqueueSnackbar('Could not load the salary sheet', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [month, year, client, paid, search, page, rowsPerPage, enqueueSnackbar]);

  useEffect(() => {
    load();
  }, [load]);

  // Another month or another client is another sheet: unsaved marks go with it.
  useEffect(() => {
    if (pendingRef.current.size) {
      enqueueSnackbar('Unsaved marks were cleared when the filter changed', { variant: 'info' });
    }
    setPending(new Map());
    setSelected(new Set());
  }, [filterSig, enqueueSnackbar]);

  // The payment mark and the remark are the only things this screen changes.
  // Stable, so a memoised row is not re-rendered by a new function each time.
  const patch = useCallback((key, changes) => {
    setRows((prev) => prev.map((r) => (`${r.id}-${r.slNo}` === key ? { ...r, ...changes } : r)));
    setPending((prev) => {
      const base = prev.get(key) || rowsRef.current.find((r) => `${r.id}-${r.slNo}` === key);
      if (!base) return prev;
      return new Map(prev).set(key, { ...base, ...changes });
    });
  }, []);

  const toggleRow = useCallback((key) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (!next.delete(key)) next.add(key);
      return next;
    });
  }, []);

  // Every row the filter matches, not just the page on screen - what "select
  // all" has to mean when a client has more guards than a page holds.
  const allRowsRef = useRef({ sig: null, map: null });
  const fetchFiltered = useCallback(async () => {
    if (allRowsRef.current.sig === filterSig && allRowsRef.current.map) {
      return allRowsRef.current.map;
    }
    const map = new Map();
    for (let p = 1; p <= 20; p += 1) {
      // eslint-disable-next-line no-await-in-loop
      const res = await getSalarySheetMonth({
        month,
        year,
        clientId: client?.clientId,
        paid: paid || undefined,
        search: search || undefined,
        page: p,
        pageSize: 1000,
      });
      const batch = res.records || [];
      batch.forEach((r) => map.set(`${r.id}-${r.slNo}`, r));
      if (!batch.length || map.size >= (res.totalCount || 0)) break;
    }
    allRowsRef.current = { sig: filterSig, map };
    return map;
  }, [filterSig, month, year, client, paid, search]);

  const allSelected = total > 0 && selected.size >= total;

  const handleSelectAll = async () => {
    if (allSelected || selected.size) {
      setSelected(new Set());
      return;
    }
    setBulkBusy(true);
    try {
      const all = await fetchFiltered();
      setSelected(new Set(all.keys()));
    } catch (err) {
      console.error(err);
      enqueueSnackbar('Could not read the rows to select', { variant: 'error' });
    } finally {
      setBulkBusy(false);
    }
  };

  // Marks every selected row, including the ones on pages not on screen.
  const markSelected = async (value) => {
    if (!selected.size) {
      enqueueSnackbar('No rows are selected', { variant: 'info' });
      return;
    }
    setBulkBusy(true);
    try {
      // Rows on this page are already in hand; only go back to the server if
      // the selection reaches rows that are not.
      const here = new Map(rowsRef.current.map((r) => [`${r.id}-${r.slNo}`, r]));
      const missing = Array.from(selected).some((k) => !here.has(k) && !pendingRef.current.has(k));
      const all = missing ? await fetchFiltered() : here;
      setPending((prev) => {
        const next = new Map(prev);
        selected.forEach((key) => {
          const base = next.get(key) || all.get(key) || here.get(key);
          if (base) next.set(key, { ...base, paid: value });
        });
        return next;
      });
      setRows((prev) =>
        prev.map((r) => (selected.has(`${r.id}-${r.slNo}`) ? { ...r, paid: value } : r))
      );
      enqueueSnackbar(`${selected.size} row(s) marked ${value}. Save to keep it.`, {
        variant: 'success',
      });
    } catch (err) {
      console.error(err);
      enqueueSnackbar('Could not mark the selected rows', { variant: 'error' });
    } finally {
      setBulkBusy(false);
    }
  };

  const changedRows = useMemo(() => Array.from(pending.values()), [pending]);

  const handleSave = async () => {
    if (!changedRows.length) {
      enqueueSnackbar('Nothing has been changed', { variant: 'info' });
      return;
    }
    setSaving(true);
    try {
      // The server matches on employee + month, so these update in place.
      const payload = changedRows.map((r) => ({
        id: r.id,
        slNo: r.slNo,
        fkEmployeeId: r.fkEmployeeId,
        rank: r.rank,
        basicSalary: num(r.basicSalary),
        wDays: num(r.wDays),
        actualBSalary: num(r.actualBSalary),
        allow: num(r.allow),
        otDays: num(r.otDays),
        otRate: num(r.otRate),
        advance: num(r.advance),
        iTax: num(r.iTax),
        loan: num(r.loan),
        verification: num(r.verification),
        fine: num(r.fine),
        clientId: r.clientId,
        totWDays: num(r.totWDays),
        allowDetail: r.allowDetail,
        salaryDate: r.salaryDate,
        paid: r.paid,
        remarks: r.remarks,
        eobi: num(r.eobi),
      }));
      const res = await saveSalarySheetRows(payload);
      enqueueSnackbar(res.message || 'Salary sheet saved', { variant: 'success' });
      setPending(new Map());
      setSelected(new Set());
      allRowsRef.current = { sig: null, map: null };
      await load();
    } catch (err) {
      console.error(err);
      enqueueSnackbar('Could not save the salary sheet', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleGenerate = async () => {
    setSaving(true);
    try {
      // The generator works out the month from attendance; its rows are then
      // written into SALARYSHEET, which is what this screen and the slip read.
      const sheet = await getEmployeeSalarySheet({
        month,
        year,
        page: 1,
        pageSize: 1000,
        source: 'generate',
      });
      const details = sheet?.sheet?.details || [];
      if (!details.length) {
        enqueueSnackbar('The generator returned no rows for this month', { variant: 'warning' });
        return;
      }
      const salaryDate = `${year}-${String(month).padStart(2, '0')}-01`;
      // Only what the generator actually knows is sent. A field left out is
      // kept as it is on an existing row, so loading the sheet again does not
      // wipe the fines, remarks or Paid marks the month has collected - nor
      // the allowance and loan that Refresh Salary Sheet wrote.
      const keep = (value) => (num(value) ? num(value) : undefined);
      const payload = details.map((d) => ({
        fkEmployeeId: d.empId,
        rank: d.designation || undefined,
        basicSalary: num(d.salary),
        wDays: num(d.totalPayableDays),
        actualBSalary: Math.round(num(d.netSalary)),
        allow: keep(num(d.foodAlw) + num(d.convAlw)),
        otDays: num(d.otDays),
        otRate: num(d.otRate),
        advance: keep(d.lessAdvance),
        loan: keep(d.lessLoan),
        clientId: d.clientId ?? null,
        totWDays: num(d.daysMonth),
        // The EOBI contribution is the employee's own figure, not a workings
        // of the month, so it comes across with the generated row.
        eobi: num(d.eobi),
        salaryDate,
      }));
      const res = await saveSalarySheetRows(payload);

      // Standing allowances, monthly instalments and each guard's EOBI come
      // round on their own: the month takes them as soon as it is loaded,
      // rather than waiting for someone to refresh a guard at a time.
      let benefits = '';
      try {
        const applied = await refreshSalarySheetMonth({ month, year });
        if (applied.benefitRows || applied.eobiRows) {
          benefits = ` Benefits applied to ${applied.benefitRows} row(s), EOBI to ${applied.eobiRows}.`;
        }
      } catch (err) {
        console.error('Could not apply the benefits to the month', err);
        enqueueSnackbar('The sheet was generated, but the benefits could not be applied', {
          variant: 'warning',
        });
      }

      enqueueSnackbar(`${res.message || 'Salary generated'}.${benefits}`, { variant: 'success' });
      await load();
    } catch (err) {
      console.error(err);
      enqueueSnackbar('Could not generate the salary', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleSlip = async (row) => {
    setSlipBusy(rowKey(row));
    try {
      let token = '';
      try {
        token = JSON.parse(localStorage.getItem('UserData'))?.token || '';
      } catch {
        token = '';
      }
      await downloadSalarySlip(row.id, token, row.slNo);
    } catch (err) {
      console.error(err);
      enqueueSnackbar('Could not build the salary slip', { variant: 'error' });
    } finally {
      setSlipBusy(null);
    }
  };

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => ({
          gross: acc.gross + grossOf(r),
          net: acc.net + netOf(r),
          advance: acc.advance + num(r.advance),
        }),
        { gross: 0, net: 0, advance: 0 }
      ),
    [rows]
  );

  return (
    <Container maxWidth={settings.themeStretch ? false : 'xl'}>
      <CustomBreadcrumbs
        heading="Salary Sheet"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Payroll' },
          { name: 'Salary Sheet' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card sx={{ p: 2.5, mb: 3 }}>
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <TextField
            select
            size="small"
            label="Month"
            value={month}
            onChange={(e) => {
              setMonth(e.target.value);
              setPage(0);
            }}
            sx={{ width: 150 }}
          >
            {MONTHS.map((name, i) => (
              <MenuItem key={name} value={i + 1}>
                {name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            size="small"
            label="Year"
            value={year}
            onChange={(e) => {
              setYear(Number(e.target.value));
              setPage(0);
            }}
            sx={{ width: 110 }}
          >
            {YEARS.map((y) => (
              <MenuItem key={y} value={y}>
                {y}
              </MenuItem>
            ))}
          </TextField>

          <Autocomplete
            size="small"
            options={clientOptions}
            filterOptions={clientFilter}
            value={client}
            onChange={(event, value) => {
              setClient(value);
              setPage(0);
            }}
            getOptionLabel={(o) => o?.label || ''}
            isOptionEqualToValue={(o, v) => o.clientId === v.clientId}
            renderOption={(props, option) => (
              <li {...props} key={option.clientId}>
                {option.label}
              </li>
            )}
            renderInput={(params) => <TextField {...params} label="Client" placeholder="All clients" />}
            sx={{ width: 300 }}
          />

          <TextField
            select
            size="small"
            label="Status"
            value={paid}
            onChange={(e) => {
              setPaid(e.target.value);
              setPage(0);
            }}
            sx={{ width: 130 }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="Paid">Paid</MenuItem>
            <MenuItem value="UnPaid">UnPaid</MenuItem>
          </TextField>

          <TextField
            size="small"
            label="Search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Employee code, name, rank or client..."
            sx={{ flex: '1 1 280px', minWidth: 260 }}
            InputProps={{
              startAdornment: (
                <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled', mr: 1 }} />
              ),
            }}
          />

          <Stack direction="row" spacing={1.5} sx={{ ml: 'auto' }}>
            <Tooltip title="Rebuild this month's sheet from attendance and the defined salaries">
              <span>
                <Button
                  variant="outlined"
                  startIcon={<Iconify icon="solar:refresh-bold" />}
                  onClick={handleGenerate}
                  disabled={saving || loading}
                  sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                >
                  Load Salary Sheet
                </Button>
              </span>
            </Tooltip>

            <Button
              variant="contained"
              startIcon={<Iconify icon="solar:diskette-bold" />}
              onClick={handleSave}
              disabled={saving || loading || !changedRows.length}
              sx={{ whiteSpace: 'nowrap', flexShrink: 0, minWidth: 120 }}
            >
              Save{changedRows.length ? ` (${changedRows.length})` : ''}
            </Button>
          </Stack>
        </Box>
      </Card>

      <Card>
        {(loading || saving) && <LinearProgress />}

        <Stack
          direction="row"
          spacing={1.5}
          alignItems="center"
          flexWrap="wrap"
          useFlexGap
          sx={{ px: 2.5, pt: 1.5 }}
        >
          <Button
            size="small"
            variant="outlined"
            startIcon={<Iconify icon="eva:checkmark-square-2-outline" />}
            onClick={handleSelectAll}
            disabled={!total || bulkBusy || loading}
            sx={{ whiteSpace: 'nowrap' }}
          >
            {selected.size ? 'Clear selection' : `Select all ${total.toLocaleString()}`}
          </Button>

          {selected.size > 0 && (
            <>
              <Chip size="small" color="primary" label={`${selected.size.toLocaleString()} selected`} />
              <Button
                size="small"
                variant="contained"
                color="success"
                onClick={() => markSelected('Paid')}
                disabled={bulkBusy || saving}
                sx={{ whiteSpace: 'nowrap' }}
              >
                Mark Paid
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="warning"
                onClick={() => markSelected('UnPaid')}
                disabled={bulkBusy || saving}
                sx={{ whiteSpace: 'nowrap' }}
              >
                Mark UnPaid
              </Button>
            </>
          )}

          {changedRows.length > 0 && (
            <Chip
              size="small"
              variant="outlined"
              color="warning"
              label={`${changedRows.length.toLocaleString()} unsaved`}
            />
          )}
        </Stack>

        <Stack direction="row" spacing={3} sx={{ px: 2.5, py: 1.5 }} flexWrap="wrap">
          <Typography variant="body2">
            {total.toLocaleString()} rows in {MONTHS[month - 1]} {year}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gross on this page <b>{money(totals.gross)}</b>
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Advance <b>{money(totals.advance)}</b>
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Net <b>{money(totals.net)}</b>
          </Typography>
        </Stack>

        <TableContainer sx={{ maxHeight: 620 }}>
          <Table stickyHeader size="small" sx={{ minWidth: 2100 }}>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    size="small"
                    checked={allSelected}
                    indeterminate={selected.size > 0 && !allSelected}
                    onChange={handleSelectAll}
                    disabled={!total || bulkBusy || loading}
                  />
                </TableCell>
                <TableCell>Emp ID</TableCell>
                <TableCell sx={{ minWidth: 170 }}>Employee</TableCell>
                <TableCell sx={{ minWidth: 130 }}>rank</TableCell>
                {EARNINGS.map((f) => (
                  <TableCell key={f.key} align="right">
                    {f.label}
                  </TableCell>
                ))}
                <TableCell align="right">Gross Sal</TableCell>
                {DEDUCTIONS.map((f) => (
                  <TableCell key={f.key} align="right">
                    {f.label}
                  </TableCell>
                ))}
                <TableCell align="right">NetSalary</TableCell>
                <TableCell align="center">ClientID</TableCell>
                <TableCell sx={{ minWidth: 150 }}>Name</TableCell>
                <TableCell>Sal.Date</TableCell>
                <TableCell sx={{ minWidth: 130 }}>Paid/UnPaid</TableCell>
                <TableCell sx={{ minWidth: 180 }}>Remarks</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {rows.map((row) => {
                const key = `${row.id}-${row.slNo}`;
                return (
                  <SalaryRow
                    key={key}
                    row={row}
                    rowKey={key}
                    edited={pending.has(key)}
                    picked={selected.has(key)}
                    onToggle={toggleRow}
                    onPatch={patch}
                    onHistory={setHistoryFor}
                    onSlip={handleSlip}
                    slipBusy={slipBusy === key}
                  />
                );
              })}

              {!loading && !rows.length && (
                <TableRow>
                  <TableCell colSpan={25}>
                    <Box sx={{ py: 4, textAlign: 'center' }}>
                      <Typography variant="subtitle2">
                        No salary rows for {MONTHS[month - 1]} {year}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Use Generate Salary to build the month from attendance.
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(event, next) => setPage(next)}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={[25, 50, 100, 200]}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(parseInt(event.target.value, 10));
            setPage(0);
          }}
        />
      </Card>

      <SalaryHistoryDialog row={historyFor} onClose={() => setHistoryFor(null)} />
    </Container>
  );
}

// ----------------------------------------------------------------------

function SalaryHistoryDialog({ row, onClose }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!row?.fkEmployeeId) return;
    setLoading(true);
    getSalaryHistory(row.fkEmployeeId, 36)
      .then((res) => setRecords(res.records || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [row]);

  return (
    <Dialog open={!!row} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
          <Typography variant="h6">{row?.employeeName || 'Previous salaries'}</Typography>
          {row?.fkEmployeeId && <Chip size="small" label={`Code ${row.fkEmployeeId}`} />}
          <Chip size="small" color="primary" label={`${records.length} month(s)`} />
        </Stack>
      </DialogTitle>

      {loading && <LinearProgress />}

      <DialogContent dividers sx={{ p: 0 }}>
        <TableContainer sx={{ maxHeight: 460 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell>Month</TableCell>
                <TableCell>Rank</TableCell>
                <TableCell align="right">Basic</TableCell>
                <TableCell align="right">WDays</TableCell>
                <TableCell align="right">OT Days</TableCell>
                <TableCell align="right">Gross</TableCell>
                <TableCell align="right">Advance</TableCell>
                <TableCell align="right">Net</TableCell>
                <TableCell>Paid</TableCell>
                <TableCell>Client</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {records.map((r) => (
                <TableRow key={`${r.id}-${r.slNo}`} hover>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    {String(r.salaryDate ?? '').slice(0, 10)}
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{r.rank || '-'}</TableCell>
                  <TableCell align="right">{money(r.basicSalary)}</TableCell>
                  <TableCell align="right">{r.wDays ?? '-'}</TableCell>
                  <TableCell align="right">{r.otDays ?? '-'}</TableCell>
                  <TableCell align="right">{money(r.grossSalary)}</TableCell>
                  <TableCell align="right">{money(r.advance)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                    {money(r.netSalary)}
                  </TableCell>
                  <TableCell>{r.paid || '-'}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{r.clientName || '-'}</TableCell>
                </TableRow>
              ))}
              {!loading && !records.length && (
                <TableRow>
                  <TableCell colSpan={10}>
                    <Box sx={{ py: 3, textAlign: 'center' }}>
                      <Typography variant="subtitle2">No earlier salary on record</Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

SalaryHistoryDialog.propTypes = {
  row: PropTypes.object,
  onClose: PropTypes.func,
};
