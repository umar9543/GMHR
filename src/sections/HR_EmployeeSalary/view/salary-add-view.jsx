import PropTypes from 'prop-types';
import { memo, useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { useSnackbar } from 'notistack';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import Checkbox from '@mui/material/Checkbox';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Container from '@mui/material/Container';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import LinearProgress from '@mui/material/LinearProgress';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import { styled } from '@mui/material/styles';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { useSettingsContext } from 'src/components/settings';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';

import {
  getSalarySheetById,
  saveSalarySheetChunked,
  getEmployeeSalarySheet,
  fetchAllSalarySheetRows,
  getSalarySheetLocationSummary,
} from 'src/api/employee-salary';

// ----------------------------------------------------------------------

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

const ALL_LOCATIONS = 0;

// A row carries 7 number inputs, so the page size is the dominant cost of the
// screen. 25 mounts in well under a second; 250+ is opt-in.
const ROWS_PER_PAGE_OPTIONS = [25, 50, 100, 250];
const DEFAULT_ROWS_PER_PAGE = 25;

// Page size used when pulling every row back for a save. The server caps it at 1000.
const EXPORT_PAGE_SIZE = 1000;

// Fields the summary strip sums, mapped to the matching server-side grand total.
const TOTAL_FIELDS = [
  { field: 'salary', totalKey: 'totalSalary', label: 'Total Salary' },
  { field: 'daysMonth', totalKey: 'totalDaysMonth', label: 'Total D/M' },
  { field: 'avgSalary', totalKey: 'totalAvgSalary', label: 'Total Avg.Sal' },
  { field: 'a', totalKey: 'totalA', label: 'Total A' },
  { field: 'totalPayableDays', totalKey: 'totalPayableDays', label: 'Total Pr/Day' },
  { field: 'deductionAmount', totalKey: 'totalDeductionAmount', label: 'Total Deduct' },
  { field: 'netSalary', totalKey: 'totalNetSalary', label: 'Total NetSal' },
  { field: 'otRate', totalKey: 'totalOTRate', label: 'Total OTRate' },
  { field: 'otDays', totalKey: 'totalOtDays', label: 'OT Days' },
  { field: 'eotAmount', totalKey: 'totalEOTAmount', label: 'Total OT' },
  { field: 'totalSalary', totalKey: 'totalTotalSalary', label: 'Total Sal' },
  { field: 'lessAdvance', totalKey: 'totalLessAdvance', label: 'Tot.Adv' },
  { field: 'lessLoan', totalKey: 'totalLessLoan', label: 'Tot.Loan' },
  { field: 'alreadyPay', totalKey: 'totalAlreadyPay', label: 'Total Al/Pay' },
  { field: 'totalPayInRupees', totalKey: 'totalPayInRupees', label: 'Total' },
];

// Same arithmetic the server applies, so an edited row stays consistent with the
// untouched rows that make up the server-side grand totals.
function recalcRow(row) {
  const daysMonth = Number(row.daysMonth) || 0;
  const salary = Number(row.salary) || 0;
  const a = Number(row.a) || 0;
  const otRate = Number(row.otRate) || 0;
  const otDays = Number(row.otDays) || 0;
  const lessAdvance = Number(row.lessAdvance) || 0;
  const lessLoan = Number(row.lessLoan) || 0;
  const alreadyPay = Number(row.alreadyPay) || 0;

  const avgSalary = daysMonth ? salary / daysMonth : 0;
  const totalPayableDays = daysMonth - a;
  const deductionAmount = a * avgSalary;
  const netSalary = avgSalary * totalPayableDays;
  const eotAmount = otRate * otDays;
  const totalSalary = netSalary + eotAmount;

  return {
    ...row,
    salary,
    a,
    otRate,
    otDays,
    lessAdvance,
    lessLoan,
    alreadyPay,
    avgSalary,
    totalPayableDays,
    deductionAmount,
    netSalary,
    eotAmount,
    totalSalary,
    totalPayInRupees: totalSalary - lessAdvance - lessLoan - alreadyPay,
  };
}

function toSavePayloadRow(row, daysInMonth) {
  return {
    empId: row.empId,
    fslCode: row.fslCode ?? null,
    name: row.name ?? null,
    salary: Number(row.salary) || 0,
    daysMonth: String(row.daysMonth ?? daysInMonth),
    avgSalary: Number(row.avgSalary) || 0,
    totalPayableDays: Number(row.totalPayableDays) || 0,
    totalSalary: Number(row.totalSalary) || 0,
    lessAdvance: Number(row.lessAdvance) || 0,
    lessLoan: Number(row.lessLoan) || 0,
    totalPayInRupees: Number(row.totalPayInRupees) || 0,
    eotAmount: Number(row.eotAmount) || 0,
    bankAccount: row.bankAccount ?? null,
    branchName: row.branchName ?? null,
    gz: Number(row.gz) || 0,
    replaceBit: !!row.replaceBit,
    a: Number(row.a) || 0,
    deductionAmount: Number(row.deductionAmount) || 0,
    netSalary: Number(row.netSalary) || 0,
    otRate: Number(row.otRate) || 0,
    otDays: Number(row.otDays) || 0,
    alreadyPay: Number(row.alreadyPay) || 0,
  };
}

const fNum = (value) => Math.round(Number(value) || 0).toLocaleString();

// A plain themed input instead of MUI's TextField. TextField mounts an
// OutlinedInput + NotchedOutline + label tree per cell; at 7 cells x 100 rows
// that measured ~8.7s of blocked main thread against ~0.8s for this.
const NumberInput = styled('input')(({ theme }) => ({
  width: 84,
  padding: '6px 8px',
  textAlign: 'center',
  font: 'inherit',
  color: theme.palette.text.primary,
  backgroundColor: 'transparent',
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  '&:focus': {
    outline: 'none',
    borderColor: theme.palette.primary.main,
  },
  '&:disabled': {
    color: theme.palette.text.disabled,
    backgroundColor: theme.palette.action.disabledBackground,
  },
}));

// Memoised on its own props so a keystroke re-renders one row rather than the
// whole page (measured 2300ms -> 4ms per update at 100 rows).
function SalaryRowBase({ row, selected, showLocation, disabled, onToggle, onChange }) {
  const cell = (field) => (
    <TableCell align="center">
      <NumberInput
        type="number"
        value={row[field] ?? 0}
        disabled={!selected || disabled}
        onChange={(event) => onChange(row.empId, field, event.target.value)}
      />
    </TableCell>
  );

  return (
    <TableRow hover selected={selected}>
      <TableCell padding="checkbox">
        <Checkbox checked={selected} disabled={disabled} onChange={() => onToggle(row.empId)} />
      </TableCell>

      {showLocation && (
        <TableCell>
          {row.locationName || (
            <Typography variant="caption" color="error">
              Unassigned
            </Typography>
          )}
        </TableCell>
      )}
      <TableCell>{row.name}</TableCell>

      {cell('salary')}

      <TableCell align="center">{row.daysMonth}</TableCell>
      <TableCell align="center">{Number(row.avgSalary || 0).toFixed(2)}</TableCell>

      {cell('a')}

      <TableCell align="center">{fNum(row.totalPayableDays)}</TableCell>
      <TableCell align="center">{fNum(row.deductionAmount)}</TableCell>
      <TableCell align="center">{fNum(row.netSalary)}</TableCell>

      {cell('otRate')}
      {cell('otDays')}

      <TableCell align="center">{fNum(row.eotAmount)}</TableCell>
      <TableCell align="center">{fNum(row.totalSalary)}</TableCell>

      {cell('lessAdvance')}
      {cell('lessLoan')}
      {cell('alreadyPay')}

      <TableCell align="center">
        <Typography variant="subtitle2" color="primary">
          {fNum(row.totalPayInRupees)}
        </Typography>
      </TableCell>

      <TableCell>{row.designation}</TableCell>
    </TableRow>
  );
}

SalaryRowBase.propTypes = {
  row: PropTypes.object.isRequired,
  selected: PropTypes.bool,
  showLocation: PropTypes.bool,
  disabled: PropTypes.bool,
  onToggle: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
};

const SalaryRow = memo(SalaryRowBase);

// ----------------------------------------------------------------------

export default function EmployeeSalaryAddView({ id }) {
  const settings = useSettingsContext();
  const { enqueueSnackbar } = useSnackbar();
  const router = useRouter();
  const isEdit = !!id;

  // ---- filters -------------------------------------------------------
  const [locationId, setLocationId] = useState(ALL_LOCATIONS);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(currentYear);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  // ---- server paging --------------------------------------------------
  const [page, setPage] = useState(0); // 0-based for MUI, 1-based on the wire
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_ROWS_PER_PAGE);
  const [totalCount, setTotalCount] = useState(0);

  // ---- data -----------------------------------------------------------
  const [locations, setLocations] = useState([]);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null); // { exists, source, allLocations, daysInMonth, sheet, savedSheets }
  const [serverTotals, setServerTotals] = useState(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState(null); // { done, total }

  // Every row the user has touched, keyed by empId, so edits survive page changes.
  const [edits, setEdits] = useState(() => new Map());
  // Pristine server copies of every row seen so far - needed to compute totals as
  // "server grand total + deltas" without holding all 50k rows in memory.
  const originalsRef = useRef(new Map());

  // Selection is inverted at this scale: everything is selected and the user opts
  // rows out, so a 50k-row sheet never needs 50k ids in state.
  const [selectAll, setSelectAll] = useState(true);
  const [exceptions, setExceptions] = useState(() => new Set());

  const isAllLocations = !locationId || locationId === ALL_LOCATIONS;
  const daysInMonth = meta?.daysInMonth ?? new Date(year, month, 0).getDate();

  const selectedCount = selectAll ? Math.max(totalCount - exceptions.size, 0) : exceptions.size;

  // ---- location list --------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    const fetchLocations = async () => {
      try {
        const res = await getSalarySheetLocationSummary(month, year);
        if (!cancelled) setLocations(res.locations || []);
      } catch (err) {
        console.error('Failed to fetch locations', err);
      }
    };
    fetchLocations();
    return () => {
      cancelled = true;
    };
  }, [month, year]);

  // ---- fetching -------------------------------------------------------
  const rememberRows = useCallback((incoming) => {
    incoming.forEach((row) => {
      if (!originalsRef.current.has(row.empId)) {
        originalsRef.current.set(row.empId, row);
      }
    });
  }, []);

  const applyResponse = useCallback(
    (res) => {
      const details = res.sheet?.details || [];
      rememberRows(details);
      setRows(details);
      setTotalCount(res.pagination?.totalCount ?? details.length);
      setServerTotals(res.totals || null);
      setMeta({
        exists: res.exists,
        source: res.source,
        allLocations: res.allLocations,
        daysInMonth: res.daysInMonth,
        sheet: res.sheet,
        savedSheets: res.savedSheets || [],
      });
    },
    [rememberRows]
  );

  const fetchPage = useCallback(
    async (nextPage, nextRowsPerPage, nextSearch) => {
      setLoading(true);
      try {
        const res = isEdit
          ? await getSalarySheetById(id, {
              page: nextPage + 1,
              pageSize: nextRowsPerPage,
              search: nextSearch,
            })
          : await getEmployeeSalarySheet({
              locationId,
              month,
              year,
              page: nextPage + 1,
              pageSize: nextRowsPerPage,
              search: nextSearch,
            });

        applyResponse(res);
        return res;
      } catch (err) {
        console.error(err);
        enqueueSnackbar(err.message || 'Error loading salary sheet', { variant: 'error' });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [applyResponse, enqueueSnackbar, id, isEdit, locationId, month, year]
  );

  // An existing sheet opened from the list loads straight away.
  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      const res = await fetchPage(0, rowsPerPage, '');
      if (res?.sheet) {
        setLocationId(res.sheet.locationId);
        setMonth(res.sheet.monthId);
        setYear(res.sheet.yearId);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEdit]);

  const resetSheetState = () => {
    setEdits(new Map());
    originalsRef.current = new Map();
    setSelectAll(true);
    setExceptions(new Set());
    setPage(0);
  };

  const handleLoadSheet = async () => {
    if (!month || !year) {
      enqueueSnackbar('Please select Month and Year', { variant: 'warning' });
      return;
    }

    resetSheetState();
    const res = await fetchPage(0, rowsPerPage, search);
    if (!res) return;

    if (res.exists) {
      enqueueSnackbar(
        isAllLocations
          ? `Loaded ${res.savedSheets?.length || 0} existing sheet(s) for ${res.pagination.totalCount.toLocaleString()} rows`
          : 'Loaded existing salary sheet',
        { variant: 'info' }
      );
    } else {
      enqueueSnackbar(
        `Generated template for ${res.pagination.totalCount.toLocaleString()} employees`,
        { variant: 'success' }
      );
    }
  };

  const handleChangePage = async (_event, nextPage) => {
    setPage(nextPage);
    await fetchPage(nextPage, rowsPerPage, search);
  };

  const handleChangeRowsPerPage = async (event) => {
    const next = parseInt(event.target.value, 10);
    setRowsPerPage(next);
    setPage(0);
    await fetchPage(0, next, search);
  };

  const handleSearch = async () => {
    setSearch(searchInput);
    setPage(0);
    await fetchPage(0, rowsPerPage, searchInput);
  };

  // ---- selection ------------------------------------------------------
  const isRowSelected = useCallback(
    (empId) => (selectAll ? !exceptions.has(empId) : exceptions.has(empId)),
    [selectAll, exceptions]
  );

  // Stable identity, so SalaryRow's memo actually holds.
  const handleToggleRow = useCallback((empId) => {
    setExceptions((prev) => {
      const next = new Set(prev);
      if (next.has(empId)) next.delete(empId);
      else next.add(empId);
      return next;
    });
  }, []);

  // Header checkbox flips the whole filtered set, not just the visible page.
  const handleSelectAllClick = (event) => {
    setSelectAll(event.target.checked);
    setExceptions(new Set());
  };

  const pageAllSelected = rows.length > 0 && rows.every((r) => isRowSelected(r.empId));
  const pageSomeSelected = rows.some((r) => isRowSelected(r.empId));

  // ---- editing --------------------------------------------------------
  const effectiveRow = useCallback(
    (empId) => edits.get(empId) || originalsRef.current.get(empId),
    [edits]
  );

  const handleCellChange = useCallback((empId, field, rawValue) => {
    const value = rawValue === '' ? 0 : parseFloat(rawValue) || 0;

    setEdits((prev) => {
      const next = new Map(prev);
      const base = next.get(empId) || originalsRef.current.get(empId);
      if (!base) return prev;
      next.set(empId, recalcRow({ ...base, [field]: value }));
      return next;
    });
  }, []);

  const displayRows = useMemo(
    () => rows.map((row) => edits.get(row.empId) || row),
    [rows, edits]
  );

  // ---- totals ---------------------------------------------------------
  // Grand totals come from the server across the WHOLE filtered set; local edits
  // and de-selections are then applied as deltas on top.
  const totals = useMemo(() => {
    const result = {};

    if (selectAll) {
      TOTAL_FIELDS.forEach(({ field, totalKey }) => {
        result[field] = Number(serverTotals?.[totalKey]) || 0;
      });

      edits.forEach((current, empId) => {
        if (exceptions.has(empId)) return;
        const original = originalsRef.current.get(empId);
        if (!original) return;
        TOTAL_FIELDS.forEach(({ field }) => {
          result[field] += (Number(current[field]) || 0) - (Number(original[field]) || 0);
        });
      });

      exceptions.forEach((empId) => {
        const original = originalsRef.current.get(empId);
        if (!original) return;
        TOTAL_FIELDS.forEach(({ field }) => {
          result[field] -= Number(original[field]) || 0;
        });
      });
    } else {
      TOTAL_FIELDS.forEach(({ field }) => {
        result[field] = 0;
      });
      exceptions.forEach((empId) => {
        const row = effectiveRow(empId);
        if (!row) return;
        TOTAL_FIELDS.forEach(({ field }) => {
          result[field] += Number(row[field]) || 0;
        });
      });
    }

    return result;
  }, [selectAll, serverTotals, edits, exceptions, effectiveRow]);

  // ---- saving ---------------------------------------------------------
  // Only the current page is in memory, so a save first walks every page of the
  // filtered set, applies the local edits, then streams the result back in chunks.
  const collectRowsToSave = useCallback(async () => {
    if (!selectAll) {
      return Array.from(exceptions)
        .map((empId) => effectiveRow(empId))
        .filter(Boolean);
    }

    const all = await fetchAllSalarySheetRows(
      { locationId, month, year, search },
      {
        pageSize: EXPORT_PAGE_SIZE,
        fetchPage: isEdit
          ? (p, size) => getSalarySheetById(id, { page: p, pageSize: size, search })
          : undefined,
        onProgress: (done, total) => setSaveProgress({ done, total, phase: 'Collecting' }),
      }
    );

    return all
      .filter((row) => !exceptions.has(row.empId))
      .map((row) => edits.get(row.empId) || row);
  }, [selectAll, exceptions, effectiveRow, isEdit, id, search, locationId, month, year, edits]);

  const handleSave = async () => {
    if (!meta) return;

    if (selectedCount === 0) {
      enqueueSnackbar('No employees selected to save!', { variant: 'warning' });
      return;
    }

    if (search) {
      enqueueSnackbar('A search filter is active - only matching rows will be saved.', {
        variant: 'warning',
      });
    }

    setSaving(true);
    setSaveProgress({ done: 0, total: selectedCount, phase: 'Collecting' });

    try {
      const allRows = await collectRowsToSave();

      // In "All Locations" mode a sheet is still stored per location, so the rows
      // are grouped and each location gets its own master record.
      const byLocation = new Map();
      allRows.forEach((row) => {
        const key = isAllLocations ? row.locationId : locationId;
        if (!byLocation.has(key)) byLocation.set(key, []);
        byLocation.get(key).push(toSavePayloadRow(row, daysInMonth));
      });

      let written = 0;
      let skipped = 0;
      const grandTotal = allRows.length;

      // Sequential on purpose: each location opens its own master before writing.
      // eslint-disable-next-line no-restricted-syntax
      for (const [loc, details] of byLocation.entries()) {
        if (!loc) {
          // A sheet is stored per location, so employees with no FKLOCATIONID
          // cannot be written anywhere.
          skipped += details.length;
          // eslint-disable-next-line no-continue
          continue;
        }
        const before = written;
        // eslint-disable-next-line no-await-in-loop
        await saveSalarySheetChunked(
          { locationId: loc, monthId: month, yearId: year, replace: true },
          details,
          {
            onProgress: (done) =>
              setSaveProgress({ done: before + done, total: grandTotal, phase: 'Saving' }),
          }
        );
        written += details.length;
      }

      enqueueSnackbar(
        `Saved ${written.toLocaleString()} row(s) across ${byLocation.size} location(s)`,
        { variant: 'success' }
      );

      if (skipped > 0) {
        enqueueSnackbar(
          `${skipped.toLocaleString()} employee(s) have no location assigned and were not saved.`,
          { variant: 'warning' }
        );
      }

      if (isEdit) {
        router.push(paths.dashboard.HR_Module.Salary.Sheet.list);
      } else {
        setEdits(new Map());
        await fetchPage(page, rowsPerPage, search);
      }
    } catch (err) {
      console.error(err);
      enqueueSnackbar(err.message || 'Error saving salary sheet', { variant: 'error' });
    } finally {
      setSaving(false);
      setSaveProgress(null);
    }
  };

  // ---- render ---------------------------------------------------------
  const renderSummaryRow = (label, value) => (
    <Stack direction="row" justifyContent="space-between" sx={{ maxWidth: 250, mb: 0.5 }}>
      <Typography variant="body2">{label}:</Typography>
      <Typography variant="subtitle2" color="error">
        {fNum(value)}
      </Typography>
    </Stack>
  );

  const columnCount = isAllLocations ? 19 : 18;

  const savedLabel = isEdit ? 'Update Salary Sheet' : 'Save Salary Sheet';
  const saveButtonLabel = saving ? 'Saving...' : savedLabel;

  return (
    <Container maxWidth={settings.themeStretch ? false : 'xl'}>
      <CustomBreadcrumbs
        heading="Employee Salary Sheet"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR', href: paths.dashboard.HR_Module.root },
          { name: 'Salary Sheet' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card sx={{ p: 3, mb: 3 }}>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
            <FormControl fullWidth disabled={isEdit}>
              <InputLabel>Location</InputLabel>
              <Select
                value={locationId}
                label="Location"
                onChange={(e) => setLocationId(e.target.value)}
              >
                <MenuItem value={ALL_LOCATIONS}>
                  <em>All Locations</em>
                </MenuItem>
                {(locations || []).map((loc) => (
                  <MenuItem key={loc.locationId} value={loc.locationId}>
                    {loc.locationName}
                    {loc.employeeCount ? ` (${loc.employeeCount.toLocaleString()})` : ''}
                    {loc.hasSavedSheet ? ' • saved' : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth disabled={isEdit}>
              <InputLabel>Month</InputLabel>
              <Select value={month} label="Month" onChange={(e) => setMonth(e.target.value)}>
                {MONTHS.map((m) => (
                  <MenuItem key={m.value} value={m.value}>
                    {m.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth disabled={isEdit}>
              <InputLabel>Year</InputLabel>
              <Select value={year} label="Year" onChange={(e) => setYear(e.target.value)}>
                {YEARS.map((y) => (
                  <MenuItem key={y} value={y}>
                    {y}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Button
              variant="contained"
              onClick={handleLoadSheet}
              color="primary"
              disabled={loading || saving}
              sx={{ height: 40, px: 4 }}
            >
              {loading ? 'Loading...' : 'Generate'}
            </Button>
          </Stack>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
            <TextField
              fullWidth
              size="small"
              label="Search name or employee code"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch();
              }}
              disabled={!meta || saving}
            />
            <Button variant="outlined" onClick={handleSearch} disabled={!meta || loading || saving}>
              Search
            </Button>
            {!!search && (
              <Button
                color="inherit"
                onClick={() => {
                  setSearchInput('');
                  setSearch('');
                  setPage(0);
                  fetchPage(0, rowsPerPage, '');
                }}
                disabled={loading || saving}
              >
                Clear
              </Button>
            )}
          </Stack>
        </Stack>
      </Card>

      {meta && (
        <Card>
          {(loading || saving) && <LinearProgress />}

          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={1}
            alignItems={{ md: 'center' }}
            justifyContent="space-between"
            sx={{ px: 3, py: 2 }}
          >
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip
                size="small"
                color={meta.exists ? 'info' : 'success'}
                label={meta.exists ? 'Saved sheet' : 'New template'}
              />
              <Chip size="small" variant="outlined" label={`${totalCount.toLocaleString()} rows`} />
              <Chip
                size="small"
                variant="outlined"
                label={`${selectedCount.toLocaleString()} selected`}
              />
              {isAllLocations && (
                <Chip
                  size="small"
                  variant="outlined"
                  color="warning"
                  label={`All locations (${locations.length})`}
                />
              )}
              {edits.size > 0 && (
                <Chip size="small" color="warning" label={`${edits.size} edited`} />
              )}
            </Stack>

            {saveProgress && (
              <Typography variant="caption" color="text.secondary">
                {saveProgress.phase} {saveProgress.done.toLocaleString()} /{' '}
                {saveProgress.total.toLocaleString()}
              </Typography>
            )}
          </Stack>

          {isAllLocations && meta.savedSheets?.length > 0 && (
            <Alert severity="info" sx={{ mx: 3, mb: 2 }}>
              {meta.savedSheets.length} location(s) already have a saved sheet for this period.
              Saving will overwrite them.
            </Alert>
          )}

          <Divider />

          <TableContainer sx={{ maxHeight: 600 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={pageSomeSelected && !pageAllSelected}
                      checked={selectAll && exceptions.size === 0}
                      onChange={handleSelectAllClick}
                      title="Select every row in the filtered set"
                    />
                  </TableCell>
                  {isAllLocations && <TableCell>LOCATION</TableCell>}
                  <TableCell>NAME</TableCell>
                  <TableCell align="center">SALARY</TableCell>
                  <TableCell align="center">D/M</TableCell>
                  <TableCell align="center">AVG.SAL</TableCell>
                  <TableCell align="center">A</TableCell>
                  <TableCell align="center">PAYABLE/DAYS</TableCell>
                  <TableCell align="center">DEDUCT AMOUNT</TableCell>
                  <TableCell align="center">NET/SALARY</TableCell>
                  <TableCell align="center">OT RATE</TableCell>
                  <TableCell align="center">WORK HOURS</TableCell>
                  <TableCell align="center">TOTAL OT</TableCell>
                  <TableCell align="center">TOTAL SALARY</TableCell>
                  <TableCell align="center">ADVANCE</TableCell>
                  <TableCell align="center">LESS LOAN</TableCell>
                  <TableCell align="center">ALREADY PAY</TableCell>
                  <TableCell align="center">TOTAL</TableCell>
                  <TableCell>DESIGNATION</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {displayRows.map((row) => (
                  <SalaryRow
                    key={row.empId}
                    row={row}
                    selected={isRowSelected(row.empId)}
                    showLocation={isAllLocations}
                    disabled={saving}
                    onToggle={handleToggleRow}
                    onChange={handleCellChange}
                  />
                ))}

                {!loading && displayRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={columnCount} align="center">
                      <Typography variant="subtitle2" sx={{ py: 3 }}>
                        No employees found for this selection.
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
            rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />

          <Divider />

          <Box sx={{ p: 3, bgcolor: 'background.neutral' }}>
            <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Grand totals - all {selectedCount.toLocaleString()} selected rows, not just this page
            </Typography>
            <Grid container spacing={2}>
              {[0, 5, 10].map((offset) => (
                <Grid item xs={12} md={4} key={offset}>
                  {TOTAL_FIELDS.slice(offset, offset + 5).map(({ field, label }) =>
                    renderSummaryRow(label, totals[field])
                  )}
                </Grid>
              ))}
            </Grid>
          </Box>

          <Divider />

          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ p: 3 }}
          >
            <Typography variant="body2" color="text.secondary">
              Selected: {selectedCount.toLocaleString()} / {totalCount.toLocaleString()} Employees
            </Typography>
            <Button
              size="large"
              variant="contained"
              color="primary"
              onClick={handleSave}
              disabled={loading || saving || selectedCount === 0}
            >
              {saveButtonLabel}
            </Button>
          </Stack>
        </Card>
      )}
    </Container>
  );
}

EmployeeSalaryAddView.propTypes = {
  id: PropTypes.string,
};
