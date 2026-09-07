import { useMemo, useState, useCallback, useEffect } from 'react';
import { useSnackbar } from 'notistack';

import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import Checkbox from '@mui/material/Checkbox';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import Container from '@mui/material/Container';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import FormControl from '@mui/material/FormControl';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import Stack from '@mui/material/Stack';
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';

import { paths } from 'src/routes/paths';
import { useSettingsContext } from 'src/components/settings';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';


import { getAttendanceSheet, saveAttendanceSheet, updateAttendanceSheet } from 'src/api/attendance';
import { getAllClientOptions, getClientRankMap } from 'src/api/hr-client';
import { getShifts } from 'src/api/shift';
import { cleanEmployeeName } from 'src/utils/employee-name';
import { useAuthFetch } from 'src/api/apibasemethods';
import { APP_API } from 'src/config-global';

import AttendanceTableToolbar from '../attendance-table-toolbar';
import AttendanceTableFiltersResult from '../attendance-filters-result';
// ----------------------------------------------------------------------

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
        const [clients, shiftRows, rankMap] = await Promise.all([
          getAllClientOptions(),
          getShifts(true).catch(() => []),
          getClientRankMap().catch(() => new Map()),
        ]);
        if (cancelled) return;
        setClientOptions(clients);
        setShifts(shiftRows);
        setRanksByClient(rankMap);
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

          // A saved sheet must show what was actually marked. Only a fresh
          // template gets the "everyone present" starting point.
          if (res.exists) return base;

          return {
            ...base,
            present: true,
            absent: false,
            overtime: false,
            gazzetted: false,
            leave: false,
            weekOff: false,
          };
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
      enqueueSnackbar(
        err.message || 'Error loading attendance',
        { variant: 'error' }
      );
    } finally {
      setLoading(false);
    }
  };
  const handleSave = async () => {
    if (!sheetData) return;

    setLoading(true);
    try {
      // API payload matches PayRollSaveRequest in C#
      const payload = {
        locationPlaceId: sheetData.locationPlaceId,
        attendenceDate: sheetData.attendenceDate,
        details: sheetData.details,
      };

      if (sheetData.payRollMstId) {
        // Update existing
        await updateAttendanceSheet(sheetData.payRollMstId, payload);
        enqueueSnackbar('Attendance updated successfully', { variant: 'success' });
      } else {
        // Create new
        const res = await saveAttendanceSheet(payload);
        enqueueSnackbar('Attendance saved successfully', { variant: 'success' });
        // Update local state to reflect the new master ID
        setSheetData(prev => ({ ...prev, payRollMstId: res.payRollMstId }));
      }
    } catch (err) {
      console.error(err);
      enqueueSnackbar(err.message || 'Error saving attendance', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleShiftChange = (empId) => (event) => {
    const val = event.target.value;
    setSheetData((prev) => {
      const newDetails = [...prev.details];
      const index = newDetails.findIndex((d) => d.empId === empId);
      if (index !== -1) {
        newDetails[index] = { ...newDetails[index], shiftId: val === '' ? null : val };
      }
      return { ...prev, details: newDetails };
    });
  };

  // Two client sites share a name, so those two carry their code in the label.
  // Everything else shows the plain name.
  const clientChoices = useMemo(() => {
    const seen = new Map();
    clientOptions.forEach((c) => seen.set(c.name, (seen.get(c.name) || 0) + 1));
    // Two sites share a name, so those two carry their code. The rest stay plain.
    return clientOptions.map((c) => ({
      ...c,
      label: seen.get(c.name) > 1 ? `${c.name} (${c.clientId})` : c.name,
    }));
  }, [clientOptions]);

  const clientById = useMemo(
    () => new Map(clientChoices.map((c) => [c.clientId, c])),
    [clientChoices]
  );

  const handleClientChange = (empId) => (event, value) => {
    setSheetData((prev) => {
      const newDetails = [...prev.details];
      const index = newDetails.findIndex((d) => d.empId === empId);
      if (index !== -1) {
        const clientId = value?.clientId ?? null;
        const allowed = clientId ? ranksByClient.get(clientId) || [] : [];
        const current = newDetails[index].rank;
        newDetails[index] = {
          ...newDetails[index],
          clientId,
          // A rank belongs to a client's contract, so a rank the new site does
          // not contract for cannot carry over.
          rank: allowed.length && current && !allowed.includes(current) ? null : current,
        };
      }
      return { ...prev, details: newDetails };
    });
  };

  const handleRankChange = (empId) => (event, value) => {
    setSheetData((prev) => {
      const newDetails = [...prev.details];
      const index = newDetails.findIndex((d) => d.empId === empId);
      if (index !== -1) {
        newDetails[index] = { ...newDetails[index], rank: value || null };
      }
      return { ...prev, details: newDetails };
    });
  };

  // Ranks the guard's client actually contracts for. Falls back to every rank
  // in use, so a site with no contract lines is still workable.
  const allRanks = useMemo(() => {
    const set = new Set();
    ranksByClient.forEach((list) => list.forEach((r) => set.add(r)));
    return Array.from(set).sort();
  }, [ranksByClient]);

  const ranksFor = (clientId) => {
    const list = clientId ? ranksByClient.get(clientId) : null;
    return list && list.length ? list : allRanks;
  };

  // A guard has exactly one attendance status on a day, but overtime is a
  // separate thing he did on top of it - so OT toggles freely and is not part
  // of the exclusive group.
  const STATUS_FIELDS = ['absent', 'present', 'gazzetted', 'leave', 'weekOff'];

  const handleOvertimeAmountChange = (empId) => (event) => {
    const val = event.target.value;
    setSheetData((prev) => {
      const newDetails = [...prev.details];
      const index = newDetails.findIndex((d) => d.empId === empId);
      if (index !== -1) {
        newDetails[index] = { ...newDetails[index], overtimeAmount: val };
      }
      return { ...prev, details: newDetails };
    });
  };

  const handleCheckboxChange = (empId, field) => (event) => {
    const { checked } = event.target;
    setSheetData((prev) => {
      const newDetails = [...prev.details];
      const index = newDetails.findIndex((d) => d.empId === empId);
      if (index !== -1) {
        const updatedRow = { ...newDetails[index] };
        if (checked && STATUS_FIELDS.includes(field)) {
          STATUS_FIELDS.forEach((f) => {
            updatedRow[f] = false;
          });
        }
        updatedRow[field] = checked;
        if (field === 'overtime' && !checked) {
          updatedRow.overtimeAmount = null;
        }
        newDetails[index] = updatedRow;
      }
      return { ...prev, details: newDetails };
    });
  };

  const isLocked = !!sheetData?.payRollMstId;

  // The OT rate on the employee record drives salary on its own. The column is
  // only worth showing while somebody on overtime has no rate to work from.
  const needsOtAmount = (row) => row.overtime && !(Number(row.otRate) > 0);

  const showOtAmountColumn = (sheetData?.details || []).some(needsOtAmount);


  const filteredDetails = (sheetData?.details || []).filter((row) =>
    !filters.name ||
    (row.employeeName || `Employee ${row.empId}`).toLowerCase().includes(filters.name.toLowerCase())
  );

  const paginatedDetails = filteredDetails.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

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
          <AttendanceTableToolbar
            filters={filters}
            onFilters={handleFilters}
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

          <TableContainer sx={{ minHeight: 400 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Shift</TableCell>
                  <TableCell>Employee Name</TableCell>
                  <TableCell>Client (site worked)</TableCell>
                  <TableCell>Rank</TableCell>
                  <TableCell align="center">A</TableCell>
                  <TableCell align="center">P</TableCell>
                  <TableCell align="center">OT</TableCell>
                  {showOtAmountColumn && <TableCell align="center">OT Amount</TableCell>}
                  <TableCell align="center">G</TableCell>
                  <TableCell align="center">L</TableCell>
                  <TableCell align="center">WO</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedDetails.map((row) => (
                  <TableRow key={row.empId} hover>
                    <TableCell>
                      <Select
                        size="small"
                        disabled={isLocked}
                        value={row.shiftId || ''}
                        onChange={handleShiftChange(row.empId)}
                        displayEmpty
                        sx={{ minWidth: 130 }}
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
                    <TableCell>{row.employeeName || `Employee ${row.empId}`}</TableCell>

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
                          <TextField {...params} placeholder="Client..." />
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
                        options={ranksFor(row.clientId)}
                        value={row.rank || null}
                        onChange={handleRankChange(row.empId)}
                        onInputChange={(event, value, reason) => {
                          if (reason === 'input') handleRankChange(row.empId)(event, value);
                        }}
                        getOptionLabel={(o) => o || ''}
                        renderInput={(params) => <TextField {...params} placeholder="Rank..." />}
                        sx={{ minWidth: 170 }}
                      />
                    </TableCell>

                    <TableCell align="center">
                      <Checkbox
                        disabled={isLocked}
                        checked={row.absent}
                        onChange={handleCheckboxChange(row.empId, 'absent')}
                      />
                    </TableCell>

                    <TableCell align="center">
                      <Checkbox
                        disabled={isLocked}
                        checked={row.present}
                        onChange={handleCheckboxChange(row.empId, 'present')}
                      />
                    </TableCell>

                    <TableCell align="center">
                      <Checkbox
                        disabled={isLocked}
                        checked={row.overtime}
                        onChange={handleCheckboxChange(row.empId, 'overtime')}
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
                        {row.overtime && Number(row.otRate) > 0 && (
                          <Typography variant="caption" color="text.secondary">
                            {row.otRate}/shift
                          </Typography>
                        )}
                      </TableCell>
                    )}

                    <TableCell align="center">
                      <Checkbox
                        disabled={isLocked}
                        checked={row.gazzetted}
                        onChange={handleCheckboxChange(row.empId, 'gazzetted')}
                      />
                    </TableCell>

                    <TableCell align="center">
                      <Checkbox
                        disabled={isLocked}
                        checked={row.leave}
                        onChange={handleCheckboxChange(row.empId, 'leave')}
                      />
                    </TableCell>

                    <TableCell align="center">
                      <Checkbox
                        disabled={isLocked}
                        checked={row.weekOff}
                        onChange={handleCheckboxChange(row.empId, 'weekOff')}
                      />
                    </TableCell>
                  </TableRow>
                ))}

                {sheetData.details.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10 + (showOtAmountColumn ? 1 : 0)} align="center">
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
            {/* {isLocked && (
              <Typography variant="body2" color="error.main">
                Attendance for this date is already locked and cannot be edited.
              </Typography>
            )} */}
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
