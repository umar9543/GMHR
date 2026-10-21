import PropTypes from 'prop-types';
import { useSnackbar } from 'notistack';
import { useRef, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import LinearProgress from '@mui/material/LinearProgress';
import TableContainer from '@mui/material/TableContainer';

import Iconify from 'src/components/iconify';
import { employeePictureUrl } from 'src/api/attendance';
import {
  getBlackListEntry,
  saveBlackListEntry,
  checkBlackListCnic,
  blackListPictureUrl,
  getNextBlackListCode,
  deleteBlackListEntry,
} from 'src/api/blacklist';

import { buildBlackListPdf } from './blacklist-pdf';

// ----------------------------------------------------------------------
// One black listing entry, as the legacy screen edits it: a code and a date,
// and the people on it. The code and the date are not typed: a new entry is
// numbered when saved and dated that day; an existing one keeps its own. A person is filled in above the list and added with
// "+"; a line in the list is picked to change it, or removed with "-".
//
// While a CNIC is typed it is checked: already on the black list (another
// entry), and one of our employees - whose name, father's name, address and
// photo can then be taken from his record.
// ----------------------------------------------------------------------

const BLANK = {
  personId: null,
  cnic: '',
  employeeName: '',
  fatherName: '',
  address: '',
  charges: '',
  exSecurityCompany: '',
  hasPicture: false,
  picture: null, // a new photo, as a JPEG data URL
  removePicture: false,
  pictureFromEmployeeId: null,
};

/** 4220112345671 -> 42201-1234567-1, as it is typed. */
function formatCnic(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 13);
  if (digits.length <= 5) return digits;
  if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

/** A chosen file as a JPEG, at most 600 px across - BMP and large photos included. */
function fileToJpeg(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 600 / img.naturalWidth);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('That file is not a picture'));
    };
    img.src = url;
  });
}

const photoSrc = (p) => {
  if (p.removePicture) return null;
  if (p.picture) return p.picture;
  if (p.pictureFromEmployeeId) return employeePictureUrl(p.pictureFromEmployeeId);
  if (p.hasPicture && p.personId) return blackListPictureUrl(p.personId);
  return null;
};

let keySeed = 0;
const withKey = (p) => {
  keySeed += 1;
  return { ...p, key: `p${keySeed}` };
};

export default function BlackListEntryDialog({ open, code, onClose, onSaved }) {
  const { enqueueSnackbar } = useSnackbar();
  const fileRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [entryCode, setEntryCode] = useState(null);
  const [nextCode, setNextCode] = useState(null);
  const [isLegacy, setIsLegacy] = useState(false);
  const [date, setDate] = useState(new Date());
  const [people, setPeople] = useState([]);
  const [form, setForm] = useState(BLANK);
  const [editingKey, setEditingKey] = useState(null);
  const [check, setCheck] = useState({ blackListed: [], employee: null });

  // ------------------------------------------------------------ load
  useEffect(() => {
    if (!open) return;
    setForm(BLANK);
    setEditingKey(null);
    setCheck({ blackListed: [], employee: null });
    (async () => {
      setLoading(true);
      try {
        if (code) {
          const entry = await getBlackListEntry(code);
          setEntryCode(entry.code);
          setIsLegacy(!!entry.isLegacy);
          setDate(entry.date ? new Date(entry.date) : null);
          setPeople((entry.people || []).map((p) => withKey({ ...BLANK, ...p })));
        } else {
          setEntryCode(null);
          setIsLegacy(false);
          setDate(new Date());
          setPeople([]);
          setNextCode(await getNextBlackListCode().catch(() => null));
        }
      } catch (err) {
        enqueueSnackbar(err.message || 'Could not load the entry', { variant: 'error' });
      } finally {
        setLoading(false);
      }
    })();
  }, [open, code, enqueueSnackbar]);

  // ------------------------------------------------------------ CNIC check
  useEffect(() => {
    const digits = form.cnic.replace(/\D/g, '');
    if (digits.length < 13) {
      setCheck({ blackListed: [], employee: null });
      return () => {};
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await checkBlackListCnic(form.cnic);
        if (!cancelled) setCheck({ blackListed: res.blackListed || [], employee: res.employee || null });
      } catch {
        /* the check is a help only */
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [form.cnic]);

  const set = (field) => (event) => setForm((f) => ({ ...f, [field]: event.target.value }));

  const fillFromEmployee = () => {
    const e = check.employee;
    if (!e) return;
    setForm((f) => ({
      ...f,
      employeeName: f.employeeName || e.name || '',
      fatherName: f.fatherName || e.fatherName || '',
      address: f.address || e.address || '',
      ...(e.hasPicture && !photoSrc(f)
        ? { pictureFromEmployeeId: e.id, picture: null, removePicture: false }
        : {}),
    }));
  };

  const pickPhoto = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const picture = await fileToJpeg(file);
      setForm((f) => ({ ...f, picture, removePicture: false, pictureFromEmployeeId: null }));
    } catch (err) {
      enqueueSnackbar(err.message, { variant: 'error' });
    }
  };

  const clearPhoto = () =>
    setForm((f) => ({ ...f, picture: null, pictureFromEmployeeId: null, removePicture: !!f.hasPicture }));

  // ------------------------------------------------------------ the list
  const addOrUpdate = () => {
    if (!form.employeeName.trim()) {
      enqueueSnackbar('Enter the name', { variant: 'warning' });
      return;
    }
    if (editingKey) {
      setPeople((list) => list.map((p) => (p.key === editingKey ? { ...form, key: editingKey } : p)));
    } else {
      setPeople((list) => [...list, withKey(form)]);
    }
    setForm(BLANK);
    setEditingKey(null);
  };

  const editLine = (p) => {
    setForm({ ...BLANK, ...p });
    setEditingKey(p.key);
  };

  const removeLine = () => {
    if (!editingKey) return;
    setPeople((list) => list.filter((p) => p.key !== editingKey));
    setForm(BLANK);
    setEditingKey(null);
  };

  // ------------------------------------------------------------ save
  const save = useCallback(async () => {
    // A filled-in person not yet added is added for you.
    let list = people;
    if (form.employeeName.trim() && !editingKey) list = [...people, withKey(form)];
    else if (editingKey) list = people.map((p) => (p.key === editingKey ? { ...form, key: editingKey } : p));
    if (!list.length) {
      enqueueSnackbar('Add at least one person', { variant: 'warning' });
      return;
    }
    setSaving(true);
    try {
      const res = await saveBlackListEntry({
        code: entryCode,
        // The calendar day as picked; toISOString() is UTC, a day early in Pakistan.
        date:
          date && !Number.isNaN(date.getTime())
            ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
            : null,
        people: list.map((p) => ({
          personId: p.personId,
          cnic: p.cnic,
          employeeName: p.employeeName,
          fatherName: p.fatherName,
          address: p.address,
          charges: p.charges,
          exSecurityCompany: p.exSecurityCompany,
          picture: p.picture,
          removePicture: p.removePicture,
          pictureFromEmployeeId: p.pictureFromEmployeeId,
        })),
      });
      enqueueSnackbar(`Black list entry ${res.code} saved`, { variant: 'success' });
      onSaved?.(res.code);
      onClose();
    } catch (err) {
      enqueueSnackbar(err.message || 'Could not save', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  }, [people, form, editingKey, entryCode, date, enqueueSnackbar, onSaved, onClose]);

  const remove = async () => {
    // eslint-disable-next-line no-alert
    if (!entryCode || !window.confirm(`Delete black list entry ${entryCode} and everyone on it?`)) return;
    setSaving(true);
    try {
      await deleteBlackListEntry(entryCode);
      enqueueSnackbar(`Black list entry ${entryCode} deleted`, { variant: 'success' });
      onSaved?.(null);
      onClose();
    } catch (err) {
      enqueueSnackbar(err.message || 'Could not delete', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const print = async () => {
    if (!people.length) return;
    setPrinting(true);
    try {
      const url = await buildBlackListPdf(
        people.map((p) => ({ ...p, code: entryCode ?? nextCode, date })),
        { subtitle: entryCode ? `Entry ${entryCode}` : 'New entry (not saved yet)' }
      );
      window.open(url, '_blank');
    } catch (err) {
      enqueueSnackbar(err.message || 'Could not print', { variant: 'error' });
    } finally {
      setPrinting(false);
    }
  };

  // Other entries this CNIC is already on.
  const elsewhere = check.blackListed.filter((p) => p.code !== entryCode);
  const src = photoSrc(form);

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="lg">
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
          <span>Black Listing of Guards / Employees</span>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {entryCode
              ? `Entry ${entryCode}${date ? ` · ${date.toLocaleDateString('en-GB')}` : ''}`
              : 'New entry'}
          </Typography>
          {isLegacy && <Chip size="small" variant="outlined" label="From legacy" />}
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        {loading && <LinearProgress sx={{ mb: 2 }} />}

        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '1fr 180px' }, pt: 2 }}>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
            <TextField
              label="NIC"
              value={form.cnic}
              onChange={(e) => setForm((f) => ({ ...f, cnic: formatCnic(e.target.value) }))}
              placeholder="42201-1234567-1"
              inputProps={{ inputMode: 'numeric' }}
            />
            <TextField
              label="Company No."
              value={check.employee ? `${check.employee.id} - ${check.employee.name}` : ''}
              placeholder="Filled when the NIC is one of our employees"
              InputProps={{
                readOnly: true,
                endAdornment: check.employee ? (
                  <Tooltip title="Take name, father's name, address and photo from his record">
                    <IconButton size="small" color="primary" onClick={fillFromEmployee}>
                      <Iconify icon="solar:import-bold" />
                    </IconButton>
                  </Tooltip>
                ) : null,
              }}
            />
            <TextField label="First Name" value={form.employeeName} onChange={set('employeeName')} />
            <TextField label="Father Name" value={form.fatherName} onChange={set('fatherName')} />
            <TextField
              label="Current Address"
              value={form.address}
              onChange={set('address')}
              sx={{ gridColumn: { sm: '1 / -1' } }}
            />
            <TextField
              label="Charges"
              value={form.charges}
              onChange={set('charges')}
              sx={{ gridColumn: { sm: '1 / -1' } }}
            />
            <TextField
              label="Ex-Security Company"
              value={form.exSecurityCompany}
              onChange={set('exSecurityCompany')}
              sx={{ gridColumn: { sm: '1 / -1' } }}
            />

            {(elsewhere.length > 0 || check.employee?.isActive) && (
              <Stack spacing={1} sx={{ gridColumn: { sm: '1 / -1' } }}>
                {elsewhere.length > 0 && (
                  <Alert severity="warning">
                    Already on the black list:{' '}
                    {elsewhere
                      .map((p) => `entry ${p.code}${p.date ? ` (${String(p.date).slice(0, 10)})` : ''} - ${p.charges || 'no charges given'}`)
                      .join('; ')}
                  </Alert>
                )}
                {check.employee?.isActive && (
                  <Alert severity="error">
                    {check.employee.name} ({check.employee.id}) is a current employee.
                  </Alert>
                )}
              </Stack>
            )}
          </Box>

          <Stack spacing={1} alignItems="center">
            <Box
              sx={{
                width: 160,
                height: 190,
                borderRadius: 1,
                bgcolor: 'background.neutral',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {src ? (
                <Box component="img" src={src} alt="" sx={{ width: 1, height: 1, objectFit: 'cover' }} />
              ) : (
                <Iconify icon="solar:user-bold" width={64} sx={{ color: 'grey.400' }} />
              )}
            </Box>
            <Stack direction="row" spacing={1}>
              <Button size="small" variant="outlined" onClick={() => fileRef.current?.click()}>
                Picture
              </Button>
              <Button size="small" color="inherit" onClick={clearPhoto} disabled={!src}>
                Clear
              </Button>
            </Stack>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickPhoto} />
          </Stack>
        </Box>

        <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ mt: 2, mb: 1 }}>
          {editingKey && (
            <Button
              color="inherit"
              onClick={() => {
                setForm(BLANK);
                setEditingKey(null);
              }}
            >
              New person
            </Button>
          )}
          <Tooltip title={editingKey ? 'Update this line' : 'Add to the list'}>
            <Button variant="contained" color="success" onClick={addOrUpdate} startIcon={<Iconify icon="mingcute:add-line" />}>
              {editingKey ? 'Update' : 'Add'}
            </Button>
          </Tooltip>
          <Tooltip title="Remove the picked line">
            <span>
              <Button
                variant="outlined"
                color="error"
                onClick={removeLine}
                disabled={!editingKey}
                startIcon={<Iconify icon="mingcute:minimize-line" />}
              >
                Remove
              </Button>
            </span>
          </Tooltip>
        </Stack>

        <TableContainer sx={{ maxHeight: 260, border: 1, borderColor: 'divider', borderRadius: 1 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell>S.N</TableCell>
                <TableCell>CNIC</TableCell>
                <TableCell>Emp Name</TableCell>
                <TableCell>FName</TableCell>
                <TableCell>Address</TableCell>
                <TableCell>Charges</TableCell>
                <TableCell>Ex-Security Co.</TableCell>
                <TableCell align="center">Picture</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {people.map((p, i) => (
                <TableRow
                  key={p.key}
                  hover
                  selected={p.key === editingKey}
                  onClick={() => editLine(p)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>{i + 1}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{p.cnic || '-'}</TableCell>
                  <TableCell>{p.employeeName}</TableCell>
                  <TableCell>{p.fatherName || '-'}</TableCell>
                  <TableCell sx={{ maxWidth: 220 }}>{p.address || '-'}</TableCell>
                  <TableCell sx={{ maxWidth: 220 }}>{p.charges || '-'}</TableCell>
                  <TableCell>{p.exSecurityCompany || '-'}</TableCell>
                  <TableCell align="center">
                    {photoSrc(p) ? (
                      <Box component="img" src={photoSrc(p)} alt="" sx={{ width: 32, height: 38, objectFit: 'cover', borderRadius: 0.5 }} />
                    ) : (
                      '-'
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!people.length && (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                    Fill in a person above and press Add
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
          Total {people.length} - click a line to change it.
        </Typography>
      </DialogContent>

      <DialogActions>
        {entryCode && (
          <Button color="error" onClick={remove} disabled={saving} sx={{ mr: 'auto' }}>
            Delete entry
          </Button>
        )}
        <Button
          variant="outlined"
          color="inherit"
          startIcon={<Iconify icon="solar:printer-bold" />}
          onClick={print}
          disabled={!people.length || printing}
        >
          {printing ? 'Preparing...' : 'Print'}
        </Button>
        <Button color="inherit" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={<Iconify icon="eva:save-fill" />}
          onClick={save}
          disabled={saving || loading}
        >
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

BlackListEntryDialog.propTypes = {
  open: PropTypes.bool,
  code: PropTypes.number,
  onClose: PropTypes.func,
  onSaved: PropTypes.func,
};
