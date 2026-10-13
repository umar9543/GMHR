import PropTypes from 'prop-types';
import { useSnackbar } from 'notistack';
import { useMemo, useState, useEffect } from 'react';

import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
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
import { getAllClientOptions } from 'src/api/hr-client';
import { cleanEmployeeName } from 'src/utils/employee-name';
import { getEmployeeCategoryWise } from 'src/api/attendance';
import { clientLabel, filterClientOptions } from 'src/utils/client-picker';

import { buildEmployeeCategoryWisePdf } from './employee-category-wise-pdf';

// ----------------------------------------------------------------------
// Employee Category Wise, in the Month-Wise Report page: the guards deployed
// at one or more clients on a date, client by client and job title by job
// title, with their photos in the PDF. No client picked means every client.
// ----------------------------------------------------------------------

const pad = (n) => String(n).padStart(2, '0');
const isoOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dmyOf = (iso) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '');

export default function EmployeeCategoryWiseReport({ reportPicker = null }) {
  const { enqueueSnackbar } = useSnackbar();

  const [clientOptions, setClientOptions] = useState([]);
  const [clients, setClients] = useState([]);
  const [date, setDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  // While the PDF is built: photos loaded so far, of how many.
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await getAllClientOptions();
        if (!cancelled) setClientOptions((rows || []).filter((c) => !c.isClosed));
      } catch (err) {
        console.error('Failed to load clients', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const validDate = date && !Number.isNaN(date.getTime()) ? date : null;

  const handleGenerate = async () => {
    if (!validDate) {
      enqueueSnackbar('Pick a date first', { variant: 'warning' });
      return;
    }
    setLoading(true);
    try {
      const res = await getEmployeeCategoryWise(
        isoOf(validDate),
        clients.map((c) => c.clientId)
      );
      setData(res);
      if (!res.records.length) {
        enqueueSnackbar('No guards deployed at these clients on this date', { variant: 'info' });
      }
    } catch (err) {
      console.error(err);
      enqueueSnackbar(err.message || 'Could not load the report', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handlePdf = async () => {
    if (!data?.records.length) return;
    setProgress({ done: 0, total: data.records.filter((r) => r.hasPicture).length });
    try {
      const { url, missing } = await buildEmployeeCategoryWisePdf(data.records, {
        dateLabel: dmyOf(data.attendanceDate),
        onProgress: (done, total) => setProgress({ done, total }),
      });
      window.open(url, '_blank');
      if (missing) {
        enqueueSnackbar(`${missing} guard(s) have no photo on file`, { variant: 'info' });
      }
    } catch (err) {
      console.error(err);
      enqueueSnackbar(err.message || 'Could not build the PDF', { variant: 'error' });
    } finally {
      setProgress(null);
    }
  };

  // How many of each job title, for the line above the table.
  const byTitle = useMemo(() => {
    const counts = new Map();
    (data?.records || []).forEach((r) => counts.set(r.jobTitle, (counts.get(r.jobTitle) || 0) + 1));
    return Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [data]);

  const requested = validDate ? isoOf(validDate) : '';
  const usedEarlier =
    data?.attendanceDate && requested && String(data.attendanceDate).slice(0, 10) !== requested;

  return (
    <>
      <Card sx={{ p: 3, mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
          {reportPicker}

          <DatePicker
            label="Date"
            value={date}
            onChange={setDate}
            format="dd/MM/yyyy"
            disableFuture
            slotProps={{ textField: { sx: { minWidth: 170 } } }}
          />

          <Autocomplete
            multiple
            fullWidth
            autoHighlight
            disableCloseOnSelect
            limitTags={3}
            options={clientOptions}
            value={clients}
            onChange={(event, value) => setClients(value)}
            filterOptions={filterClientOptions}
            getOptionLabel={(o) => clientLabel(o)}
            isOptionEqualToValue={(o, v) => o.clientId === v.clientId}
            renderOption={(props, option) => (
              <li {...props} key={option.clientId}>
                {clientLabel(option)}
              </li>
            )}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  {...getTagProps({ index })}
                  key={option.clientId}
                  size="small"
                  label={option.clientId}
                  title={option.name}
                />
              ))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label="Clients (all if blank)"
                placeholder={clients.length ? '' : 'Code or name'}
              />
            )}
          />

          <Button
            variant="contained"
            size="large"
            onClick={handleGenerate}
            disabled={loading}
            sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            {loading ? 'Generating...' : 'Generate Report'}
          </Button>
        </Stack>
      </Card>

      {data && (
        <Card>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            alignItems={{ md: 'center' }}
            justifyContent="space-between"
            spacing={2}
            sx={{ p: 2, borderBottom: (theme) => `dashed 1px ${theme.palette.divider}` }}
          >
            <Stack spacing={0.5}>
              <Typography variant="h6">
                Employee Category Wise - {dmyOf(data.attendanceDate) || '-'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {data.records.length} guard(s)
                {byTitle.length ? `: ${byTitle.map(([t, n]) => `${n} ${t}`).join(', ')}` : ''}
                {usedEarlier &&
                  ` - ${dmyOf(requested)} has no attendance yet, so this is the deployment of ${dmyOf(
                    data.attendanceDate
                  )}`}
              </Typography>
            </Stack>

            <Button
              variant="contained"
              color="error"
              startIcon={<Iconify icon="solar:file-text-bold" />}
              onClick={handlePdf}
              disabled={!data.records.length || !!progress}
              sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              {progress ? `Loading photos ${progress.done}/${progress.total}...` : 'Open PDF'}
            </Button>
          </Stack>

          {progress && (
            <LinearProgress
              variant="determinate"
              value={progress.total ? (progress.done / progress.total) * 100 : 100}
            />
          )}

          <TableContainer sx={{ maxHeight: 600 }}>
            <Table stickyHeader size="small" sx={{ minWidth: 900 }}>
              <TableHead>
                <TableRow>
                  <TableCell>S No.</TableCell>
                  <TableCell>Comp ID</TableCell>
                  <TableCell>Employee Name</TableCell>
                  <TableCell>Job Title</TableCell>
                  <TableCell>Civil/Ex-Armed</TableCell>
                  <TableCell>NIC</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell align="center">Photo</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.records.map((r, i) => (
                  <TableRow key={`${r.empId}-${r.clientId}`} hover>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>{r.empId}</TableCell>
                    <TableCell>{cleanEmployeeName(r.employeeName)}</TableCell>
                    <TableCell>{r.jobTitle}</TableCell>
                    <TableCell>{r.serviceType}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{r.nic || '-'}</TableCell>
                    <TableCell>
                      {r.clientId} - {r.clientName}
                    </TableCell>
                    <TableCell align="center">
                      {r.hasPicture ? (
                        <Iconify icon="solar:camera-bold" width={18} sx={{ color: 'success.main' }} />
                      ) : (
                        <Typography variant="caption" color="text.disabled">
                          none
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {!data.records.length && (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      No guards deployed at these clients on this date
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

EmployeeCategoryWiseReport.propTypes = {
  reportPicker: PropTypes.node,
};
