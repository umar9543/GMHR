import { useState, useCallback, useEffect } from 'react';
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

import { paths } from 'src/routes/paths';
import { useSettingsContext } from 'src/components/settings';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';


import { getAttendanceSheet, saveAttendanceSheet, updateAttendanceSheet } from 'src/api/attendance';
import { useAuthFetch } from 'src/api/apibasemethods';
import { APP_API } from 'src/config-global';

import AttendanceTableToolbar from '../attendance-table-toolbar';
import AttendanceTableFiltersResult from '../attendance-filters-result';
// ----------------------------------------------------------------------

export default function AttendanceView() {
  const settings = useSettingsContext();
  const { enqueueSnackbar } = useSnackbar();

  const [locationId, setLocationId] = useState('');
  const [dateStr, setDateStr] = useState(new Date().toISOString().split('T')[0]);

  const [loading, setLoading] = useState(false);
  const [sheetData, setSheetData] = useState(null);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(100);

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

  const handleLoadSheet = async () => {
    if (!locationId || !dateStr) {
      enqueueSnackbar('Please select Location and Date', { variant: 'warning' });
      return;
    }

    setLoading(true);
    setPage(0);
    try {
      const res = await getAttendanceSheet(locationId, dateStr);
      setSheetData(res.sheet);
      if (res.exists) {
        enqueueSnackbar('Loaded existing attendance sheet', { variant: 'info' });
      } else {
        enqueueSnackbar('Generated new attendance template', { variant: 'success' });
      }
    } catch (err) {
      console.error(err);
      enqueueSnackbar(err.message || 'Error loading attendance', { variant: 'error' });
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
        details: sheetData.details
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

  const handleReplaceLocationChange = (empId) => (event) => {
    const val = event.target.value;
    setSheetData((prev) => {
      const newDetails = [...prev.details];
      const index = newDetails.findIndex((d) => d.empId === empId);
      if (index !== -1) {
        newDetails[index] = { ...newDetails[index], replaceLocationId: val === '' ? null : val };
      }
      return { ...prev, details: newDetails };
    });
  };

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
    const checked = event.target.checked;
    setSheetData((prev) => {
      const newDetails = [...prev.details];
      const index = newDetails.findIndex((d) => d.empId === empId);
      if (index !== -1) {
        const updatedRow = { ...newDetails[index] };
        if (checked) {
          updatedRow.absent = false;
          updatedRow.present = false;
          updatedRow.overtime = false;
          updatedRow.gazzetted = false;
          updatedRow.leave = false;
          updatedRow.weekOff = false;
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

  const showOtAmountColumn = sheetData?.details.some((row) => row.overtime) || false;

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
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
          <FormControl fullWidth>
            <InputLabel>Location</InputLabel>
            <Select
              value={locationId}
              label="Location"
              onChange={(e) => setLocationId(e.target.value)}
            >
              {/* If API is not hooked up, you can add static MenuItem options here */}
              {(locations || []).map((loc) => (
                <MenuItem key={loc.id || loc.ID} value={loc.id || loc.ID}>
                  {loc.location || loc.LOCATION || loc.name}
                </MenuItem>
              ))}
              {/* Fallback mock if locations fail to load */}
              {(!locations || locations.length === 0) && (
                <MenuItem value={1}>Location 1 (Mock)</MenuItem>
              )}
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
                  <TableCell>Replace Location</TableCell>
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
                        sx={{ minWidth: 80 }}
                      >
                        <MenuItem value=""><em>None</em></MenuItem>
                        <MenuItem value={1}>A</MenuItem>
                        <MenuItem value={2}>B</MenuItem>
                      </Select>
                    </TableCell>
                    <TableCell>{row.employeeName || `Employee ${row.empId}`}</TableCell>

                    <TableCell>
                      <Select
                        size="small"
                        disabled={isLocked}
                        value={row.replaceLocationId || ''}
                        onChange={handleReplaceLocationChange(row.empId)}
                        displayEmpty
                        sx={{ minWidth: 120 }}
                      >
                        <MenuItem value=""><em>None</em></MenuItem>
                        {(locations || []).map((loc) => (
                          <MenuItem key={loc.id || loc.ID} value={loc.id || loc.ID}>
                            {loc.location || loc.LOCATION || loc.name}
                          </MenuItem>
                        ))}
                      </Select>
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
                        {row.overtime ? (
                          <TextField
                            size="small"
                            type="number"
                            placeholder="Amount"
                            value={row.overtimeAmount || ''}
                            onChange={handleOvertimeAmountChange(row.empId)}
                            disabled={isLocked}
                            sx={{ minWidth: 80 }}
                          />
                        ) : null}
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
                    <TableCell colSpan={showOtAmountColumn ? 10 : 9} align="center">
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
            {isLocked && (
              <Typography variant="body2" color="error.main">
                Attendance for this date is already locked and cannot be edited.
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
