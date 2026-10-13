import PropTypes from 'prop-types';
import { useSnackbar } from 'notistack';
import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import Switch from '@mui/material/Switch';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Autocomplete from '@mui/material/Autocomplete';
import TableContainer from '@mui/material/TableContainer';
import LinearProgress from '@mui/material/LinearProgress';
import FormControlLabel from '@mui/material/FormControlLabel';

import { getShifts } from 'src/api/shift';
import { clientLabel, filterClientOptions } from 'src/utils/client-picker';
import { getClientRanks, getAllClientOptions } from 'src/api/hr-client';
import { getEmployeeMonth, saveEmployeeMonth } from 'src/api/attendance';

// ----------------------------------------------------------------------
// One employee's month of attendance, laid out like the daily sheet: the
// mark, the shift, the client, the overtime client, the category and the
// category the overtime was covered under.
//
// Shown on the Employee Wise Entry page and in the month-wise report's
// dialog. The page shows only the days that carry attendance unless asked
// for the rest (`hideEmpty`).
//
// Saving a day writes it into that date's sheet; the server first brings the
// rest of the day over from the legacy history, so the day stays whole for
// every other guard. Choosing "None" gives the guard back his legacy line for
// the day, or removes his line when he has none.
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

const clientCodeFilter = filterClientOptions;

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTH_SHORT = MONTHS.map((m) => m.slice(0, 3));
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const pad = (n) => String(n).padStart(2, '0');
const isoDate = (year, month, day) => `${year}-${pad(month)}-${pad(day)}`;

// The same compact columns as the daily sheet.
const ID_PICKER_SX = { width: 100 };
const WIDE_LIST = { popper: { style: { width: 340 }, placement: 'bottom-start' } };
const CATEGORY_SX = { width: 160 };
const CATEGORY_LIST = { popper: { style: { width: 240 }, placement: 'bottom-start' } };
const NAME_CELL_SX = { maxWidth: 160, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };

export default function EmployeeMonthEditor({
  open = true,
  onClose,
  employee,
  year,
  month,
  lastDay,
  hideEmpty = false,
  onSaved,
  maxHeight = 520,
}) {
  const { enqueueSnackbar } = useSnackbar();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [days, setDays] = useState([]);
  const [header, setHeader] = useState(null);
  const [edited, setEdited] = useState(() => new Set());
  const [showEmpty, setShowEmpty] = useState(!hideEmpty);

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
          mark: found?.mark || '',
          shiftId: found?.shiftId ?? null,
          clientId: found?.clientId || null,
          otClientId: found?.otClientId || null,
          rank: found?.rank || '',
          ovRank: found?.ovRank || '',
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
    (clientOptions || []).forEach((c) => map.set(c.clientId, { ...c, label: clientLabel(c) }));
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

  const shiftCode = (shiftId) => shifts.find((sh) => sh.shiftId === shiftId)?.code || '-';

  const patchDay = (day, patch) => {
    setDays((prev) => prev.map((d) => (d.day === day ? { ...d, ...patch } : d)));
    setEdited((prev) => new Set(prev).add(day));
  };

  // Overtime details belong to the P/P mark alone.
  const handleMark = (day) => (event) => {
    const mark = event.target.value;
    patchDay(day, mark === OVERTIME_MARK ? { mark } : { mark, otClientId: null, ovRank: '' });
  };

  // A day changed here stays on screen even if it was cleared, until saved.
  const inRange = lastDay ? days.filter((d) => d.day <= lastDay) : days;
  const shownDays = showEmpty ? inRange : inRange.filter((d) => d.mark || edited.has(d.day));
  const emptyCount = inRange.filter((d) => !d.mark).length;
  const changedDays = inRange.filter((d) => edited.has(d.day));

  const handleSave = async () => {
    if (!changedDays.length) {
      enqueueSnackbar('Nothing has been changed', { variant: 'info' });
      return;
    }
    const missing = changedDays.filter((d) => d.mark && (!d.clientId || !d.shiftId));
    if (missing.length) {
      enqueueSnackbar(`${missing.length} day(s) still need a client and a shift`, {
        variant: 'warning',
      });
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
        ovRank: d.mark === OVERTIME_MARK ? d.ovRank || null : null,
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

  const categoryPicker = (value, onChange, { disabled = false, placeholder = 'Category' } = {}) => (
    <Autocomplete
      size="small"
      freeSolo
      forcePopupIcon
      disableClearable
      disabled={disabled}
      options={rankChoices}
      value={value || ''}
      onChange={(e, v) => onChange(v || '')}
      onInputChange={(e, v, reason) => {
        if (reason === 'input') onChange(v);
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder={disabled ? '' : placeholder}
          inputProps={{ ...params.inputProps, title: value || '' }}
        />
      )}
      sx={CATEGORY_SX}
      slotProps={CATEGORY_LIST}
    />
  );

  const clientPicker = (value, onChange, { disabled = false, error = false } = {}) => (
    <Autocomplete
      size="small"
      autoHighlight
      disabled={disabled}
      options={clientChoices}
      filterOptions={clientCodeFilter}
      value={clientById.get(value) || null}
      onChange={(e, v) => onChange(v?.clientId ?? null)}
      getOptionLabel={(o) => (o?.clientId != null ? String(o.clientId) : '')}
      isOptionEqualToValue={(o, v) => o.clientId === v.clientId}
      renderOption={(props, option) => (
        <li {...props} key={option.clientId}>
          {option.label}
        </li>
      )}
      renderInput={(params) => (
        <TextField {...params} placeholder={disabled ? '' : 'Code'} error={error} />
      )}
      sx={ID_PICKER_SX}
      slotProps={WIDE_LIST}
    />
  );

  const nameCell = (clientId) => {
    const name = clientById.get(clientId)?.name || '';
    return (
      <TableCell sx={NAME_CELL_SX} title={name}>
        {name || '-'}
      </TableCell>
    );
  };

  return (
    <>
      <Box sx={{ px: 3, pt: 2.5, pb: 1.5 }}>
        <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap">
          <Typography variant="h6">
            {header?.EmployeeName || employee?.name || `Employee ${employeeId}`}
          </Typography>
          <Chip size="small" label={`Code ${employeeId}`} />
          <Chip size="small" color="primary" label={`${MONTHS[month - 1]} ${year}`} />
          <Box sx={{ flexGrow: 1 }} />
          {hideEmpty && (
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={showEmpty}
                  onChange={(e) => setShowEmpty(e.target.checked)}
                />
              }
              label={`Show days with no attendance (${emptyCount})`}
            />
          )}
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Change a day and save. Choosing None for a day gives it back its legacy record, or
          removes it when there is none.
        </Typography>
      </Box>

      {(loading || saving) && <LinearProgress />}

      <Box sx={{ borderTop: 1, borderBottom: 1, borderColor: 'divider' }}>
        <TableContainer sx={{ maxHeight }}>
          <Table stickyHeader size="small" sx={{ minWidth: 1150 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 50 }}>S.No</TableCell>
                <TableCell sx={{ width: 100 }}>Day</TableCell>
                <TableCell>Atten</TableCell>
                <TableCell>Shift</TableCell>
                <TableCell align="center" sx={{ width: 110 }}>
                  Client Id
                </TableCell>
                <TableCell>Client</TableCell>
                <TableCell align="center" sx={{ width: 110 }}>
                  OT Client Id
                </TableCell>
                <TableCell>OT Client</TableCell>
                <TableCell sx={{ width: 170 }}>Category</TableCell>
                <TableCell sx={{ width: 170 }}>OT Category</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {shownDays.map((row, index) => {
                const isOvertime = row.mark === OVERTIME_MARK;
                const weekday = WEEKDAYS[new Date(year, month - 1, row.day).getDay()];
                return (
                  <TableRow key={row.day} hover selected={edited.has(row.day)}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      <Box component="span" sx={{ fontWeight: 600 }}>
                        {weekday}
                      </Box>{' '}
                      <Box component="span" sx={{ color: 'text.secondary' }}>
                        {pad(row.day)} {MONTH_SHORT[month - 1]}
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Select
                        size="small"
                        displayEmpty
                        value={row.mark}
                        onChange={handleMark(row.day)}
                        renderValue={(value) => value || 'None'}
                        sx={{ minWidth: 72 }}
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
                        renderValue={(value) => (value ? shiftCode(value) : '-')}
                        sx={{ minWidth: 64 }}
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
                      {clientPicker(row.clientId, (clientId) => patchDay(row.day, { clientId }), {
                        error: !!row.mark && !row.clientId,
                      })}
                    </TableCell>
                    {nameCell(row.clientId)}

                    <TableCell align="center">
                      {clientPicker(
                        row.otClientId,
                        (otClientId) => patchDay(row.day, { otClientId }),
                        { disabled: !isOvertime, error: isOvertime && !row.otClientId }
                      )}
                    </TableCell>
                    {nameCell(row.otClientId)}

                    <TableCell>
                      {categoryPicker(row.rank, (rank) => patchDay(row.day, { rank }))}
                    </TableCell>

                    {/* The category he covered the overtime under, which can
                        differ from his own - an overtime day's alone. */}
                    <TableCell>
                      {categoryPicker(row.ovRank, (ovRank) => patchDay(row.day, { ovRank }), {
                        disabled: !isOvertime,
                        placeholder: row.rank || 'OT Category',
                      })}
                    </TableCell>
                  </TableRow>
                );
              })}

              {!loading && !shownDays.length && (
                <TableRow>
                  <TableCell colSpan={10}>
                    <Box sx={{ py: 3, textAlign: 'center' }}>
                      <Typography variant="subtitle2">No attendance this month</Typography>
                      {hideEmpty && emptyCount > 0 && (
                        <Typography variant="body2" color="text.secondary">
                          Turn on &quot;Show days with no attendance&quot; to add a day.
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 3, py: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mr: 'auto' }}>
          {changedDays.length ? `${changedDays.length} day(s) changed` : 'No changes yet'}
        </Typography>
        {onClose && (
          <Button onClick={onClose} disabled={saving}>
            Close
          </Button>
        )}
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving || loading || !changedDays.length}
        >
          Save Changes
        </Button>
      </Stack>
    </>
  );
}

EmployeeMonthEditor.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  employee: PropTypes.object,
  year: PropTypes.number,
  month: PropTypes.number,
  lastDay: PropTypes.number,
  hideEmpty: PropTypes.bool,
  onSaved: PropTypes.func,
  maxHeight: PropTypes.number,
};
