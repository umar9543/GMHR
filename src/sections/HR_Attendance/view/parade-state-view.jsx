import { useMemo, useState, useEffect } from 'react';
import { useSnackbar } from 'notistack';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import InputAdornment from '@mui/material/InputAdornment';
import Typography from '@mui/material/Typography';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import LinearProgress from '@mui/material/LinearProgress';
import TableContainer from '@mui/material/TableContainer';
import Autocomplete from '@mui/material/Autocomplete';

import { paths } from 'src/routes/paths';
import Iconify from 'src/components/iconify';
import { useSettingsContext } from 'src/components/settings';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';

import { getAllClientOptions } from 'src/api/hr-client';
import { clientLabel, filterClientOptions } from 'src/utils/client-picker';
import { getParadeState, getDailyByEmployee } from 'src/api/attendance';

import { groupRows, PARADE_COLUMNS } from '../parade-state-utils';
import { buildParadeStatePdf } from '../parade-state-pdf';
import { groupByClient, buildDailyEmployeePdf } from '../daily-employee-pdf';

const REPORTS = [
  { value: 'parade', label: 'Daily Parade State' },
  { value: 'employee', label: 'Daily Report by Employee' },
];

// The row that stands for every client, told apart by an id no client has.
const SELECT_ALL = { clientId: -1, name: '', label: 'All clients' };

const clientFilter = filterClientOptions;

/** LASTNAME is '-' for most of the legacy rows, which prints as a dangling dash. */
const cleanName = (name) => String(name || '').replace(/\s*-\s*$/, '').trim();

const toIsoDate = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function ParadeStateView() {
  const settings = useSettingsContext();
  const { enqueueSnackbar } = useSnackbar();

  const [reportType, setReportType] = useState('parade');
  const [date, setDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [building, setBuilding] = useState(false);
  const [result, setResult] = useState(null);
  const [search, setSearch] = useState('');

  // The by-employee report is asked for its sites; empty means all of them.
  const [clients, setClients] = useState([]);
  const [clientOptions, setClientOptions] = useState([]);
  const [daily, setDaily] = useState(null);

  const byEmployee = reportType === 'employee';

  useEffect(() => {
    let cancelled = false;
    getAllClientOptions()
      .then((list) => {
        if (!cancelled) {
          setClientOptions((list || []).map((c) => ({ ...c, label: clientLabel(c) })));
        }
      })
      .catch((err) => console.error('Could not load the clients', err));
    return () => {
      cancelled = true;
    };
  }, []);

  // One report's result must never be shown under the other's heading.
  useEffect(() => {
    setResult(null);
    setDaily(null);
  }, [reportType]);

  const dailySites = useMemo(() => (daily ? groupByClient(daily.records) : []), [daily]);

  // Day totals for the summary chips always come from the whole sheet; the
  // search only narrows what the table shows.
  const dayTotals = useMemo(
    () => (result ? groupRows(result.records).grandTotals : null),
    [result]
  );

  const view = useMemo(() => {
    if (!result) return null;
    const q = search.trim().toLowerCase();
    const records = q
      ? result.records.filter(
          (r) =>
            (r.clientName || '').toLowerCase().includes(q) ||
            (r.groupName || '').toLowerCase().includes(q) ||
            String(r.clientId ?? '').toLowerCase().includes(q)
        )
      : result.records;
    return groupRows(records);
  }, [result, search]);

  const handleGenerate = async () => {
    if (!date || Number.isNaN(date.getTime())) {
      enqueueSnackbar('Pick a date first', { variant: 'warning' });
      return;
    }

    if (byEmployee) {
      setLoading(true);
      try {
        const res = await getDailyByEmployee(
          toIsoDate(date),
          clients.map((c) => c.clientId)
        );
        setDaily(res);
        enqueueSnackbar(
          res.records.length
            ? `${res.records.length} guard(s) marked on this date`
            : 'No attendance marked on this date',
          { variant: res.records.length ? 'success' : 'info' }
        );
      } catch (err) {
        console.error(err);
        enqueueSnackbar(err.message || 'Could not build the report', { variant: 'error' });
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      const res = await getParadeState(toIsoDate(date));
      setResult(res);
      if (!res.records.length) {
        enqueueSnackbar('No client sites to report for this date', { variant: 'info' });
      } else {
        enqueueSnackbar(`Parade state ready: ${res.records.length} client sites`, {
          variant: 'success',
        });
      }
    } catch (err) {
      console.error(err);
      enqueueSnackbar(err.message || 'Could not build the parade state', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (byEmployee) {
      if (!daily?.records?.length) return;
      setBuilding(true);
      try {
        const url = await buildDailyEmployeePdf(daily.records, toIsoDate(date));
        window.open(url, '_blank');
      } catch (err) {
        console.error(err);
        enqueueSnackbar(err.message || 'Could not build the PDF', { variant: 'error' });
      } finally {
        setBuilding(false);
      }
      return;
    }

    if (!result?.records?.length) return;
    setBuilding(true);
    try {
      const url = await buildParadeStatePdf(result.records, toIsoDate(date));
      window.open(url, '_blank');
    } catch (err) {
      console.error(err);
      enqueueSnackbar(err.message || 'Could not build the PDF', { variant: 'error' });
    } finally {
      setBuilding(false);
    }
  };

  const numberCell = (value, highlight) => (
    <TableCell
      align="center"
      sx={{
        px: 0.5,
        ...(highlight && value > 0 ? { color: 'error.main', fontWeight: 'bold' } : {}),
      }}
    >
      {value}
    </TableCell>
  );

  return (
    <Container maxWidth={settings.themeStretch ? false : 'xl'}>
      <CustomBreadcrumbs
        heading="Daily Parade State"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR', href: paths.dashboard.HR_Module.root },
          { name: 'Attendance' },
          { name: 'Parade State' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
          <TextField
            select
            label="Report"
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            sx={{ width: 250 }}
          >
            {REPORTS.map((r) => (
              <MenuItem key={r.value} value={r.value}>
                {r.label}
              </MenuItem>
            ))}
          </TextField>

          {byEmployee && (
            <Autocomplete
              multiple
              disableCloseOnSelect
              limitTags={1}
              options={clientOptions}
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
              sx={{ width: 330 }}
            />
          )}

          <DatePicker
            label="As of date"
            value={date}
            onChange={setDate}
            format="dd/MM/yyyy"
            slotProps={{ textField: { sx: { minWidth: 210 } } }}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={handleGenerate}
            disabled={loading}
            sx={{ height: 40, px: 4, whiteSpace: 'nowrap' }}
          >
            {loading ? 'Loading...' : 'Generate'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<Iconify icon="solar:download-minimalistic-bold" />}
            onClick={handleDownload}
            disabled={building || (byEmployee ? !daily?.records?.length : !result?.records?.length)}
            sx={{ height: 40, px: 3, whiteSpace: 'nowrap' }}
          >
            {building ? 'Building...' : 'PDF'}
          </Button>
        </Box>
      </Card>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {byEmployee &&
        dailySites.map((site) => (
          <Card key={site.clientId ?? site.clientName} sx={{ mb: 3 }}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ px: 2.5, py: 2 }}
            >
              <Box>
                <Typography variant="subtitle1">{site.clientName}</Typography>
                {!!site.groupName && (
                  <Typography variant="body2" color="text.secondary">
                    {site.groupName}
                  </Typography>
                )}
              </Box>
              <Chip
                size="small"
                label={`${site.shifts.reduce((t, b) => t + b.rows.length, 0)} guard(s)`}
              />
            </Stack>

            <Divider />

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 70 }}>SHIFT</TableCell>
                    <TableCell sx={{ width: 70 }}>ATTND</TableCell>
                    <TableCell sx={{ width: 110 }}>Employee Code</TableCell>
                    <TableCell sx={{ minWidth: 190 }}>Employee</TableCell>
                    <TableCell sx={{ minWidth: 140 }}>Category</TableCell>
                    <TableCell sx={{ minWidth: 180 }}>Over Time Location</TableCell>
                    <TableCell sx={{ minWidth: 140 }}>OV Category</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {site.shifts.map((block) => [
                    <TableRow key={`${site.clientId}-${block.shift}`}>
                      <TableCell colSpan={7} sx={{ fontWeight: 'bold', bgcolor: 'background.neutral' }}>
                        {block.shift}
                      </TableCell>
                    </TableRow>,
                    ...block.rows.map((row) => (
                      <TableRow key={`${site.clientId}-${block.shift}-${row.empId}`} hover>
                        <TableCell>{block.shift}</TableCell>
                        <TableCell>{row.attendance}</TableCell>
                        <TableCell>{row.empId}</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          {cleanName(row.employeeName)}
                        </TableCell>
                        <TableCell>{row.category || '-'}</TableCell>
                        <TableCell>{row.otClientName || '-'}</TableCell>
                        <TableCell>{row.ovCategory || '-'}</TableCell>
                      </TableRow>
                    )),
                  ])}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        ))}

      {byEmployee && daily && !daily.records.length && !loading && (
        <Card sx={{ p: 5, textAlign: 'center' }}>
          <Typography variant="subtitle2" color="text.secondary">
            No attendance was marked on this date for the chosen sites.
          </Typography>
        </Card>
      )}

      {!byEmployee && view && (
        <Card>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            justifyContent="space-between"
            alignItems={{ md: 'center' }}
            spacing={1}
            sx={{ p: 2.5 }}
          >
            <Box>
              <Typography variant="subtitle1">
                {view.rowCount}
                {search.trim() ? ` of ${result.records.length}` : ''} client sites &middot;{' '}
                {view.groups.length} groups
              </Typography>
              <Typography variant="body2" color="text.secondary">
                DEF is strength not on post. SH is what is still uncovered after overtime.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Chip
                size="small"
                color="info"
                label={`Required ${dayTotals.reqTotal}`}
              />
              <Chip
                size="small"
                color="success"
                label={`On post ${dayTotals.preDay + dayTotals.preNight}`}
              />
              <Chip
                size="small"
                color={dayTotals.shDay + dayTotals.shNight > 0 ? 'error' : 'default'}
                label={`Short ${dayTotals.shDay + dayTotals.shNight}`}
              />
            </Stack>
          </Stack>

          {result && !result.fromLiveSheet && (
            <Alert severity="info" sx={{ mx: 2.5, mb: 2 }}>
              No attendance was marked against a client on this date, so the figures come
              from the migrated legacy history.
            </Alert>
          )}

          <Divider />

          <Stack sx={{ p: 2.5 }}>
            <TextField
              fullWidth
              size="small"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search client site or group..."
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                  </InputAdornment>
                ),
              }}
            />
          </Stack>

          <TableContainer sx={{ maxHeight: 640 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 60 }}>Sno #</TableCell>
                  <TableCell>Locations</TableCell>
                  <TableCell>Group Name</TableCell>
                  {PARADE_COLUMNS.map((col) => (
                    <TableCell key={col.key} align="center" sx={{ px: 0.5 }}>
                      {col.label}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {(() => {
                  let sno = 0;
                  return view.groups.map((group) => [
                    ...group.rows.map((row) => {
                      sno += 1;
                      return (
                        <TableRow key={`${group.groupName}-${row.clientId}`} hover>
                          <TableCell>{sno}</TableCell>
                          <TableCell>{row.clientName}</TableCell>
                          <TableCell>{group.groupName}</TableCell>
                          {PARADE_COLUMNS.map((col) =>
                            numberCell(row[col.key], col.key === 'shDay' || col.key === 'shNight')
                          )}
                        </TableRow>
                      );
                    }),
                    <TableRow key={`${group.groupName}-total`} sx={{ bgcolor: 'background.neutral' }}>
                      <TableCell />
                      <TableCell />
                      <TableCell sx={{ fontWeight: 'bold' }}>{group.groupName}</TableCell>
                      {PARADE_COLUMNS.map((col) => (
                        <TableCell
                          key={col.key}
                          align="center"
                          sx={{ px: 0.5, fontWeight: 'bold' }}
                        >
                          {group.totals[col.key]}
                        </TableCell>
                      ))}
                    </TableRow>,
                  ]);
                })()}

                {!view.rowCount && (
                  <TableRow>
                    <TableCell colSpan={3 + PARADE_COLUMNS.length} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        No client site matches &quot;{search.trim()}&quot;
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}

                <TableRow sx={{ bgcolor: 'background.neutral' }}>
                  <TableCell />
                  <TableCell sx={{ fontWeight: 'bold' }}>GRAND TOTAL</TableCell>
                  <TableCell />
                  {PARADE_COLUMNS.map((col) => (
                    <TableCell key={col.key} align="center" sx={{ px: 0.5, fontWeight: 'bold' }}>
                      {view.grandTotals[col.key]}
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {!loading && ((byEmployee && !daily) || (!byEmployee && !view)) && (
        <Card sx={{ p: 5, textAlign: 'center' }}>
          <Typography variant="subtitle2" color="text.secondary">
            Pick a date and press Generate to build the{' '}
            {byEmployee ? 'daily report' : 'parade state'}.
          </Typography>
        </Card>
      )}
    </Container>
  );
}
