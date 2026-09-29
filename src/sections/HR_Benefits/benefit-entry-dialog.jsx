import PropTypes from 'prop-types';
import { useSnackbar } from 'notistack';
import { useState, useEffect } from 'react';

import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import DialogTitle from '@mui/material/DialogTitle';
import Autocomplete from '@mui/material/Autocomplete';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

import { getEmployeeOptions } from 'src/api/attendance';
import { createBenefitEntry, updateBenefitEntry } from 'src/api/benefits';

// ----------------------------------------------------------------------
// Add or edit one allowance or deduction, the same fields the legacy screen
// asks for: the employee, the kind, a description, the amount and the date -
// plus the monthly figure, which only deductions carry.
// ----------------------------------------------------------------------

const todayText = () => new Date().toISOString().slice(0, 10);

export default function BenefitEntryDialog({ open, kind, types, entry, onClose, onSaved }) {
  const { enqueueSnackbar } = useSnackbar();
  const isDeduction = kind === 'deductions';
  const editing = Boolean(entry?.id);
  // On an employee's own page the guard is settled; only the list lets you pick.
  const lockEmployee = Boolean(entry?.employeeId);

  const [employee, setEmployee] = useState(null);
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [typeId, setTypeId] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [monthly, setMonthly] = useState('');
  const [date, setDate] = useState(todayText());
  const [saving, setSaving] = useState(false);

  // The form is filled from the row being edited, or emptied for a new one.
  useEffect(() => {
    if (!open) return;
    if (entry?.id) {
      setEmployee({ id: entry.employeeId, name: entry.employeeName || '' });
      setTypeId(entry.typeId ?? '');
      setDescription(entry.description ?? '');
      setAmount(entry.amount ?? '');
      setMonthly(entry.monthlyDeduction ?? '');
      setDate(String(entry.entryDate ?? '').slice(0, 10) || todayText());
    } else {
      // A new entry started from an employee's page arrives with the guard
      // already named, and only that page can name one.
      setEmployee(entry?.employeeId ? { id: entry.employeeId, name: entry.employeeName || '' } : null);
      setTypeId('');
      setDescription('');
      setAmount('');
      setMonthly('');
      setDate(todayText());
    }
  }, [open, entry]);

  // Searched on the server: there are thousands of guards.
  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const rows = await getEmployeeOptions(employeeSearch);
        if (!cancelled) setEmployeeOptions(rows || []);
      } catch (err) {
        console.error('Could not load the employees', err);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [employeeSearch, open]);

  const handleSave = async () => {
    if (!employee?.id) {
      enqueueSnackbar('Choose an employee', { variant: 'warning' });
      return;
    }
    if (!typeId) {
      enqueueSnackbar(isDeduction ? 'Choose a deduction' : 'Choose an allowance', {
        variant: 'warning',
      });
      return;
    }

    const payload = {
      employeeId: Number(employee.id),
      typeId: Number(typeId),
      // The legacy screen writes the kind's own name when nothing is typed.
      description:
        description.trim() || types.find((t) => t.id === Number(typeId))?.description || '',
      amount: Number(amount) || 0,
      monthlyDeduction: isDeduction ? Number(monthly) || 0 : 0,
      entryDate: date || null,
    };

    setSaving(true);
    try {
      if (editing) await updateBenefitEntry(kind, entry.id, payload);
      else await createBenefitEntry(kind, payload);
      enqueueSnackbar(editing ? 'Entry updated' : 'Entry saved', { variant: 'success' });
      onSaved();
    } catch (err) {
      console.error(err);
      enqueueSnackbar(err.message || 'Could not save the entry', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const title = `${editing ? 'Edit' : 'Add'} ${isDeduction ? 'Deduction' : 'Allowance'}`;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <Autocomplete
            size="small"
            options={employeeOptions}
            value={employee}
            onChange={(event, value) => setEmployee(value)}
            onInputChange={(event, value) => setEmployeeSearch(value)}
            getOptionLabel={(o) => (o ? `${o.id} - ${o.name}` : '')}
            isOptionEqualToValue={(o, v) => o.id === v.id}
            filterOptions={(x) => x}
            disabled={lockEmployee}
            renderInput={(params) => <TextField {...params} label="Employee" required />}
          />

          <TextField
            select
            size="small"
            required
            label={isDeduction ? 'Deduction' : 'Allowance'}
            value={typeId}
            onChange={(e) => setTypeId(e.target.value)}
          >
            {types.map((t) => (
              <MenuItem key={t.id} value={t.id}>
                {t.id} - {t.description}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            size="small"
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Left empty, the chosen kind's name is used"
          />

          {!isDeduction && (
            <Alert severity="info" sx={{ py: 0.5 }}>
              An allowance stands: this amount is added to every month&apos;s salary from its date
              until the entry is deleted.
            </Alert>
          )}

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              size="small"
              fullWidth
              type="number"
              label="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />

            {isDeduction && (
              <TextField
                size="small"
                fullWidth
                type="number"
                label="Monthly Deduction"
                value={monthly}
                onChange={(e) => setMonthly(e.target.value)}
                helperText="Charged every month on top of the amount, until this entry is deleted. A Loan is the exception: it is recovered by instalments of this figure."
              />
            )}

            <TextField
              size="small"
              fullWidth
              type="date"
              label="Date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

BenefitEntryDialog.propTypes = {
  open: PropTypes.bool,
  kind: PropTypes.string,
  types: PropTypes.array,
  entry: PropTypes.object,
  onClose: PropTypes.func,
  onSaved: PropTypes.func,
};
