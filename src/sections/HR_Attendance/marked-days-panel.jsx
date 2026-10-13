import PropTypes from 'prop-types';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import Collapse from '@mui/material/Collapse';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import TableContainer from '@mui/material/TableContainer';
import LinearProgress from '@mui/material/LinearProgress';

import Iconify from 'src/components/iconify';
import { getMarkedDays } from 'src/api/attendance';

// ----------------------------------------------------------------------
// Which days attendance has been marked. The sheet screen can only answer for
// the date in the box, so this is the way to see at a glance what has been
// done and what has been missed - and to open any of those days.
// ----------------------------------------------------------------------

const MONTHS_BACK = 3;

const dmy = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

const weekday = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
};

const toIso = (d) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export default function MarkedDaysPanel({ onPick, selectedDate }) {
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const to = new Date();
      const from = new Date(to.getFullYear(), to.getMonth() - MONTHS_BACK, 1);
      setDays(await getMarkedDays(toIso(from), toIso(to)));
      setFailed(false);
    } catch (err) {
      // The endpoint may not be deployed yet; the sheet works without it.
      console.error('Could not read the marked days', err);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (failed) return null;

  return (
    <Card sx={{ mb: 3 }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ px: 2.5, py: 1.5 }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="subtitle1">Marked days</Typography>
          <Chip size="small" label={`${days.length} in the last ${MONTHS_BACK} months`} />
          {!open && (
            <Typography variant="caption" color="text.secondary">
              open to see which days are marked
            </Typography>
          )}
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title="Read again">
            <IconButton size="small" onClick={load} disabled={loading}>
              <Iconify icon="solar:refresh-bold" width={18} />
            </IconButton>
          </Tooltip>
          <IconButton size="small" onClick={() => setOpen((v) => !v)}>
            <Iconify
              icon={open ? 'eva:arrow-ios-upward-fill' : 'eva:arrow-ios-downward-fill'}
              width={20}
            />
          </IconButton>
        </Stack>
      </Stack>

      {loading && <LinearProgress />}

      <Collapse in={open}>
        <Divider />

        <TableContainer sx={{ maxHeight: 320 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ minWidth: 160 }}>Attendance date</TableCell>
                <TableCell align="right">Guards</TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>

            <TableBody>
              {days.map((day) => (
                <TableRow key={day.date} hover selected={day.date === selectedDate}>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    {dmy(day.date)}{' '}
                    <Box component="span" sx={{ color: 'text.disabled' }}>
                      {weekday(day.date)}
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    {(day.appRows || day.legacyRows).toLocaleString()}
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      startIcon={<Iconify icon="solar:pen-bold" width={16} />}
                      onClick={() => {
                        setOpen(false);
                        onPick(day.date);
                      }}
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}

              {!loading && !days.length && (
                <TableRow>
                  <TableCell colSpan={3}>
                    <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
                      No attendance marked in the last {MONTHS_BACK} months
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Collapse>
    </Card>
  );
}

MarkedDaysPanel.propTypes = {
  onPick: PropTypes.func,
  selectedDate: PropTypes.string,
};
