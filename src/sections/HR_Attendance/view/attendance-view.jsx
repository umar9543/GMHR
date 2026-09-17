import { useSnackbar } from 'notistack';
import { useMemo, useState, useEffect, useCallback } from 'react';

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
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';

import { paths } from 'src/routes/paths';
import { APP_API } from 'src/config-global';
import { useSettingsContext } from 'src/components/settings';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';

import { getShifts } from 'src/api/shift';
import { useAuthFetch } from 'src/api/apibasemethods';
import { cleanEmployeeName } from 'src/utils/employee-name';
import { getClientRanks, getClientRankMap, getAllClientOptions } from 'src/api/hr-client';
import { getAttendanceSheet, saveAttendanceSheet, updateAttendanceSheet } from 'src/api/attendance';

import AttendanceTableToolbar from '../attendance-table-toolbar';
import AttendanceTableFiltersResult from '../attendance-filters-result';

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

// 500+ clients on every row, so the popup is capped - Autocomplete renders the
// listbox only while open, and the limit keeps that render small.
const clientFilter = createFilterOptions({ limit: 50, stringify: (o) => o.label });

export default function AttendanceView() {
  const settings = useSettingsContext();
  const { enqueueSnackbar } = useSnackbar();

  const [locationId, setLocationId] = useState('');

  // The sheet is opened for a base location and a date. The CLIENT is recorded
  // per guard, on his own row - that is how the legacy system stores it, because
  // guards rotate between sites and a whole sheet is rarely one client.
  const [clientOptions, setClientOptions] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [ranksByClient, setRanksByClient] = useState(new Map());
  const [rankList, setRankList] = useState([]);
  const [dateStr, setDateStr] = useState(new Date().toISOString().split('T')[0]);

  const [loading, setLoading] = useState(false);
  const [sheetData, setSheetData] = useState(null);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const [filters, setFilters] = useState({ name: '' });

  const handleFilters = useCallback((name, value) => {
    setFilters((prevState) => ({
      ...prevState,
      [name]: value,
    }));
    setPage(0);
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters({ name: '' });
    setPage(0);
  }, []);

  const canReset = !!filters.name;

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
        const [clients, shiftRows, rankMap, ranks] = await Promise.all([
          getAllClientOptions(),
          getShifts(true).catch(() => []),
          getClientRankMap().catch(() => new Map()),
          getClientRanks().catch(() => []),
        ]);
        if (cancelled) return;
        setClientOptions(clients);
        setShifts(shiftRows);
        setRanksByClient(rankMap);
        setRankList(ranks || []);
      } catch (err) {
        console.error('Failed to load clients', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLoadSheet = async () => {
    if (!dateStr) {
      enqueueSnackbar('Please select Date', { variant: 'warning' });
      return;
    }

    setLoading(true);
    setPage(0);

    try {
      const res = await getAttendanceSheet(locationId, dateStr);

      const sheet = {
        ...res.sheet,
        details: (res.sheet?.details || []).map((row) => {
          const base = { ...row, employeeName: cleanEmployeeName(row.employeeName) };

          // A saved sheet must show what was actually marked. A fresh template
          // starts everyone at Present, which is the day's usual case.
          if (res.exists) return base;

          return { ...base, ...flagsForMark('P') };
        }),
      };

      setSheetData(sheet);

      if (res.exists) {
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

  const updateRow = (empId, patch) =>
    setSheetData((prev) => {
      const details = [...prev.details];
      const index = details.findIndex((d) => d.empId === empId);
      if (index !== -1) details[index] = { ...details[index], ...patch };
      return { ...prev, details };
    });

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
      setFilters({ name: '' });
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

  const handleMarkChange = (empId) => (event) => {
    const mark = event.target.value;
    const patch = flagsForMark(mark);
    // Overtime details belong to the P/P mark alone.
    if (mark !== OVERTIME_MARK) {
      patch.otClientId = null;
      patch.overtimeAmount = null;
    }
    updateRow(empId, patch);
  };

  const handleShiftChange = (empId) => (event) =>
    updateRow(empId, { shiftId: event.target.value === '' ? null : event.target.value });

  const handleOvertimeAmountChange = (empId) => (event) =>
    updateRow(empId, { overtimeAmount: event.target.value });

  // Every client, so a row already pointing at a closed site still shows it.
  const clientById = useMemo(() => {
    const map = new Map();
    clientOptions.forEach((c) => map.set(c.clientId, { ...c, label: `${c.clientId} - ${c.name}` }));
    return map;
  }, [clientOptions]);

  // Sites whose contract is closed are not offered for new marking.
  const clientChoices = useMemo(
    () => Array.from(clientById.values()).filter((c) => !c.isClosed),
    [clientById]
  );

  const handleClientChange = (empId) => (event, value) =>
    updateRow(empId, { clientId: value?.clientId ?? null });

  const handleOtClientChange = (empId) => (event, value) =>
    updateRow(empId, { otClientId: value?.clientId ?? null });

  const handleRankChange = (empId) => (event, value) => updateRow(empId, { rank: value || null });

  // Every category in use, the same list the rank pickers elsewhere offer. A
  // guard can be marked under any of them, not only the ones his site
  // contracts for.
  const rankChoices = useMemo(() => {
    const set = new Set((rankList || []).map((r) => String(r).trim()).filter(Boolean));
    ranksByClient.forEach((list) => list.forEach((r) => set.add(String(r).trim())));
    // "." is a stray value in the contract data, not a category.
    set.delete('.');
    return Array.from(set).sort();
  }, [rankList, ranksByClient]);

  const isLocked = !!sheetData?.payRollMstId;

  // The OT rate on the employee record drives salary on its own. The column is
  // only worth showing while somebody on overtime has no rate to work from.
  const needsOtAmount = (row) => markOf(row) === OVERTIME_MARK && !(Number(row.otRate) > 0);

  const showOtAmountColumn = (sheetData?.details || []).some(needsOtAmount);

  const filteredDetails = (sheetData?.details || []).filter(
    (row) =>
      !filters.name ||
      (row.employeeName || `Employee ${row.empId}`).toLowerCase().includes(filters.name.toLowerCase())
  );

  const paginatedDetails = filteredDetails.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const columnCount = 9 + (showOtAmountColumn ? 1 : 0);

  const incompleteCount = (sheetData?.details || []).filter((row) => rowProblem(row)).length;

  return (
    <Container maxWidth={settings.themeStretch ? false : 'lg'}>
      <CustomBreadcrumbs
        heading="Attendance Sheet"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR', href: paths.dashboard.HR_Module.root },
          { name: 'Attendance' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card sx={{ p: 3, mb: 3 }}>
        <Stack>
          {isLocked && (
            <Typography variant="body2" color="error.main">
              Attendance for this date is already marked and cannot be edited.
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
            sx={{ height: 40, px: 4 }}
          >
            {loading ? 'Loading...' : 'Load'}
          </Button>
        </Stack>
      </Card>

      {sheetData && (
        <Card>
          <AttendanceTableToolbar filters={filters} onFilters={handleFilters} />
          {canReset && (
            <AttendanceTableFiltersResult
              filters={filters}
              onFilters={handleFilters}
              onResetFilters={handleResetFilters}
              results={filteredDetails.length}
              sx={{ p: 2.5, pt: 0 }}
            />
          )}

          <TableContainer sx={{ minHeight: 400 }}>
            <Table sx={{ minWidth: 1400 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Emp ID</TableCell>
                  <TableCell>Employee</TableCell>
                  <TableCell>Atten</TableCell>
                  <TableCell>Shift</TableCell>
                  <TableCell align="center">Client Id</TableCell>
                  <TableCell>Client</TableCell>
                  <TableCell align="center">OT Client Id</TableCell>
                  <TableCell>OT Client</TableCell>
                  <TableCell>Category</TableCell>
                  {showOtAmountColumn && <TableCell align="center">OT Amount</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedDetails.map((row) => {
                  const mark = markOf(row);
                  const isOvertime = mark === OVERTIME_MARK;
                  return (
                    <TableRow key={row.empId} hover>
                      <TableCell>{row.empId}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {row.employeeName || `Employee ${row.empId}`}
                      </TableCell>

                      <TableCell>
                        <Select
                          size="small"
                          disabled={isLocked}
                          value={mark}
                          onChange={handleMarkChange(row.empId)}
                          sx={{ minWidth: 100 }}
                        >
                          {marksFor(mark).map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </TableCell>

                      <TableCell>
                        <Select
                          size="small"
                          disabled={isLocked}
                          error={!isLocked && !row.shiftId}
                          value={row.shiftId || ''}
                          onChange={handleShiftChange(row.empId)}
                          displayEmpty
                          sx={{ minWidth: 110 }}
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
                      </TableCell>

                      <TableCell align="center">{row.clientId ?? '-'}</TableCell>

                      <TableCell>
                        <Autocomplete
                          size="small"
                          disabled={isLocked}
                          options={clientChoices}
                          filterOptions={clientFilter}
                          value={clientById.get(row.clientId) || null}
                          onChange={handleClientChange(row.empId)}
                          getOptionLabel={(o) => o?.label || ''}
                          isOptionEqualToValue={(o, v) => o.clientId === v.clientId}
                          renderOption={(props, option) => (
                            <li {...props} key={option.clientId}>
                              {option.label}
                            </li>
                          )}
                          renderInput={(params) => (
                            <TextField {...params} placeholder="Client..." error={!isLocked && !row.clientId} />
                          )}
                          sx={{ minWidth: 230 }}
                        />
                      </TableCell>

                      <TableCell align="center">{row.otClientId ?? '-'}</TableCell>

                      <TableCell>
                        <Autocomplete
                          size="small"
                          disabled={isLocked || !isOvertime}
                          options={clientChoices}
                          filterOptions={clientFilter}
                          value={clientById.get(row.otClientId) || null}
                          onChange={handleOtClientChange(row.empId)}
                          getOptionLabel={(o) => o?.label || ''}
                          isOptionEqualToValue={(o, v) => o.clientId === v.clientId}
                          renderOption={(props, option) => (
                            <li {...props} key={option.clientId}>
                              {option.label}
                            </li>
                          )}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              placeholder={isOvertime ? 'OT client...' : ''}
                              error={!isLocked && isOvertime && !row.otClientId}
                            />
                          )}
                          sx={{ minWidth: 230 }}
                        />
                      </TableCell>

                      <TableCell>
                        <Autocomplete
                          size="small"
                          disabled={isLocked}
                          freeSolo
                          forcePopupIcon
                          openOnFocus
                          options={rankChoices}
                          value={row.rank || null}
                          onChange={handleRankChange(row.empId)}
                          onInputChange={(event, value, reason) => {
                            if (reason === 'input') handleRankChange(row.empId)(event, value);
                          }}
                          getOptionLabel={(o) => o || ''}
                          renderInput={(params) => <TextField {...params} placeholder="Category..." />}
                          sx={{ minWidth: 170 }}
                        />
                      </TableCell>

                      {showOtAmountColumn && (
                        <TableCell align="center">
                          {needsOtAmount(row) && (
                            <TextField
                              size="small"
                              type="number"
                              placeholder="Amount"
                              value={row.overtimeAmount || ''}
                              onChange={handleOvertimeAmountChange(row.empId)}
                              disabled={isLocked}
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
                })}

                {sheetData.details.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={columnCount} align="center">
                      <Typography variant="subtitle2" sx={{ py: 3 }}>
                        No employees found for this location.
                      </Typography>
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
            rowsPerPageOptions={[50, 100, 200]}
          />

          <Stack direction="row" justifyContent="flex-end" alignItems="center" spacing={2} sx={{ p: 3 }}>
            {!isLocked && incompleteCount > 0 && (
              <Typography variant="body2" color="warning.main">
                {incompleteCount} row(s) still need a client, a shift or an OT client
              </Typography>
            )}
            <Button
              size="large"
              variant="contained"
              color="primary"
              onClick={handleSave}
              disabled={loading || isLocked}
            >
              {isLocked ? 'Already Submitted' : 'Save Attendance'}
            </Button>
          </Stack>
        </Card>
      )}
    </Container>
  );
}
