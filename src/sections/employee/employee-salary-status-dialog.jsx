import PropTypes from 'prop-types';
import { useSnackbar } from 'notistack';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Checkbox from '@mui/material/Checkbox';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import LinearProgress from '@mui/material/LinearProgress';
import FormControlLabel from '@mui/material/FormControlLabel';
import InputAdornment from '@mui/material/InputAdornment';

import Iconify from 'src/components/iconify';

import { APP_API } from 'src/config-global';
import { getSalaryHistory } from 'src/api/employee-salary';

// ---------------------------------------------------------------------------
// Salary Status - the legacy "Employee Information -> Salary Status" tab.
//
// What the employee is hired as and paid: job title, employee type, basic
// salary and overtime rate, how they are paid, and whether they are still in
// service. The figures came across from the legacy system, one row per
// employee in dbo.EmployeeSalaryStatus; the four the legacy screen keeps but
// never filled from Oracle (current salary, duties, paid leave, black list)
// start empty and are the app's own.
// ---------------------------------------------------------------------------

const PAYMENT_MODES = ['Cash', 'Cheque', 'Jazz Cash', 'Bank Transfer'];

const EMPTY = {
  designationId: '',
  employeeTypeId: '',
  isActive: true,
  contractPeriod: '',
  basicSalary: '',
  otRate: '',
  paymentMode: '',
  currentSalary: '',
  totalDuties: '',
  paidLeave: '',
  isBlackListed: false,
  noAllowance: false,
};

/** A figure for the form: null and undefined become an empty box. */
const asText = (value) => (value === null || value === undefined ? '' : String(value));

/** A figure for the API: an empty box becomes null, not zero. */
const asNumber = (value) => {
  const text = String(value ?? '').trim();
  if (!text) return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
};

export default function EmployeeSalaryStatusDialog({ open, onClose, employeeId, employeeName }) {
  const { enqueueSnackbar } = useSnackbar();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState(EMPTY);
  const [fromLegacy, setFromLegacy] = useState(false);
  const [designations, setDesignations] = useState([]);
  const [employeeTypes, setEmployeeTypes] = useState([]);
  // The quick add beside Job Title: null when closed, else what is typed.
  const [newTitle, setNewTitle] = useState(null);
  const [addingTitle, setAddingTitle] = useState(false);

  // Duties since he joined, from his salary history: every month he was paid
  // and the days (WDAYS) and overtime days (OTDAYS) it paid. One call; the
  // history holds up to 20 years.
  const [duties, setDuties] = useState({ loading: false, counts: null });

  useEffect(() => {
    if (!open || !employeeId) return undefined;
    let cancelled = false;
    setDuties({ loading: true, counts: null });
    getSalaryHistory(employeeId, 240)
      .then((data) => {
        if (cancelled) return;
        const rows = data?.records ?? data?.Records ?? [];
        const num = (v) => Number(v) || 0;
        const days = rows.reduce((t, r) => t + num(r.wDays ?? r.WDays ?? r.wdays), 0);
        const ot = rows.reduce((t, r) => t + num(r.otDays ?? r.OtDays ?? r.otdays), 0);
        const dates = rows.map((r) => r.salaryDate ?? r.SalaryDate).filter(Boolean).sort();
        setDuties({
          loading: false,
          counts: { months: rows.length, days, ot, total: days + ot, from: dates[0], to: dates[dates.length - 1] },
        });
      })
      .catch(() => !cancelled && setDuties({ loading: false, counts: null }));
    return () => {
      cancelled = true;
    };
  }, [open, employeeId]);

  const monthLabel = (d) =>
    d ? new Date(d).toLocaleString('en-GB', { month: 'short', year: 'numeric' }) : '';

  const set = (field) => (event) => {
    const { value, checked, type } = event.target;
    setValues((previous) => ({ ...previous, [field]: type === 'checkbox' ? checked : value }));
  };

  // The two pickers, which do not change while the dialog is open.
  useEffect(() => {
    if (!open) return;

    (async () => {
      try {
        const [jobs, types] = await Promise.all([
          fetch(`${APP_API}/api/SalaryStatus/designations`).then((r) => r.json()),
          fetch(`${APP_API}/api/SalaryStatus/employee-types`).then((r) => r.json()),
        ]);
        // Job titles in ascending order of their number.
        setDesignations(Array.isArray(jobs) ? [...jobs].sort((a, b) => Number(a.id) - Number(b.id)) : []);
        setEmployeeTypes(Array.isArray(types) ? types : []);
      } catch {
        // The pickers are a convenience; the rest of the tab still works.
        setDesignations([]);
        setEmployeeTypes([]);
      }
    })();
  }, [open]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${APP_API}/api/SalaryStatus/${employeeId}`);
      if (!response.ok) throw new Error('Could not load the salary status');

      const data = await response.json();
      setFromLegacy(!!data.isLegacy);
      setValues({
        designationId: asText(data.designationId),
        employeeTypeId: asText(data.employeeTypeId),
        isActive: !!data.isActive,
        contractPeriod: asText(data.contractPeriod),
        basicSalary: asText(data.basicSalary),
        otRate: asText(data.otRate),
        paymentMode: asText(data.paymentMode),
        currentSalary: asText(data.currentSalary),
        totalDuties: asText(data.totalDuties),
        paidLeave: asText(data.paidLeave),
        isBlackListed: !!data.isBlackListed,
        noAllowance: !!data.noAllowance,
      });
    } catch (error) {
      enqueueSnackbar(error.message, { variant: 'error' });
      setValues(EMPTY);
    } finally {
      setLoading(false);
    }
  }, [employeeId, enqueueSnackbar]);

  useEffect(() => {
    if (open && employeeId) load();
  }, [open, employeeId, load]);

  // Adds a job title without leaving the dialog, and picks it.
  const addTitle = async () => {
    const description = (newTitle || '').trim();
    if (!description) return;
    setAddingTitle(true);
    try {
      const response = await fetch(`${APP_API}/api/SalaryStatus/designations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message ?? 'Could not add the job title');

      const added = { id: body.id, description: body.description };
      setDesignations((previous) =>
        previous.some((row) => row.id === added.id)
          ? previous
          : [...previous, added].sort((a, b) => Number(a.id) - Number(b.id))
      );
      setValues((previous) => ({ ...previous, designationId: String(added.id) }));
      setNewTitle(null);
      enqueueSnackbar(
        body.existed
          ? `${added.description} is already job title ${added.id} - picked it`
          : `Job title ${added.id} - ${added.description} added`
      );
    } catch (error) {
      enqueueSnackbar(error.message, { variant: 'error' });
    } finally {
      setAddingTitle(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${APP_API}/api/SalaryStatus/${employeeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          designationId: asNumber(values.designationId),
          employeeTypeId: asNumber(values.employeeTypeId),
          isActive: values.isActive,
          contractPeriod: values.contractPeriod.trim() || null,
          basicSalary: asNumber(values.basicSalary),
          otRate: asNumber(values.otRate),
          paymentMode: values.paymentMode || null,
          currentSalary: asNumber(values.currentSalary),
          totalDuties: asNumber(values.totalDuties),
          paidLeave: asNumber(values.paidLeave),
          isBlackListed: values.isBlackListed,
          noAllowance: values.noAllowance,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message ?? 'Could not save the salary status');
      }

      enqueueSnackbar('The salary status was saved');
      setFromLegacy(false);
      onClose();
    } catch (error) {
      enqueueSnackbar(error.message, { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const rupees = { startAdornment: <InputAdornment position="start">Rs</InputAdornment> };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
          <span>Salary Status</span>
          {employeeName && (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {employeeName} ({employeeId})
            </Typography>
          )}
          {fromLegacy && <Chip size="small" variant="outlined" label="From legacy" />}
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        {loading && <LinearProgress sx={{ mb: 2 }} />}

        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            opacity: loading ? 0.5 : 1,
            // Room for the first row's floating labels, which sit 9px above
            // their box: the theme gives DialogContent no top padding, so the
            // scrolling content area would otherwise cut them off.
            pt: 2,
          }}
        >
          {newTitle === null ? (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <TextField
                select
                fullWidth
                label="Job Title"
                value={values.designationId}
                onChange={set('designationId')}
                disabled={loading}
              >
                <MenuItem value="">—</MenuItem>
                {designations.map((row) => (
                  <MenuItem key={row.id} value={String(row.id)}>
                    {row.id} - {row.description}
                  </MenuItem>
                ))}
              </TextField>
              <Tooltip title="Add a job title">
                <span>
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={() => setNewTitle('')}
                    disabled={loading}
                  >
                    <Iconify icon="mingcute:add-line" />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          ) : (
            <TextField
              autoFocus
              label="New job title"
              value={newTitle}
              onChange={(event) => setNewTitle(event.target.value.toUpperCase())}
              onKeyDown={(event) => {
                if (event.key === 'Enter') addTitle();
                if (event.key === 'Escape') {
                  event.stopPropagation();
                  setNewTitle(null);
                }
              }}
              disabled={addingTitle}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={addTitle}
                      disabled={addingTitle || !newTitle.trim()}
                    >
                      <Iconify icon="eva:checkmark-fill" />
                    </IconButton>
                    <IconButton size="small" onClick={() => setNewTitle(null)} disabled={addingTitle}>
                      <Iconify icon="mingcute:close-line" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          )}

          <TextField
            select
            label="Employee Type"
            value={values.employeeTypeId}
            onChange={set('employeeTypeId')}
            disabled={loading}
          >
            <MenuItem value="">—</MenuItem>
            {employeeTypes.map((row) => (
              <MenuItem key={row.id} value={String(row.id)}>
                {row.id} - {row.description}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Status"
            value={values.isActive ? 'active' : 'inactive'}
            onChange={(event) =>
              setValues((previous) => ({
                ...previous,
                isActive: event.target.value === 'active',
              }))
            }
            disabled={loading}
          >
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
          </TextField>

          <TextField
            select
            label="Payment Mode"
            value={values.paymentMode}
            onChange={set('paymentMode')}
            disabled={loading}
          >
            <MenuItem value="">—</MenuItem>
            {/* Whatever legacy wrote is kept, even if it is not in the list. */}
            {[...new Set([...PAYMENT_MODES, values.paymentMode].filter(Boolean))].map((mode) => (
              <MenuItem key={mode} value={mode}>
                {mode}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Basic Salary"
            value={values.basicSalary}
            onChange={set('basicSalary')}
            disabled={loading}
            type="number"
            InputProps={rupees}
          />

          <TextField
            label="Current Salary"
            value={values.currentSalary}
            onChange={set('currentSalary')}
            disabled={loading}
            type="number"
            InputProps={rupees}
          />

          <TextField
            label="OT Rate"
            value={values.otRate}
            onChange={set('otRate')}
            disabled={loading}
            type="number"
            InputProps={rupees}
          />

          <TextField
            label="Total # of Duties"
            value={values.totalDuties}
            onChange={set('totalDuties')}
            disabled={loading}
            type="number"
          />

          <TextField
            label="Paid Leave"
            value={values.paidLeave}
            onChange={set('paidLeave')}
            disabled={loading}
            type="number"
          />

          <TextField
            label="Contract Period"
            value={values.contractPeriod}
            onChange={set('contractPeriod')}
            disabled={loading}
          />
        </Box>

        <Box sx={{ mt: 2, p: 1.5, borderRadius: 1.5, bgcolor: 'background.neutral' }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Duties since joining
            {duties.counts?.months > 0 && (
              <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                {duties.counts.months} paid month(s), {monthLabel(duties.counts.from)} - {monthLabel(duties.counts.to)}
              </Typography>
            )}
          </Typography>
          {duties.loading && <LinearProgress />}
          {!duties.loading && !duties.counts && (
            <Typography variant="body2" color="text.secondary">
              Could not read the salary history.
            </Typography>
          )}
          {!duties.loading && duties.counts?.months === 0 && (
            <Typography variant="body2" color="text.secondary">
              No salary paid yet.
            </Typography>
          )}
          {!duties.loading && duties.counts?.months > 0 && (
            <Stack direction="row" flexWrap="wrap" gap={1}>
              <Chip size="small" color="success" variant="soft" label={`Working days: ${duties.counts.days}`} />
              <Chip size="small" color="info" variant="soft" label={`OT duties: ${duties.counts.ot}`} />
              <Chip size="small" color="primary" label={`Total duties: ${duties.counts.total}`} />
            </Stack>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 0, sm: 3 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={values.noAllowance}
                onChange={set('noAllowance')}
                disabled={loading}
              />
            }
            label="Allowance not to be Given"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={values.isBlackListed}
                onChange={set('isBlackListed')}
                disabled={loading}
                color="error"
              />
            }
            label="Black List"
          />
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={saving} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={save}
          disabled={loading || saving}
          variant="contained"
          startIcon={<Iconify icon="eva:save-fill" />}
        >
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

EmployeeSalaryStatusDialog.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  employeeId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  employeeName: PropTypes.string,
};
