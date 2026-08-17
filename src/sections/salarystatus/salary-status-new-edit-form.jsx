import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import Autocomplete from '@mui/material/Autocomplete';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Checkbox from '@mui/material/Checkbox';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import TextField from '@mui/material/TextField';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import FormProvider, { RHFAutocomplete } from 'src/components/hook-form';
import { useForm } from 'react-hook-form';
import { useSnackbar } from 'notistack';
import { useRouter } from 'src/routes/hooks';
import { paths } from 'src/routes/paths';
import { useAuthFetch } from 'src/api/apibasemethods';
import { APP_API } from 'src/config-global';
import { getEmployeeSalarySheet } from 'src/api/employee-salary';

const MONTHS = [
  { value: 1, label: 'January' }, { value: 2, label: 'February' },
  { value: 3, label: 'March' }, { value: 4, label: 'April' },
  { value: 5, label: 'May' }, { value: 6, label: 'June' },
  { value: 7, label: 'July' }, { value: 8, label: 'August' },
  { value: 9, label: 'September' }, { value: 10, label: 'October' },
  { value: 11, label: 'November' }, { value: 12, label: 'December' },
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

export default function SalaryStatusNewEditForm({ currentSalaryStatusId }) {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const authFetch = useAuthFetch();

  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState([]);
  const [jobTitles, setJobTitles] = useState([]);

  useEffect(() => {
    const fetchJobTitles = async () => {
      try {
        const response = await fetch('https://localhost:7034/api/dropdown/job-titles');
        if (response.ok) setJobTitles(await response.json());
      } catch (error) {
        console.error('Failed to fetch job titles', error);
      }
    };
    fetchJobTitles();
  }, []);

  const methods = useForm({
    defaultValues: {
      locationId: null,
      month: MONTHS.find(m => m.value === (new Date().getMonth() + 1)) || null,
      year: { value: currentYear, label: currentYear.toString() }
    }
  });

  const { watch } = methods;
  const filterValues = watch();

  const [sheetData, setSheetData] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const res = await authFetch(`${APP_API}/api/Dropdown/locations`);
        if (res.ok) setLocations(await res.json());
      } catch (err) {
        console.error('Failed to fetch locations', err);
      }
    };
    fetchLocations();
  }, [authFetch]);

  useEffect(() => {
    if (currentSalaryStatusId) {
      loadSingleStatus(currentSalaryStatusId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSalaryStatusId]);

  const loadSingleStatus = async (id) => {
    setLoading(true);
    try {
      const response = await fetch(`https://localhost:7034/api/salarysheet/${id}`);
      if (response.ok) {
        const data = await response.json();
        const empId = data.fkEmployeeId;
        const row = {
          empId,
          employeeName: data.firstName || 'Employee',
          rank: data.rank,
          salary: data.basicSalary,
          daysMonth: data.totWDays,
          actualBSalary: data.actualBSalary,
          allow: data.allow,
          otDays: data.otDays,
          otRate: data.otRate,
          advance: data.advance,
          iTax: data.iTax,
          loan: data.loan,
          verification: data.verification,
          fine: data.fine,
          paid: data.paid || 'Unpaid',
          salaryDate: data.salaryDate ? new Date(data.salaryDate).toISOString().split('T')[0] : '',
          remarks: data.remarks || '',
          id: data.id,
        };
        setSheetData([row]);
        setSelectedRows([empId]);
      }
    } catch (error) {
      console.error(error);
      enqueueSnackbar('Failed to load status', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSheet = async () => {
    const locId = filterValues.locationId?.id || filterValues.locationId?.ID;
    const m = filterValues.month?.value;
    const y = filterValues.year?.value;

    if (!locId || !m || !y) {
      enqueueSnackbar('Please select Location, Month and Year', { variant: 'warning' });
      return;
    }
    setLoading(true);
    try {
      const res = await getEmployeeSalarySheet(locId, m, y);

      const details = (res?.sheet?.details || []).map(row => ({
        empId: row.empId,
        employeeName: row.employeeName,
        rank: row.designation || '',
        salary: row.totalSalary || row.salary || 0,
        daysMonth: row.daysMonth || new Date(y, m, 0).getDate(),
        actualBSalary: row.salary || 0,
        allow: 0,
        otDays: 0,
        otRate: row.otRate || 0,
        advance: row.lessAdvance || 0,
        iTax: 0,
        loan: row.lessLoan || 0,
        verification: 0,
        fine: 0,
        paid: 'Unpaid',
        salaryDate: new Date().toISOString().split('T')[0],
        remarks: '',
      }));

      setSheetData(details);
      setSelectedRows(details.map(d => d.empId)); // Check all by default
      if (!res.exists) {
        enqueueSnackbar('Note: Salary Sheet for this period was not saved yet.', { variant: 'info' });
      } else {
        enqueueSnackbar('Loaded employees from Salary Sheet', { variant: 'success' });
      }
    } catch (error) {
      console.error(error);
      enqueueSnackbar('Failed to load sheet data', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAllClick = (event) => {
    if (event.target.checked) {
      setSelectedRows(sheetData.map((n) => n.empId));
      return;
    }
    setSelectedRows([]);
  };

  const handleClick = (event, empId) => {
    const selectedIndex = selectedRows.indexOf(empId);
    let newSelected = [];
    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selectedRows, empId);
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

  const handleInputChange = (empId, field, val) => {
    setSheetData((prev) => {
      const newDetails = [...prev];
      const index = newDetails.findIndex((d) => d.empId === empId);
      if (index !== -1) {
        newDetails[index] = { ...newDetails[index], [field]: val };
      }
      return newDetails;
    });
  };

  const handleSave = async () => {
    if (selectedRows.length === 0) {
      enqueueSnackbar('No employees selected to save!', { variant: 'warning' });
      return;
    }

    setLoading(true);
    try {
      const selectedData = sheetData.filter(d => selectedRows.includes(d.empId));

      if (currentSalaryStatusId) {
        // Single Update
        const d = selectedData[0];
        const payload = {
          Id: d.id,
          SlNo: d.id,
          FkEmployeeId: d.empId,
          Rank: d.rank,
          BasicSalary: Math.round(Number(d.salary) || 0),
          WDays: Math.round(Number(d.daysMonth) || 0),
          ActualBSalary: Math.round(Number(d.actualBSalary) || 0),
          Allow: Number(d.allow) || 0,
          OtDays: Math.round(Number(d.otDays) || 0),
          OtRate: Number(d.otRate) || 0,
          Advance: Number(d.advance) || 0,
          Itax: Number(d.iTax) || 0,
          Loan: Number(d.loan) || 0,
          Verification: Number(d.verification) || 0,
          Fine: Number(d.fine) || 0,
          ClientId: 0,
          TotWDays: Math.round(Number(d.daysMonth) || 0),
          AllowDetail: '',
          SalaryDate: d.salaryDate,
          Paid: d.paid,
          Remarks: d.remarks,
          Eobi: 0
        };
        const res = await fetch(`https://localhost:7034/api/salarysheet/${currentSalaryStatusId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          enqueueSnackbar('Updated successfully', { variant: 'success' });
          router.push(paths.dashboard.HR_Module.Salary.Status.list);
        } else {
          enqueueSnackbar('Failed to update', { variant: 'error' });
        }
      } else {
        // Bulk Create
        const payloadList = selectedData.map((d, index) => ({
          SlNo: index + 1,
          FkEmployeeId: d.empId,
          Rank: d.rank,
          BasicSalary: Math.round(Number(d.salary) || 0),
          WDays: Math.round(Number(d.daysMonth) || 0),
          ActualBSalary: Math.round(Number(d.actualBSalary) || 0),
          Allow: Number(d.allow) || 0,
          OtDays: Math.round(Number(d.otDays) || 0),
          OtRate: Number(d.otRate) || 0,
          Advance: Number(d.advance) || 0,
          Itax: Number(d.iTax) || 0,
          Loan: Number(d.loan) || 0,
          Verification: Number(d.verification) || 0,
          Fine: Number(d.fine) || 0,
          ClientId: 0,
          TotWDays: Math.round(Number(d.daysMonth) || 0),
          AllowDetail: '',
          SalaryDate: d.salaryDate,
          Paid: d.paid,
          Remarks: d.remarks,
          Eobi: 0
        }));

        const res = await fetch(`https://localhost:7034/api/salarysheet/bulk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payloadList),
        });
        if (res.ok) {
          enqueueSnackbar(`Saved ${payloadList.length} statuses successfully`, { variant: 'success' });
          router.push(paths.dashboard.HR_Module.Salary.Status.list);
        } else {
          enqueueSnackbar('Failed to save bulk statuses', { variant: 'error' });
        }
      }
    } catch (err) {
      console.error(err);
      enqueueSnackbar('An error occurred', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card sx={{ p: 3 }}>
      {!currentSalaryStatusId && (
        <FormProvider methods={methods}>
          <Grid container spacing={2} alignItems="center" sx={{ mb: 3 }}>
            <Grid item xs={12} sm={3}>
              <RHFAutocomplete
                name="locationId"
                label="Location"
                options={locations}
                getOptionLabel={(option) => option.location || option.LOCATION || option.name || ''}
                isOptionEqualToValue={(option, value) => (option.id || option.ID) === (value.id || value.ID)}

              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <RHFAutocomplete
                name="month"
                label="Month"
                options={MONTHS}
                getOptionLabel={(option) => option.label || ''}
                isOptionEqualToValue={(option, value) => option.value === value.value}

              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <RHFAutocomplete
                name="year"
                label="Year"
                options={YEARS.map(y => ({ value: y, label: y.toString() }))}
                getOptionLabel={(option) => option.label || ''}
                isOptionEqualToValue={(option, value) => option.value === value.value}

              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleLoadSheet}
                fullWidth
                disabled={loading}
                sx={{ height: 40 }}
              >
                {loading ? 'Loading...' : 'Load Sheet'}
              </Button>
            </Grid>
          </Grid>
        </FormProvider>
      )}

      {sheetData.length > 0 && (
        <TableContainer sx={{ maxHeight: 600, mb: 3 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selectedRows.length > 0 && selectedRows.length < sheetData.length}
                    checked={sheetData.length > 0 && selectedRows.length === sheetData.length}
                    onChange={handleSelectAllClick}
                  />
                </TableCell>
                <TableCell>Employee</TableCell>
                <TableCell>TOTAL</TableCell>
                <TableCell>Rank</TableCell>
                <TableCell>Paid Status</TableCell>
                <TableCell>Salary Date</TableCell>
                <TableCell>Remarks</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sheetData.map((row) => {
                const isSelected = selectedRows.indexOf(row.empId) !== -1;
                return (
                  <TableRow hover key={row.empId} selected={isSelected}>
                    <TableCell padding="checkbox">
                      <Checkbox checked={isSelected} onChange={(e) => handleClick(e, row.empId)} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">{row.employeeName}</Typography>
                      <Typography variant="caption" color="text.secondary">{row.empId}</Typography>
                    </TableCell>
                    <TableCell>{row.salary}</TableCell>

                    <TableCell>
                      <Autocomplete
                        size="small"
                        sx={{ minWidth: 160 }}
                        options={jobTitles.map((job) => job.JOBTITLE)}
                        value={row.rank || null}
                        onChange={(event, newValue) => {
                          handleInputChange(row.empId, 'rank', newValue || '');
                        }}
                        renderInput={(params) => <TextField {...params} placeholder="Select Rank" />}
                      />
                    </TableCell>

                    <TableCell>
                      <FormControl size="small" sx={{ minWidth: 120 }}>
                        <Select
                          value={row.paid}
                          onChange={(e) => handleInputChange(row.empId, 'paid', e.target.value)}
                        >
                          <MenuItem value="Paid">Paid</MenuItem>
                          <MenuItem value="Unpaid">Unpaid</MenuItem>
                          <MenuItem value="Hold">Hold</MenuItem>
                        </Select>
                      </FormControl>
                    </TableCell>

                    <TableCell>
                      <DatePicker
                        value={row.salaryDate ? new Date(row.salaryDate) : null}
                        onChange={(newValue) => {
                          const dateString = newValue ? newValue.toISOString().split('T')[0] : '';
                          handleInputChange(row.empId, 'salaryDate', dateString);
                        }}
                        slotProps={{
                          textField: {
                            size: 'small',
                            sx: { minWidth: 150 }
                          }
                        }}
                      />
                    </TableCell>

                    <TableCell>
                      <TextField
                        size="small"
                        placeholder="Remarks..."
                        value={row.remarks}
                        onChange={(e) => handleInputChange(row.empId, 'remarks', e.target.value)}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Stack direction="row" spacing={2} justifyContent="flex-end">
        <Button variant="outlined" onClick={() => router.push(paths.dashboard.HR_Module.Salary.Status.list)}>
          Cancel
        </Button>
        <Button variant="contained" color="primary" onClick={handleSave} disabled={loading || sheetData.length === 0}>
          {
            // eslint-disable-next-line
            loading ? 'Saving...' : (currentSalaryStatusId ? 'Update Status' : 'Save Selected Statuses')}
        </Button>
      </Stack>
    </Card>
  );
}

SalaryStatusNewEditForm.propTypes = {
  currentSalaryStatusId: PropTypes.string,
};
