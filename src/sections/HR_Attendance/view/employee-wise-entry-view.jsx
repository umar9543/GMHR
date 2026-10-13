import { useState, useEffect } from 'react';

import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Autocomplete from '@mui/material/Autocomplete';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

import { paths } from 'src/routes/paths';
import { useSettingsContext } from 'src/components/settings';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';

import { getEmployeeOptions } from 'src/api/attendance';
import { cleanEmployeeName } from 'src/utils/employee-name';

import EmployeeMonthEditor from '../employee-month-editor';

// ----------------------------------------------------------------------
// Employee Wise Entry: one guard's attendance for a month - the days he was
// marked, to correct or complete. Days with no attendance are left out
// unless asked for, so a day can still be added.
// ----------------------------------------------------------------------

export default function EmployeeWiseEntryView() {
  const settings = useSettingsContext();

  const [monthDate, setMonthDate] = useState(new Date());
  const [employee, setEmployee] = useState(null);
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [employeeSearch, setEmployeeSearch] = useState('');

  // Searched on the server: there are 7,000+ employees. A code also matches
  // inside CNICs and phone numbers, so the employee with exactly that code
  // goes first.
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const rows = await getEmployeeOptions(employeeSearch);
        const typed = employeeSearch.trim();
        const exact = (r) => (String(r.id) === typed ? 0 : 1);
        if (!cancelled) setEmployeeOptions([...rows].sort((a, b) => exact(a) - exact(b)));
      } catch (err) {
        console.error('Failed to load employees', err);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [employeeSearch]);

  const validMonth = monthDate && !Number.isNaN(monthDate.getTime()) ? monthDate : null;

  return (
    <Container maxWidth={settings.themeStretch ? false : 'lg'}>
      <CustomBreadcrumbs
        heading="Employee Wise Entry"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR', href: paths.dashboard.HR_Module.root },
          { name: 'Attendance' },
          { name: 'Employee Wise Entry' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card sx={{ p: 3, mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
          <DatePicker
            label="Month and Year"
            views={['year', 'month']}
            value={monthDate}
            onChange={setMonthDate}
            format="MMMM yyyy"
            disableFuture
            slotProps={{ textField: { sx: { minWidth: 220 } } }}
          />

          <Autocomplete
            fullWidth
            options={employeeOptions}
            value={employee}
            onChange={(event, value) => setEmployee(value)}
            onInputChange={(event, value) => setEmployeeSearch(value)}
            getOptionLabel={(option) =>
              option ? `${cleanEmployeeName(option.name)} (${option.id})` : ''
            }
            isOptionEqualToValue={(option, value) => option.id === value.id}
            filterOptions={(x) => x}
            renderInput={(params) => <TextField {...params} label="Employee name or code" />}
          />
        </Stack>
      </Card>

      {validMonth && employee ? (
        <Card>
          <EmployeeMonthEditor
            key={`${employee.id}-${validMonth.getFullYear()}-${validMonth.getMonth()}`}
            employee={{ empCode: employee.id, name: cleanEmployeeName(employee.name) }}
            year={validMonth.getFullYear()}
            month={validMonth.getMonth() + 1}
            hideEmpty
            maxHeight={620}
          />
        </Card>
      ) : (
        <Card sx={{ p: 5, textAlign: 'center' }}>
          <Typography variant="subtitle2" color="text.secondary">
            Pick a month and an employee to see their attendance.
          </Typography>
        </Card>
      )}
    </Container>
  );
}
