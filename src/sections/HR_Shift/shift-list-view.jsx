import { useState, useEffect, useCallback } from 'react';
import { useSnackbar } from 'notistack';

import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Switch from '@mui/material/Switch';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import LinearProgress from '@mui/material/LinearProgress';
import TableContainer from '@mui/material/TableContainer';
import FormControlLabel from '@mui/material/FormControlLabel';

import { paths } from 'src/routes/paths';
import Iconify from 'src/components/iconify';
import { useSettingsContext } from 'src/components/settings';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';

import { getShifts, createShift, updateShift, deleteShift } from 'src/api/shift';

const emptyShift = {
  code: '',
  name: '',
  startTime: '',
  endTime: '',
  sortOrder: 0,
  isActive: true,
};

// The API sends a time span; <input type="time"> wants HH:mm.
function toTimeInput(value) {
  if (!value) return '';
  return String(value).slice(0, 5);
}

export default function ShiftListView() {
  const settings = useSettingsContext();
  const { enqueueSnackbar } = useSnackbar();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await getShifts(false));
    } catch (err) {
      enqueueSnackbar(err.message || 'Failed to load shifts', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    if (!editing.code?.trim() || !editing.name?.trim()) {
      enqueueSnackbar('Code and name are both required', { variant: 'warning' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        code: editing.code.trim(),
        name: editing.name.trim(),
        startTime: editing.startTime ? `${editing.startTime}:00` : null,
        endTime: editing.endTime ? `${editing.endTime}:00` : null,
        sortOrder: parseInt(editing.sortOrder, 10) || 0,
        isActive: !!editing.isActive,
      };

      if (editing.shiftId) {
        await updateShift(editing.shiftId, payload);
        enqueueSnackbar('Shift updated', { variant: 'success' });
      } else {
        await createShift(payload);
        enqueueSnackbar('Shift created', { variant: 'success' });
      }
      setEditing(null);
      await load();
    } catch (err) {
      enqueueSnackbar(err.message || 'Save failed', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    const warning = row.usageCount
      ? `"${row.name}" is used by ${row.usageCount} attendance rows, so it will be deactivated rather than deleted. Continue?`
      : `Delete shift "${row.name}"?`;
    // eslint-disable-next-line no-alert
    if (!window.confirm(warning)) return;

    try {
      const res = await deleteShift(row.shiftId);
      enqueueSnackbar(res.message || 'Shift removed', { variant: 'success' });
      await load();
    } catch (err) {
      enqueueSnackbar(err.message || 'Delete failed', { variant: 'error' });
    }
  };

  const dialogTitle = editing?.shiftId ? 'Edit Shift' : 'New Shift';
  const saveLabel = saving ? 'Saving...' : 'Save';

  return (
    <Container maxWidth={settings.themeStretch ? false : 'lg'}>
      <CustomBreadcrumbs
        heading="Shifts"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR', href: paths.dashboard.HR_Module.root },
          { name: 'Setup' },
          { name: 'Shifts' },
        ]}
        action={
          <Button
            variant="contained"
            color="primary"
            startIcon={<Iconify icon="mingcute:add-line" />}
            onClick={() => setEditing({ ...emptyShift, sortOrder: rows.length + 1 })}
          >
            New Shift
          </Button>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card>
        {loading && <LinearProgress />}

        <Stack sx={{ p: 2.5 }}>
          <Typography variant="body2" color="text.secondary">
            Shifts the attendance sheet can mark a guard against. A shift already used by
            attendance is deactivated instead of deleted, so past sheets keep naming the
            shift they were marked under.
          </Typography>
        </Stack>

        <Divider />

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Code</TableCell>
                <TableCell>Name</TableCell>
                <TableCell align="center">Start</TableCell>
                <TableCell align="center">End</TableCell>
                <TableCell align="center">Order</TableCell>
                <TableCell align="center">Used By</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.shiftId} hover>
                  <TableCell>
                    <Typography variant="subtitle2">{row.code}</Typography>
                  </TableCell>
                  <TableCell>{row.name}</TableCell>
                  <TableCell align="center">{toTimeInput(row.startTime) || '-'}</TableCell>
                  <TableCell align="center">{toTimeInput(row.endTime) || '-'}</TableCell>
                  <TableCell align="center">{row.sortOrder}</TableCell>
                  <TableCell align="center">{row.usageCount}</TableCell>
                  <TableCell align="center">
                    <Chip
                      size="small"
                      color={row.isActive ? 'success' : 'default'}
                      label={row.isActive ? 'Active' : 'Inactive'}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        onClick={() =>
                          setEditing({
                            ...row,
                            startTime: toTimeInput(row.startTime),
                            endTime: toTimeInput(row.endTime),
                          })
                        }
                      >
                        <Iconify icon="solar:pen-bold" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={row.usageCount ? 'Deactivate' : 'Delete'}>
                      <IconButton size="small" color="error" onClick={() => handleDelete(row)}>
                        <Iconify icon="solar:trash-bin-trash-bold" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}

              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Typography variant="subtitle2" sx={{ py: 3 }}>
                      No shifts defined yet.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Dialog open={!!editing} onClose={() => setEditing(null)} fullWidth maxWidth="xs">
        <DialogTitle>{dialogTitle}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Code"
              value={editing?.code || ''}
              onChange={(e) => setEditing((p) => ({ ...p, code: e.target.value }))}
              inputProps={{ maxLength: 10 }}
              helperText="Short marker, e.g. D or N"
              fullWidth
            />
            <TextField
              label="Name"
              value={editing?.name || ''}
              onChange={(e) => setEditing((p) => ({ ...p, name: e.target.value }))}
              fullWidth
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="Start time"
                type="time"
                value={editing?.startTime || ''}
                onChange={(e) => setEditing((p) => ({ ...p, startTime: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <TextField
                label="End time"
                type="time"
                value={editing?.endTime || ''}
                onChange={(e) => setEditing((p) => ({ ...p, endTime: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                fullWidth
                helperText="May be earlier than start, for night shifts"
              />
            </Stack>
            <TextField
              label="Sort order"
              type="number"
              value={editing?.sortOrder ?? 0}
              onChange={(e) => setEditing((p) => ({ ...p, sortOrder: e.target.value }))}
              fullWidth
            />
            <FormControlLabel
              control={
                <Switch
                  checked={!!editing?.isActive}
                  onChange={(e) => setEditing((p) => ({ ...p, isActive: e.target.checked }))}
                />
              }
              label="Active"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditing(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saveLabel}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
