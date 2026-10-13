import { useSnackbar } from 'notistack';
import { useState, useEffect } from 'react';

import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import Container from '@mui/material/Container';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Autocomplete from '@mui/material/Autocomplete';
import LinearProgress from '@mui/material/LinearProgress';
import TableContainer from '@mui/material/TableContainer';
import FormControlLabel from '@mui/material/FormControlLabel';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

import { paths } from 'src/routes/paths';
import Iconify from 'src/components/iconify';
import { useSettingsContext } from 'src/components/settings';
import { cleanEmployeeName } from 'src/utils/employee-name';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';
import { getEmployeeCards, getEmployeeOptions } from 'src/api/attendance';

import { buildEmployeeCardPdf } from '../employee-card-pdf';

// ----------------------------------------------------------------------
// Employee Card: pick employees, then print their cards onto the company's
// card sheets - Print Front onto the pre-printed side, which carries the
// whole card; Print Back, optional, repeats the details on the blank back.
// Two employees to a sheet, in the order listed.
//
// Each printer feeds paper a little differently, so the offsets that put the
// print exactly on the card are kept on this computer.
// ----------------------------------------------------------------------

const SETTINGS_KEY = 'gm.employeeCard.print';
// The lower record copy is printed a few mm lower on the company's sheets
// than the scan they were measured from: 4.5 mm, read off a test print.
const DEFAULT_SETTINGS = {
  front: { x: 0, y: 0 },
  back: { x: 0, y: 0 },
  copy1: { x: 0, y: 0 },
  copy2: { x: 0, y: 4.5 },
  backTurn: 'sideways',
};

const readSettings = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');
    return saved ? { ...DEFAULT_SETTINGS, ...saved } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
};

const currentUserName = () => {
  try {
    return JSON.parse(localStorage.getItem('UserData') || '{}')?.userName || '';
  } catch {
    return '';
  }
};

const pad = (n) => String(n).padStart(2, '0');
const isoOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export default function EmployeeCardView() {
  const settings = useSettingsContext();
  const { enqueueSnackbar } = useSnackbar();

  const [employees, setEmployees] = useState([]);
  const [options, setOptions] = useState([]);
  const [search, setSearch] = useState('');
  const [range, setRange] = useState({ from: '', to: '' });
  const [adding, setAdding] = useState(false);

  const [preparedBy, setPreparedBy] = useState(currentUserName);
  const [issueDate, setIssueDate] = useState(new Date());
  const [showTemplate, setShowTemplate] = useState(false);
  const [print, setPrint] = useState(readSettings);
  const [progress, setProgress] = useState(null);

  // The offsets belong to this computer's printer.
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(print));
    } catch {
      /* a private window keeps them for this visit only */
    }
  }, [print]);

  // Searched on the server: there are 7,000+ employees.
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const rows = await getEmployeeOptions(search);
        const typed = search.trim();
        const exact = (r) => (String(r.id) === typed ? 0 : 1);
        if (!cancelled) setOptions([...rows].sort((a, b) => exact(a) - exact(b)));
      } catch (err) {
        console.error('Failed to load employees', err);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search]);

  const addCards = async (query) => {
    setAdding(true);
    try {
      const rows = await getEmployeeCards(query);
      if (!rows.length) {
        enqueueSnackbar('No active employees found', { variant: 'info' });
        return;
      }
      setEmployees((prev) => {
        const have = new Set(prev.map((e) => e.empId));
        return [...prev, ...rows.filter((r) => !have.has(r.empId))];
      });
    } catch (err) {
      console.error(err);
      enqueueSnackbar(err.message || 'Could not load the employees', { variant: 'error' });
    } finally {
      setAdding(false);
    }
  };

  const handleRange = () => {
    const from = Number(range.from);
    const to = Number(range.to);
    if (!from || !to) {
      enqueueSnackbar('Enter both codes', { variant: 'warning' });
      return;
    }
    addCards({ from, to });
    setRange({ from: '', to: '' });
  };

  const handlePrint = async (side) => {
    if (!employees.length) return;
    const validDate = issueDate && !Number.isNaN(issueDate.getTime()) ? issueDate : new Date();
    setProgress({ side, done: 0, total: employees.filter((e) => e.hasPicture).length });
    try {
      const { url, missing } = await buildEmployeeCardPdf(employees, {
        side,
        preparedBy: preparedBy.trim(),
        issueDate: isoOf(validDate),
        offset: print[side],
        copyOffsets: [print.copy1, print.copy2],
        backTurn: print.backTurn,
        showTemplate,
        onProgress: (done, total) => setProgress({ side, done, total }),
      });
      window.open(url, '_blank');
      if (missing) {
        enqueueSnackbar(`${missing} employee(s) have no photo on file`, { variant: 'info' });
      }
    } catch (err) {
      console.error(err);
      enqueueSnackbar(err.message || 'Could not build the cards', { variant: 'error' });
    } finally {
      setProgress(null);
    }
  };

  const setOffset = (side, axis) => (event) => {
    const value = Number(event.target.value);
    setPrint((prev) => ({
      ...prev,
      [side]: { ...prev[side], [axis]: Number.isFinite(value) ? value : 0 },
    }));
  };

  const sheets = Math.ceil(employees.length / 2);
  const offsetField = (side, axis, label) => (
    <TextField
      size="small"
      type="number"
      label={label}
      value={print[side][axis]}
      onChange={setOffset(side, axis)}
      inputProps={{ step: 0.5 }}
      sx={{ width: 120 }}
    />
  );

  return (
    <Container maxWidth={settings.themeStretch ? false : 'lg'}>
      <CustomBreadcrumbs
        heading="Employee Card"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR', href: paths.dashboard.HR_Module.root },
          { name: 'Employee Management', href: paths.dashboard.HR_Module.Employee.list },
          { name: 'Employee Card' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card sx={{ p: 3, mb: 3 }}>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
            <Autocomplete
              fullWidth
              options={options}
              value={null}
              inputValue={search}
              onInputChange={(event, value, reason) => {
                if (reason !== 'reset') setSearch(value);
              }}
              onChange={(event, value) => {
                if (value) addCards({ ids: [value.id] });
                setSearch('');
              }}
              getOptionLabel={(o) => (o ? `${cleanEmployeeName(o.name)} (${o.id})` : '')}
              isOptionEqualToValue={(o, v) => o.id === v.id}
              filterOptions={(x) => x}
              renderInput={(params) => (
                <TextField {...params} label="Add employee - name or code" />
              )}
            />
            <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
              or codes
            </Typography>
            <TextField
              label="From"
              type="number"
              value={range.from}
              onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
              sx={{ width: 120, flexShrink: 0 }}
            />
            <TextField
              label="To"
              type="number"
              value={range.to}
              onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
              sx={{ width: 120, flexShrink: 0 }}
            />
            <Button variant="outlined" onClick={handleRange} disabled={adding} sx={{ flexShrink: 0 }}>
              Add range
            </Button>
          </Stack>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              label="Prepared By"
              value={preparedBy}
              onChange={(e) => setPreparedBy(e.target.value)}
              sx={{ minWidth: 240 }}
            />
            <DatePicker
              label="Issue Date"
              value={issueDate}
              onChange={setIssueDate}
              format="dd/MM/yyyy"
              slotProps={{ textField: { sx: { minWidth: 180 } } }}
            />
          </Stack>
        </Stack>
      </Card>

      <Card sx={{ mb: 3 }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          alignItems={{ md: 'center' }}
          justifyContent="space-between"
          spacing={2}
          sx={{ p: 2 }}
        >
          <Typography variant="h6">
            {employees.length
              ? `${employees.length} employee(s) - ${sheets} sheet(s)`
              : 'No employees picked yet'}
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {!!employees.length && (
              <Button color="inherit" onClick={() => setEmployees([])} disabled={!!progress}>
                Clear
              </Button>
            )}
            <Button
              variant="contained"
              startIcon={<Iconify icon="solar:printer-bold" />}
              onClick={() => handlePrint('front')}
              disabled={!employees.length || !!progress}
            >
              {progress?.side === 'front'
                ? `Loading photos ${progress.done}/${progress.total}...`
                : 'Print Front'}
            </Button>
            <Button
              variant="contained"
              color="inherit"
              startIcon={<Iconify icon="solar:printer-bold" />}
              onClick={() => handlePrint('back')}
              disabled={!employees.length || !!progress}
            >
              {progress?.side === 'back'
                ? `Loading photos ${progress.done}/${progress.total}...`
                : 'Print Back'}
            </Button>
          </Stack>
        </Stack>
        {(adding || progress) && <LinearProgress />}

        {!!employees.length && (
          <TableContainer sx={{ maxHeight: 420 }}>
            <Table stickyHeader size="small" sx={{ minWidth: 820 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Sheet</TableCell>
                  <TableCell>No.</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Appointment</TableCell>
                  <TableCell>N.I.C. #</TableCell>
                  <TableCell>Date of Joining</TableCell>
                  <TableCell align="center">Photo</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {employees.map((e, i) => (
                  <TableRow key={e.empId} hover>
                    <TableCell>
                      {Math.floor(i / 2) + 1}
                      {i % 2 ? ' (lower)' : ' (upper)'}
                    </TableCell>
                    <TableCell>{e.empId}</TableCell>
                    <TableCell>{cleanEmployeeName(e.name)}</TableCell>
                    <TableCell>{e.jobTitle || '-'}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{e.nic || '-'}</TableCell>
                    <TableCell>{e.joiningDate || '-'}</TableCell>
                    <TableCell align="center">
                      {e.hasPicture ? (
                        <Iconify icon="solar:camera-bold" width={18} sx={{ color: 'success.main' }} />
                      ) : (
                        <Typography variant="caption" color="error.main">
                          none
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => setEmployees((prev) => prev.filter((x) => x.empId !== e.empId))}
                      >
                        <Iconify icon="solar:trash-bin-trash-bold" width={18} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      <Card sx={{ p: 3 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          Printing on the card sheets
        </Typography>
        <Alert severity="info" sx={{ mb: 2 }}>
          Print the PDF at <b>Actual size (100%)</b>, never &quot;Fit to page&quot;. Load the card
          sheets with the printed side up and Print Front - it prints everything: the card&apos;s
          details and photo, and the record copy. Print Back is only if you also want the details
          on the back. Try a plain sheet first: hold it against a card sheet up to the light, and
          if the print sits off, set the offset below - it is kept for this computer.
        </Alert>

        <FormControlLabel
          control={<Switch checked={showTemplate} onChange={(e) => setShowTemplate(e.target.checked)} />}
          label="Show the card design behind the data - for checking on screen only, turn it off to print"
        />

        <Divider sx={{ my: 2 }} />

        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={3}
          alignItems={{ md: 'center' }}
          flexWrap="wrap"
          useFlexGap
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="body2" sx={{ width: 90 }}>
              Front offset
            </Typography>
            {offsetField('front', 'x', 'Right (mm)')}
            {offsetField('front', 'y', 'Down (mm)')}
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="body2" sx={{ width: 90 }}>
              Upper record copy
            </Typography>
            {offsetField('copy1', 'x', 'Right (mm)')}
            {offsetField('copy1', 'y', 'Down (mm)')}
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="body2" sx={{ width: 90 }}>
              Lower record copy
            </Typography>
            {offsetField('copy2', 'x', 'Right (mm)')}
            {offsetField('copy2', 'y', 'Down (mm)')}
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="body2" sx={{ width: 90 }}>
              Back offset
            </Typography>
            {offsetField('back', 'x', 'Right (mm)')}
            {offsetField('back', 'y', 'Down (mm)')}
          </Stack>
          <TextField
            select
            size="small"
            label="Sheet turned for the back"
            value={print.backTurn}
            onChange={(e) => setPrint((prev) => ({ ...prev, backTurn: e.target.value }))}
            sx={{ minWidth: 260 }}
          >
            <MenuItem value="sideways">Sideways, like a book page</MenuItem>
            <MenuItem value="topBottom">Top to bottom</MenuItem>
          </TextField>
        </Stack>
        <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 1 }}>
          A negative offset moves the print left or up. The record copy offsets move only that
          copy&apos;s values and photo - the pre-printed sheets place the lower copy a few mm
          differently from the cards. Turned sideways, the back of each card is printed on the
          right of the sheet, behind the card.
        </Typography>
      </Card>
    </Container>
  );
}
