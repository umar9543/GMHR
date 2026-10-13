import PropTypes from 'prop-types';
import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import Collapse from '@mui/material/Collapse';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import TableContainer from '@mui/material/TableContainer';
import LinearProgress from '@mui/material/LinearProgress';
import TablePagination from '@mui/material/TablePagination';

import Iconify from 'src/components/iconify';
import { getMarkedDays } from 'src/api/attendance';

// ----------------------------------------------------------------------
// Which days attendance has been marked. The sheet screen can only answer for
// the date in the box, so this is the way to see at a glance what has been
// done and what has been missed - and to open any of those days.
//
// It opens on the last three months, which reads in a moment. The period box
// reaches back over the whole history: any one year (a couple of seconds), or
// every marked day since the legacy records begin in 2010, which takes the
// server around half a minute and so is only read when asked for.
// ----------------------------------------------------------------------

const MONTHS_BACK = 3;
const FIRST_YEAR = 2010;
const ROWS_PER_PAGE = 100;

const RECENT = 'recent';
const ALL = 'all';

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

/** The from and to dates a period reads, and how it is described. */
const periodRange = (period) => {
  const today = new Date();
  if (period === RECENT) {
    return {
      from: toIso(new Date(today.getFullYear(), today.getMonth() - MONTHS_BACK, 1)),
      to: toIso(today),
      text: `in the last ${MONTHS_BACK} months`,
    };
  }
  if (period === ALL) {
    return { from: `${FIRST_YEAR}-01-01`, to: toIso(today), text: 'in all history' };
  }
  return { from: `${period}-01-01`, to: `${period}-12-31`, text: `in ${period}` };
};

export default function MarkedDaysPanel({ onPick, selectedDate }) {
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState(RECENT);
  const [days, setDays] = useState([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  // Only the last period asked for may fill the list, if an earlier one
  // answers after it.
  const latest = useRef(0);

  const years = useMemo(() => {
    const list = [];
    for (let y = new Date().getFullYear(); y >= FIRST_YEAR; y -= 1) list.push(y);
    return list;
  }, []);

  const range = periodRange(period);

  const load = useCallback(async () => {
    const ask = latest.current + 1;
    latest.current = ask;
    const { from, to } = periodRange(period);
    setLoading(true);
    try {
      const list = await getMarkedDays(from, to);
      if (latest.current !== ask) return;
      setDays(list);
      setPage(0);
      setFailed(false);
    } catch (err) {
      if (latest.current !== ask) return;
      // The endpoint may not be deployed yet; the sheet works without it.
      console.error('Could not read the marked days', err);
      setFailed(true);
    } finally {
      if (latest.current === ask) setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    load();
  }, [load]);

  if (failed) return null;

  const shown = days.slice(page * ROWS_PER_PAGE, (page + 1) * ROWS_PER_PAGE);

  return (
    <Card sx={{ mb: 3 }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={1}
        sx={{ px: 2.5, py: 1.5 }}
      >
        <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{ whiteSpace: 'nowrap' }}>
            Marked days
          </Typography>
          <Chip
            size="small"
            label={loading ? 'reading...' : `${days.length.toLocaleString()} ${range.text}`}
          />
          {!open && (
            <Typography variant="caption" color="text.secondary" noWrap>
              open to see which days are marked
            </Typography>
          )}
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            select
            size="small"
            label="Period"
            value={period}
            onChange={(event) => {
              setPeriod(event.target.value);
              setOpen(true);
            }}
            sx={{ minWidth: 170 }}
          >
            <MenuItem value={RECENT}>Last {MONTHS_BACK} months</MenuItem>
            {years.map((y) => (
              <MenuItem key={y} value={String(y)}>
                {y}
              </MenuItem>
            ))}
            <MenuItem value={ALL}>All history (slow)</MenuItem>
          </TextField>
          <Tooltip title="Read again">
            <span>
              <IconButton size="small" onClick={load} disabled={loading}>
                <Iconify icon="solar:refresh-bold" width={18} />
              </IconButton>
            </span>
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

        {loading && period === ALL && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', px: 2.5, py: 1 }}>
            Reading every marked day since {FIRST_YEAR} - this takes around half a minute.
          </Typography>
        )}

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
              {shown.map((day) => (
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
                      No attendance marked {range.text}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* A year holds about 365 days and all history over 6,000, so they
            come a hundred at a time. */}
        {days.length > ROWS_PER_PAGE && (
          <TablePagination
            component="div"
            count={days.length}
            page={page}
            rowsPerPage={ROWS_PER_PAGE}
            rowsPerPageOptions={[ROWS_PER_PAGE]}
            onPageChange={(event, next) => setPage(next)}
          />
        )}
      </Collapse>
    </Card>
  );
}

MarkedDaysPanel.propTypes = {
  onPick: PropTypes.func,
  selectedDate: PropTypes.string,
};
