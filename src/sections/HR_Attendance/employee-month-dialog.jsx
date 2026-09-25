import PropTypes from 'prop-types';
import { useSnackbar } from 'notistack';
import { useState, useEffect, useMemo, useCallback } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Select from '@mui/material/Select';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import TableContainer from '@mui/material/TableContainer';
import LinearProgress from '@mui/material/LinearProgress';

import { getShifts } from 'src/api/shift';
import { getClientRanks, getAllClientOptions } from 'src/api/hr-client';
import { getEmployeeMonth, saveEmployeeMonth } from 'src/api/attendance';

// ----------------------------------------------------------------------
// One employee's month of attendance, in the same shape as the attendance
// sheet: the mark, the shift, the client worked at and the overtime client.
//
// Days come from two places - marked in this app, or migrated from the legacy
// HR system - and a legacy day edited here is written into this app's own
// sheet, which then takes precedence. Clearing a day hands it back to legacy.
// ----------------------------------------------------------------------

const MARKS = [
  { value: 'P', label: 'P - Present' },
  { value: 'A', label: 'A - Absent' },
  { value: 'L', label: 'L - Leave' },
  { value: 'P/P', label: 'P/P - Present + Overtime' },
];
const LEGACY_MARKS = { G: 'G - Gazetted', WO: 'WO - Week Off', OT: 'OT - Overtime only' };
const OVERTIME_MARK = 'P/P';

const marksFor = (mark) =>
  LEGACY_MARKS[mark] ? [...MARKS, { value: mark, label: LEGACY_MARKS[mark] }] : MARKS;

const clientCodeFilter = createFilterOptions({
  limit: 50,
  stringify: (o) => `${o.clientId} ${o.name ?? ''}`,
});

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const pad = (n) => String(n).padStart(2, '0');
const isoDate = (year, month, day) => `${year}-${pad(month)}-${pad(day)}`;

export default function EmployeeMonthDialog({ open, onClose, employee, year, month, onSaved }) {
  const { enqueueSnackbar } = useSnackbar();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [days, setDays] = useState([]);
  const [header, setHeader] = useState(null);
  const [edited, setEdited] = useState(() => new Set());

  const [clientOptions, setClientOptions] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [rankList, setRankList] = useState([]);

  const employeeId = employee?.empCode ?? employee?.id ?? null;

  useEffect(() => {
    let cancelled = false;
    if (!open) return () => {};
    (async () => {
      try {
        const [clients, shiftRows, ranks] = await Promise.all([
          getAllClientOptions().catch(() => []),
          getShifts(true).catch(() => []),
          getClientRanks().catch(() => []),
        ]);
        if (cancelled) return;
        setClientOptions(clients || []);
        setShifts(shiftRows || []);
        setRankList(ranks || []);
      } catch (err) {
        console.error(err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const load = useCallback(async () => {
    if (!open || !employeeId) return;
    setLoading(true);
    setEdited(new Set());
    try {
      const data = await getEmployeeMonth(employeeId, year, month);
      const byDay = new Map((data.days || []).map((d) => [d.day, d]));
      // Every day of the month, so a day that was never marked can be added.
      const rows = Array.from({ length: data.daysInMonth || 31 }, (_, i) => {
        const day = i + 1;
        const found = byDay.get(day);
        return {
          day,
          source: found?.source || 'none',
          mark: found?.mark || '',
          shiftId: found?.shiftId ?? null,
          clientId: found?.clientId || null,
          otClientId: found?.otClientId || null,
          rank: found?.rank || '',
          overtimeAmount: found?.overtimeAmount ?? null,
        };
      });
      setDays(rows);
      setHeader(data.employee || null);
    } catch (err) {
      console.error(err);
      enqueueSnackbar('Could not load this employee’s attendance', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [open, employeeId, year, month, enqueueSnackbar]);

  useEffect(() => {
    load();
  }, [load]);

  const clientById = useMemo(() => {
    const map = new Map();
    (clientOptions || []).forEach((c) =>
      map.set(c.clientId, { ...c, label: `${c.clientId} - ${c.name}` })
    );
    return map;
  }, [clientOptions]);

  const clientChoices = useMemo(
    () => Array.from(clientById.values()).filter((c) => !c.isClosed),
    [clientById]
  );

  const rankChoices = useMemo(() => {
    const set = new Set((rankList || []).map((r) => String(r).trim()).filter(Boolean));
    set.delete('.');
    return Array.from(set).sort();
  }, [rankList]);

  const patchDay = (day, patch) => {
    setDays((prev) => prev.map((d) => (d.day === day ? { ...d, ...patch } : d)));
    setEdited((prev) => new Set(prev).add(day));
  };

  const handleMark = (day) => (event) => {
    const mark = event.target.value;
    patchDay(day, mark === OVERTIME_MARK ? { mark } : { mark, otClientId: null });
  };

  const changedDays = days.filter((d) => edited.has(d.day));

  const handleSave = async () => {
    if (!changedDays.length) {
      enqueueSnackbar('Nothing has been changed', { variant: 'info' });
      return;
    }
    const missing = changedDays.filter((d) => d.mark && (!d.clientId || !d.shiftId));
    if (missing.length) {
      enqueueSnackbar(
        `${missing.length} day(s) still need a client and a shift`,
        { variant: 'warning' }
      );
      return;
    }
    const needOt = changedDays.filter((d) => d.mark === OVERTIME_MARK && !d.otClientId);
    if (needOt.length) {
      enqueueSnackbar(`${needOt.length} day(s) marked ${OVERTIME_MARK} need an OT client`, {
        variant: 'warning',
      });
      return;
    }

    setSaving(true);
    try {
      const payload = changedDays.map((d) => ({
        date: isoDate(year, month, d.day),
        mark: d.mark,
        shiftId: d.shiftId,
        clientId: d.clientId,
        otClientId: d.otClientId,
        rank: d.rank,
        overtimeAmount: d.overtimeAmount,
      }));
      const res = await saveEmployeeMonth(employeeId, payload);
      enqueueSnackbar(
        `Saved ${res.daysSaved || 0} day(s)${res.daysCleared ? `, cleared ${res.daysCleared}` : ''}`,
        { variant: 'success' }
      );
      await load();
      onSaved?.();
    } catch (err) {
      console.error(err);
      enqueueSnackbar('Could not save the attendance', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap">
          <Typography variant="h6">
            {header?.EmployeeName || employee?.name || `Employee ${employeeId}`}
          </Typography>
          <Chip size="small" label={`Code ${employeeId}`} />
          <Chip size="small" color="primary" label={`${MONTHS[month - 1]} ${year}`} />
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Change a day and save. Clearing a day&apos;s mark removes what this app holds,
          leaving the legacy record for that day.
        </Typography>
      </DialogTitle>

      {(loading || saving) && <LinearProgress />}

      <DialogContent dividers sx={{ p: 0 }}>
        <TableContainer sx={{ maxHeight: 520 }}>
          <Table stickyHeader size="small" sx={{ minWidth: 1100 }}>
            <TableHead>
              <TableRow>
                <TableCell>Day</TableCell>
                <TableCell>Atten</TableCell>
                <TableCell>Shift</TableCell>
                <TableCell align="center">Client Id</TableCell>
                <TableCell>Client</TableCell>
                <TableCell align="center">OT Client Id</TableCell>
                <TableCell>OT Client</TableCell>
                <TableCell>Category</TableCell>
                <TableCell align="center">From</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {days.map((row) => {
                const isOvertime = row.mark === OVERTIME_MARK;
                const changed = edited.has(row.day);
                return (
                  <TableRow key={row.day} hover selected={changed}>
                    <TableCell sx={{ fontWeight: 'bold' }}>{row.day}</TableCell>

                    <TableCell>
                      <Select
                        size="small"
                        displayEmpty
                        value={row.mark}
                        onChange={handleMark(row.day)}
                        sx={{ minWidth: 100 }}
                      >
                        <MenuItem value="">
                          <em>None</em>
                        </MenuItem>
                        {marksFor(row.mark).map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </TableCell>

                    <TableCell>
                      <Select
                        size="small"
                        displayEmpty
                        error={!!row.mark && !row.shiftId}
                        value={row.shiftId || ''}
                        onChange={(e) =>
                          patchDay(row.day, {
                            shiftId: e.target.value === '' ? null : e.target.value,
                          })
                        }
                        sx={{ minWidth: 100 }}
                      >
                        <MenuItem value="">
                          <em>None</em>
                        </MenuItem>
                        {shifts.map((sh) => (
                          <MenuItem key={sh.shiftId} value={sh.shiftId}>
                            {sh.code} - {sh.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </TableCell>

                    <TableCell align="center">
                      <Autocomplete
                        size="small"
                        options={clientChoices}
                        filterOptions={clientCodeFilter}
                        value={clientById.get(row.clientId) || null}
                        onChange={(e, value) =>
                          patchDay(row.day, { clientId: value?.clientId ?? null })
                        }
                        getOptionLabel={(o) => (o?.clientId != null ? String(o.clientId) : '')}
                        isOptionEqualToValue={(o, v) => o.clientId === v.clientId}
                        renderOption={(props, option) => (
                          <li {...props} key={option.clientId}>
                            {option.label}
                          </li>
                        )}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            placeholder="Code"
                            error={!!row.mark && !row.clientId}
                          />
                        )}
                        sx={{ minWidth: 110 }}
                      />
                    </TableCell>

                    <TableCell>{clientById.get(row.clientId)?.name || '-'}</TableCell>

                    <TableCell align="center">
                      <Autocomplete
                        size="small"
                        disabled={!isOvertime}
                        options={clientChoices}
                        filterOptions={clientCodeFilter}
                        value={clientById.get(row.otClientId) || null}
                        onChange={(e, value) =>
                          patchDay(row.day, { otClientId: value?.clientId ?? null })
                        }
                        getOptionLabel={(o) => (o?.clientId != null ? String(o.clientId) : '')}
                        isOptionEqualToValue={(o, v) => o.clientId === v.clientId}
                        renderOption={(props, option) => (
                          <li {...props} key={option.clientId}>
                            {option.label}
                          </li>
                        )}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            placeholder={isOvertime ? 'Code' : ''}
                            error={isOvertime && !row.otClientId}
                          />
                        )}
                        sx={{ minWidth: 110 }}
                      />
                    </TableCell>

                    <TableCell>{clientById.get(row.otClientId)?.name || '-'}</TableCell>

                    <TableCell>
                      <Autocomplete
                        size="small"
                        freeSolo
                        forcePopupIcon
                        options={rankChoices}
                        value={row.rank || ''}
                        onChange={(e, value) => patchDay(row.day, { rank: value || '' })}
                        onInputChange={(e, value, reason) => {
                          if (reason === 'input') patchDay(row.day, { rank: value });
                        }}
                        renderInput={(params) => <TextField {...params} placeholder="Category" />}
                        sx={{ minWidth: 170 }}
                      />
                    </TableCell>

                    <TableCell align="center">
                      {row.source === 'none' ? (
                        <Typography variant="caption" color="text.disabled">
                          -
                        </Typography>
                      ) : (
                        <Tooltip
                          title={
                            row.source === 'live'
                              ? 'Marked in this app'
                              : 'From the legacy HR system'
                          }
                        >
                          <Chip
                            size="small"
                            variant="soft"
                            color={row.source === 'live' ? 'success' : 'default'}
                            label={row.source === 'live' ? 'App' : 'Legacy'}
                          />
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}

              {!loading && !days.length && (
                <TableRow>
                  <TableCell colSpan={9}>
                    <Box sx={{ py: 3, textAlign: 'center' }}>
                      <Typography variant="subtitle2">No attendance for this month</Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>

      <DialogActions>
        <Typography variant="body2" color="text.secondary" sx={{ mr: 'auto' }}>
          {changedDays.length
            ? `${changedDays.length} day(s) changed`
            : 'No changes yet'}
        </Typography>
        <Button onClick={onClose} disabled={saving}>
          Close
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving || loading || !changedDays.length}
        >
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
}

EmployeeMonthDialog.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  employee: PropTypes.object,
  year: PropTypes.number,
  month: PropTypes.number,
  onSaved: PropTypes.func,
};
