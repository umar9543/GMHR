import PropTypes from 'prop-types';
import { useSnackbar } from 'notistack';
import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Checkbox from '@mui/material/Checkbox';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import Autocomplete from '@mui/material/Autocomplete';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import LinearProgress from '@mui/material/LinearProgress';
import TableContainer from '@mui/material/TableContainer';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import FormControlLabel from '@mui/material/FormControlLabel';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { APP_API } from 'src/config-global';
import Iconify from 'src/components/iconify';
import { useSettingsContext } from 'src/components/settings';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';

import {
  getClient,
  createGroup,
  createClient,
  updateClient,
  getClientRanks,
  getClientHistory,
  getClientAllowances,
  deleteClientHistoryVersion,
} from 'src/api/hr-client';

import { buildClientSheetPdf } from './client-sheet-pdf';

// ----------------------------------------------------------------------
// Company Details: the legacy client screen. A client takes a number of
// guards per rank, and that number is entered for a date: tomorrow it may be
// more or fewer. Every date is kept, so the Guard History shows what the
// client took on each day and when it was entered.
//
// Rate is no longer on this screen. The server keeps the rates already on
// file, so billing is unaffected.
// ----------------------------------------------------------------------

const DATE_FORMAT = 'dd/MM/yyyy';
const HISTORY_PAGE = 50;

const startOfToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

// Dates travel as yyyy-MM-dd and are handled as local calendar dates. Going
// through toISOString would shift them back a day in Pakistan time.
const pad = (n) => String(n).padStart(2, '0');

const toIsoDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const fromIsoDate = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ''));
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null;
};

const fmtDate = (value) => {
  const d = value instanceof Date ? value : fromIsoDate(value);
  return d ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}` : '-';
};

const sameDay = (a, b) => !!a && !!b && toIsoDate(a) === toIsoDate(b);
const toCount = (v) => Math.max(0, parseInt(v, 10) || 0);
const toAmount = (v) => Math.max(0, parseFloat(v) || 0);

let rowSeq = 0;
const newRow = (source = {}) => {
  rowSeq += 1;
  const requiredDay = toCount(source.requiredDay);
  const requiredNight = toCount(source.requiredNight);
  const hasTotal = source.totalGuards !== undefined && source.totalGuards !== null;
  return {
    key: `rank-row-${rowSeq}`,
    rank: source.rank || '',
    requiredDay,
    requiredNight,
    totalGuards: hasTotal ? toCount(source.totalGuards) : requiredDay + requiredNight,
    overtimeRate: toAmount(source.overtimeRate),
  };
};

const blankForm = () => ({
  dailyDate: startOfToday(),
  name: '',
  group: null,
  contractCode: 'GD',
  activeDate: startOfToday(),
  expiryDate: null,
  expiryDate2: null,
  isClosed: false,
  dayFood: false,
  nightFood: false,
  compAllow: 0,
  otAmount: 0,
  otChk: false,
});

/** Screen fields from a history entry, or from the client itself when it has no history. */
const formFromSource = (source, dailyDate) => ({
  dailyDate,
  name: source.name || '',
  group: source.groupId
    ? { id: source.groupId, name: (source.groupName || `Group ${source.groupId}`).trim() }
    : null,
  contractCode: source.contractCode || 'GD',
  activeDate: fromIsoDate(source.activeDate),
  expiryDate: fromIsoDate(source.expiryDate),
  expiryDate2: fromIsoDate(source.expiryDate2),
  isClosed: !!source.isClosed,
  dayFood: !!source.chkDay,
  nightFood: !!source.chkNight,
  compAllow: source.compAllow ?? 0,
  otAmount: source.otAmount ?? 0,
  otChk: !!source.otChk,
});

const rankSummary = (ranks) =>
  (ranks || [])
    .filter((r) => r.totalGuards || r.requiredDay || r.requiredNight)
    .map((r) => `${r.rank} ${r.requiredDay}/${r.requiredNight}`)
    .join(', ') || 'No guards';

// ----------------------------------------------------------------------

export default function ClientNewEditView({ id }) {
  const settings = useSettingsContext();
  const { enqueueSnackbar } = useSnackbar();
  const router = useRouter();
  const isEdit = !!id;

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [printing, setPrinting] = useState(false);

  const [groups, setGroups] = useState([]);
  const [rankOptions, setRankOptions] = useState([]);

  const [form, setForm] = useState(blankForm);
  const [rows, setRows] = useState(() => [newRow()]);

  const [versions, setVersions] = useState([]);
  const [versionTotal, setVersionTotal] = useState(0);
  const [versionPage, setVersionPage] = useState(1);
  const [loadingOlder, setLoadingOlder] = useState(false);
  // Position in `versions` of the entry on screen. Null while entering a new date.
  const [viewIndex, setViewIndex] = useState(null);

  const [allowances, setAllowances] = useState([]);

  const [rankToAdd, setRankToAdd] = useState('');
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [savingGroup, setSavingGroup] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const setField = useCallback((field, value) => setForm((prev) => ({ ...prev, [field]: value })), []);

  // ------------------------------------------------------------ lookups
  useEffect(() => {
    (async () => {
      const [groupRows, ranks] = await Promise.all([
        fetch(`${APP_API}/api/Dropdown/groups`)
          .then((r) => (r.ok ? r.json() : []))
          .catch(() => []),
        getClientRanks().catch(() => []),
      ]);
      setGroups(
        (groupRows || []).map((g) => ({
          id: g.id ?? g.Id ?? g.ID,
          name: String(g.name ?? g.Name ?? g.NAME ?? '').trim(),
        }))
      );
      setRankOptions((ranks || []).map((r) => String(r).trim()).filter((r) => r && r !== '.'));
    })();
  }, []);

  // ----------------------------------------------------- showing entries
  const showVersion = useCallback((list, index) => {
    const entry = list[index];
    setForm(formFromSource(entry, fromIsoDate(entry.dailyDate)));
    setRows(entry.ranks?.length ? entry.ranks.map(newRow) : [newRow()]);
    setViewIndex(index);
  }, []);

  /** A new entry dated today, prefilled from an earlier entry or the client. */
  const startNewDate = useCallback((source, sourceRanks) => {
    setForm(source ? formFromSource(source, startOfToday()) : blankForm());
    setRows(sourceRanks?.length ? sourceRanks.map(newRow) : [newRow()]);
    setViewIndex(null);
  }, []);

  const loadAll = useCallback(
    async (focusHistoryId) => {
      setLoading(true);
      try {
        const [current, history, allowanceRows] = await Promise.all([
          getClient(id),
          getClientHistory(id, { page: 1, pageSize: HISTORY_PAGE }),
          getClientAllowances(id).catch(() => []),
        ]);
        const list = history.records || [];
        setVersions(list);
        setVersionTotal(history.pagination?.totalCount ?? list.length);
        setVersionPage(1);
        setAllowances(allowanceRows || []);

        const focusIndex = focusHistoryId ? list.findIndex((v) => v.historyId === focusHistoryId) : -1;
        const todayIndex = list.findIndex((v) => sameDay(fromIsoDate(v.dailyDate), startOfToday()));

        if (focusIndex >= 0) {
          showVersion(list, focusIndex);
        } else if (todayIndex >= 0) {
          showVersion(list, todayIndex);
        } else {
          // A new entry for today starts from the client's current strength,
          // the figures the Parade State and attendance already use. The
          // latest dated entry is not always that: the legacy system let an
          // earlier date be saved after a later one.
          startNewDate(current, current.requirements);
        }
      } catch (err) {
        enqueueSnackbar(err.message || 'Failed to load the client', { variant: 'error' });
      } finally {
        setLoading(false);
      }
    },
    [id, enqueueSnackbar, showVersion, startNewDate]
  );

  useEffect(() => {
    if (isEdit) loadAll();
  }, [isEdit, loadAll]);

  const loadOlder = useCallback(async () => {
    if (loadingOlder || versions.length >= versionTotal) return null;
    setLoadingOlder(true);
    try {
      const nextPage = versionPage + 1;
      const history = await getClientHistory(id, { page: nextPage, pageSize: HISTORY_PAGE });
      const merged = [...versions, ...(history.records || [])];
      setVersions(merged);
      setVersionPage(nextPage);
      return merged;
    } catch (err) {
      enqueueSnackbar(err.message || 'Could not load older entries', { variant: 'error' });
      return null;
    } finally {
      setLoadingOlder(false);
    }
  }, [id, loadingOlder, versions, versionTotal, versionPage, enqueueSnackbar]);

  // ---------------------------------------------------------- navigation
  const shown = viewIndex !== null ? versions[viewIndex] : null;

  const clashIndex = useMemo(
    () => versions.findIndex((v) => sameDay(fromIsoDate(v.dailyDate), form.dailyDate)),
    [versions, form.dailyDate]
  );
  const replacesEntry = clashIndex >= 0 && clashIndex !== viewIndex;

  // ---------------------------------------------------------------- grid
  const updateRow = (key, patch) =>
    setRows((prev) =>
      prev.map((row) => {
        if (row.key !== key) return row;
        const next = { ...row, ...patch };
        if (patch.requiredDay !== undefined || patch.requiredNight !== undefined) {
          next.totalGuards = next.requiredDay + next.requiredNight;
        }
        return next;
      })
    );

  const removeRow = (key) =>
    setRows((prev) => (prev.length > 1 ? prev.filter((row) => row.key !== key) : [newRow()]));

  const rankInUse = (rank) =>
    rows.some((row) => row.rank.trim().toLowerCase() === String(rank).trim().toLowerCase());

  const addableRanks = rankOptions.filter((rank) => !rankInUse(rank));

  const addRank = () => {
    const rank = String(rankToAdd || '').trim();
    if (!rank) return;
    if (rankInUse(rank)) {
      enqueueSnackbar(`${rank} is already in the list`, { variant: 'info' });
      return;
    }
    setRows((prev) =>
      prev.length === 1 && !prev[0].rank.trim() ? [newRow({ rank })] : [...prev, newRow({ rank })]
    );
    setRankToAdd('');
  };

  const totals = rows.reduce(
    (acc, row) => ({
      day: acc.day + row.requiredDay,
      night: acc.night + row.requiredNight,
      total: acc.total + row.totalGuards,
    }),
    { day: 0, night: 0, total: 0 }
  );

  // ------------------------------------------------------------- actions
  const handleSave = async () => {
    if (!form.name.trim()) {
      enqueueSnackbar('Customer name is required', { variant: 'warning' });
      return;
    }
    if (!form.dailyDate) {
      enqueueSnackbar('Choose the daily date', { variant: 'warning' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        dailyDate: toIsoDate(form.dailyDate),
        name: form.name.trim(),
        groupId: form.group?.id ?? null,
        contractCode: form.contractCode.trim() || 'GD',
        activeDate: toIsoDate(form.activeDate),
        expiryDate: toIsoDate(form.expiryDate),
        expiryDate2: toIsoDate(form.expiryDate2),
        isClosed: form.isClosed ? 1 : 0,
        chkDay: form.dayFood ? 1 : 0,
        chkNight: form.nightFood ? 1 : 0,
        compAllow: toAmount(form.compAllow),
        otAmount: toAmount(form.otAmount),
        otChk: form.otChk ? 1 : 0,
        requirements: rows
          .filter((row) => row.rank.trim())
          .map((row) => ({
            rank: row.rank.trim(),
            requiredDay: row.requiredDay,
            requiredNight: row.requiredNight,
            totalGuards: row.totalGuards,
            overtimeRate: row.overtimeRate,
          })),
      };

      if (isEdit) {
        const res = await updateClient(id, payload);
        enqueueSnackbar(
          res.currentUpdated === false
            ? `Saved for ${fmtDate(payload.dailyDate)}. Current strength is unchanged because a later date exists.`
            : `Guards saved for ${fmtDate(payload.dailyDate)}`,
          { variant: 'success' }
        );
        await loadAll(res.historyId);
      } else {
        const res = await createClient(payload);
        enqueueSnackbar('Client created', { variant: 'success' });
        router.push(paths.dashboard.HR_Module.Client.edit(res.clientId));
      }
    } catch (err) {
      enqueueSnackbar(err.message || 'Save failed', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!shown) return;
    setDeleting(true);
    try {
      const res = await deleteClientHistoryVersion(id, shown.historyId);
      enqueueSnackbar(
        res.restoredFrom
          ? `Entry deleted. Current strength now follows ${fmtDate(res.restoredFrom)}.`
          : 'Entry deleted',
        { variant: 'success' }
      );
      setConfirmDeleteOpen(false);
      await loadAll();
    } catch (err) {
      enqueueSnackbar(err.message || 'Delete failed', { variant: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  const handleAddGroup = async () => {
    const name = newGroupName.replace(/\s+/g, ' ').trim();
    if (!name || savingGroup) return;
    setSavingGroup(true);
    try {
      const res = await createGroup(name);
      const group = { id: res.group?.id, name: (res.group?.name || name).trim() };
      setGroups((prev) =>
        prev.some((g) => g.id === group.id)
          ? prev
          : [...prev, group].sort((a, b) => a.name.localeCompare(b.name))
      );
      setField('group', group);
      setGroupDialogOpen(false);
      enqueueSnackbar(
        res.created === false
          ? `"${group.name}" already exists and is now selected`
          : `Group "${group.name}" added`,
        { variant: 'success' }
      );
    } catch (err) {
      enqueueSnackbar(err.message || 'Could not add the group', { variant: 'error' });
    } finally {
      setSavingGroup(false);
    }
  };

  const handlePrint = async () => {
    setPrinting(true);
    try {
      const url = await buildClientSheetPdf({
        form,
        rows,
        totals,
        versions: versions.slice(0, 40),
        allowances,
      });
      window.open(url, '_blank');
    } catch (err) {
      enqueueSnackbar(err.message || 'Could not build the PDF', { variant: 'error' });
    } finally {
      setPrinting(false);
    }
  };

  // --------------------------------------------------------------- render
  const dateField = (label, field, extra = {}) => (
    <DatePicker
      label={label}
      value={form[field]}
      onChange={(value) => setField(field, value)}
      format={DATE_FORMAT}
      slotProps={{ textField: { fullWidth: true, size: 'small', ...extra } }}
    />
  );

  // The legacy screen puts a tick box on its expiry dates: ticked means the date is set.
  const optionalDateField = (label, field) => (
    <Stack direction="row" alignItems="center" spacing={0.5}>
      <Checkbox
        checked={!!form[field]}
        onChange={(e) => setField(field, e.target.checked ? startOfToday() : null)}
        inputProps={{ 'aria-label': `Set ${label}` }}
      />
      <DatePicker
        label={label}
        value={form[field]}
        onChange={(value) => setField(field, value)}
        disabled={!form[field]}
        format={DATE_FORMAT}
        slotProps={{ textField: { fullWidth: true, size: 'small' } }}
      />
    </Stack>
  );

  const tick = (label, field) => (
    <FormControlLabel
      control={<Checkbox checked={!!form[field]} onChange={(e) => setField(field, e.target.checked)} />}
      label={label}
    />
  );

  return (
    <Container maxWidth={settings.themeStretch ? false : 'xl'}>
      <CustomBreadcrumbs
        heading="Company Details"
        links={[
          { name: 'HR', href: paths.dashboard.HR_Module.root },
          { name: 'Clients', href: paths.dashboard.HR_Module.Client.list },
          { name: isEdit ? `Client ${id}` : 'New' },
        ]}
        sx={{ mb: 3 }}
      />

      {(loading || loadingOlder) && <LinearProgress sx={{ mb: 2 }} />}

      <Card sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            {dateField('Daily Date', 'dailyDate', {
              helperText: replacesEntry ? 'An entry for this date exists. Saving replaces it.' : ' ',
            })}
          </Grid>

          <Grid item xs={12}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Autocomplete
                fullWidth
                size="small"
                options={groups}
                value={form.group}
                onChange={(e, value) => setField('group', value)}
                getOptionLabel={(option) => option?.name || ''}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                renderInput={(params) => <TextField {...params} label="Group Name" />}
              />
              <Tooltip title="Add group">
                <IconButton
                  color="primary"
                  onClick={() => {
                    setNewGroupName('');
                    setGroupDialogOpen(true);
                  }}
                >
                  <Iconify icon="mingcute:add-line" />
                </IconButton>
              </Tooltip>
            </Stack>
          </Grid>

          <Grid item xs={12} md={4}>
            {dateField('Activation Date', 'activeDate')}
          </Grid>
          <Grid item xs={12} md={4}>
            {optionalDateField('Expiry Date', 'expiryDate')}
          </Grid>
          <Grid item xs={12} md={4}>
            {tick('Click if Contract Close', 'isClosed')}
          </Grid>

          <Grid item xs={12} md={8}>
            <TextField
              label="Customer"
              size="small"
              fullWidth
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              inputProps={{ maxLength: 200 }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            {optionalDateField('Expiry Date 2', 'expiryDate2')}
          </Grid>

          <Grid item xs={12} md={2}>
            <TextField
              label="Contract Code"
              size="small"
              fullWidth
              value={form.contractCode}
              onChange={(e) => setField('contractCode', e.target.value)}
              inputProps={{ maxLength: 100 }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <Stack direction="row">
              {tick('Day Food', 'dayFood')}
              {tick('Night Food', 'nightFood')}
            </Stack>
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              label="Company Allowance"
              size="small"
              type="number"
              fullWidth
              value={form.compAllow}
              onChange={(e) => setField('compAllow', e.target.value)}
              inputProps={{ min: 0 }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              label="OT Client Amount"
              size="small"
              type="number"
              fullWidth
              value={form.otAmount}
              onChange={(e) => setField('otAmount', e.target.value)}
              inputProps={{ min: 0 }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            {tick('Click for OT ClientAmt', 'otChk')}
          </Grid>
        </Grid>
      </Card>

      <Card sx={{ mb: 3 }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ md: 'center' }}
          spacing={1}
          sx={{ px: 3, pt: 2.5, pb: 1.5 }}
        >
          <Box>
            <Typography variant="subtitle1">Guards required on {fmtDate(form.dailyDate)}</Typography>
            <Typography variant="body2" color="text.secondary">
              How many guards this client takes for this date. The next day can be more or fewer;
              every date is kept in the Guard History.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Chip color="warning" label={`Day ${totals.day}`} />
            <Chip color="info" label={`Night ${totals.night}`} />
            <Chip label={`Total ${totals.total}`} />
          </Stack>
        </Stack>

        <Divider />

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ minWidth: 240 }}>Rank</TableCell>
                <TableCell align="center" sx={{ width: 150 }}>
                  Day Guards
                </TableCell>
                <TableCell align="center" sx={{ width: 150 }}>
                  Night Guards
                </TableCell>
                <TableCell align="center" sx={{ width: 150 }}>
                  Total
                </TableCell>
                <TableCell align="right" sx={{ width: 170 }}>
                  Overtime Rate
                </TableCell>
                <TableCell sx={{ width: 56 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.key}>
                  <TableCell>
                    <Autocomplete
                      freeSolo
                      forcePopupIcon
                      openOnFocus
                      size="small"
                      options={rankOptions}
                      value={row.rank}
                      onChange={(e, value) => updateRow(row.key, { rank: value || '' })}
                      onInputChange={(e, value, reason) => {
                        if (reason === 'input') updateRow(row.key, { rank: value });
                      }}
                      renderInput={(params) => <TextField {...params} placeholder="Rank" />}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <TextField
                      size="small"
                      type="number"
                      value={row.requiredDay}
                      onChange={(e) => updateRow(row.key, { requiredDay: toCount(e.target.value) })}
                      inputProps={{ min: 0, style: { textAlign: 'center' } }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <TextField
                      size="small"
                      type="number"
                      value={row.requiredNight}
                      onChange={(e) => updateRow(row.key, { requiredNight: toCount(e.target.value) })}
                      inputProps={{ min: 0, style: { textAlign: 'center' } }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <TextField
                      size="small"
                      type="number"
                      value={row.totalGuards}
                      onChange={(e) => updateRow(row.key, { totalGuards: toCount(e.target.value) })}
                      inputProps={{ min: 0, style: { textAlign: 'center' } }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <TextField
                      size="small"
                      type="number"
                      value={row.overtimeRate}
                      onChange={(e) => updateRow(row.key, { overtimeRate: toAmount(e.target.value) })}
                      inputProps={{ min: 0, style: { textAlign: 'right' } }}
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" color="error" onClick={() => removeRow(row.key)}>
                      <Iconify icon="solar:trash-bin-trash-bold" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Stack direction="row" spacing={1} alignItems="center" sx={{ p: 2 }}>
          <Autocomplete
            freeSolo
            forcePopupIcon
            openOnFocus
            size="small"
            sx={{ width: 300 }}
            options={addableRanks}
            inputValue={rankToAdd}
            onInputChange={(e, value) => setRankToAdd(value)}
            renderInput={(params) => <TextField {...params} label="Add More Rank" />}
          />
          <Button variant="outlined" startIcon={<Iconify icon="mingcute:add-line" />} onClick={addRank}>
            Add
          </Button>
        </Stack>
      </Card>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <Card>
            <Box sx={{ px: 3, pt: 2.5, pb: 1.5 }}>
              <Typography variant="subtitle1">Guard History</Typography>
              <Typography variant="body2" color="text.secondary">
                {versionTotal} dated entries. Click one to open it.
              </Typography>
            </Box>
            <Divider />
            <TableContainer sx={{ maxHeight: 440 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Daily Date</TableCell>
                    <TableCell align="center">Day</TableCell>
                    <TableCell align="center">Night</TableCell>
                    <TableCell align="center">Total</TableCell>
                    <TableCell>Guards per rank (day/night)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {versions.map((entry, index) => (
                    <TableRow
                      key={entry.historyId}
                      hover
                      selected={index === viewIndex}
                      sx={{ cursor: 'pointer' }}
                      onClick={() => showVersion(versions, index)}
                    >
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmtDate(entry.dailyDate)}</TableCell>
                      <TableCell align="center">{entry.totalDay}</TableCell>
                      <TableCell align="center">{entry.totalNight}</TableCell>
                      <TableCell align="center">{entry.totalGuards}</TableCell>
                      <TableCell sx={{ typography: 'caption', color: 'text.secondary' }}>
                        {rankSummary(entry.ranks)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!versions.length && (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                        {isEdit
                          ? 'No history yet. Saving creates the first entry.'
                          : 'The history starts when the client is saved.'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            {versions.length < versionTotal && (
              <Box sx={{ p: 1.5, textAlign: 'center' }}>
                <Button onClick={loadOlder} disabled={loadingOlder}>
                  {loadingOlder
                    ? 'Loading...'
                    : `Load older entries (${versionTotal - versions.length} more)`}
                </Button>
              </Box>
            )}
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <Box sx={{ px: 3, pt: 2.5, pb: 1.5 }}>
              <Typography variant="subtitle1">Company Allowance</Typography>
              <Typography variant="body2" color="text.secondary">
                Each date the allowance changed.
              </Typography>
            </Box>
            <Divider />
            <TableContainer sx={{ maxHeight: 440 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell align="right">Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {allowances.map((a) => (
                    <TableRow key={a.allowanceId}>
                      <TableCell>{fmtDate(a.allowDate)}</TableCell>
                      <TableCell align="right">
                        {Number(a.amount || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!allowances.length && (
                    <TableRow>
                      <TableCell colSpan={2} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                        No allowance recorded.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Grid>
      </Grid>

      <Stack direction="row" justifyContent="flex-end" spacing={1.5} sx={{ mb: 5 }}>
        <Button
          variant="outlined"
          startIcon={<Iconify icon="solar:printer-minimalistic-bold" />}
          onClick={handlePrint}
          disabled={printing || loading}
        >
          {printing ? 'Building...' : 'Print'}
        </Button>
        <Button
          variant="contained"
          startIcon={<Iconify icon="solar:diskette-bold" />}
          onClick={handleSave}
          disabled={saving || loading}
        >
          {saving ? 'Saving...' : 'Save'}
        </Button>
        <Button
          variant="outlined"
          color="error"
          startIcon={<Iconify icon="solar:trash-bin-trash-bold" />}
          onClick={() => setConfirmDeleteOpen(true)}
          disabled={!shown || deleting}
        >
          Delete
        </Button>
        <Button color="inherit" onClick={() => router.push(paths.dashboard.HR_Module.Client.list)}>
          Cancel
        </Button>
      </Stack>

      <Dialog
        open={groupDialogOpen}
        onClose={() => !savingGroup && setGroupDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Add Group</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            margin="dense"
            label="Group name"
            value={newGroupName}
            inputProps={{ maxLength: 100 }}
            onChange={(e) => setNewGroupName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddGroup();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setGroupDialogOpen(false)} disabled={savingGroup}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleAddGroup} disabled={savingGroup || !newGroupName.trim()}>
            {savingGroup ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmDeleteOpen} onClose={() => !deleting && setConfirmDeleteOpen(false)}>
        <DialogTitle>Delete this entry?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            The guards entered for {shown ? fmtDate(shown.dailyDate) : ''} will be removed from the
            history. The client itself is not deleted.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setConfirmDeleteOpen(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

ClientNewEditView.propTypes = {
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};
