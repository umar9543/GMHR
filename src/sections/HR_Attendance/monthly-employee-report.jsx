import PropTypes from 'prop-types';
import { useSnackbar } from 'notistack';
import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Autocomplete from '@mui/material/Autocomplete';
import LinearProgress from '@mui/material/LinearProgress';
import TableContainer from '@mui/material/TableContainer';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

import Iconify from 'src/components/iconify';

import { getShifts } from 'src/api/shift';
import { getAllClientOptions } from 'src/api/hr-client';
import { cleanEmployeeName } from 'src/utils/employee-name';
import { getEmployeeMonth, getEmployeeOptions } from 'src/api/attendance';

import { markTotals, buildMonthlyEmployeePdf } from './monthly-employee-pdf';

// ----------------------------------------------------------------------
// Monthly Report by Employee: the Daily Report by Employee turned round -
// one employee, picked from a dropdown instead of the clients, and a line for
// every day of the month he was marked.
// ----------------------------------------------------------------------

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const pad = (n) => String(n).padStart(2, '0');

const markColour = (mark) => {
  if (mark === 'A') return 'error.main';
  if (mark === 'L') return 'warning.main';
  return 'text.primary';
};

export default function MonthlyEmployeeReport({ reportPicker }) {
  const { enqueueSnackbar } = useSnackbar();

  const [monthDate, setMonthDate] = useState(new Date());
  const [employee, setEmployee] = useState(null);
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [building, setBuilding] = useState(false);
  const [report, setReport] = useState(null);

  const [shifts, setShifts] = useState([]);
  const [clients, setClients] = useState([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getShifts(true).catch(() => []), getAllClientOptions().catch(() => [])]).then(
      ([shiftRows, clientRows]) => {
        if (cancelled) return;
        setShifts(shiftRows || []);
        setClients(clientRows || []);
      }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  // Searched on the server: there are 7,000+ employees.
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        // Former employees too, since a past month is often asked for. A code
        // also matches inside CNICs and phone numbers, so the employee with
        // exactly that code goes first.
        const rows = await getEmployeeOptions(employeeSearch, 50, true);
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

  const clientName = useMemo(() => {
    const map = new Map(clients.map((c) => [c.clientId, c.name]));
    return (id) => (id ? map.get(id) || `Client ${id}` : '');
  }, [clients]);

  const shiftCode = useMemo(() => {
    const map = new Map(shifts.map((s) => [s.shiftId, String(s.code || '').toUpperCase()]));
    return (id) => (map.get(id) === 'N' ? 'N' : 'D');
  }, [shifts]);

  const handleGenerate = async () => {
    if (!employee) {
      enqueueSnackbar('Pick an employee first', { variant: 'warning' });
      return;
    }
    if (!monthDate || Number.isNaN(monthDate.getTime())) {
      enqueueSnackbar('Pick a month', { variant: 'warning' });
      return;
    }

    const year = monthDate.getFullYear();
    const month = monthDate.getMonth() + 1;
    setLoading(true);
    try {
      const data = await getEmployeeMonth(employee.id, year, month);
      const rows = (data.days || [])
        .filter((d) => d.mark)
        .sort((a, b) => a.day - b.day)
        .map((d) => ({
          date: `${pad(d.day)}/${pad(month)}/${year}`,
          shift: shiftCode(d.shiftId),
          attendance: d.mark,
          location: clientName(d.clientId),
          category: d.rank || '',
          otLocation: clientName(d.otClientId),
          // The category he covered the overtime duty under.
          ovCategory: d.mark === 'P/P' ? d.rank || '' : '',
        }));
      setReport({
        employee: {
          id: employee.id,
          name: cleanEmployeeName(data.employee?.EmployeeName || employee.name),
        },
        year,
        month,
        rows,
      });
      enqueueSnackbar(
        rows.length ? `${rows.length} day(s) marked that month` : 'No attendance marked that month',
        { variant: rows.length ? 'success' : 'info' }
      );
    } catch (err) {
      console.error(err);
      enqueueSnackbar(err.message || 'Could not build the report', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!report) return;
    setBuilding(true);
    try {
      window.open(await buildMonthlyEmployeePdf(report), '_blank');
    } catch (err) {
      console.error(err);
      enqueueSnackbar(err.message || 'Could not build the PDF', { variant: 'error' });
    } finally {
      setBuilding(false);
    }
  };

  return (
    <>
      <Card sx={{ p: 3, mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
          {reportPicker}

          <Autocomplete
            fullWidth
            options={employeeOptions}
            value={employee}
            onChange={(event, value) => {
              setEmployee(value);
              setReport(null);
            }}
            onInputChange={(event, value) => setEmployeeSearch(value)}
            getOptionLabel={(o) => (o ? `${cleanEmployeeName(o.name)} (${o.id})` : '')}
            isOptionEqualToValue={(o, v) => o.id === v.id}
            filterOptions={(x) => x}
            renderInput={(params) => <TextField {...params} label="Employee name or code" />}
          />

          <DatePicker
            label="Month and Year"
            views={['year', 'month']}
            value={monthDate}
            onChange={(value) => {
              setMonthDate(value);
              setReport(null);
            }}
            format="MMMM yyyy"
            slotProps={{ textField: { sx: { minWidth: 200 } } }}
          />

          <Button
            variant="contained"
            onClick={handleGenerate}
            disabled={loading}
            size="large"
            sx={{ px: 4, whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            {loading ? 'Generating...' : 'Generate Report'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<Iconify icon="solar:download-minimalistic-bold" />}
            onClick={handleDownload}
            disabled={!report || building}
            size="large"
            sx={{ px: 3, whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            {building ? 'Building...' : 'PDF'}
          </Button>
        </Stack>
      </Card>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {report && (
        <Card>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            flexWrap="wrap"
            spacing={1}
            sx={{ px: 2.5, py: 2 }}
          >
            <Box>
              <Typography variant="subtitle1">
                {report.employee.name} ({report.employee.id})
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {MONTHS[report.month - 1]} {report.year}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              {markTotals(report.rows).map((t) => (
                <Chip key={t.mark} size="small" label={`${t.mark} ${t.count}`} />
              ))}
              <Chip size="small" color="primary" label={`${report.rows.length} day(s)`} />
            </Stack>
          </Stack>

          <Divider />

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 110 }}>Date</TableCell>
                  <TableCell sx={{ width: 70 }}>SHIFT</TableCell>
                  <TableCell sx={{ width: 70 }}>ATTND</TableCell>
                  <TableCell sx={{ minWidth: 200 }}>Location</TableCell>
                  <TableCell sx={{ minWidth: 140 }}>Category</TableCell>
                  <TableCell sx={{ minWidth: 180 }}>Over Time Location</TableCell>
                  <TableCell sx={{ minWidth: 140 }}>OV Category</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {report.rows.map((row) => (
                  <TableRow key={row.date} hover>
                    <TableCell>{row.date}</TableCell>
                    <TableCell>{row.shift}</TableCell>
                    <TableCell sx={{ color: markColour(row.attendance), fontWeight: 600 }}>
                      {row.attendance}
                    </TableCell>
                    <TableCell>{row.location || '-'}</TableCell>
                    <TableCell>{row.category || '-'}</TableCell>
                    <TableCell>{row.otLocation || '-'}</TableCell>
                    <TableCell>{row.ovCategory || '-'}</TableCell>
                  </TableRow>
                ))}

                {!report.rows.length && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        No attendance was marked for this employee that month.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}
    </>
  );
}

MonthlyEmployeeReport.propTypes = {
  reportPicker: PropTypes.node,
};
