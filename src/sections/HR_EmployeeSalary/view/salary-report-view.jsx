import { useSnackbar } from 'notistack';
import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Menu from '@mui/material/Menu';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';

import { paths } from 'src/routes/paths';
import Iconify from 'src/components/iconify';
import { useSettingsContext } from 'src/components/settings';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';

import { getEmployeeOptions } from 'src/api/attendance';
import { getAllClientOptions } from 'src/api/hr-client';
import { getSalaryReport } from 'src/api/employee-salary';
import { buildSalarySlipPdf, fetchSlipByEmployee } from 'src/sections/salarystatus/salary-slip-pdf';
import {
  buildSalarySummaryPdf,
  buildMobilinkReportPdf,
  buildSalarySheetReportPdf,
} from 'src/sections/HR_EmployeeSalary/salary-report-pdf';
import {
  buildPptx,
  buildExcel,
  reportTable,
} from 'src/sections/HR_EmployeeSalary/salary-report-export';

// ----------------------------------------------------------------------
// Every salary report the company prints, behind one picker. The report type
// decides which layout is drawn; month, year and client narrow what goes into
// it, and an employee is asked for only by the individual voucher.
// ----------------------------------------------------------------------

const REPORTS = [
  { value: 'sheet', label: 'Salary Report' },
  { value: 'individual', label: 'Salary Report Individual' },
  { value: 'summary', label: 'Salary Summary' },
  { value: 'mobilink', label: 'Mobilink Salary Report' },
];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const THIS_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 8 }, (_, i) => THIS_YEAR + 1 - i);

// The row that stands for every client, told apart by an id no client has.
const SELECT_ALL = { clientId: -1, name: '', label: 'All clients' };

const clientFilter = createFilterOptions({
  limit: 60,
  stringify: (o) => `${o.clientId} ${o.name ?? ''}`,
});

const token = () => {
  try {
    return JSON.parse(localStorage.getItem('UserData'))?.token || '';
  } catch {
    return '';
  }
};

export default function SalaryReportView() {
  const settings = useSettingsContext();
  const { enqueueSnackbar } = useSnackbar();

  const today = new Date();
  const [type, setType] = useState('sheet');
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [clients, setClients] = useState([]);
  const [employee, setEmployee] = useState(null);

  const [clientOptions, setClientOptions] = useState([]);
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [employeeSearch, setEmployeeSearch] = useState('');

  const [busy, setBusy] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [rowCount, setRowCount] = useState(null);
  // The rows the report was built from, kept so the spreadsheet and the deck
  // can be made from the figures rather than from the drawn page.
  const [reportRows, setReportRows] = useState([]);
  const [menuAnchor, setMenuAnchor] = useState(null);

  const needsEmployee = type === 'individual';

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

  // Searched on the server: there are thousands of guards.
  useEffect(() => {
    if (!needsEmployee) return undefined;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const rows = await getEmployeeOptions(employeeSearch);
        if (!cancelled) setEmployeeOptions(rows || []);
      } catch (err) {
        console.error('Could not load the employees', err);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [employeeSearch, needsEmployee]);

  // A preview is a blob URL; the old one has to go or the tab leaks it.
  useEffect(
    () => () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    },
    [pdfUrl]
  );

  const showPdf = (blob) => {
    setPdfUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(blob);
    });
  };

  const baseName = useMemo(() => {
    const period = `${MONTHS[month - 1]}_${year}`;
    if (type === 'individual') return `Salary_Slip_${employee?.id || ''}_${period}`;
    if (type === 'summary') return `Salary_Summary_${period}`;
    if (type === 'mobilink') return `Mobilink_Salary_${period}`;
    return `Salary_Report_${period}`;
  }, [type, employee, month, year]);

  const handleGenerate = async () => {
    if (needsEmployee && !employee?.id) {
      enqueueSnackbar('Choose an employee for the individual report', { variant: 'warning' });
      return;
    }

    setBusy(true);
    setRowCount(null);
    try {
      // The individual report is the voucher the salary sheet already prints,
      // fetched by employee and period rather than by row id.
      if (needsEmployee) {
        const slip = await fetchSlipByEmployee(employee.id, month, year, token());
        showPdf(await buildSalarySlipPdf(slip));
        // The same guard's row, so Excel and PowerPoint have figures to write.
        setReportRows(await getSalaryReport({ month, year, employeeId: employee.id }));
        setRowCount(1);
        enqueueSnackbar(`Salary slip for ${slip.employeeName || employee.name}`, {
          variant: 'success',
        });
        return;
      }

      const rows = await getSalaryReport({
        month,
        year,
        clientIds: clients.map((c) => c.clientId),
      });

      if (!rows.length) {
        setPdfUrl((old) => {
          if (old) URL.revokeObjectURL(old);
          return null;
        });
        setReportRows([]);
        setRowCount(0);
        enqueueSnackbar('No salary rows for this month and client', { variant: 'info' });
        return;
      }

      const opts = { month, year };
      let blob;
      if (type === 'summary') blob = await buildSalarySummaryPdf(rows, opts);
      else if (type === 'mobilink') blob = await buildMobilinkReportPdf(rows, opts);
      else blob = await buildSalarySheetReportPdf(rows, opts);

      showPdf(blob);
      setReportRows(rows);
      setRowCount(rows.length);
      enqueueSnackbar(`${rows.length} row(s) in the report`, { variant: 'success' });
    } catch (err) {
      console.error(err);
      enqueueSnackbar(err.message || 'Could not build the report', { variant: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const saveBlob = (blob, name) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    // Given straight back: the browser has the file by the time this runs.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleDownload = async (format) => {
    setMenuAnchor(null);

    try {
      if (format === 'pdf') {
        if (!pdfUrl) return;
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = `${baseName}.pdf`;
        link.click();
        return;
      }

      if (!reportRows.length) {
        enqueueSnackbar('Generate the report first', { variant: 'warning' });
        return;
      }

      setBusy(true);
      const table = reportTable(type, reportRows, { month, year });

      if (format === 'excel') {
        saveBlob(buildExcel(table), `${baseName}.xlsx`);
      } else {
        saveBlob(await buildPptx(table), `${baseName}.pptx`);
      }

      enqueueSnackbar(`Saved as ${format === 'excel' ? 'Excel' : 'PowerPoint'}`, {
        variant: 'success',
      });
    } catch (err) {
      console.error(err);
      enqueueSnackbar(err.message || 'Could not save the file', { variant: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Container maxWidth={settings.themeStretch ? false : 'xl'}>
      <CustomBreadcrumbs
        heading="Salary Report"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Payroll' },
          { name: 'Salary Report' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card sx={{ p: 2.5, mb: 3 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
          <TextField
            select
            size="small"
            label="Report Type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            sx={{ width: 230 }}
          >
            {REPORTS.map((r) => (
              <MenuItem key={r.value} value={r.value}>
                {r.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            size="small"
            label="Month"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
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
            onChange={(e) => setYear(Number(e.target.value))}
            sx={{ width: 110 }}
          >
            {YEARS.map((y) => (
              <MenuItem key={y} value={y}>
                {y}
              </MenuItem>
            ))}
          </TextField>

          {/* Several clients at once: the sheet prints a table for each. The
              individual voucher is for one guard, so it has no use for this. */}
          {!needsEmployee && (
          <Autocomplete
            multiple
            disableCloseOnSelect
            size="small"
            limitTags={2}
            options={clientOptions}
            // The picker offers "All clients" first, which takes whatever the
            // search has narrowed the list to - all of them when it is empty.
            filterOptions={(options, state) => {
              const matched = clientFilter(options, state);
              return matched.length ? [SELECT_ALL, ...matched] : matched;
            }}
            value={clients}
            onChange={(event, value) => {
              const hitAll = value.some((o) => o.clientId === SELECT_ALL.clientId);
              if (!hitAll) {
                setClients(value);
                return;
              }
              // Everything the search is showing, minus the row itself; a
              // second click on a full list clears it.
              const picked = value.filter((o) => o.clientId !== SELECT_ALL.clientId);
              setClients(picked.length >= clientOptions.length ? [] : clientOptions);
            }}
            getOptionLabel={(o) => o?.label || ''}
            isOptionEqualToValue={(o, v) => o.clientId === v.clientId}
            renderOption={(props, option, { selected }) => {
              if (option.clientId === SELECT_ALL.clientId) {
                const all = clients.length > 0 && clients.length === clientOptions.length;
                return (
                  <li {...props} key="select-all">
                    <Checkbox
                      size="small"
                      checked={all}
                      indeterminate={clients.length > 0 && !all}
                      sx={{ mr: 1 }}
                    />
                    <b>{all ? 'Clear selection' : `Select all ${clientOptions.length} clients`}</b>
                    <Divider />
                  </li>
                );
              }
              return (
                <li {...props} key={option.clientId}>
                  <Checkbox size="small" checked={selected} sx={{ mr: 1 }} />
                  {option.label}
                </li>
              );
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Clients"
                placeholder={clients.length ? '' : 'All clients'}
              />
            )}
            sx={{ width: 340 }}
          />
          )}

          {needsEmployee && (
            <Autocomplete
              size="small"
              options={employeeOptions}
              value={employee}
              onChange={(event, value) => setEmployee(value)}
              onInputChange={(event, value) => setEmployeeSearch(value)}
              getOptionLabel={(o) => (o ? `${o.id} - ${o.name}` : '')}
              isOptionEqualToValue={(o, v) => o.id === v.id}
              filterOptions={(x) => x}
              renderInput={(params) => <TextField {...params} label="Employee" />}
              sx={{ width: 300 }}
            />
          )}

          <Stack direction="row" spacing={1.5} sx={{ ml: 'auto' }}>
            <Button
              variant="contained"
              onClick={handleGenerate}
              disabled={busy}
              startIcon={
                busy ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <Iconify icon="solar:document-text-bold" />
                )
              }
              sx={{ whiteSpace: 'nowrap', flexShrink: 0, minWidth: 150 }}
            >
              Generate Report
            </Button>

            <Button
              variant="outlined"
              onClick={(event) => setMenuAnchor(event.currentTarget)}
              disabled={!pdfUrl || busy}
              startIcon={<Iconify icon="eva:download-fill" />}
              endIcon={<Iconify icon="eva:chevron-down-fill" />}
              sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              Download
            </Button>

            <Menu
              open={Boolean(menuAnchor)}
              anchorEl={menuAnchor}
              onClose={() => setMenuAnchor(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              <MenuItem onClick={() => handleDownload('pdf')}>
                <ListItemIcon>
                  <Iconify icon="vscode-icons:file-type-pdf2" width={22} />
                </ListItemIcon>
                <ListItemText primary="Save as PDF" secondary="The page as printed" />
              </MenuItem>

              <MenuItem onClick={() => handleDownload('excel')}>
                <ListItemIcon>
                  <Iconify icon="vscode-icons:file-type-excel" width={22} />
                </ListItemIcon>
                <ListItemText primary="Save as Excel" secondary="Figures you can total" />
              </MenuItem>

              <MenuItem onClick={() => handleDownload('powerpoint')}>
                <ListItemIcon>
                  <Iconify icon="vscode-icons:file-type-powerpoint" width={22} />
                </ListItemIcon>
                <ListItemText primary="Save as PowerPoint" secondary="Title slide and table" />
              </MenuItem>
            </Menu>
          </Stack>
        </Box>
      </Card>

      <Card sx={{ minHeight: 640 }}>
        {busy && <LinearProgress />}

        {pdfUrl && (
          <Box sx={{ height: 840, width: '100%' }}>
            <iframe
              src={pdfUrl}
              title="Report preview"
              width="100%"
              height="100%"
              style={{ border: 'none' }}
            />
          </Box>
        )}

        {!pdfUrl && (
          <Stack alignItems="center" justifyContent="center" sx={{ py: 12 }} spacing={1}>
            <Iconify
              icon="solar:document-text-bold-duotone"
              width={56}
              sx={{ color: 'text.disabled' }}
            />
            <Typography variant="h6" color="text.secondary">
              {rowCount === 0 ? 'No salary rows for this month' : 'No report yet'}
            </Typography>
            <Typography variant="body2" color="text.disabled">
              Choose a report type and period, then generate it.
            </Typography>
          </Stack>
        )}
      </Card>
    </Container>
  );
}
