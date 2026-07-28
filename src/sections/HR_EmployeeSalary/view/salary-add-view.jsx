import { useState, useEffect } from 'react';
import { useSnackbar } from 'notistack';

import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import Container from '@mui/material/Container';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import TableContainer from '@mui/material/TableContainer';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Checkbox from '@mui/material/Checkbox';

import { paths } from 'src/routes/paths';
import { useSettingsContext } from 'src/components/settings';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';

import { getEmployeeSalarySheet, saveEmployeeSalarySheet, updateEmployeeSalarySheet } from 'src/api/employee-salary';
import { useAuthFetch } from 'src/api/apibasemethods';
import { APP_API } from 'src/config-global';
import { Router } from 'react-router';
import { useRouter } from 'src/routes/hooks';

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

export default function EmployeeSalaryAddView({ id }) {
  const settings = useSettingsContext();
  const { enqueueSnackbar } = useSnackbar();
  const authFetch = useAuthFetch();
  const isEdit = !!id;

  const [locationId, setLocationId] = useState('');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(currentYear);
  const router = useRouter()
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sheetData, setSheetData] = useState(null);

  // State for Checkboxes
  const [selectedRows, setSelectedRows] = useState([]);

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
      }
    };
    fetchLocations();

    if (isEdit) {
      loadSheetById(id);
    }
  }, [authFetch, id, isEdit]);

  const loadSheetById = async (sheetId) => {
    setLoading(true);
    try {
      const res = await authFetch(`${APP_API}/api/EmployeeSalary/GetSheetById/${sheetId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.exists) {
          const sheet = data.sheet;
          setSheetData(sheet);
          setLocationId(sheet.locationId);
          setMonth(sheet.monthId);
          setYear(sheet.yearId);
          setSelectedRows(sheet.details.map((r) => r.empId));
        }
      } else {
        enqueueSnackbar('Failed to load existing sheet', { variant: 'error' });
      }
    } catch (err) {
      console.error(err);
      enqueueSnackbar('Error loading existing sheet', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSheet = async () => {
    if (!locationId || !month || !year) {
      enqueueSnackbar('Please select Location, Month and Year', { variant: 'warning' });
      return;
    }

    setLoading(true);
    try {
      const res = await getEmployeeSalarySheet(locationId, month, year);

      const dm = new Date(year, month, 0).getDate();

      // Initialize calculations according to legacy Sgs format
      const processedDetails = res.sheet.details.map(row => {
        const r = { ...row };
        r.daysMonth = dm;
        r.salary = r.salary || 0;
        r.avgSalary = r.salary / dm;
        r.a = r.a || 0;
        r.totalPayableDays = dm - r.a;
        r.deductionAmount = r.a * r.avgSalary;
        r.netSalary = r.avgSalary * r.totalPayableDays;

        r.otRate = r.otRate || 0;
        r.workHours = r.workHours || 0;
        r.eotAmount = r.otRate * r.workHours;
        r.totalSalary = r.netSalary + r.eotAmount;

        r.lessAdvance = r.lessAdvance || 0;
        r.lessLoan = r.lessLoan || 0;
        r.alreadyPay = r.alreadyPay || 0;
        r.totalPayInRupees = r.totalSalary - r.lessAdvance - r.lessLoan - r.alreadyPay;
        return r;
      });
      res.sheet.details = processedDetails;
      setSheetData(res.sheet);

      // Select All by default
      setSelectedRows(processedDetails.map((r) => r.empId));

      if (res.exists) {
        enqueueSnackbar('Loaded existing salary sheet', { variant: 'info' });
      } else {
        enqueueSnackbar('Generated new salary template', { variant: 'success' });
      }
    } catch (err) {
      console.error(err);
      enqueueSnackbar(err.message || 'Error loading salary sheet', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!sheetData) return;

    if (selectedRows.length === 0) {
      enqueueSnackbar('No employees selected to save!', { variant: 'warning' });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        locationId: sheetData.locationId,
        monthId: sheetData.monthId,
        yearId: sheetData.yearId,
        currentDate: new Date().toISOString(),
        details: sheetData.details
          .filter(d => selectedRows.includes(d.empId)) // ONLY SAVE SELECTED
          .map(d => ({
            ...d,
            daysMonth: d.daysMonth.toString() // API expects string for DaysMonth
          })),
      };

      if (isEdit) {
        await updateEmployeeSalarySheet(id, payload);
        enqueueSnackbar('Salary sheet updated successfully', { variant: 'success' });
        router.push(paths.dashboard.HR_Module.Salary.Sheet.list)
      } else {
        const res = await saveEmployeeSalarySheet(payload);
        enqueueSnackbar('Salary sheet saved successfully', { variant: 'success' });
        setSheetData((prev) => ({ ...prev, employeeSalaryMstID: res.employeeSalaryMstID }));
      }
    } catch (err) {
      console.error(err);
      enqueueSnackbar(err.message || 'Error saving salary sheet', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Checkbox Handlers
  const handleSelectAllClick = (event) => {
    if (event.target.checked) {
      const newSelecteds = sheetData.details.map((n) => n.empId);
      setSelectedRows(newSelecteds);
      return;
    }
    setSelectedRows([]);
  };

  const handleClick = (event, id) => {
    const selectedIndex = selectedRows.indexOf(id);
    let newSelected = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selectedRows, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selectedRows.slice(1));
    } else if (selectedIndex === selectedRows.length - 1) {
      newSelected = newSelected.concat(selectedRows.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selectedRows.slice(0, selectedIndex),
        selectedRows.slice(selectedIndex + 1)
      );
    }

    setSelectedRows(newSelected);
  };

  const handleInputChange = (empId, field) => (event) => {
    // allow empty string while typing, fallback to 0 if NaN
    let val = event.target.value;
    if (val !== '') {
      val = parseFloat(val) || 0;
    } else {
      val = 0;
    }

    setSheetData((prev) => {
      const newDetails = [...prev.details];
      const index = newDetails.findIndex((d) => d.empId === empId);
      if (index !== -1) {
        const r = { ...newDetails[index] };
        r[field] = val;

        // Recalculate
        r.avgSalary = r.salary / r.daysMonth;
        r.totalPayableDays = r.daysMonth - r.a;
        r.deductionAmount = r.a * r.avgSalary;
        r.netSalary = r.avgSalary * r.totalPayableDays;

        r.eotAmount = r.otRate * r.workHours;
        r.totalSalary = r.netSalary + r.eotAmount;
        r.totalPayInRupees = r.totalSalary - r.lessAdvance - r.lessLoan - r.alreadyPay;

        newDetails[index] = r;
      }
      return { ...prev, details: newDetails };
    });
  };


  // Calculate totals (ONLY for selected rows!)
  let totSalary = 0;
  let totDM = 0;
  let totAvgSal = 0;
  let totA = 0;
  let totPrDay = 0;
  let totDeduct = 0;
  let totNetSal = 0;
  let totOTRate = 0;
  let totWH = 0;
  let totOT = 0;
  let totTotalSal = 0;
  let totAdv = 0;
  let totLoan = 0;
  let totAlPay = 0;
  let totTotal = 0;

  if (sheetData && sheetData.details) {
    sheetData.details.filter(d => selectedRows.includes(d.empId)).forEach(d => {
      totSalary += d.salary || 0;
      totDM += d.daysMonth || 0;
      totAvgSal += d.avgSalary || 0;
      totA += d.a || 0;
      totPrDay += d.totalPayableDays || 0;
      totDeduct += d.deductionAmount || 0;
      totNetSal += d.netSalary || 0;
      totOTRate += d.otRate || 0;
      totWH += d.workHours || 0;
      totOT += d.eotAmount || 0;
      totTotalSal += d.totalSalary || 0;
      totAdv += d.lessAdvance || 0;
      totLoan += d.lessLoan || 0;
      totAlPay += d.alreadyPay || 0;
      totTotal += d.totalPayInRupees || 0;
    });
  }

  const renderSummaryRow = (label, value) => (
    <Stack direction="row" justifyContent="space-between" sx={{ maxWidth: 250, mb: 0.5 }}>
      <Typography variant="body2">{label}:</Typography>
      <Typography variant="subtitle2" color="error">{Math.round(value)}</Typography>
    </Stack>
  );

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
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
          <FormControl fullWidth>
            <InputLabel>Location</InputLabel>
            <Select
              value={locationId}
              label="Location"
              onChange={(e) => setLocationId(e.target.value)}
            >
              {(locations || []).map((loc) => (
                <MenuItem key={loc.id || loc.ID} value={loc.id || loc.ID}>
                  {loc.location || loc.LOCATION || loc.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Month</InputLabel>
            <Select
              value={month}
              label="Month"
              onChange={(e) => setMonth(e.target.value)}
            >
              {MONTHS.map((m) => (
                <MenuItem key={m.value} value={m.value}>
                  {m.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Year</InputLabel>
            <Select
              value={year}
              label="Year"
              onChange={(e) => setYear(e.target.value)}
            >
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
            disabled={loading}
            sx={{ height: 40, px: 4 }}
          >
            {loading ? 'Loading...' : 'Generate'}
          </Button>
        </Stack>
      </Card>

      {sheetData && (
        <Card>
          <TableContainer sx={{ maxHeight: 600 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={selectedRows.length > 0 && selectedRows.length < sheetData.details.length}
                      checked={sheetData.details.length > 0 && selectedRows.length === sheetData.details.length}
                      onChange={handleSelectAllClick}
                    />
                  </TableCell>
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
                {sheetData.details.map((row) => {
                  const isSelected = selectedRows.indexOf(row.empId) !== -1;
                  return (
                    <TableRow key={row.empId} hover selected={isSelected}>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={isSelected}
                          onChange={(event) => handleClick(event, row.empId)}
                        />
                      </TableCell>
                      <TableCell>{row.name}</TableCell>

                      <TableCell align="center">
                        <TextField
                          size="small"
                          type="number"
                          value={row.salary}
                          onChange={handleInputChange(row.empId, 'salary')}
                          disabled={!isSelected}
                          sx={{ minWidth: 80 }}
                        />
                      </TableCell>

                      <TableCell align="center">{row.daysMonth}</TableCell>
                      <TableCell align="center">{row.avgSalary?.toFixed(2)}</TableCell>

                      <TableCell align="center">
                        <TextField
                          size="small"
                          type="number"
                          value={row.a}
                          onChange={handleInputChange(row.empId, 'a')}
                          disabled={!isSelected}
                          sx={{ minWidth: 60 }}
                        />
                      </TableCell>

                      <TableCell align="center">{Math.round(row.totalPayableDays)}</TableCell>
                      <TableCell align="center">{Math.round(row.deductionAmount)}</TableCell>
                      <TableCell align="center">{Math.round(row.netSalary)}</TableCell>

                      <TableCell align="center">
                        <TextField
                          size="small"
                          type="number"
                          value={row.otRate}
                          onChange={handleInputChange(row.empId, 'otRate')}
                          disabled={!isSelected}
                          sx={{ minWidth: 70 }}
                        />
                      </TableCell>

                      <TableCell align="center">
                        <TextField
                          size="small"
                          type="number"
                          value={row.workHours}
                          onChange={handleInputChange(row.empId, 'workHours')}
                          disabled={!isSelected}
                          sx={{ minWidth: 70 }}
                        />
                      </TableCell>

                      <TableCell align="center">{Math.round(row.eotAmount)}</TableCell>
                      <TableCell align="center">{Math.round(row.totalSalary)}</TableCell>

                      <TableCell align="center">
                        <TextField
                          size="small"
                          type="number"
                          value={row.lessAdvance}
                          onChange={handleInputChange(row.empId, 'lessAdvance')}
                          disabled={!isSelected}
                          sx={{ minWidth: 70 }}
                        />
                      </TableCell>

                      <TableCell align="center">
                        <TextField
                          size="small"
                          type="number"
                          value={row.lessLoan}
                          onChange={handleInputChange(row.empId, 'lessLoan')}
                          disabled={!isSelected}
                          sx={{ minWidth: 70 }}
                        />
                      </TableCell>

                      <TableCell align="center">
                        <TextField
                          size="small"
                          type="number"
                          value={row.alreadyPay}
                          onChange={handleInputChange(row.empId, 'alreadyPay')}
                          disabled={!isSelected}
                          sx={{ minWidth: 70 }}
                        />
                      </TableCell>

                      <TableCell align="center">
                        <Typography variant="subtitle2" color="primary">
                          {Math.round(row.totalPayInRupees)}
                        </Typography>
                      </TableCell>

                      <TableCell>{row.designation}</TableCell>
                    </TableRow>
                  )
                })}

                {sheetData.details.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={18} align="center">
                      <Typography variant="subtitle2" sx={{ py: 3 }}>
                        No employees found for this location.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ p: 3, bgcolor: 'background.neutral' }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                {renderSummaryRow("Total Salary", totSalary)}
                {renderSummaryRow("Total D/M", totDM)}
                {renderSummaryRow("Total Avg.Sal", totAvgSal)}
                {renderSummaryRow("Total A", totA)}
                {renderSummaryRow("Total Pr/Day", totPrDay)}
              </Grid>
              <Grid item xs={12} md={4}>
                {renderSummaryRow("Total Deduct", totDeduct)}
                {renderSummaryRow("Total NetSal", totNetSal)}
                {renderSummaryRow("Total OTRate", totOTRate)}
                {renderSummaryRow("Total W/H", totWH)}
                {renderSummaryRow("Total OT", totOT)}
              </Grid>
              <Grid item xs={12} md={4}>
                {renderSummaryRow("Total Sal", totTotalSal)}
                {renderSummaryRow("Tot.Adv", totAdv)}
                {renderSummaryRow("Tot.Loan", totLoan)}
                {renderSummaryRow("Total Al/Pay", totAlPay)}
                {renderSummaryRow("Total", totTotal)}
              </Grid>
            </Grid>
          </Box>
          <Divider />

          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Selected: {selectedRows.length} / {sheetData.details.length} Employees
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <Button
                size="large"
                variant="contained"
                color="primary"
                onClick={handleSave}
                disabled={loading || selectedRows.length === 0}
              >
                {isEdit ? 'Update Salary Sheet' : 'Save Salary Sheet'}
              </Button>
            </Stack>
          </Stack>
        </Card>
      )}
    </Container>
  );
}
