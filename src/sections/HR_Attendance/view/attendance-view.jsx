import PropTypes from 'prop-types';
import { useSnackbar } from 'notistack';
import { memo, useMemo, useState, useEffect, useCallback, useDeferredValue } from 'react';

import Menu from '@mui/material/Menu';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Container from '@mui/material/Container';
import TextField from '@mui/material/TextField';
import ListItemText from '@mui/material/ListItemText';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';

import { paths } from 'src/routes/paths';
import { APP_API } from 'src/config-global';
import Iconify from 'src/components/iconify';
import { useSettingsContext } from 'src/components/settings';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';

import { getShifts } from 'src/api/shift';
import { useAuthFetch } from 'src/api/apibasemethods';
import { cleanEmployeeName } from 'src/utils/employee-name';
import { clientLabel, filterClientOptions } from 'src/utils/client-picker';
import { getClientRanks, getAllClientOptions, getClientRequirementMap } from 'src/api/hr-client';
import {
  getParadeState,
  getPreviousDay,
  getAttendanceSheet,
  saveAttendanceSheet,
  updateAttendanceSheet,
} from 'src/api/attendance';

import LazyPicker from '../lazy-picker';
import MarkedDaysPanel from '../marked-days-panel';
import { checkDailySheet } from '../daily-sheet-check';
import DailySheetCheckDialog from '../daily-sheet-check-dialog';
import AttendanceTableToolbar from '../attendance-table-toolbar';
import { buildParadeStatePdf } from '../parade-state-pdf';
import { buildDailyEmployeePdf } from '../daily-employee-pdf';
import { buildParadePriorityPdf } from '../parade-state-priority';
import { buildDailyAttendancePdf } from '../daily-attendance-pdf';
import QuickReportDialog, { QUICK_REPORTS } from '../quick-report-dialog';
import { buildAttendanceDocumentsPdf } from '../attendance-documents-pdf';
import { buildAttendanceDocumentsDocx } from '../attendance-documents-docx';
import AttendanceTableFiltersResult from '../attendance-filters-result';

// One guard's line. Memoised: the sheet shows up to 200 of these, each holding
// six pickers, and only the row that was touched should repaint. Every picker
// is a LazyPicker, so a row costs a few plain boxes until one is used.
// A client's name in one line, cut short with "..." like the category; the
// whole name shows on hover.
const NAME_CELL_SX = {
  maxWidth: 170,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

// The client and OT client boxes hold only a code, so they stay narrow; the
// list that drops down is wider, so the names can be read while picking.
const ID_PICKER_SX = { width: 100 };
const ID_PICKER_SLOTS = { popper: { style: { width: 340 }, placement: 'bottom-start' } };

// The category box is as narrow as the client name; a long category is cut
// short with "...", and its list opens wide enough to read every one.
const CATEGORY_PICKER_SX = { width: 160 };
const CATEGORY_PICKER_SLOTS = { popper: { style: { width: 240 }, placement: 'bottom-start' } };

const AttendanceRow = memo(
  ({
    sno,
    row,
    shifts,
    clientById,
    clientChoices,
    clientCodeFilter,
    rankChoices,
    showOtAmountColumn,
    wrongCategory,
    prev,
    onMark,
    onShift,
    onClient,
    onOtClient,
    onRank,
    onOvRank,
    onOvertimeAmount,
  }) => {
    const mark = markOf(row);
    const isOvertime = mark === OVERTIME_MARK;
    // The OT rate on the employee record drives salary on its own; the column is
    // only worth filling when a guard on overtime has no rate to work from.
    const needsAmount = isOvertime && !(Number(row.otRate) > 0);

    return (
      <TableRow hover>
        <TableCell>{sno}</TableCell>
        <TableCell>{row.empId}</TableCell>
        <TableCell sx={{ whiteSpace: 'nowrap' }}>
          {row.employeeName || `Employee ${row.empId}`}
        </TableCell>

        <TableCell>
          <LazyPicker text={mark} width={72} activateOnFocus={false}>
            {({ done }) => (
              <Select
                size="small"
                defaultOpen
                autoFocus
                value={mark}
                onChange={(event) => onMark(row.empId, event.target.value)}
                onClose={done}
                renderValue={(value) => value}
                sx={{ width: 72 }}
              >
                {marksFor(mark).map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            )}
          </LazyPicker>
        </TableCell>

        <TableCell>
          <LazyPicker
            text={shifts.find((sh) => sh.shiftId === row.shiftId)?.code || '-'}
            error={!row.shiftId}
            width={72}
            activateOnFocus={false}
          >
            {({ done }) => (
              <Select
                size="small"
                defaultOpen
                autoFocus
                error={!row.shiftId}
                value={row.shiftId || ''}
                onChange={(event) => onShift(row.empId, event.target.value)}
                onClose={done}
                displayEmpty
                renderValue={(value) => shifts.find((sh) => sh.shiftId === value)?.code || '-'}
                sx={{ width: 72 }}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {shifts.map((sh) => (
                  <MenuItem key={sh.shiftId} value={sh.shiftId}>
                    {sh.code} - {sh.name}
                  </MenuItem>
                ))}
              </Select>
            )}
          </LazyPicker>
          {prev?.shiftId && row.shiftId && prev.shiftId !== row.shiftId && (
            <Typography variant="caption" color="warning.main" display="block">
              was {shifts.find((sh) => sh.shiftId === prev.shiftId)?.code || '-'}
            </Typography>
          )}
        </TableCell>

        <TableCell align="center">
          <LazyPicker
            text={row.clientId != null ? String(row.clientId) : ''}
            placeholder="Code"
            error={!row.clientId}
            width={ID_PICKER_SX.width}
          >
            {({ done }) => (
              <Autocomplete
                size="small"
                autoHighlight
                openOnFocus
                options={clientChoices}
                filterOptions={clientCodeFilter}
                value={clientById.get(row.clientId) || null}
                onChange={(event, value) => onClient(row.empId, value)}
                getOptionLabel={(o) => (o?.clientId != null ? String(o.clientId) : '')}
                isOptionEqualToValue={(o, v) => o.clientId === v.clientId}
                renderOption={(props, option) => (
                  <li {...props} key={option.clientId}>
                    {option.label}
                  </li>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    autoFocus
                    onBlur={done}
                    placeholder="Code"
                    error={!row.clientId}
                  />
                )}
                sx={ID_PICKER_SX}
                slotProps={ID_PICKER_SLOTS}
              />
            )}
          </LazyPicker>
          {prev?.clientId && row.clientId && prev.clientId !== row.clientId && (
            <Typography
              variant="caption"
              color="warning.main"
              display="block"
              title={clientById.get(prev.clientId)?.name || ''}
            >
              was {prev.clientId}
            </Typography>
          )}
        </TableCell>

        <TableCell sx={NAME_CELL_SX} title={clientById.get(row.clientId)?.name || ''}>
          {clientById.get(row.clientId)?.name || '-'}
        </TableCell>

        <TableCell align="center">
          <LazyPicker
            text={row.otClientId != null ? String(row.otClientId) : ''}
            placeholder={isOvertime ? 'Code' : ''}
            error={isOvertime && !row.otClientId}
            disabled={!isOvertime}
            width={ID_PICKER_SX.width}
          >
            {({ done }) => (
              <Autocomplete
                size="small"
                autoHighlight
                openOnFocus
                options={clientChoices}
                filterOptions={clientCodeFilter}
                value={clientById.get(row.otClientId) || null}
                onChange={(event, value) => onOtClient(row.empId, value)}
                getOptionLabel={(o) => (o?.clientId != null ? String(o.clientId) : '')}
                isOptionEqualToValue={(o, v) => o.clientId === v.clientId}
                renderOption={(props, option) => (
                  <li {...props} key={option.clientId}>
                    {option.label}
                  </li>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    autoFocus
                    onBlur={done}
                    placeholder="Code"
                    error={!row.otClientId}
                  />
                )}
                sx={ID_PICKER_SX}
                slotProps={ID_PICKER_SLOTS}
              />
            )}
          </LazyPicker>
        </TableCell>

        <TableCell sx={NAME_CELL_SX} title={clientById.get(row.otClientId)?.name || ''}>
          {clientById.get(row.otClientId)?.name || '-'}
        </TableCell>

        <TableCell>
          <LazyPicker
            text={row.rank || ''}
            placeholder="Category..."
            error={wrongCategory}
            width={CATEGORY_PICKER_SX.width}
          >
            {({ done }) => (
              <Autocomplete
                size="small"
                freeSolo
                forcePopupIcon
                openOnFocus
                options={rankChoices}
                value={row.rank || null}
                onChange={(event, value) => onRank(row.empId, value)}
                onInputChange={(event, value, reason) => {
                  if (reason === 'input') onRank(row.empId, value);
                }}
                getOptionLabel={(o) => o || ''}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    autoFocus
                    onBlur={done}
                    placeholder="Category..."
                    // The whole category on hover, when the box cuts it short.
                    inputProps={{ ...params.inputProps, title: row.rank || '' }}
                    error={wrongCategory}
                  />
                )}
                // No clear button: it took half the narrow box. Deleting the text
                // clears the category all the same.
                disableClearable
                sx={CATEGORY_PICKER_SX}
                slotProps={CATEGORY_PICKER_SLOTS}
              />
            )}
          </LazyPicker>
          {wrongCategory && (
            <Typography variant="caption" color="error.main" display="block">
              Client did not ask for this
            </Typography>
          )}
        </TableCell>

        {/* The category the overtime duty was covered under - it can differ
          from his own. An overtime day's alone. */}
        <TableCell>
          <LazyPicker
            text={row.ovRank || ''}
            placeholder={isOvertime ? row.rank || 'OT Category' : ''}
            disabled={!isOvertime}
            width={CATEGORY_PICKER_SX.width}
          >
            {({ done }) => (
              <Autocomplete
                size="small"
                freeSolo
                forcePopupIcon
                openOnFocus
                disableClearable
                options={rankChoices}
                value={row.ovRank || ''}
                onChange={(event, value) => onOvRank(row.empId, value)}
                onInputChange={(event, value, reason) => {
                  if (reason === 'input') onOvRank(row.empId, value);
                }}
                getOptionLabel={(o) => o || ''}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    autoFocus
                    onBlur={done}
                    placeholder={row.rank || 'OT Category'}
                    inputProps={{ ...params.inputProps, title: row.ovRank || '' }}
                  />
                )}
                sx={CATEGORY_PICKER_SX}
                slotProps={CATEGORY_PICKER_SLOTS}
              />
            )}
          </LazyPicker>
        </TableCell>

        {showOtAmountColumn && (
          <TableCell align="center">
            {needsAmount && (
              <TextField
                size="small"
                type="number"
                placeholder="Amount"
                value={row.overtimeAmount || ''}
                onChange={(event) => onOvertimeAmount(row.empId, event.target.value)}
                sx={{ minWidth: 90 }}
              />
            )}
            {isOvertime && Number(row.otRate) > 0 && (
              <Typography variant="caption" color="text.secondary">
                {row.otRate}/shift
              </Typography>
            )}
          </TableCell>
        )}
      </TableRow>
    );
  }
);

AttendanceRow.displayName = 'AttendanceRow';

AttendanceRow.propTypes = {
  sno: PropTypes.number,
  row: PropTypes.object,
  shifts: PropTypes.array,
  clientById: PropTypes.object,
  clientChoices: PropTypes.array,
  clientCodeFilter: PropTypes.func,
  rankChoices: PropTypes.array,
  showOtAmountColumn: PropTypes.bool,
  wrongCategory: PropTypes.bool,
  prev: PropTypes.object,
  onMark: PropTypes.func,
  onShift: PropTypes.func,
  onClient: PropTypes.func,
  onOtClient: PropTypes.func,
  onRank: PropTypes.func,
  onOvRank: PropTypes.func,
  onOvertimeAmount: PropTypes.func,
};

// ----------------------------------------------------------------------
// The attendance sheet, laid out like the legacy one: employee, his mark for
// the day, shift, the client he worked at, the client he did overtime for,
// and his category.
//
// The mark is one choice per guard. P/P is the overtime mark, which is why it
// is the one that asks for an OT client: in the legacy data 101,970 of the
// 102,119 rows with an OT client are P/P.
// ----------------------------------------------------------------------

const MARKS = [
  { value: 'P', label: 'P - Present' },
  { value: 'A', label: 'A - Absent' },
  { value: 'L', label: 'L - Leave' },
  { value: 'P/P', label: 'P/P - Present + Overtime' },
];

// Older sheets carry two marks this screen no longer offers. A row that has
// one keeps it in its own list, so it still shows and can be changed.
const LEGACY_MARKS = { G: 'G - Gazetted', WO: 'WO - Week Off' };

const marksFor = (mark) =>
  LEGACY_MARKS[mark] ? [...MARKS, { value: mark, label: LEGACY_MARKS[mark] }] : MARKS;

const OVERTIME_MARK = 'P/P';

/** The mark a saved row carries. A row with nothing set counts as present. */
const markOf = (row) => {
  if (row.overtime) return OVERTIME_MARK;
  if (row.absent) return 'A';
  if (row.leave) return 'L';
  if (row.gazzetted) return 'G';
  if (row.weekOff) return 'WO';
  return 'P';
};

/** The stored flags for a mark. The sheet keeps storing flags, as it always has. */
const flagsForMark = (mark) => ({
  present: mark === 'P' || mark === OVERTIME_MARK,
  overtime: mark === OVERTIME_MARK,
  absent: mark === 'A',
  leave: mark === 'L',
  gazzetted: mark === 'G',
  weekOff: mark === 'WO',
});

// The category filter's value for a row with no category.
const NO_CATEGORY = '__none__';

const EMPTY_FILTERS = { name: '', client: '', mark: '', category: '', check: '', track: '' };

// The Day changes filter: the day on screen against the guard's previous day.
const TRACK_OPTIONS = [
  { value: 'short', label: 'At a short client' },
  { value: 'transferred', label: 'Transferred to another client' },
  { value: 'shift', label: 'Shift changed' },
  { value: 'new', label: 'New entry (not on previous day)' },
  { value: 'changed', label: 'Changed from previous day' },
];

// 500+ clients on every row, so the popup is capped - Autocomplete renders the
// listbox only while open, and the limit keeps that render small.
const clientFilter = createFilterOptions({ limit: 50, stringify: (o) => o.label });

// The code column is what is picked from; the name column shows what was
// picked. Searching still matches the name, so a site is found either way.
const clientCodeFilter = filterClientOptions;

export default function AttendanceView() {
  const settings = useSettingsContext();
  const { enqueueSnackbar } = useSnackbar();

  const [locationId, setLocationId] = useState('');

  // The sheet is opened for a base location and a date. The CLIENT is recorded
  // per guard, on his own row - that is how the legacy system stores it, because
  // guards rotate between sites and a whole sheet is rarely one client.
  const [clientOptions, setClientOptions] = useState([]);
  const [shifts, setShifts] = useState([]);
  // Per client, the categories asked for and how many by day and by night.
  const [requirementsByClient, setRequirementsByClient] = useState(new Map());
  const [checkOpen, setCheckOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [rankList, setRankList] = useState([]);
  const [dateStr, setDateStr] = useState(new Date().toISOString().split('T')[0]);

  const [loading, setLoading] = useState(false);
  const [paradeBusy, setParadeBusy] = useState(false);
  // The Reports dropdown: where it opens, and which report is being built.
  const [reportsAnchor, setReportsAnchor] = useState(null);
  // The documents report reads every guard's scans, so it says how far
  // along it is rather than sitting silent.
  // false, 'pdf' or 'word' - which of the two is being built.
  const [docsBusy, setDocsBusy] = useState(false);
  const [docsDone, setDocsDone] = useState(0);
  const [sheetData, setSheetData] = useState(null);
  // The sheet on screen is the legacy history's own record of the day.
  const [fromLegacy, setFromLegacy] = useState(false);
  // Each guard's previous day, to find who moved, changed shift or changed.
  const [previousDay, setPreviousDay] = useState({ date: null, byEmp: new Map() });

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const [filters, setFilters] = useState(EMPTY_FILTERS);

  const handleFilters = useCallback((name, value) => {
    setFilters((prevState) => ({
      ...prevState,
      [name]: value,
    }));
    setPage(0);
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS);
    setPage(0);
  }, []);

  const canReset = Object.values(filters).some(Boolean);

  const authFetch = useAuthFetch();
  const [locations, setLocations] = useState([]);
  const [locLoading, setLocLoading] = useState(true);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const res = await authFetch(`${APP_API}/api/Dropdown/locations`);
        if (res.ok) {
          const data = await res.json();
          setLocations(data);
        }
      } catch (err) {
        console.error('Failed to fetch locations', err);
      } finally {
        setLocLoading(false);
      }
    };
    fetchLocations();
  }, [authFetch]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [clients, shiftRows, requirementMap, ranks] = await Promise.all([
          getAllClientOptions(),
          getShifts(true).catch(() => []),
          getClientRequirementMap().catch(() => new Map()),
          getClientRanks().catch(() => []),
        ]);
        if (cancelled) return;
        setClientOptions(clients);
        setShifts(shiftRows);
        setRequirementsByClient(requirementMap);
        setRankList(ranks || []);
      } catch (err) {
        console.error('Failed to load clients', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLoadSheet = async (forDate) => {
    const date = typeof forDate === 'string' ? forDate : dateStr;
    if (!date) {
      enqueueSnackbar('Please select Date', { variant: 'warning' });
      return;
    }

    setLoading(true);
    setPage(0);

    try {
      const [res, prev] = await Promise.all([
        getAttendanceSheet(locationId, date),
        // The comparison is a help, not the sheet: a failure leaves it empty.
        getPreviousDay(date).catch(() => ({ previousDate: null, records: [] })),
      ]);
      setPreviousDay({
        date: prev.previousDate ? String(prev.previousDate).slice(0, 10) : null,
        byEmp: new Map(prev.records.map((r) => [r.empId ?? r.EmpId, r])),
      });

      const prevByEmp = new Map(prev.records.map((r) => [r.empId ?? r.EmpId, r]));
      // A new employee has no client or shift yet: he starts at the head office
      // (client GM) on the day shift, marked absent until he is posted.
      const dayShiftId = shifts.find((sh) => String(sh.code).toUpperCase() === 'D')?.shiftId ?? null;
      const gmClientId =
        clientOptions.find((c) => String(c.name || '').trim().toUpperCase() === 'GM')?.clientId ?? null;

      const sheet = {
        ...res.sheet,
        details: (res.sheet?.details || []).map((row) => {
          const base = { ...row, employeeName: cleanEmployeeName(row.employeeName) };

          // A saved sheet, or a day from the legacy history, shows what was
          // actually marked.
          if (res.exists || res.fromLegacy) return base;

          // A fresh day starts as an exact copy of the guard's previous day:
          // the same mark (P, P/P, A, L...), shift, client and overtime client.
          const before = prevByEmp.get(base.empId);
          const beforeMark = before ? (before.mark ?? before.Mark ?? '') : '';
          if (before && beforeMark) {
            const pick = (camel, pascal, fallback) => before[camel] ?? before[pascal] ?? fallback;
            return {
              ...base,
              shiftId: pick('shiftId', 'ShiftId', base.shiftId),
              clientId: pick('clientId', 'ClientId', base.clientId),
              otClientId: pick('otClientId', 'OtClientId', null),
              rank: pick('rank', 'Rank', base.rank),
              ovRank: pick('ovRank', 'OvRank', base.ovRank),
              ...flagsForMark(beforeMark),
            };
          }

          if (!base.clientId || !base.shiftId) {
            return {
              ...base,
              clientId: base.clientId || gmClientId,
              shiftId: base.shiftId || dayShiftId,
              ...flagsForMark('A'),
            };
          }

          // Not on the previous day but already posted: starts present.
          return { ...base, ...flagsForMark('P') };
        }),
      };

      setSheetData(sheet);
      setFromLegacy(!!res.fromLegacy);

      if (res.fromLegacy) {
        enqueueSnackbar('Loaded this date as marked in the legacy HR system', { variant: 'info' });
      } else if (res.exists) {
        enqueueSnackbar(
          locationId
            ? 'Loaded existing attendance sheet'
            : 'Loaded existing attendance sheets for all locations',
          { variant: 'info' }
        );
      } else {
        enqueueSnackbar(
          locationId
            ? 'Generated new attendance template'
            : 'Generated new attendance template for all locations',
          { variant: 'success' }
        );
      }
    } catch (err) {
      console.error(err);
      enqueueSnackbar(err.message || 'Error loading attendance', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Stable, so a memoised row is not re-rendered by a new function each time.
  const updateRow = useCallback(
    (empId, patch) =>
      setSheetData((prev) => {
        const details = [...prev.details];
        const index = details.findIndex((d) => d.empId === empId);
        if (index !== -1) details[index] = { ...details[index], ...patch };
        return { ...prev, details };
      }),
    []
  );

  /** Rows that cannot be saved yet, and what each one is missing. */
  const rowProblem = (row) => {
    if (!row.clientId) return 'a client';
    if (!row.shiftId) return 'a shift';
    // A guard marked P/P did overtime duty somewhere, so the sheet needs to
    // know which client it was.
    if (markOf(row) === OVERTIME_MARK && !row.otClientId) return 'an OT client';
    return null;
  };

  const handleSave = async () => {
    if (!sheetData) return;

    const problems = (sheetData.details || [])
      .map((row, index) => ({ row, index, missing: rowProblem(row) }))
      .filter((item) => item.missing);

    if (problems.length) {
      const counts = problems.reduce((acc, item) => {
        acc[item.missing] = (acc[item.missing] || 0) + 1;
        return acc;
      }, {});
      const summary = Object.entries(counts)
        .map(([missing, count]) => `${count} need ${missing}`)
        .join(', ');
      enqueueSnackbar(`Cannot save: ${summary}.`, { variant: 'warning' });

      // Jump to the first row that needs attention, since the sheet is paged.
      const first = problems[0];
      setFilters(EMPTY_FILTERS);
      setPage(Math.floor(first.index / rowsPerPage));
      return;
    }

    setLoading(true);
    try {
      // API payload matches PayRollSaveRequest in C#
      const payload = {
        locationPlaceId: sheetData.locationPlaceId,
        attendenceDate: sheetData.attendenceDate,
        details: sheetData.details,
      };

      if (sheetData.payRollMstId) {
        await updateAttendanceSheet(sheetData.payRollMstId, payload);
        enqueueSnackbar('Attendance updated successfully', { variant: 'success' });
      } else {
        const res = await saveAttendanceSheet(payload);
        enqueueSnackbar('Attendance saved successfully', { variant: 'success' });
        setSheetData((prev) => ({ ...prev, payRollMstId: res.payRollMstId }));
      }
    } catch (err) {
      console.error(err);
      enqueueSnackbar(err.message || 'Error saving attendance', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkChange = useCallback(
    (empId, mark) => {
      const patch = flagsForMark(mark);
      // Overtime details belong to the P/P mark alone.
      if (mark !== OVERTIME_MARK) {
        patch.otClientId = null;
        patch.overtimeAmount = null;
        patch.ovRank = null;
      }
      updateRow(empId, patch);
    },
    [updateRow]
  );

  const handleShiftChange = useCallback(
    (empId, value) => updateRow(empId, { shiftId: value === '' ? null : value }),
    [updateRow]
  );

  const handleOvertimeAmountChange = useCallback(
    (empId, value) => updateRow(empId, { overtimeAmount: value }),
    [updateRow]
  );

  // Every client, so a row already pointing at a closed site still shows it.
  const clientById = useMemo(() => {
    const map = new Map();
    clientOptions.forEach((c) => map.set(c.clientId, { ...c, label: clientLabel(c) }));
    return map;
  }, [clientOptions]);

  // Sites whose contract is closed are not offered for new marking.
  const clientChoices = useMemo(
    () => Array.from(clientById.values()).filter((c) => !c.isClosed),
    [clientById]
  );

  const handleClientChange = useCallback(
    (empId, value) => updateRow(empId, { clientId: value?.clientId ?? null }),
    [updateRow]
  );

  const handleOtClientChange = useCallback(
    (empId, value) => updateRow(empId, { otClientId: value?.clientId ?? null }),
    [updateRow]
  );

  const handleOvRankChange = useCallback(
    (empId, value) => updateRow(empId, { ovRank: value || null }),
    [updateRow]
  );

  const handleRankChange = useCallback(
    (empId, value) => updateRow(empId, { rank: value || null }),
    [updateRow]
  );

  // Every category in use, the same list the rank pickers elsewhere offer. A
  // guard can be marked under any of them, not only the ones his site
  // contracts for.
  const rankChoices = useMemo(() => {
    const set = new Set((rankList || []).map((r) => String(r).trim()).filter(Boolean));
    requirementsByClient.forEach((list) => list.forEach((r) => set.add(String(r.rank).trim())));
    // "." is a stray value in the contract data, not a category.
    set.delete('.');
    return Array.from(set).sort();
  }, [rankList, requirementsByClient]);

  const isSaved = !!sheetData?.payRollMstId;

  // The OT rate on the employee record drives salary on its own. The column is
  // only worth showing while somebody on overtime has no rate to work from.
  const showOtAmountColumn = (sheetData?.details || []).some(
    (row) => markOf(row) === OVERTIME_MARK && !(Number(row.otRate) > 0)
  );

  // Day or night, from the shift's code - as the parade state counts it.
  const shiftOf = useCallback(
    (row) => {
      const shift = shifts.find((sh) => sh.shiftId === row.shiftId);
      return String(shift?.code || '').toUpperCase() === 'N' ? 'N' : 'D';
    },
    [shifts]
  );

  // The daily sheet check, kept current with the sheet: the dialog shows it,
  // and the sheet's own filter and red category boxes come from it.
  const checkResult = useMemo(
    () =>
      sheetData
        ? checkDailySheet(sheetData.details, { requirementsByClient, clientById, markOf, shiftOf })
        : null,
    [sheetData, requirementsByClient, clientById, shiftOf]
  );
  const wrongIds = checkResult?.wrongIds;

  // The Day changes filter's guards. Short clients are read as the parade
  // state reads them: required by day and by night against on post plus
  // overtime cover (its SH column), from the whole sheet. A P/P guard worked
  // both shifts - his own at his client, the other at his OT client - so a
  // site of 1 day + 1 night held by one P/P guard is not short.
  const dayChanges = useMemo(() => {
    const details = sheetData?.details || [];
    const perClient = new Map();
    const add = (clientId, shift) => {
      if (!perClient.has(clientId)) perClient.set(clientId, { D: 0, N: 0 });
      perClient.get(clientId)[shift] += 1;
    };
    details.forEach((row) => {
      if (!row.clientId) return;
      const mark = markOf(row);
      const shift = shiftOf(row);
      if (!perClient.has(row.clientId)) perClient.set(row.clientId, { D: 0, N: 0 });
      if (mark === 'P' || mark === OVERTIME_MARK) add(row.clientId, shift);
      if (mark === OVERTIME_MARK) add(row.otClientId || row.clientId, shift === 'N' ? 'D' : 'N');
    });
    // Each short client and by how many, day and night.
    const shortClients = new Map();
    perClient.forEach((counts, clientId) => {
      const client = clientById.get(clientId);
      const reqDay = Number(client?.requiredDay) || 0;
      const reqNight = Number(client?.requiredNight) || 0;
      if (counts.D < reqDay || counts.N < reqNight) {
        shortClients.set(clientId, {
          D: Math.max(0, reqDay - counts.D),
          N: Math.max(0, reqNight - counts.N),
        });
      }
    });

    const sets = {
      short: new Set(),
      transferred: new Set(),
      shift: new Set(),
      new: new Set(),
      changed: new Set(),
      shortClients,
    };
    details.forEach((row) => {
      if (shortClients.has(row.clientId)) sets.short.add(row.empId);
      const prev = previousDay.byEmp.get(row.empId);
      if (!prev) {
        // Only with a previous day to compare with is a guard new.
        if (previousDay.date) sets.new.add(row.empId);
        return;
      }
      const moved = !!(prev.clientId && row.clientId && prev.clientId !== row.clientId);
      const shifted = !!(prev.shiftId && row.shiftId && prev.shiftId !== row.shiftId);
      if (moved) sets.transferred.add(row.empId);
      if (shifted) sets.shift.add(row.empId);
      const same = (a, b) => String(a ?? '').trim() === String(b ?? '').trim();
      if (
        moved ||
        shifted ||
        !same(prev.mark, markOf(row)) ||
        !same(prev.otClientId, row.otClientId) ||
        !same(prev.rank, row.rank) ||
        !same(prev.ovRank, row.ovRank)
      ) {
        sets.changed.add(row.empId);
      }
    });
    return sets;
  }, [sheetData, previousDay, clientById, shiftOf]);

  const trackOptions = useMemo(
    () => TRACK_OPTIONS.map((o) => ({ ...o, count: dayChanges[o.value].size })),
    [dayChanges]
  );

  // The choices in the attendance and category filters, each with its count.
  const markOptions = useMemo(() => {
    const counts = new Map();
    (sheetData?.details || []).forEach((row) => {
      const mark = markOf(row);
      counts.set(mark, (counts.get(mark) || 0) + 1);
    });
    const legacy = Object.entries(LEGACY_MARKS)
      .filter(([value]) => counts.has(value))
      .map(([value, label]) => ({ value, label }));
    return [...MARKS, ...legacy].map((m) => ({ ...m, count: counts.get(m.value) || 0 }));
  }, [sheetData]);

  const categoryOptions = useMemo(() => {
    const counts = new Map();
    (sheetData?.details || []).forEach((row) => {
      const category = String(row.rank || '').trim() || NO_CATEGORY;
      counts.set(category, (counts.get(category) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([value, count]) => ({
        value,
        label: value === NO_CATEGORY ? '(no category)' : value,
        count,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [sheetData]);

  // Searched by name or by employee code, since the code is what the guards
  // and the paper sheets are known by; and by the client, on either the worked
  // site or the overtime one.
  //
  // It reads a deferred copy of the filters: the filter boxes answer every
  // keystroke at once and the table catches up when React has a moment, so
  // typing a name or clearing a filter never freezes the screen.
  const deferredFilters = useDeferredValue(filters);
  const filteredDetails = useMemo(() => {
    const who = (deferredFilters.name || '').trim().toLowerCase();
    const where = (deferredFilters.client || '').trim().toLowerCase();
    const { mark, category, check, track } = deferredFilters;
    if (!who && !where && !mark && !category && !check && !track) return sheetData?.details || [];

    const clientText = (clientId) => {
      if (clientId == null) return '';
      const client = clientById.get(clientId);
      return `${clientId} ${client?.name ?? ''}`.toLowerCase();
    };

    return (sheetData?.details || []).filter((row) => {
      if (who) {
        const name = (row.employeeName || `Employee ${row.empId}`).toLowerCase();
        const code = String(row.empId ?? '');
        if (!name.includes(who) && !code.includes(who)) return false;
      }
      if (where) {
        const hit =
          clientText(row.clientId).includes(where) || clientText(row.otClientId).includes(where);
        if (!hit) return false;
      }
      if (mark && markOf(row) !== mark) return false;
      if (category && (String(row.rank || '').trim() || NO_CATEGORY) !== category) return false;
      if (check === 'wrong' && !wrongIds?.has(row.empId)) return false;
      if (track && !dayChanges[track]?.has(row.empId)) return false;
      return true;
    });
  }, [sheetData, deferredFilters, clientById, wrongIds, dayChanges]);

  const paginatedDetails = filteredDetails.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const columnCount = 11 + (showOtAmountColumn ? 1 : 0);

  const incompleteCount = (sheetData?.details || []).filter((row) => rowProblem(row)).length;

  // The sheet on screen is the report: what the client box has filtered to,
  // in the shape the by-employee parade state prints.
  const paradeRows = useMemo(
    () =>
      filteredDetails
        .filter((row) => row.clientId)
        .map((row) => {
          const mark = markOf(row);
          return {
            empId: row.empId,
            employeeName: row.employeeName,
            clientId: row.clientId,
            clientName: clientById.get(row.clientId)?.name || `Client ${row.clientId}`,
            groupName: clientById.get(row.clientId)?.groupName || '',
            shift: shiftOf(row),
            attendance: mark,
            category: row.rank || '',
            otClientId: row.otClientId || null,
            otClientName: clientById.get(row.otClientId)?.name || '',
            // The category he covered the overtime duty under.
            ovCategory: mark === OVERTIME_MARK ? row.ovRank || row.rank || '' : '',
          };
        }),
    [filteredDetails, clientById, shiftOf]
  );

  // The same report in either format: the PDF opens in a tab, the Word
  // file downloads so it can be edited.
  const handleDocuments = async (format) => {
    if (!paradeRows.length) {
      enqueueSnackbar('No marked guards to report', { variant: 'info' });
      return;
    }

    setDocsBusy(format);
    setDocsDone(0);
    try {
      const location = (locations || []).find((loc) => (loc.id || loc.ID) === locationId);
      const options = {
        locationName: location
          ? location.location || location.LOCATION || location.name
          : 'All Locations',
        onProgress: (done) => setDocsDone(done),
      };

      let missing;
      if (format === 'word') {
        const built = await buildAttendanceDocumentsDocx(paradeRows, dateStr, options);
        ({ missing } = built);
        const url = URL.createObjectURL(built.blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = built.filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      } else {
        const built = await buildAttendanceDocumentsPdf(paradeRows, dateStr, options);
        ({ missing } = built);
        window.open(built.url, '_blank');
      }

      if (missing.length) {
        enqueueSnackbar(
          `No documents found for ${missing.length} guard${missing.length === 1 ? '' : 's'}`,
          { variant: 'warning' }
        );
      }
    } catch (err) {
      console.error(err);
      enqueueSnackbar(err.message || 'Could not build the documents report', { variant: 'error' });
    } finally {
      setDocsBusy(false);
    }
  };

  // Daily Parade State and the priority sheet are the Parade State report
  // from the menu, for the sheet's date: the same server figures, read from
  // the saved sheet (or the legacy history for a day with none), built by the
  // same PDF builders. Unsaved changes on screen are not in them.
  const handleParadeState = async (priority) => {
    setParadeBusy(true);
    try {
      const res = await getParadeState(dateStr);
      if (!res.records.length) {
        enqueueSnackbar('No client sites to report for this date', { variant: 'info' });
        return;
      }
      const build = priority ? buildParadePriorityPdf : buildParadeStatePdf;
      window.open(await build(res.records, dateStr), '_blank');
      if (!isSaved) {
        enqueueSnackbar(
          'This sheet is not saved yet - the parade state shows what is saved for the date',
          {
            variant: 'info',
          }
        );
      }
    } catch (err) {
      console.error(err);
      enqueueSnackbar(err.message || 'Could not build the parade state', { variant: 'error' });
    } finally {
      setParadeBusy(false);
    }
  };

  // Quick Reporting as of the sheet's date: the daily attendance list of the
  // guards one option picks, from the whole sheet on screen.
  const quickCounts = useMemo(() => {
    const details = sheetData?.details || [];
    const byMark = (m) => details.filter((row) => markOf(row) === m).length;
    return {
      absent: byMark('A'),
      leave: byMark('L'),
      overtime: byMark(OVERTIME_MARK),
      short: dayChanges.short.size,
      transferred: dayChanges.transferred.size,
      new: dayChanges.new.size,
      shift: dayChanges.shift.size,
      changed: dayChanges.changed.size,
    };
  }, [sheetData, dayChanges]);

  const handleQuickReport = (choice) => {
    const option = QUICK_REPORTS.find((o) => o.value === choice);
    const details = sheetData?.details || [];
    const prevLabel = previousDay.date ? previousDay.date.split('-').reverse().join('/') : '';
    const clientName = (id) => (id ? clientById.get(id)?.name || `Client ${id}` : '');
    const shiftCode = (id) => shifts.find((sh) => sh.shiftId === id)?.code || '-';
    const prevOf = (row) => previousDay.byEmp.get(row.empId) || {};

    const pick =
      {
        absent: (row) => markOf(row) === 'A',
        leave: (row) => markOf(row) === 'L',
        overtime: (row) => markOf(row) === OVERTIME_MARK,
      }[choice] || ((row) => dayChanges[choice]?.has(row.empId));

    // The last column, where the report has something better to say than
    // the overtime location.
    let lastHeader;
    let lastOf = () => '';
    if (choice === 'short') {
      lastHeader = 'SHORT AT CLIENT';
      lastOf = (row) => {
        const s = dayChanges.shortClients.get(row.clientId) || {};
        return [s.D && `Day ${s.D}`, s.N && `Night ${s.N}`].filter(Boolean).join(', ');
      };
    } else if (choice === 'transferred') {
      lastHeader = `PREVIOUS CLIENT (${prevLabel})`;
      lastOf = (row) => clientName(prevOf(row).clientId);
    } else if (choice === 'shift') {
      lastHeader = `SHIFT (${prevLabel} > TODAY)`;
      lastOf = (row) => `${shiftCode(prevOf(row).shiftId)} > ${shiftOf(row)}`;
    } else if (choice === 'changed') {
      lastHeader = `CHANGED SINCE ${prevLabel}`;
      lastOf = (row) => {
        const prev = prevOf(row);
        const same = (a, b) => String(a ?? '').trim() === String(b ?? '').trim();
        const parts = [];
        if (!same(prev.mark, markOf(row))) parts.push(`Atten ${prev.mark || '-'} > ${markOf(row)}`);
        if (prev.shiftId && row.shiftId && prev.shiftId !== row.shiftId) {
          parts.push(`Shift ${shiftCode(prev.shiftId)} > ${shiftOf(row)}`);
        }
        if (prev.clientId && row.clientId && prev.clientId !== row.clientId) {
          parts.push(`Client ${prev.clientId} > ${row.clientId}`);
        }
        if (!same(prev.otClientId, row.otClientId)) {
          parts.push(`OT client ${prev.otClientId || '-'} > ${row.otClientId || '-'}`);
        }
        if (!same(prev.rank, row.rank)) parts.push('Category');
        if (!same(prev.ovRank, row.ovRank)) parts.push('OT category');
        return parts.join(', ');
      };
    }

    const rows = details.filter(pick).map((row) => ({
      shift: shiftOf(row),
      mark: markOf(row),
      empId: row.empId,
      employeeName: row.employeeName || `Employee ${row.empId}`,
      location: clientName(row.clientId),
      otLocation: row.otClientId ? clientName(row.otClientId) : '',
      last: lastOf(row),
    }));
    if (!rows.length) {
      enqueueSnackbar(`No guards for ${option?.label || choice} on this date`, { variant: 'info' });
      return;
    }
    try {
      window.open(
        buildDailyAttendancePdf(rows, { dateStr, title: option?.title, lastHeader }),
        '_blank'
      );
    } catch (err) {
      console.error(err);
      enqueueSnackbar(err.message || 'Could not build the report', { variant: 'error' });
    }
  };

  const handleParadePdf = async () => {
    if (!paradeRows.length) {
      enqueueSnackbar('No marked guards to report', { variant: 'info' });
      return;
    }

    setParadeBusy(true);
    try {
      const url = await buildDailyEmployeePdf(paradeRows, dateStr);
      window.open(url, '_blank');
    } catch (err) {
      console.error(err);
      enqueueSnackbar(err.message || 'Could not build the parade state', { variant: 'error' });
    } finally {
      setParadeBusy(false);
    }
  };

  const reports = [
    {
      key: 'parade',
      label: 'Daily Parade State',
      hint: 'Every site: required against on post, by group',
      disabled: !dateStr || paradeBusy,
      run: () => handleParadeState(false),
    },
    {
      key: 'priority',
      label: 'Daily Priority State',
      hint: 'The parade state, groups with the most guards first',
      disabled: !dateStr || paradeBusy,
      run: () => handleParadeState(true),
    },
    {
      key: 'client',
      label: filters.client ? `Client Parade State - "${filters.client}"` : 'Client Parade State',
      hint: filters.client
        ? `Guards at the clients matching "${filters.client}"`
        : 'Guards at every client, client by client',
      disabled: !paradeRows.length || paradeBusy,
      run: handleParadePdf,
    },
    {
      key: 'cnic',
      label: 'CNIC Location - PDF',
      hint: 'Each guard with photo, signature, CNIC and soldier book',
      disabled: !paradeRows.length || !!docsBusy,
      run: () => handleDocuments('pdf'),
    },
    {
      key: 'cnic-word',
      label: 'CNIC Location - Word',
      hint: 'The same, as an editable Word file',
      disabled: !paradeRows.length || !!docsBusy,
      run: () => handleDocuments('word'),
    },
  ];

  let reportsLabel = 'Reports';
  if (docsBusy) reportsLabel = `Building ${docsDone}/${paradeRows.length}...`;
  else if (paradeBusy) reportsLabel = 'Building...';

  return (
    <Container maxWidth={settings.themeStretch ? false : 'lg'}>
      <CustomBreadcrumbs
        heading="Daily Parade State"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR', href: paths.dashboard.HR_Module.root },
          { name: 'Attendance' },
          { name: 'Daily Parade State' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card sx={{ p: 3, mb: 3 }}>
        <Stack sx={{ mb: isSaved || (fromLegacy && sheetData) ? 2 : 0 }}>
          {isSaved && (
            <Typography variant="body2" color="info.main">
              Attendance for this date is already saved. Change what you need and save again - the
              sheet is replaced with what is on screen.
            </Typography>
          )}
          {!isSaved && fromLegacy && sheetData && (
            <Typography variant="body2" color="info.main">
              This date is shown as it was marked in the legacy HR system. Saving it makes it this
              app&apos;s sheet for the day.
            </Typography>
          )}
        </Stack>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
          <FormControl fullWidth>
            <InputLabel id="attendance-location-label">Location</InputLabel>
            <Select
              labelId="attendance-location-label"
              label="Location"
              value={locationId}
              onChange={(event) => setLocationId(event.target.value)}
              disabled={locLoading}
            >
              <MenuItem value="">
                <em>All Locations</em>
              </MenuItem>
              {(locations || []).map((loc) => (
                <MenuItem key={loc.id || loc.ID} value={loc.id || loc.ID}>
                  {loc.location || loc.LOCATION || loc.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <DatePicker
            label="Date"
            value={dateStr ? new Date(dateStr) : null}
            onChange={(newDate) => {
              if (newDate && !Number.isNaN(newDate.getTime())) {
                const year = newDate.getFullYear();
                const month = String(newDate.getMonth() + 1).padStart(2, '0');
                const day = String(newDate.getDate()).padStart(2, '0');
                setDateStr(`${year}-${month}-${day}`);
              } else {
                setDateStr('');
              }
            }}
            slotProps={{ textField: { fullWidth: true } }}
            format="dd/MM/yyyy"
          />

          <Button
            variant="contained"
            onClick={handleLoadSheet}
            color="primary"
            disabled={loading}
            size="large"
            sx={{ px: 4, whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            {loading ? 'Loading...' : 'Load'}
          </Button>
        </Stack>
      </Card>

      <MarkedDaysPanel
        selectedDate={dateStr}
        onPick={(date) => {
          setDateStr(date);
          handleLoadSheet(date);
        }}
      />

      {sheetData && (
        <Card>
          <AttendanceTableToolbar
            filters={filters}
            onFilters={handleFilters}
            markOptions={markOptions}
            categoryOptions={categoryOptions}
            wrongCount={wrongIds ? wrongIds.size : null}
            trackOptions={trackOptions}
            previousDate={previousDay.date}
          />
          {canReset && (
            <AttendanceTableFiltersResult
              filters={filters}
              onFilters={handleFilters}
              onResetFilters={handleResetFilters}
              results={filteredDetails.length}
              sx={{ p: 2.5, pt: 0 }}
            />
          )}

          {/* The check and the reports, on what the filters above show. */}
          <Stack
            direction="row"
            justifyContent="flex-end"
            alignItems="center"
            spacing={1.5}
            flexWrap="wrap"
            useFlexGap
            sx={{ px: 2.5, pb: 2.5 }}
          >
            <Button
              variant="outlined"
              color={wrongIds?.size ? 'error' : 'primary'}
              startIcon={<Iconify icon="solar:checklist-minimalistic-bold" />}
              onClick={() => setCheckOpen(true)}
              disabled={loading}
              sx={{ whiteSpace: 'nowrap' }}
            >
              Check Daily Sheet
            </Button>

            <Button
              variant="outlined"
              color="primary"
              startIcon={<Iconify icon="solar:document-text-bold" />}
              onClick={() => setQuickOpen(true)}
              disabled={loading || !sheetData?.details?.length}
              sx={{ whiteSpace: 'nowrap' }}
            >
              Quick Report
            </Button>

            <Button
              variant="contained"
              color="inherit"
              startIcon={<Iconify icon="solar:document-text-bold" />}
              endIcon={<Iconify icon="eva:arrow-ios-downward-fill" />}
              onClick={(event) => setReportsAnchor(event.currentTarget)}
              disabled={loading || !!docsBusy || paradeBusy}
              sx={{ whiteSpace: 'nowrap' }}
            >
              {reportsLabel}
            </Button>

            <Menu
              anchorEl={reportsAnchor}
              open={!!reportsAnchor}
              onClose={() => setReportsAnchor(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              {reports.map((report, index) => (
                <MenuItem
                  key={report.key}
                  disabled={report.disabled}
                  onClick={() => {
                    setReportsAnchor(null);
                    report.run();
                  }}
                  sx={{ py: 1, minWidth: 320 }}
                >
                  <ListItemText
                    primary={`${index < 4 ? index + 1 : 5}. ${report.label}`}
                    secondary={report.hint}
                    primaryTypographyProps={{ typography: 'body2', fontWeight: 600 }}
                    secondaryTypographyProps={{ typography: 'caption' }}
                  />
                </MenuItem>
              ))}
            </Menu>
          </Stack>

          <TableContainer sx={{ minHeight: 400 }}>
            <Table sx={{ minWidth: 1200 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 56 }}>S.No</TableCell>
                  <TableCell>Emp ID</TableCell>
                  <TableCell>Employee</TableCell>
                  <TableCell>Atten</TableCell>
                  <TableCell>Shift</TableCell>
                  <TableCell align="center" sx={{ width: 110 }}>
                    Client ID
                  </TableCell>
                  <TableCell>Client</TableCell>
                  <TableCell align="center" sx={{ width: 110 }}>
                    OT Client ID
                  </TableCell>
                  <TableCell>OT Client</TableCell>
                  <TableCell sx={{ width: 170 }}>Category</TableCell>
                  <TableCell sx={{ width: 170 }}>OT Category</TableCell>
                  {showOtAmountColumn && <TableCell align="center">OT Amount</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedDetails.map((row, index) => (
                  <AttendanceRow
                    key={row.empId}
                    sno={page * rowsPerPage + index + 1}
                    row={row}
                    shifts={shifts}
                    clientById={clientById}
                    clientChoices={clientChoices}
                    clientCodeFilter={clientCodeFilter}
                    rankChoices={rankChoices}
                    showOtAmountColumn={showOtAmountColumn}
                    wrongCategory={!!wrongIds?.has(row.empId)}
                    prev={previousDay.byEmp.get(row.empId)}
                    onMark={handleMarkChange}
                    onShift={handleShiftChange}
                    onClient={handleClientChange}
                    onOtClient={handleOtClientChange}
                    onRank={handleRankChange}
                    onOvRank={handleOvRankChange}
                    onOvertimeAmount={handleOvertimeAmountChange}
                  />
                ))}

                {filteredDetails.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={columnCount} align="center">
                      <Typography variant="subtitle2" sx={{ py: 3 }}>
                        {sheetData.details.length === 0
                          ? 'No employees found for this location.'
                          : 'Nobody matches these filters.'}
                      </Typography>
                      {sheetData.details.length > 0 && (
                        <Button
                          size="small"
                          color="inherit"
                          onClick={handleResetFilters}
                          sx={{ mb: 2 }}
                        >
                          Clear filters
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={filteredDetails.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[25, 50, 100, 200]}
          />

          <Stack
            direction="row"
            justifyContent="flex-end"
            alignItems="center"
            flexWrap="wrap"
            useFlexGap
            spacing={2}
            sx={{ p: 3 }}
          >
            {incompleteCount > 0 && (
              <Typography variant="body2" color="warning.main">
                {incompleteCount} row(s) still need a client, a shift or an OT client
              </Typography>
            )}
            <Button
              size="large"
              variant="contained"
              color="primary"
              onClick={handleSave}
              disabled={loading}
            >
              {isSaved ? 'Update Attendance' : 'Save Attendance'}
            </Button>
          </Stack>
        </Card>
      )}

      <QuickReportDialog
        open={quickOpen}
        onClose={() => setQuickOpen(false)}
        counts={quickCounts}
        dateLabel={dateStr ? dateStr.split('-').reverse().join('/') : ''}
        previousLabel={previousDay.date ? previousDay.date.split('-').reverse().join('/') : ''}
        onShow={handleQuickReport}
      />

      <DailySheetCheckDialog
        open={checkOpen}
        onClose={() => setCheckOpen(false)}
        result={checkResult}
        dateLabel={dateStr ? dateStr.split('-').reverse().join('/') : ''}
        onShowOnSheet={() => {
          setFilters({ ...EMPTY_FILTERS, check: 'wrong' });
          setPage(0);
          setCheckOpen(false);
        }}
      />
    </Container>
  );
}
