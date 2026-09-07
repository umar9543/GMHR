import { useState, useEffect } from 'react';
import { useSnackbar } from 'notistack';

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
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import TableContainer from '@mui/material/TableContainer';
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

import { paths } from 'src/routes/paths';
import Iconify from 'src/components/iconify';
import { useSettingsContext } from 'src/components/settings';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';
import { cleanEmployeeName } from 'src/utils/employee-name';

import { getParadeStateMonthly } from 'src/api/attendance';
import { getAllClientOptions } from 'src/api/hr-client';

import { buildMonthlyParadeStatePdf } from '../parade-state-monthly-pdf';

const clientFilter = createFilterOptions({ limit: 50, stringify: (o) => o.label });

export default function ParadeStateMonthlyView() {
  const settings = useSettingsContext();
  const { enqueueSnackbar } = useSnackbar();

  const [clientOptions, setClientOptions] = useState([]);
  const [client, setClient] = useState(null);
  const [monthDate, setMonthDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [building, setBuilding] = useState(false);
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await getAllClientOptions();
        if (cancelled) return;
        const seen = new Map();
        rows.forEach((c) => seen.set(c.name, (seen.get(c.name) || 0) + 1));
        setClientOptions(
          rows.map((c) => ({
            ...c,
            label: seen.get(c.name) > 1 ? `${c.name} (${c.clientId})` : c.name,
          }))
        );
      } catch (err) {
        console.error('Failed to load clients', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleGenerate = async () => {
    if (!client) {
      enqueueSnackbar('Pick a client site first', { variant: 'warning' });
      return;
    }
    if (!monthDate || Number.isNaN(monthDate.getTime())) {
      enqueueSnackbar('Pick a month', { variant: 'warning' });
      return;
    }

    setLoading(true);
    try {
      const res = await getParadeStateMonthly(
        client.clientId,
        monthDate.getFullYear(),
        monthDate.getMonth() + 1
      );
      setData(res);
      if (!res.records.length) {
        enqueueSnackbar('No guards were marked at this site that month', { variant: 'info' });
      } else {
        enqueueSnackbar(`${res.records.length} guards posted at this site`, {
          variant: 'success',
        });
      }
    } catch (err) {
      console.error(err);
      enqueueSnackbar(err.message || 'Could not build the report', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!data?.records?.length) return;
    setBuilding(true);
    try {
      const url = await buildMonthlyParadeStatePdf(data);
      window.open(url, '_blank');
    } catch (err) {
      console.error(err);
      enqueueSnackbar(err.message || 'Could not build the PDF', { variant: 'error' });
    } finally {
      setBuilding(false);
    }
  };

  const days = data ? Array.from({ length: data.daysInMonth }, (_, i) => i + 1) : [];

  const markColour = (status) => {
    if (!status) return 'text.disabled';
    if (status.startsWith('A')) return 'error.main';
    if (status.startsWith('L')) return 'warning.main';
    return 'text.primary';
  };

  return (
    <Container maxWidth={settings.themeStretch ? false : 'xl'}>
      <CustomBreadcrumbs
        heading="Monthly Parade State"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR', href: paths.dashboard.HR_Module.root },
          { name: 'Attendance' },
          { name: 'Monthly Parade State' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card sx={{ p: 3, mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
          <Autocomplete
            fullWidth
            options={clientOptions}
            filterOptions={clientFilter}
            value={client}
            onChange={(event, value) => setClient(value)}
            getOptionLabel={(o) => o?.label || ''}
            isOptionEqualToValue={(o, v) => o.clientId === v.clientId}
            renderOption={(props, option) => (
              <li {...props} key={option.clientId}>
                {option.label}
              </li>
            )}
            renderInput={(params) => <TextField {...params} label="Client site" />}
          />
          <DatePicker
            label="Month and Year"
            views={['year', 'month']}
            value={monthDate}
            onChange={setMonthDate}
            format="MMMM yyyy"
            slotProps={{ textField: { fullWidth: true } }}
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
            disabled={!data?.records?.length || building}
            sx={{ height: 40, px: 3, whiteSpace: 'nowrap' }}
          >
            {building ? 'Building...' : 'PDF'}
          </Button>
        </Stack>
      </Card>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {data && !!data.records.length && (
        <Card>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            justifyContent="space-between"
            alignItems={{ md: 'center' }}
            spacing={1}
            sx={{ p: 2.5 }}
          >
            <Box>
              <Typography variant="subtitle1">{data.client?.clientName}</Typography>
              <Typography variant="body2" color="text.secondary">
                {data.client?.groupName} &middot; each cell shows the mark with the shift beneath
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Chip size="small" color="info" label={`Required ${data.client?.reqDay || 0}D / ${data.client?.reqNight || 0}N`} />
              <Chip size="small" color="success" label={`${data.records.length} guards`} />
            </Stack>
          </Stack>

          <Divider />

          <TableContainer sx={{ maxHeight: 620 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 48 }}>Sno</TableCell>
                  <TableCell>Rank</TableCell>
                  <TableCell>Guard</TableCell>
                  {days.map((d) => (
                    <TableCell key={d} align="center" sx={{ px: 0.25, minWidth: 26 }}>
                      {d}
                    </TableCell>
                  ))}
                  <TableCell align="center" sx={{ px: 0.5 }}>P</TableCell>
                  <TableCell align="center" sx={{ px: 0.5 }}>A</TableCell>
                  <TableCell align="center" sx={{ px: 0.5 }}>L</TableCell>
                  <TableCell align="center" sx={{ px: 0.5 }}>OT</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.records.map((row, i) => (
                  <TableRow key={row.employeeId} hover>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>{row.rank || '-'}</TableCell>
                    <TableCell>
                      {cleanEmployeeName(row.employeeName) || `Employee ${row.employeeId}`}
                    </TableCell>
                    {days.map((d) => {
                      const status = row.days[String(d)] || '';
                      const shift = row.days[`s${d}`] || '';
                      return (
                        <TableCell key={d} align="center" sx={{ px: 0.25 }}>
                          <Typography variant="caption" sx={{ display: 'block', color: markColour(status) }}>
                            {status || '-'}
                          </Typography>
                          {!!status && !!shift && (
                            <Typography
                              variant="caption"
                              sx={{ display: 'block', fontSize: 9, color: 'text.secondary' }}
                            >
                              {shift}
                            </Typography>
                          )}
                        </TableCell>
                      );
                    })}
                    <TableCell align="center" sx={{ px: 0.5 }}>{row.present}</TableCell>
                    <TableCell align="center" sx={{ px: 0.5, color: row.absent ? 'error.main' : undefined }}>
                      {row.absent}
                    </TableCell>
                    <TableCell align="center" sx={{ px: 0.5 }}>{row.leave}</TableCell>
                    <TableCell align="center" sx={{ px: 0.5 }}>{row.overtime}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {!data && !loading && (
        <Card sx={{ p: 5, textAlign: 'center' }}>
          <Typography variant="subtitle2" color="text.secondary">
            Pick a client site and a month, then press Generate.
          </Typography>
        </Card>
      )}
    </Container>
  );
}
