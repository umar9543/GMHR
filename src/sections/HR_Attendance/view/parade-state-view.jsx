import { useMemo, useState } from 'react';
import { useSnackbar } from 'notistack';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
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
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import LinearProgress from '@mui/material/LinearProgress';
import TableContainer from '@mui/material/TableContainer';

import { paths } from 'src/routes/paths';
import Iconify from 'src/components/iconify';
import { useSettingsContext } from 'src/components/settings';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';

import { getParadeState } from 'src/api/attendance';

import { groupRows, PARADE_COLUMNS } from '../parade-state-utils';
import { buildParadeStatePdf } from '../parade-state-pdf';

const toIsoDate = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function ParadeStateView() {
  const settings = useSettingsContext();
  const { enqueueSnackbar } = useSnackbar();

  const [date, setDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [building, setBuilding] = useState(false);
  const [result, setResult] = useState(null);

  const view = useMemo(
    () => (result ? groupRows(result.records) : null),
    [result]
  );

  const handleGenerate = async () => {
    if (!date || Number.isNaN(date.getTime())) {
      enqueueSnackbar('Pick a date first', { variant: 'warning' });
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
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
          <DatePicker
            label="As of date"
            value={date}
            onChange={setDate}
            format="dd/MM/yyyy"
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
            disabled={!result?.records?.length || building}
            sx={{ height: 40, px: 3, whiteSpace: 'nowrap' }}
          >
            {building ? 'Building...' : 'PDF'}
          </Button>
        </Stack>
      </Card>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {view && (
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
                {view.rowCount} client sites &middot; {view.groups.length} groups
              </Typography>
              <Typography variant="body2" color="text.secondary">
                DEF is strength not on post. SH is what is still uncovered after overtime.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Chip
                size="small"
                color="info"
                label={`Required ${view.grandTotals.reqTotal}`}
              />
              <Chip
                size="small"
                color="success"
                label={`On post ${view.grandTotals.preDay + view.grandTotals.preNight}`}
              />
              <Chip
                size="small"
                color={view.grandTotals.shDay + view.grandTotals.shNight > 0 ? 'error' : 'default'}
                label={`Short ${view.grandTotals.shDay + view.grandTotals.shNight}`}
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

      {!view && !loading && (
        <Card sx={{ p: 5, textAlign: 'center' }}>
          <Typography variant="subtitle2" color="text.secondary">
            Pick a date and press Generate to build the parade state.
          </Typography>
        </Card>
      )}
    </Container>
  );
}
